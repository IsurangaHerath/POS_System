/**
 * Reports Page
 * 
 * Sales and inventory reports with export functionality
 */

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

const ReportsPage = () => {
    const { error } = useToast();
    const { hasMinRole, user } = useAuth();

    // Check if user has permission to view reports (Manager or Admin only)
    const canViewReports = hasMinRole('manager');

    const [activeTab, setActiveTab] = useState('daily');
    const [isLoading, setIsLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [dateRange, setDateRange] = useState({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    // Fetch report data
    const fetchReport = async () => {
        setIsLoading(true);
        try {
            let endpoint = '';
            let params = {};

            switch (activeTab) {
                case 'daily':
                    endpoint = '/reports/daily-sales';
                    params = { date: dateRange.start };
                    break;
                case 'monthly':
                    endpoint = '/reports/monthly-sales';
                    params = { month: dateRange.start.substring(0, 7) };
                    break;
                case 'products':
                    endpoint = '/reports/product-performance';
                    params = { start_date: dateRange.start, end_date: dateRange.end };
                    break;
                default:
                    return;
            }

            const response = await api.get(endpoint, { params });
            setReportData(response.data.data);
        } catch (err) {
            error('Failed to load report');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [activeTab]);

    // Export to CSV
    const exportCSV = () => {
        if (!reportData) return;

        let csvContent = '';
        let filename = '';

        if (activeTab === 'daily' || activeTab === 'monthly') {
            csvContent = 'Date,Sales Count,Total Revenue,Total Tax,Total Discount\n';
            reportData.sales?.forEach(row => {
                csvContent += `${row.date},${row.count},${row.revenue},${row.tax},${row.discount}\n`;
            });
            filename = `${activeTab}_sales_report.csv`;
        } else if (activeTab === 'products') {
            csvContent = 'Product,SKU,Quantity Sold,Revenue\n';
            reportData.products?.forEach(row => {
                csvContent += `${row.name},${row.sku},${row.quantity_sold},${row.revenue}\n`;
            });
            filename = 'product_performance_report.csv';
        }

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // Export to PDF
    const exportPDF = async () => {
        if (!reportData) return;

        const content = `
      <html>
      <head>
        <title>Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; }
        </style>
      </head>
      <body>
        <h1>${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Report</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        ${generateReportTable()}
      </body>
      </html>
    `;

        if (window.electron?.print?.pdf) {
            const pdf = await window.electron.print.pdf(content);
            // Save PDF
        } else {
            const printWindow = window.open('', '_blank');
            printWindow.document.write(content);
            printWindow.document.close();
            printWindow.print();
        }
    };

    // Generate report table HTML
    const generateReportTable = () => {
        if (!reportData) return '';

        if (activeTab === 'daily' || activeTab === 'monthly') {
            return `
        <table>
          <thead>
            <tr><th>Date</th><th>Sales</th><th>Revenue</th><th>Tax</th><th>Discount</th></tr>
          </thead>
          <tbody>
            ${reportData.sales?.map(row => `
              <tr>
                <td>${row.date}</td>
                <td>${row.count}</td>
                <td>$${row.revenue?.toFixed(2)}</td>
                <td>$${row.tax?.toFixed(2)}</td>
                <td>$${row.discount?.toFixed(2)}</td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>
      `;
        }

        if (activeTab === 'products') {
            return `
        <table>
          <thead>
            <tr><th>Product</th><th>SKU</th><th>Qty Sold</th><th>Revenue</th></tr>
          </thead>
          <tbody>
            ${reportData.products?.map(row => `
              <tr>
                <td>${row.name}</td>
                <td>${row.sku}</td>
                <td>${row.quantity_sold}</td>
                <td>$${row.revenue?.toFixed(2)}</td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>
      `;
        }

        return '';
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    // Check permission and show message if not authorized
    if (!canViewReports) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        View and export sales reports
                    </p>
                </div>
                <div className="card p-12 text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Access Restricted
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">
                        Reports are available only for <strong>Manager</strong> and <strong>Admin</strong> roles.
                        <br />
                        Your current role is: <strong>{user?.role || 'Unknown'}</strong>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        View and export sales reports
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportCSV} className="btn btn-secondary" disabled={!reportData}>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export CSV
                    </button>
                    <button onClick={exportPDF} className="btn btn-primary" disabled={!reportData}>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Export PDF
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex gap-4">
                    {['daily', 'monthly', 'products'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === tab
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            {tab === 'daily' && 'Daily Sales'}
                            {tab === 'monthly' && 'Monthly Sales'}
                            {tab === 'products' && 'Product Performance'}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Date Filter */}
            <div className="card p-4">
                <div className="flex flex-wrap gap-4 items-end">
                    <div>
                        <label className="form-label">
                            {activeTab === 'monthly' ? 'Month' : 'Start Date'}
                        </label>
                        <input
                            type={activeTab === 'monthly' ? 'month' : 'date'}
                            value={activeTab === 'monthly' ? dateRange.start.substring(0, 7) : dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="form-input"
                        />
                    </div>
                    {activeTab === 'products' && (
                        <div>
                            <label className="form-label">End Date</label>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="form-input"
                            />
                        </div>
                    )}
                    <button onClick={fetchReport} className="btn btn-primary">
                        Generate Report
                    </button>
                </div>
            </div>

            {/* Report Content */}
            <div className="card">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : !reportData ? (
                    <div className="p-12 text-center">
                        <p className="text-gray-500 dark:text-gray-400">Select date range and generate report</p>
                    </div>
                ) : (
                    <div className="p-6">
                        {/* Summary Cards */}
                        {(activeTab === 'daily' || activeTab === 'monthly') && reportData.summary && (
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Sales</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {reportData.summary.total_sales || 0}
                                    </p>
                                </div>
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Revenue</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(reportData.summary.total_revenue)}
                                    </p>
                                </div>
                                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Tax</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(reportData.summary.total_tax)}
                                    </p>
                                </div>
                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Discount</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(reportData.summary.total_discount)}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Data Table */}
                        <div className="overflow-x-auto">
                            <table className="table">
                                <thead>
                                    <tr>
                                        {activeTab === 'products' ? (
                                            <>
                                                <th>Product</th>
                                                <th>SKU</th>
                                                <th>Qty Sold</th>
                                                <th>Revenue</th>
                                            </>
                                        ) : (
                                            <>
                                                <th>Date</th>
                                                <th>Sales</th>
                                                <th>Revenue</th>
                                                <th>Tax</th>
                                                <th>Discount</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeTab === 'products' ? (
                                        reportData.products?.map((row, index) => (
                                            <tr key={index}>
                                                <td className="font-medium text-gray-900 dark:text-white">{row.name}</td>
                                                <td className="text-gray-600 dark:text-gray-300">{row.sku}</td>
                                                <td className="text-gray-600 dark:text-gray-300">{row.quantity_sold}</td>
                                                <td className="font-semibold text-gray-900 dark:text-white">
                                                    {formatCurrency(row.revenue)}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        reportData.sales?.map((row, index) => (
                                            <tr key={index}>
                                                <td className="font-medium text-gray-900 dark:text-white">{row.date}</td>
                                                <td className="text-gray-600 dark:text-gray-300">{row.count}</td>
                                                <td className="font-semibold text-gray-900 dark:text-white">
                                                    {formatCurrency(row.revenue)}
                                                </td>
                                                <td className="text-gray-600 dark:text-gray-300">
                                                    {formatCurrency(row.tax)}
                                                </td>
                                                <td className="text-gray-600 dark:text-gray-300">
                                                    {formatCurrency(row.discount)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportsPage;

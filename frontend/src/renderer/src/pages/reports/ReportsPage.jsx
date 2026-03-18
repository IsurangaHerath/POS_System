/**
 * Reports Page Component
 * 
 * Displays sales and inventory reports with filtering and export capabilities.
 * Access is restricted to users with Manager or Admin roles.
 */

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

// Report type constants for consistency
const REPORT_TYPES = {
    DAILY: 'daily',
    MONTHLY: 'monthly',
    PRODUCTS: 'products'
};

// API endpoints for each report type
const REPORT_ENDPOINTS = {
    [REPORT_TYPES.DAILY]: '/reports/daily-sales',
    [REPORT_TYPES.MONTHLY]: '/reports/monthly-sales',
    [REPORT_TYPES.PRODUCTS]: '/reports/product-performance'
};

const ReportsPage = () => {
    // Context hooks for notifications and authorization
    const { showError } = useToast();
    const { hasMinRole, currentUser } = useAuth();

    // Authorization check - only managers and admins can view reports
    const canAccessReports = hasMinRole('manager');

    // State management
    const [selectedReportType, setSelectedReportType] = useState(REPORT_TYPES.DAILY);
    const [isLoading, setIsLoading] = useState(false);
    const [report, setReport] = useState(null);
    const [dateFilter, setDateFilter] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    /**
     * Fetches report data from the API based on selected report type and date filter.
     * Updates state with the retrieved data or shows an error notification on failure.
     */
    const fetchReportData = useCallback(async () => {
        setIsLoading(true);
        
        try {
            const endpoint = REPORT_ENDPOINTS[selectedReportType];
            const params = buildQueryParams(selectedReportType, dateFilter);
            
            const response = await api.get(endpoint, { params });
            setReport(response.data.data);
        } catch (error) {
            console.error('Failed to load report:', error);
            showError('Failed to load report. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [selectedReportType, dateFilter, showError]);

    /**
     * Builds query parameters based on the selected report type.
     * @param {string} reportType - The type of report (daily, monthly, products)
     * @param {Object} filter - Date filter object with startDate and endDate
     * @returns {Object} Query parameters for the API request
     */
    const buildQueryParams = (reportType, filter) => {
        switch (reportType) {
            case REPORT_TYPES.DAILY:
                return { date: filter.startDate };
            case REPORT_TYPES.MONTHLY:
                return { month: filter.startDate.substring(0, 7) };
            case REPORT_TYPES.PRODUCTS:
                return { 
                    start_date: filter.startDate, 
                    end_date: filter.endDate 
                };
            default:
                return {};
        }
    };

    // Fetch report when report type changes
    useEffect(() => {
        fetchReportData();
    }, [fetchReportData]);

    /**
     * Handles CSV export functionality.
     * Generates CSV content based on the current report type and triggers download.
     */
    const handleExportCSV = () => {
        if (!report) return;

        let csvContent = '';
        let filename = '';

        if (selectedReportType === REPORT_TYPES.DAILY || selectedReportType === REPORT_TYPES.MONTHLY) {
            csvContent = 'Date,Sales Count,Total Revenue,Total Tax,Total Discount\n';
            report.sales?.forEach(row => {
                csvContent += `${row.date},${row.count},${row.revenue},${row.tax},${row.discount}\n`;
            });
            filename = `${selectedReportType}_sales_report.csv`;
        } else if (selectedReportType === REPORT_TYPES.PRODUCTS) {
            csvContent = 'Product,SKU,Quantity Sold,Revenue\n';
            report.products?.forEach(row => {
                csvContent += `${row.name},${row.sku},${row.quantity_sold},${row.revenue}\n`;
            });
            filename = 'product_performance_report.csv';
        }

        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(downloadUrl);
    };

    /**
     * Handles PDF export functionality.
     * Generates HTML content and either uses Electron's PDF printing or opens a print window.
     */
    const handleExportPDF = async () => {
        if (!report) return;

        const reportTitle = selectedReportType.charAt(0).toUpperCase() + selectedReportType.slice(1);
        const tableHtml = generateReportTableHTML();

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${reportTitle} Report</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        padding: 20px; 
                        color: #333;
                    }
                    h1 { 
                        color: #1a1a1a; 
                        margin-bottom: 10px;
                    }
                    .meta { 
                        color: #666; 
                        margin-bottom: 20px;
                        font-size: 14px;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-top: 20px;
                    }
                    th, td { 
                        border: 1px solid #ddd; 
                        padding: 10px; 
                        text-align: left;
                    }
                    th { 
                        background-color: #f5f5f5; 
                        font-weight: bold;
                    }
                    tr:nth-child(even) {
                        background-color: #fafafa;
                    }
                </style>
            </head>
            <body>
                <h1>${reportTitle} Report</h1>
                <p class="meta">Generated on: ${new Date().toLocaleString()}</p>
                ${tableHtml}
            </body>
            </html>
        `;

        // Check if running in Electron environment with PDF support
        if (window.electron?.print?.pdf) {
            await window.electron.print.pdf(htmlContent);
        } else {
            // Fallback: Open print window
            const printWindow = window.open('', '_blank');
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            printWindow.print();
        }
    };

    /**
     * Generates HTML table markup for the current report data.
     * Used for both display in the UI and PDF export.
     * @returns {string} HTML string of the report table
     */
    const generateReportTableHTML = () => {
        if (!report) return '';

        if (selectedReportType === REPORT_TYPES.DAILY || selectedReportType === REPORT_TYPES.MONTHLY) {
            return `
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Sales</th>
                            <th>Revenue</th>
                            <th>Tax</th>
                            <th>Discount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.sales?.map(row => `
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

        if (selectedReportType === REPORT_TYPES.PRODUCTS) {
            return `
                <table>
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>SKU</th>
                            <th>Qty Sold</th>
                            <th>Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.products?.map(row => `
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

    /**
     * Formats a numeric amount as USD currency.
     * @param {number} amount - The amount to format
     * @returns {string} Formatted currency string
     */
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    /**
     * Renders the unauthorized access view for users without sufficient permissions.
     */
    if (!canAccessReports) {
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
                        Your current role is: <strong>{currentUser?.role || 'Unknown'}</strong>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        View and export sales reports
                    </p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleExportCSV} 
                        className="btn btn-secondary" 
                        disabled={!report || isLoading}
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export CSV
                    </button>
                    <button 
                        onClick={handleExportPDF} 
                        className="btn btn-primary" 
                        disabled={!report || isLoading}
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Export PDF
                    </button>
                </div>
            </div>

            {/* Report Type Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex gap-4">
                    {Object.values(REPORT_TYPES).map((reportType) => (
                        <button
                            key={reportType}
                            onClick={() => setSelectedReportType(reportType)}
                            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                                selectedReportType === reportType
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            {reportType === REPORT_TYPES.DAILY && 'Daily Sales'}
                            {reportType === REPORT_TYPES.MONTHLY && 'Monthly Sales'}
                            {reportType === REPORT_TYPES.PRODUCTS && 'Product Performance'}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Date Filter Controls */}
            <div className="card p-4">
                <div className="flex flex-wrap gap-4 items-end">
                    <div>
                        <label className="form-label">
                            {selectedReportType === REPORT_TYPES.MONTHLY ? 'Month' : 'Start Date'}
                        </label>
                        <input
                            type={selectedReportType === REPORT_TYPES.MONTHLY ? 'month' : 'date'}
                            value={
                                selectedReportType === REPORT_TYPES.MONTHLY 
                                    ? dateFilter.startDate.substring(0, 7) 
                                    : dateFilter.startDate
                            }
                            onChange={(e) => setDateFilter(prev => ({ 
                                ...prev, 
                                startDate: e.target.value 
                            }))}
                            className="form-input"
                        />
                    </div>
                    {selectedReportType === REPORT_TYPES.PRODUCTS && (
                        <div>
                            <label className="form-label">End Date</label>
                            <input
                                type="date"
                                value={dateFilter.endDate}
                                onChange={(e) => setDateFilter(prev => ({ 
                                    ...prev, 
                                    endDate: e.target.value 
                                }))}
                                className="form-input"
                            />
                        </div>
                    )}
                    <button 
                        onClick={fetchReportData} 
                        className="btn btn-primary"
                        disabled={isLoading}
                    >
                        Generate Report
                    </button>
                </div>
            </div>

            {/* Report Content Area */}
            <div className="card">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : !report ? (
                    <div className="p-12 text-center">
                        <p className="text-gray-500 dark:text-gray-400">
                            Select date range and generate report
                        </p>
                    </div>
                ) : (
                    <div className="p-6">
                        {/* Summary Cards - Only show for daily/monthly reports */}
                        {(selectedReportType === REPORT_TYPES.DAILY || selectedReportType === REPORT_TYPES.MONTHLY) && report.summary && (
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Sales</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {report.summary.total_sales || 0}
                                    </p>
                                </div>
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Revenue</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(report.summary.total_revenue)}
                                    </p>
                                </div>
                                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Tax</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(report.summary.total_tax)}
                                    </p>
                                </div>
                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Discount</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(report.summary.total_discount)}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Report Data Table */}
                        <div className="overflow-x-auto">
                            <table className="table">
                                <thead>
                                    <tr>
                                        {selectedReportType === REPORT_TYPES.PRODUCTS ? (
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
                                    {selectedReportType === REPORT_TYPES.PRODUCTS ? (
                                        report.products?.map((row, index) => (
                                            <tr key={index}>
                                                <td className="font-medium text-gray-900 dark:text-white">
                                                    {row.name}
                                                </td>
                                                <td className="text-gray-600 dark:text-gray-300">
                                                    {row.sku}
                                                </td>
                                                <td className="text-gray-600 dark:text-gray-300">
                                                    {row.quantity_sold}
                                                </td>
                                                <td className="font-semibold text-gray-900 dark:text-white">
                                                    {formatCurrency(row.revenue)}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        report.sales?.map((row, index) => (
                                            <tr key={index}>
                                                <td className="font-medium text-gray-900 dark:text-white">
                                                    {row.date}
                                                </td>
                                                <td className="text-gray-600 dark:text-gray-300">
                                                    {row.count}
                                                </td>
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

/**
 * Reports Page Component
 * Displays sales and inventory reports with export capabilities.
 * Access is restricted to users with Manager or Admin roles.
 */

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const REPORT_TYPES = {
    DAILY: 'daily',
    MONTHLY: 'monthly'
};

const REPORT_ENDPOINTS = {
    [REPORT_TYPES.DAILY]: '/reports/daily-sales',
    [REPORT_TYPES.MONTHLY]: '/reports/monthly-sales'
};

const ReportsPage = () => {
    const { error } = useToast();
    const { hasMinRole, currentUser } = useAuth();
    const { formatPrice, convertPrice, currencySettings } = useCurrency();

    const canAccessReports = hasMinRole('manager');

    const [selectedReportType, setSelectedReportType] = useState(REPORT_TYPES.DAILY);
    const [isLoading, setIsLoading] = useState(false);
    const [report, setReport] = useState(null);
    const [dateFilter, setDateFilter] = useState({
        startDate: new Date().toISOString().split('T')[0]
    });

    // Normalize date value for input based on report type
    const getDateInputValue = () => {
        if (selectedReportType === REPORT_TYPES.MONTHLY) {
            // For month picker, ensure value is in YYYY-MM format
            const monthRegex = /^\d{4}-\d{2}$/;
            if (monthRegex.test(dateFilter.startDate)) {
                return dateFilter.startDate;
            }
            // If it's a full date, extract YYYY-MM
            if (dateFilter.startDate.includes('-') && dateFilter.startDate.length > 7) {
                return dateFilter.startDate.substring(0, 7);
            }
            // Fallback: use current year-month
            return new Date().toISOString().substring(0, 7);
        } else {
            // For date picker, ensure value is in YYYY-MM-DD format
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (dateRegex.test(dateFilter.startDate)) {
                return dateFilter.startDate;
            }
            // If it's just YYYY-MM, default to first of month
            if (dateFilter.startDate.length === 7) {
                return dateFilter.startDate + '-01';
            }
            // Fallback: use current date
            return new Date().toISOString().split('T')[0];
        }
    };

    const handleDateChange = (value) => {
        if (selectedReportType === REPORT_TYPES.MONTHLY) {
            // Ensure value is in YYYY-MM format for month picker
            if (/^\d{4}-\d{2}$/.test(value)) {
                setDateFilter({ startDate: value });
            } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                // Extract YYYY-MM from full date
                setDateFilter({ startDate: value.substring(0, 7) });
            }
        } else {
            // For daily report, ensure value is in YYYY-MM-DD format
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                setDateFilter({ startDate: value });
            }
        }
    };

    const fetchReportData = useCallback(async () => {
        setIsLoading(true);
        setReport(null);
        
        try {
            const endpoint = REPORT_ENDPOINTS[selectedReportType];
            const params = {};
            
            if (selectedReportType === REPORT_TYPES.DAILY) {
                params.date = dateFilter.startDate;
            } else if (selectedReportType === REPORT_TYPES.MONTHLY) {
                params.month = dateFilter.startDate.substring(0, 7);
            }

            const response = await api.get(endpoint, { params });
            setReport(response.data.data);
        } catch (err) {
            error('Failed to load report. Please try again.');
            setReport(null);
        } finally {
            setIsLoading(false);
        }
    }, [selectedReportType, dateFilter, error]);

    useEffect(() => {
        fetchReportData();
    }, [fetchReportData]);

    const handleExportCSV = () => {
        if (!report) {
            error('No report data to export.');
            return;
        }

        const exportData = report.individual_sales && report.individual_sales.length > 0 
            ? report.individual_sales 
            : report.sales;

        if (!exportData || exportData.length === 0) {
            error('No sales data available to export.');
            return;
        }

        const csvContent = 'Invoice,Date,Items,Revenue,Tax,Discount,Payment,Cashier\n' +
            exportData.map(row => 
                `${row.invoice_number || ''},${row.date || ''},${row.item_count || row.count || 0},${row.revenue || 0},${row.tax || 0},${row.discount || 0},${row.payment_method || ''},${row.cashier_name || ''}`
            ).join('\n');

        const filename = `${selectedReportType}_sales_report.csv`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(downloadUrl);
    };

    const handleExportPDF = async () => {
        if (!report) {
            error('No report data to export.');
            return;
        }

        const exportData = report.individual_sales && report.individual_sales.length > 0 
            ? report.individual_sales 
            : report.sales;

        if (!exportData || exportData.length === 0) {
            error('No data available to export.');
            return;
        }

        const reportTitle = selectedReportType === REPORT_TYPES.DAILY ? 'Daily Sales Report' : 'Monthly Sales Report';
        const dateRange = selectedReportType === REPORT_TYPES.DAILY 
            ? `Date: ${dateFilter.startDate}`
            : `Month: ${dateFilter.startDate.substring(0, 7)}`;
        
        // Check if we have individual sales data
        const hasIndividualSales = report.individual_sales && report.individual_sales.length > 0;
        
        // Create PDF document
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(18);
        doc.text(reportTitle, 14, 20);
        
        // Add date and generation info
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(dateRange, 14, 28);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 34);
        
        // Add summary section
        if (report.summary) {
            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.text('Summary', 14, 46);
            
            doc.setFontSize(10);
            doc.setTextColor(60);
            const summaryY = 54;
            const totalTransactions = report.summary.total_transactions || report.summary.total_count || 0;
            const totalSales = report.summary.total_sales || report.summary.total_revenue || 0;
            const totalTax = report.summary.total_tax || 0;
            const totalDiscount = report.summary.total_discount || 0;
            
            doc.text(`Total Transactions: ${totalTransactions}`, 14, summaryY);
            doc.text(`Total Revenue: ${formatCurrency(totalSales)}`, 14, summaryY + 6);
            doc.text(`Total Tax: ${formatCurrency(totalTax)}`, 14, summaryY + 12);
            doc.text(`Total Discount: ${formatCurrency(totalDiscount)}`, 14, summaryY + 18);
            
            // Add comparison if available
            if (report.comparison) {
                const compY = summaryY + 28;
                doc.text(`Compared to: ${report.comparison.previous_period}`, 14, compY);
                const revenueChange = parseFloat(report.comparison.revenue_change_percent) || 0;
                const transactionChange = parseFloat(report.comparison.transaction_change_percent) || 0;
                doc.text(`Revenue Change: ${revenueChange >= 0 ? '+' : ''}${report.comparison.revenue_change_percent}%`, 14, compY + 6);
                doc.text(`Transaction Change: ${transactionChange >= 0 ? '+' : ''}${report.comparison.transaction_change_percent}%`, 14, compY + 12);
            }
        }
        
        // Prepare table data
        let tableData = [];
        let tableColumns = [];
        
        if (hasIndividualSales) {
            tableColumns = [
                { header: 'Invoice', dataKey: 'invoice_number' },
                { header: 'Date', dataKey: 'date' },
                { header: 'Items', dataKey: 'item_count' },
                { header: 'Revenue', dataKey: 'revenue' },
                { header: 'Tax', dataKey: 'tax' },
                { header: 'Discount', dataKey: 'discount' },
                { header: 'Payment', dataKey: 'payment_method' },
                { header: 'Cashier', dataKey: 'cashier_name' }
            ];
            
            tableData = exportData.map(row => ({
                invoice_number: row.invoice_number || '',
                date: row.date || '',
                item_count: row.item_count || 0,
                revenue: formatCurrency(row.revenue || 0),
                tax: formatCurrency(row.tax || 0),
                discount: formatCurrency(row.discount || 0),
                payment_method: row.payment_method || '',
                cashier_name: row.cashier_name || ''
            }));
        } else {
            // Monthly data (aggregated)
            tableColumns = [
                { header: 'Date', dataKey: 'date' },
                { header: 'Total Sales', dataKey: 'total_sales' },
                { header: 'Revenue', dataKey: 'revenue' },
                { header: 'Tax', dataKey: 'tax' },
                { header: 'Discount', dataKey: 'discount' }
            ];
            
            tableData = exportData.map(row => ({
                date: row.date || '',
                total_sales: row.count || row.sales_count || 0,
                revenue: formatCurrency(row.revenue || 0),
                tax: formatCurrency(row.tax || 0),
                discount: formatCurrency(row.discount || 0)
            }));
        }
        
        // Add table to PDF
        autoTable(doc, {
            head: [tableColumns.map(col => col.header)],
            body: tableData.map(row => tableColumns.map(col => row[col.dataKey])),
            startY: report.summary ? 100 : 50,
            theme: 'striped',
            headStyles: {
                fillColor: [66, 135, 245],
                textColor: 255,
                fontSize: 9,
                fontStyle: 'bold'
            },
            bodyStyles: {
                fontSize: 8
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            margin: { top: 50, right: 14, bottom: 14, left: 14 }
        });
        
        // Generate filename and download
        const filename = `${selectedReportType}_sales_report_${dateFilter.startDate}.pdf`;
        doc.save(filename);
    };

    const formatCurrency = (amount) => {
        // Convert from USD base to current currency
        const converted = convertPrice(amount || 0);
        return `${currencySettings.currency_symbol}${converted.toFixed(2)}`;
    };

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

            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex gap-4">
                    <button
                        onClick={() => setSelectedReportType(REPORT_TYPES.DAILY)}
                        className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                            selectedReportType === REPORT_TYPES.DAILY
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        Daily Sales
                    </button>
                    <button
                        onClick={() => setSelectedReportType(REPORT_TYPES.MONTHLY)}
                        className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                            selectedReportType === REPORT_TYPES.MONTHLY
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        Monthly Sales
                    </button>
                </nav>
            </div>

            <div className="card p-4">
                <div className="flex flex-wrap gap-4 items-end">
                    <div>
                        <label className="form-label">
                            {selectedReportType === REPORT_TYPES.MONTHLY ? 'Month' : 'Date'}
                        </label>
                        <input
                            type={selectedReportType === REPORT_TYPES.MONTHLY ? 'month' : 'date'}
                            value={getDateInputValue()}
                            onChange={(e) => handleDateChange(e.target.value)}
                            className="form-input"
                        />
                    </div>
                </div>
            </div>

            <div className="card">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : !report ? (
                    <div className="p-12 text-center">
                        <p className="text-gray-500 dark:text-gray-400">
                            Loading report data...
                        </p>
                    </div>
                ) : (
                    <div className="p-6">
                        {report.comparison && (
                            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Compared to {report.comparison.previous_period}
                                        </p>
                                    </div>
                                    <div className="flex gap-6">
                                        <div className="text-center">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Revenue Change</p>
                                            <p className={`text-lg font-bold ${parseFloat(report.comparison.revenue_change_percent) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {report.comparison.revenue_change_percent >= 0 ? '+' : ''}{report.comparison.revenue_change_percent}%
                                            </p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Transaction Change</p>
                                            <p className={`text-lg font-bold ${parseFloat(report.comparison.transaction_change_percent) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {report.comparison.transaction_change_percent >= 0 ? '+' : ''}{report.comparison.transaction_change_percent}%
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {report.summary && (
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Sales</p>
                                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                        {report.summary.total_transactions || report.summary.total_count || 0}
                                    </p>
                                </div>
                                <div className="p-4 bg-green-50 dark:bg-green-900 rounded-lg">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                        {formatCurrency(report.summary.total_sales || report.summary.total_revenue)}
                                    </p>
                                </div>
                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Tax</p>
                                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                        {formatCurrency(report.summary.total_tax || 0)}
                                    </p>
                                </div>
                                <div className="p-4 bg-red-50 dark:bg-red-900 rounded-lg">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Discount</p>
                                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                                        {formatCurrency(report.summary.total_discount || 0)}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Invoice
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Items
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Revenue
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Tax
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Discount
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Payment
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Cashier
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                    {(report.individual_sales && report.individual_sales.length > 0) ? (
                                        report.individual_sales.map((row, index) => (
                                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">
                                                    {row.invoice_number}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                    {row.date}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                    {row.item_count || 0}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                    {formatCurrency(row.revenue)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                    {formatCurrency(row.tax)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                    {formatCurrency(row.discount)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className={`badge ${row.payment_method === 'cash' ? 'badge-success' : row.payment_method === 'card' ? 'badge-primary' : 'badge-gray'}`}>
                                                        {row.payment_method}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                                    {row.cashier_name}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                                No sales records found
                                            </td>
                                        </tr>
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

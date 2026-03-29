/**
 * Recent Sales Component
 * 
 * Displays list of recent sales transactions
 */

import React from 'react';
import { Link } from 'react-router-dom';

const RecentSales = ({ sales, formatCurrency }) => {
    // Sample data if no data provided
    const recentSales = sales.length > 0 ? sales : [
        { id: 1, invoice_number: 'INV-001', total_amount: 125.50, payment_method: 'cash', created_at: new Date(), status: 'completed' },
        { id: 2, invoice_number: 'INV-002', total_amount: 89.99, payment_method: 'card', created_at: new Date(Date.now() - 3600000), status: 'completed' },
        { id: 3, invoice_number: 'INV-003', total_amount: 245.00, payment_method: 'cash', created_at: new Date(Date.now() - 7200000), status: 'completed' },
        { id: 4, invoice_number: 'INV-004', total_amount: 67.25, payment_method: 'card', created_at: new Date(Date.now() - 10800000), status: 'completed' }
    ];

    // Format time
    const formatTime = (date) => {
        const now = new Date();
        const saleDate = new Date(date);
        const diffMs = now - saleDate;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return saleDate.toLocaleDateString();
    };

    // Get payment method icon
    const getPaymentIcon = (method) => {
        switch (method) {
            case 'cash':
                return (
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                );
            case 'card':
                return (
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                    </div>
                );
            default:
                return (
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                );
        }
    };

    return (
        <div className="card h-full">
            <div className="card-header flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Recent Sales
                </h3>
                <Link
                    to="/sales"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                    View All
                </Link>
            </div>
            <div className="card-body p-0">
                {recentSales.length === 0 ? (
                    <div className="p-6 text-center">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">No recent sales</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {recentSales.map((sale) => (
                            <Link
                                key={sale.id}
                                to={`/sales/${sale.id}`}
                                className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    {getPaymentIcon(sale.payment_method)}
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {sale.invoice_number}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {formatTime(sale.sale_date || sale.created_at)}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                        {formatCurrency(sale.total_amount)}
                                    </p>
                                    <span className="badge badge-success text-xs">
                                        {sale.status || 'completed'}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecentSales;

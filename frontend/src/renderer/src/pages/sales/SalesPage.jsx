/**
 * Sales Page
 * 
 * List of all sales with search, filter, and details
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useCurrency } from '../../context/CurrencyContext';

// Components
import Pagination from '../../components/common/Pagination';

const SalesPage = () => {
    const { success, error } = useToast();

    const [sales, setSales] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [paymentFilter, setPaymentFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const itemsPerPage = 15;

    // Fetch sales
    const fetchSales = useCallback(async () => {
        try {
            setIsLoading(true);
            const params = {
                page: currentPage,
                limit: itemsPerPage,
                search: searchTerm,
                payment_method: paymentFilter,
                start_date: dateFilter.start,
                end_date: dateFilter.end
            };

            const response = await api.get('/sales', { params });

            setSales(response.data.data || []);
            setTotalPages(response.data.pagination?.totalPages || 1);
            setTotalItems(response.data.pagination?.totalItems || 0);
        } catch (err) {
            console.error('Failed to fetch sales:', err);
            error('Failed to load sales');
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, searchTerm, paymentFilter, dateFilter, error]);

    useEffect(() => {
        fetchSales();
    }, [fetchSales]);

    const { formatPrice } = useCurrency();
    
    // Format currency using the global currency context
    const formatCurrency = (amount) => {
        return formatPrice(amount || 0);
    };

    // Format date
    const formatDate = (date) => {
        return new Date(date).toLocaleString();
    };

    // Get payment method badge
    const getPaymentBadge = (method) => {
        const badges = {
            cash: 'badge-success',
            card: 'badge-primary'
        };
        return badges[method] || 'badge-gray';
    };

    // Get status badge
    const getStatusBadge = (status) => {
        const badges = {
            completed: 'badge-success',
            pending: 'badge-warning',
            cancelled: 'badge-danger'
        };
        return badges[status] || 'badge-gray';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {totalItems} sales records
                    </p>
                </div>
                <Link to="/pos" className="btn btn-primary">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Sale
                </Link>
            </div>

            {/* Filters */}
            <div className="card p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search invoice..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="form-input pl-10"
                        />
                    </div>

                    {/* Payment method filter */}
                    <select
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value)}
                        className="form-input"
                    >
                        <option value="">All Payments</option>
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                    </select>

                    {/* Date range */}
                    <input
                        type="date"
                        value={dateFilter.start}
                        onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                        className="form-input"
                        placeholder="Start date"
                    />
                    <input
                        type="date"
                        value={dateFilter.end}
                        onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                        className="form-input"
                        placeholder="End date"
                    />
                </div>
            </div>

            {/* Sales Table */}
            <div className="card overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : sales.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                        <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p>No sales found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Invoice</th>
                                    <th>Date</th>
                                    <th>Items</th>
                                    <th>Subtotal</th>
                                    <th>Tax</th>
                                    <th>Total</th>
                                    <th>Payment</th>
                                    <th>Amount Received</th>
                                    <th>Change</th>
                                    <th>Status</th>
                                    <th>Cashier</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.map((sale) => (
                                    <tr key={sale.id}>
                                        <td>
                                            <span className="font-medium text-blue-600 dark:text-blue-400">
                                                {sale.invoice_number}
                                            </span>
                                        </td>
                                        <td className="text-gray-600 dark:text-gray-300">
                                            {formatDate(sale.created_at)}
                                        </td>
                                        <td className="text-gray-600 dark:text-gray-300">
                                            {sale.item_count || sale.items?.length || 0} items
                                        </td>
                                        <td className="text-gray-600 dark:text-gray-300">
                                            {formatCurrency(sale.subtotal)}
                                        </td>
                                        <td className="text-gray-600 dark:text-gray-300">
                                            {formatCurrency(sale.tax_amount)}
                                        </td>
                                        <td className="font-semibold text-gray-900 dark:text-white">
                                            {formatCurrency(sale.total_amount)}
                                        </td>
                                        <td>
                                            <span className={`badge ${getPaymentBadge(sale.payment_method)}`}>
                                                {sale.payment_method}
                                            </span>
                                        </td>
                                        <td className="text-gray-600 dark:text-gray-300">
                                            {sale.payment_method === 'cash' ? formatCurrency(sale.amount_paid) : '-'}
                                        </td>
                                        <td className="text-gray-600 dark:text-gray-300">
                                            {sale.payment_method === 'cash' ? formatCurrency(sale.change_amount) : '-'}
                                        </td>
                                        <td>
                                            <span className={`badge ${getStatusBadge(sale.status)}`}>
                                                {sale.status}
                                            </span>
                                        </td>
                                        <td className="text-gray-600 dark:text-gray-300">
                                            {sale.cashier_name || '-'}
                                        </td>
                                        <td className="text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <Link
                                                    to={`/sales/${sale.id}`}
                                                    className="text-blue-600 dark:text-blue-400 hover:underline"
                                                >
                                                    View Bill
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default SalesPage;

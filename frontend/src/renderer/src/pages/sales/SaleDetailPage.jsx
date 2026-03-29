/**
 * Sale Detail Page
 * 
 * Detailed view of a single sale/invoice
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useCurrency } from '../../context/CurrencyContext';

const SaleDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { error } = useToast();

    const [sale, setSale] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch sale details
    useEffect(() => {
        const fetchSale = async () => {
            try {
                setIsLoading(true);
                const response = await api.get(`/sales/${id}`);
                setSale(response.data.data);
            } catch (err) {
                error('Failed to load sale details');
                navigate('/sales');
            } finally {
                setIsLoading(false);
            }
        };

        fetchSale();
    }, [id, error, navigate]);

    const { formatPrice } = useCurrency();

    // Format currency using the global currency context
    const formatCurrency = (amount) => {
        return formatPrice(amount || 0);
    };

    // Format date
    const formatDate = (date) => {
        return new Date(date).toLocaleString();
    };

    // Print invoice
    const printInvoice = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!sale) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Sale not found</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between no-print">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Invoice {sale.invoice_number}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {formatDate(sale.created_at)}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => navigate('/sales')} className="btn btn-secondary">
                        Back to Sales
                    </button>
                    <button onClick={printInvoice} className="btn btn-primary">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print
                    </button>
                </div>
            </div>

            {/* Invoice Card */}
            <div className="card">
                {/* Invoice Header */}
                <div className="card-header flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">POS System</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Your Store Name</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Invoice Number</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{sale.invoice_number}</p>
                    </div>
                </div>

                {/* Invoice Details */}
                <div className="card-body space-y-6">
                    {/* Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                            <p className="font-medium text-gray-900 dark:text-white">{formatDate(sale.created_at)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Cashier</p>
                            <p className="font-medium text-gray-900 dark:text-white">{sale.cashier_name || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Payment Method</p>
                            <p className="font-medium text-gray-900 dark:text-white uppercase">{sale.payment_method}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                            <span className={`badge ${sale.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                                {sale.status}
                            </span>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th className="text-center">Qty</th>
                                    <th className="text-right">Unit Price</th>
                                    <th className="text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sale.items?.map((item, index) => (
                                    <tr key={index}>
                                        <td>
                                            <p className="font-medium text-gray-900 dark:text-white">{item.product_name}</p>
                                            {item.product_sku && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400">SKU: {item.product_sku}</p>
                                            )}
                                        </td>
                                        <td className="text-center text-gray-600 dark:text-gray-300">{item.quantity}</td>
                                        <td className="text-right text-gray-600 dark:text-gray-300">{formatCurrency(item.unit_price)}</td>
                                        <td className="text-right font-medium text-gray-900 dark:text-white">
                                            {formatCurrency(item.quantity * item.unit_price)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end">
                        <div className="w-64 space-y-2">
                            <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                <span>Subtotal</span>
                                <span>{formatCurrency(sale.subtotal)}</span>
                            </div>
                            {sale.discount_amount > 0 && (
                                <div className="flex justify-between text-green-600 dark:text-green-400">
                                    <span>Discount</span>
                                    <span>-{formatCurrency(sale.discount_amount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                <span>Tax</span>
                                <span>{formatCurrency(sale.tax_amount)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
                                <span>Total</span>
                                <span>{formatCurrency(sale.total_amount)}</span>
                            </div>
                            {sale.payment_method === 'cash' && (
                                <>
                                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                        <span>Amount Received</span>
                                        <span>{formatCurrency(sale.amount_paid)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                        <span>Change</span>
                                        <span>{formatCurrency(sale.change_amount)}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="card-footer text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Thank you for your purchase!</p>
                </div>
            </div>
        </div>
    );
};

export default SaleDetailPage;

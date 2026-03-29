/**
 * Purchase Orders Page
 * 
 * Manage purchase orders from suppliers
 */

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useCurrency } from '../../context/CurrencyContext';

// Components
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';

const PurchaseOrdersPage = () => {
    const { hasMinRole } = useAuth();
    const { success, error } = useToast();

    const [orders, setOrders] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [orderItems, setOrderItems] = useState([{ product_id: '', quantity: 1, unit_cost: '' }]);
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canCreate = hasMinRole('manager');

    // Fetch data
    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [ordersRes, suppliersRes, productsRes] = await Promise.all([
                api.get('/purchase-orders', { params: { page: currentPage, status: statusFilter } }),
                api.get('/suppliers', { params: { limit: 100 } }),
                api.get('/products', { params: { limit: 100 } })
            ]);
            setOrders(ordersRes.data.data || []);
            setTotalPages(ordersRes.data.pagination?.totalPages || 1);
            setSuppliers(suppliersRes.data.data || []);
            setProducts(productsRes.data.data || []);
        } catch (err) {
            error('Failed to load data');
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, statusFilter, error]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Add order item
    const addOrderItem = () => {
        setOrderItems([...orderItems, { product_id: '', quantity: 1, unit_cost: '' }]);
    };

    // Remove order item
    const removeOrderItem = (index) => {
        setOrderItems(orderItems.filter((_, i) => i !== index));
    };

    // Update order item
    const updateOrderItem = (index, field, value) => {
        const updated = [...orderItems];
        updated[index][field] = value;

        // Auto-fill unit cost when product is selected
        if (field === 'product_id') {
            const product = products.find(p => p.id === parseInt(value));
            if (product) {
                updated[index].unit_cost = product.cost_price || '';
            }
        }

        setOrderItems(updated);
    };

    // Calculate total
    const calculateTotal = () => {
        return orderItems.reduce((sum, item) => {
            return sum + (item.quantity * parseFloat(item.unit_cost || 0));
        }, 0);
    };

    // Create purchase order
    const handleCreateOrder = async () => {
        if (!selectedSupplier) {
            error('Please select a supplier');
            return;
        }

        const validItems = orderItems.filter(item => item.product_id && item.quantity > 0);
        if (validItems.length === 0) {
            error('Please add at least one item');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/purchase-orders', {
                supplier_id: selectedSupplier,
                items: validItems.map(item => ({
                    product_id: parseInt(item.product_id),
                    quantity: parseInt(item.quantity),
                    unit_cost: parseFloat(item.unit_cost)
                }))
            });
            success('Purchase order created successfully');
            setShowModal(false);
            setOrderItems([{ product_id: '', quantity: 1, unit_cost: '' }]);
            setSelectedSupplier('');
            fetchData();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to create order');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Update order status
    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            await api.put(`/purchase-orders/${orderId}/status`, { status: newStatus });
            success('Order status updated');
            fetchData();
        } catch (err) {
            error('Failed to update status');
        }
    };

    // Get status badge
    const getStatusBadge = (status) => {
        const badges = {
            pending: 'badge-warning',
            ordered: 'badge-primary',
            received: 'badge-success',
            cancelled: 'badge-danger'
        };
        return badges[status] || 'badge-gray';
    };

    const { formatPrice } = useCurrency();

    // Format currency using global currency context
    const formatCurrency = (amount) => {
        return formatPrice(amount || 0);
    };

    // Format date
    const formatDate = (date) => {
        return new Date(date).toLocaleDateString();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Purchase Orders</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Manage orders from suppliers
                    </p>
                </div>
                {canCreate && (
                    <button onClick={() => setShowModal(true)} className="btn btn-primary">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Order
                    </button>
                )}
            </div>

            {/* Filter */}
            <div className="card p-4">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="form-input w-48"
                >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="ordered">Ordered</option>
                    <option value="received">Received</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>

            {/* Orders Table */}
            <div className="card overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="p-12 text-center">
                        <p className="text-gray-500 dark:text-gray-400">No purchase orders found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Order #</th>
                                    <th>Supplier</th>
                                    <th>Date</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order) => (
                                    <tr key={order.id}>
                                        <td className="font-medium text-gray-900 dark:text-white">
                                            PO-{String(order.id).padStart(4, '0')}
                                        </td>
                                        <td className="text-gray-600 dark:text-gray-300">
                                            {order.supplier_name}
                                        </td>
                                        <td className="text-gray-600 dark:text-gray-300">
                                            {formatDate(order.order_date)}
                                        </td>
                                        <td className="font-semibold text-gray-900 dark:text-white">
                                            {formatCurrency(order.total_amount)}
                                        </td>
                                        <td>
                                            <span className={`badge ${getStatusBadge(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            {order.status === 'pending' && canCreate && (
                                                <button
                                                    onClick={() => updateOrderStatus(order.id, 'ordered')}
                                                    className="btn btn-primary btn-sm"
                                                >
                                                    Mark Ordered
                                                </button>
                                            )}
                                            {order.status === 'ordered' && canCreate && (
                                                <button
                                                    onClick={() => updateOrderStatus(order.id, 'received')}
                                                    className="btn btn-success btn-sm"
                                                >
                                                    Mark Received
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

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

            {/* Create Order Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Create Purchase Order"
                size="xl"
            >
                <div className="p-6 space-y-4">
                    {/* Supplier Selection */}
                    <div>
                        <label className="form-label">Supplier *</label>
                        <select
                            value={selectedSupplier}
                            onChange={(e) => setSelectedSupplier(e.target.value)}
                            className="form-input"
                        >
                            <option value="">Select supplier</option>
                            {suppliers.map((supplier) => (
                                <option key={supplier.id} value={supplier.id}>
                                    {supplier.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Order Items */}
                    <div>
                        <label className="form-label">Items</label>
                        <div className="space-y-2">
                            {orderItems.map((item, index) => (
                                <div key={index} className="flex gap-2 items-center">
                                    <select
                                        value={item.product_id}
                                        onChange={(e) => updateOrderItem(index, 'product_id', e.target.value)}
                                        className="form-input flex-1"
                                    >
                                        <option value="">Select product</option>
                                        {products.map((product) => (
                                            <option key={product.id} value={product.id}>
                                                {product.name} (Stock: {product.stock_quantity})
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => updateOrderItem(index, 'quantity', e.target.value)}
                                        min="1"
                                        className="form-input w-24"
                                        placeholder="Qty"
                                    />
                                    <input
                                        type="number"
                                        value={item.unit_cost}
                                        onChange={(e) => updateOrderItem(index, 'unit_cost', e.target.value)}
                                        step="0.01"
                                        className="form-input w-28"
                                        placeholder="Cost"
                                    />
                                    {orderItems.length > 1 && (
                                        <button
                                            onClick={() => removeOrderItem(index)}
                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={addOrderItem}
                            className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            + Add Item
                        </button>
                    </div>

                    {/* Total */}
                    <div className="flex justify-end">
                        <div className="text-right">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Amount</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                                {formatCurrency(calculateTotal())}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button onClick={() => setShowModal(false)} className="btn btn-secondary">
                            Cancel
                        </button>
                        <button
                            onClick={handleCreateOrder}
                            className="btn btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Creating...' : 'Create Order'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default PurchaseOrdersPage;

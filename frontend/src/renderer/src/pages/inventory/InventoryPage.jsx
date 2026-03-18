/**
 * Inventory Page
 * 
 * Stock management with adjustments and history
 */

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

// Components
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';

const InventoryPage = () => {
    const { hasMinRole } = useAuth();
    const { success, error } = useToast();

    const [inventory, setInventory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [stockFilter, setStockFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Modal states
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [adjustingProduct, setAdjustingProduct] = useState(null);
    const [adjustmentData, setAdjustmentData] = useState({
        type: 'in',
        quantity: '',
        reason: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canAdjust = hasMinRole('manager');

    // Fetch inventory
    const fetchInventory = useCallback(async () => {
        try {
            setIsLoading(true);
            const params = {
                page: currentPage,
                search: searchTerm
            };

            // Add low_stock filter if selected
            if (stockFilter === 'low') {
                params.low_stock = 'true';
            }

            const response = await api.get('/inventory', { params });
            // Map backend field names to frontend expected names
            const inventoryData = (response.data.data || []).map(item => ({
                id: item.product_id,
                name: item.product_name,
                sku: item.sku,
                barcode: item.barcode,
                stock_quantity: item.quantity_in_stock,
                min_stock_level: item.reorder_level,
                unit: 'piece',
                updated_at: item.last_stock_check,
                stock_status: item.stock_status
            }));
            setInventory(inventoryData);
            setTotalPages(response.data.pagination?.totalPages || 1);
        } catch (err) {
            console.error('Inventory fetch error:', err);
            error('Failed to load inventory: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, searchTerm, stockFilter, error]);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    // Open adjust modal
    const handleAdjust = (product) => {
        setAdjustingProduct(product);
        setAdjustmentData({ type: 'in', quantity: '', reason: '' });
        setShowAdjustModal(true);
    };

    // Submit adjustment
    const handleAdjustmentSubmit = async () => {
        if (!adjustmentData.quantity || adjustmentData.quantity <= 0) {
            error('Please enter a valid quantity');
            return;
        }

        setIsSubmitting(true);
        try {
            // Map frontend field names to backend expected field names
            // Frontend: type: 'in'/'out' -> Backend: adjustment_type: 'add'/'subtract'
            // Frontend: reason -> Backend: notes
            const adjustmentType = adjustmentData.type === 'in' ? 'add' : 'subtract';
            
            await api.post('/inventory/adjust', {
                product_id: adjustingProduct.id,
                adjustment_type: adjustmentType,
                quantity: parseInt(adjustmentData.quantity),
                notes: adjustmentData.reason
            });
            success('Stock adjusted successfully');
            setShowAdjustModal(false);
            fetchInventory();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to adjust stock');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Get stock status
    const getStockStatus = (quantity, minLevel) => {
        if (quantity === 0) return { label: 'Out of Stock', class: 'badge-danger' };
        if (quantity <= minLevel) return { label: 'Low Stock', class: 'badge-warning' };
        return { label: 'In Stock', class: 'badge-success' };
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Manage stock levels and adjustments
                </p>
            </div>

            {/* Filters */}
            <div className="card p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="form-input pl-10"
                        />
                    </div>
                    <select
                        value={stockFilter}
                        onChange={(e) => setStockFilter(e.target.value)}
                        className="form-input w-48"
                    >
                        <option value="">All Stock Levels</option>
                        <option value="low">Low Stock</option>
                        <option value="out">Out of Stock</option>
                        <option value="in">In Stock</option>
                    </select>
                </div>
            </div>

            {/* Inventory Table */}
            <div className="card overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>SKU</th>
                                    <th>Current Stock</th>
                                    <th>Min Level</th>
                                    <th>Status</th>
                                    <th>Last Updated</th>
                                    {canAdjust && <th className="text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {inventory.map((item) => {
                                    const status = getStockStatus(item.stock_quantity, item.min_stock_level);
                                    return (
                                        <tr key={item.id}>
                                            <td className="font-medium text-gray-900 dark:text-white">
                                                {item.name}
                                            </td>
                                            <td className="text-gray-600 dark:text-gray-300">{item.sku}</td>
                                            <td className="font-semibold text-gray-900 dark:text-white">
                                                {item.stock_quantity} {item.unit}
                                            </td>
                                            <td className="text-gray-600 dark:text-gray-300">
                                                {item.min_stock_level} {item.unit}
                                            </td>
                                            <td>
                                                <span className={`badge ${status.class}`}>{status.label}</span>
                                            </td>
                                            <td className="text-gray-500 dark:text-gray-400 text-sm">
                                                {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : '-'}
                                            </td>
                                            {canAdjust && (
                                                <td className="text-right">
                                                    <button
                                                        onClick={() => handleAdjust(item)}
                                                        className="btn btn-secondary btn-sm"
                                                    >
                                                        Adjust
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
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

            {/* Adjustment Modal */}
            <Modal
                isOpen={showAdjustModal}
                onClose={() => setShowAdjustModal(false)}
                title="Adjust Stock"
            >
                <div className="p-6 space-y-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <p className="font-medium text-gray-900 dark:text-white">
                            {adjustingProduct?.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Current Stock: {adjustingProduct?.stock_quantity} {adjustingProduct?.unit}
                        </p>
                    </div>

                    <div>
                        <label className="form-label">Adjustment Type</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setAdjustmentData(prev => ({ ...prev, type: 'in' }))}
                                className={`p-3 rounded-lg border-2 ${adjustmentData.type === 'in'
                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                        : 'border-gray-200 dark:border-gray-700'
                                    }`}
                            >
                                <span className="text-green-600 font-medium">Stock In (+)</span>
                            </button>
                            <button
                                onClick={() => setAdjustmentData(prev => ({ ...prev, type: 'out' }))}
                                className={`p-3 rounded-lg border-2 ${adjustmentData.type === 'out'
                                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                        : 'border-gray-200 dark:border-gray-700'
                                    }`}
                            >
                                <span className="text-red-600 font-medium">Stock Out (-)</span>
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Quantity</label>
                        <input
                            type="number"
                            value={adjustmentData.quantity}
                            onChange={(e) => setAdjustmentData(prev => ({ ...prev, quantity: e.target.value }))}
                            min="1"
                            className="form-input"
                            placeholder="Enter quantity"
                        />
                    </div>

                    <div>
                        <label className="form-label">Reason</label>
                        <textarea
                            value={adjustmentData.reason}
                            onChange={(e) => setAdjustmentData(prev => ({ ...prev, reason: e.target.value }))}
                            rows={2}
                            className="form-input"
                            placeholder="Reason for adjustment (optional)"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button onClick={() => setShowAdjustModal(false)} className="btn btn-secondary">
                            Cancel
                        </button>
                        <button
                            onClick={handleAdjustmentSubmit}
                            className={`btn ${adjustmentData.type === 'in' ? 'btn-success' : 'btn-danger'}`}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Processing...' : `Confirm ${adjustmentData.type === 'in' ? 'Stock In' : 'Stock Out'}`}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default InventoryPage;

/**
 * Low Stock Alert Component
 * 
 * Displays products with low stock levels
 */

import React from 'react';
import { Link } from 'react-router-dom';

const LowStockAlert = ({ products }) => {
    // Sample data if no data provided
    const lowStockProducts = products.length > 0 ? products : [
        { id: 1, name: 'Wireless Mouse', sku: 'WM-001', stock_quantity: 3, min_stock_level: 10 },
        { id: 2, name: 'USB Keyboard', sku: 'UK-002', stock_quantity: 5, min_stock_level: 15 },
        { id: 3, name: 'Monitor Stand', sku: 'MS-003', stock_quantity: 2, min_stock_level: 5 }
    ];

    // Normalize data - backend may return different field names
    const normalizedProducts = lowStockProducts.map(p => ({
        id: p.id || p.product_id,
        name: p.name || p.product_name,
        sku: p.sku || p.barcode || '',
        stock_quantity: p.stock_quantity ?? p.quantity_in_stock ?? 0,
        min_stock_level: p.min_stock_level ?? p.reorder_level ?? 0
    }));

    // Get stock level status
    const getStockStatus = (quantity, minLevel) => {
        if (quantity === 0) return { label: 'Out of Stock', color: 'red', class: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' };
        if (quantity <= minLevel / 2) return { label: 'Critical', color: 'red', class: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' };
        return { label: 'Low', color: 'yellow', class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' };
    };

    // Check if stock is critical (very low - less than 25% of reorder level)
    const isCritical = (quantity, minLevel) => {
        return quantity === 0 || quantity <= minLevel / 4;
    };

    return (
        <div className="card h-full">
            <div className="card-header flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Low Stock Alert
                </h3>
                <Link
                    to="/inventory"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                    Manage Inventory
                </Link>
            </div>
            <div className="card-body p-0">
                {normalizedProducts.length === 0 ? (
                    <div className="p-6 text-center">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">All products are well stocked!</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {normalizedProducts.map((product) => {
                            const status = getStockStatus(product.stock_quantity, product.min_stock_level);
                            const critical = isCritical(product.stock_quantity, product.min_stock_level);
                            return (
                                <div key={product.id} className={`px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 ${critical ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {critical && (
                                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                            )}
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {product.name}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    SKU: {product.sku}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.class}`}>
                                                {status.label}
                                            </span>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                <span className="font-semibold text-gray-900 dark:text-white">{product.stock_quantity}</span> / {product.min_stock_level} reorder level
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LowStockAlert;

/**
 * Products Page
 * 
 * Product management with list, search, filter, and CRUD operations
 */

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useCurrency } from '../../context/CurrencyContext';

// Components
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import ProductForm from '../../components/products/ProductForm';

const ProductsPage = () => {
    const { hasMinRole } = useAuth();
    const { success, error } = useToast();
    const { formatPrice } = useCurrency();
    const { addToCart } = useCart();

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const itemsPerPage = 10;

    // Modal states
    const [showProductModal, setShowProductModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingProduct, setDeletingProduct] = useState(null);

    // Check if user can edit
    const canEdit = hasMinRole('manager');

    // Fetch products
    const fetchProducts = useCallback(async () => {
        try {
            setIsLoading(true);
            const params = {
                page: currentPage,
                limit: itemsPerPage,
                search: searchTerm
            };

            if (selectedCategory) {
                params.category_id = selectedCategory;
            }

            const response = await api.get('/products', { params });

            // Map backend field names to frontend expected names
            // Store original USD prices, formatPrice will handle conversion when displayed
            const productsData = (response.data.data || []).map(item => ({
                ...item,
                id: item.id,
                name: item.name,
                sku: item.sku,
                barcode: item.barcode,
                // Keep original USD price, formatPrice will handle conversion
                price: parseFloat(item.selling_price) || 0,
                stock_quantity: item.quantity_in_stock,
                min_stock_level: item.reorder_level,
                category_name: item.category_name,
                image_url: item.image_url
            }));
            setProducts(productsData);
            setTotalPages(response.data.pagination?.totalPages || 1);
            setTotalItems(response.data.pagination?.totalItems || 0);
        } catch (err) {
            console.error('Failed to fetch products:', err);
            error('Failed to load products: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, searchTerm, selectedCategory, error]);

    // Fetch categories for filter
    const fetchCategories = useCallback(async () => {
        try {
            const response = await api.get('/categories');
            setCategories(response.data.data || []);
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, [fetchProducts, fetchCategories]);

    // Handle search
    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    // Handle category filter
    const handleCategoryFilter = (e) => {
        setSelectedCategory(e.target.value);
        setCurrentPage(1);
    };

    // Open add product modal
    const handleAddProduct = () => {
        setEditingProduct(null);
        setShowProductModal(true);
    };

    // Open edit product modal
    const handleEditProduct = (product) => {
        setEditingProduct(product);
        setShowProductModal(true);
    };

    // Open delete confirmation modal
    const handleDeleteClick = (product) => {
        setDeletingProduct(product);
        setShowDeleteModal(true);
    };

    // Save product (create or update)
    const handleSaveProduct = async (productData) => {
        try {
            if (editingProduct) {
                await api.put(`/products/${editingProduct.id}`, productData);
                success('Product updated successfully');
            } else {
                await api.post('/products', productData);
                success('Product created successfully');
            }
            setShowProductModal(false);
            fetchProducts();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to save product');
        }
    };

    // Delete product
    const handleDeleteProduct = async () => {
        try {
            await api.delete(`/products/${deletingProduct.id}`);
            success('Product deleted successfully');
            setShowDeleteModal(false);
            fetchProducts();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to delete product');
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {totalItems} products total
                    </p>
                </div>
                {canEdit && (
                    <button onClick={handleAddProduct} className="btn btn-primary">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Product
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="card p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchTerm}
                                onChange={handleSearch}
                                className="form-input pl-10"
                            />
                        </div>
                    </div>

                    {/* Category filter */}
                    <div className="sm:w-48">
                        <select
                            value={selectedCategory}
                            onChange={handleCategoryFilter}
                            className="form-input"
                        >
                            <option value="">All Categories</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Products Table */}
            <div className="card overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                        <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <p>No products found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>SKU</th>
                                    <th>Category</th>
                                    <th>Price</th>
                                    <th>Stock</th>
                                    <th>Status</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product) => {
                                    const stockStatus = getStockStatus(product.stock_quantity, product.min_stock_level);
                                    return (
                                        <tr key={product.id}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                                        {product.image_url ? (
                                                            <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                                                        ) : (
                                                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                                                        {product.barcode && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">{product.barcode}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="text-gray-600 dark:text-gray-300">{product.sku}</td>
                                            <td className="text-gray-600 dark:text-gray-300">{product.category_name || '-'}</td>
                                            <td className="font-medium text-gray-900 dark:text-white">{formatPrice(product.price)}</td>
                                            <td className="text-gray-600 dark:text-gray-300">{product.stock_quantity}</td>
                                            <td>
                                                <span className={`badge ${stockStatus.class}`}>{stockStatus.label}</span>
                                            </td>
                                            <td className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => addToCart(product)}
                                                        disabled={product.stock_quantity < 1}
                                                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title="Add to Cart"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                                        </svg>
                                                    </button>
                                                    {canEdit && (
                                                        <>
                                                            <button
                                                                onClick={() => handleEditProduct(product)}
                                                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                                                title="Edit"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteClick(product)}
                                                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                                                title="Delete"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
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

            {/* Product Modal */}
            <Modal
                isOpen={showProductModal}
                onClose={() => setShowProductModal(false)}
                title={editingProduct ? 'Edit Product' : 'Add Product'}
                size="lg"
            >
                <ProductForm
                    product={editingProduct}
                    categories={categories}
                    onSave={handleSaveProduct}
                    onCancel={() => setShowProductModal(false)}
                />
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Delete Product"
            >
                <div className="p-6">
                    <p className="text-gray-600 dark:text-gray-300">
                        Are you sure you want to delete <strong>{deletingProduct?.name}</strong>? This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            onClick={() => setShowDeleteModal(false)}
                            className="btn btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDeleteProduct}
                            className="btn btn-danger"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ProductsPage;

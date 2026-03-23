/**
 * POS Page
 *
 * Point of Sale interface with cart functionality
 */

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

// Components
import Modal from '../../components/common/Modal';

const POSPage = () => {
    const { user } = useAuth();
    const { success, error } = useToast();
    const {
        cart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        refreshCart
    } = useCart();

    // State
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [discount, setDiscount] = useState({ type: 'percentage', value: 0 });
    const [amountReceived, setAmountReceived] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Tax rate (can be made configurable)
    const taxRate = 0.1; // 10%

    // Fetch products and categories
    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const [productsRes, categoriesRes] = await Promise.all([
                    api.get('/products', { params: { limit: 100, is_active: true } }),
                    api.get('/categories')
                ]);
                // Map backend field names to frontend expected names
                const productsData = (productsRes.data.data || []).map(item => ({
                    ...item,
                    id: item.id,
                    name: item.name,
                    sku: item.sku,
                    barcode: item.barcode,
                    price: parseFloat(item.selling_price) || 0,
                    stock_quantity: item.quantity_in_stock,
                    min_stock_level: item.reorder_level,
                    category_name: item.category_name,
                    image_url: item.image_url
                }));
                setProducts(productsData);
                setCategories(categoriesRes.data.data || []);
                
                // Refresh cart with latest product data
                refreshCart(productsData);
            } catch (err) {
                error('Failed to load products');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [error, refreshCart]);

    // Filter products
    const filteredProducts = products.filter((product) => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.barcode?.includes(searchTerm);
        const matchesCategory = !selectedCategory || product.category_id === parseInt(selectedCategory);
        return matchesSearch && matchesCategory && product.stock_quantity > 0;
    });

    // Handle add to cart with stock validation
    const handleAddToCart = (product) => {
        addToCart(product);
    };

    // Handle update cart quantity
    const handleUpdateCartQuantity = (productId, quantity) => {
        updateCartQuantity(productId, quantity, products);
    };

    // Handle clear cart
    const handleClearCart = () => {
        clearCart();
        setDiscount({ type: 'percentage', value: 0 });
    };

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * item.quantity, 0);
    const discountAmount = discount.type === 'percentage'
        ? (subtotal * discount.value) / 100
        : discount.value;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * taxRate;
    const total = taxableAmount + taxAmount;
    const change = parseFloat(amountReceived) - total;

    // Handle payment
    const handlePayment = async () => {
        if (parseFloat(amountReceived) < total) {
            error('Insufficient amount received');
            return;
        }

        setIsProcessing(true);

        try {
            // Map frontend field names to backend expected field names
            // Frontend: discount -> Backend: discount_amount
            // Frontend: amount_received -> Backend: amount_paid
            // Backend calculates tax and total_amount internally from items
            const saleData = {
                items: cart.map((item) => ({
                    product_id: item.id,
                    quantity: item.quantity,
                    unit_price: item.price,
                    discount: 0  // Per-item discount
                })),
                // Remove subtotal, tax, total_amount, change - backend calculates these
                payment_method: paymentMethod,
                amount_paid: parseFloat(amountReceived),  // Map to backend expected field name
                discount_amount: discountAmount  // Map to backend expected field name
            };

            const response = await api.post('/sales', saleData);

            success('Sale completed successfully!');

            // Generate receipt
            const sale = response.data.data;
            printReceipt(sale);

            // Clear cart and close modal
            clearCart();
            setShowPaymentModal(false);
            setAmountReceived('');
        } catch (err) {
            error(err.response?.data?.message || 'Failed to process sale');
        } finally {
            setIsProcessing(false);
        }
    };

    // Print receipt
    const printReceipt = (sale) => {
        const receiptContent = `
      <html>
      <head>
        <title>Receipt</title>
        <style>
          body { font-family: monospace; font-size: 12px; width: 280px; margin: 0 auto; padding: 10px; }
          .header { text-align: center; margin-bottom: 10px; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .item { display: flex; justify-content: space-between; margin: 5px 0; }
          .total { font-weight: bold; }
          .footer { text-align: center; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2 style="margin: 0;">POS System</h2>
          <p style="margin: 5px 0;">Your Store Name</p>
          <p style="margin: 5px 0;">Tel: (123) 456-7890</p>
        </div>
        <div class="divider"></div>
        <p>Invoice: ${sale.invoice_number}</p>
        <p>Date: ${new Date(sale.created_at).toLocaleString()}</p>
        <p>Cashier: ${user?.full_name || user?.username}</p>
        <div class="divider"></div>
        ${cart.map((item) => `
          <div class="item">
            <span>${item.name} x${item.quantity}</span>
            <span>${((parseFloat(item.price) || 0) * item.quantity).toFixed(2)}</span>
          </div>
        `).join('')}
        <div class="divider"></div>
        <div class="item"><span>Subtotal:</span><span>$${subtotal.toFixed(2)}</span></div>
        ${discountAmount > 0 ? `<div class="item"><span>Discount:</span><span>-$${discountAmount.toFixed(2)}</span></div>` : ''}
        <div class="item"><span>Tax (10%):</span><span>$${taxAmount.toFixed(2)}</span></div>
        <div class="item total"><span>Total:</span><span>$${total.toFixed(2)}</span></div>
        <div class="divider"></div>
        <div class="item"><span>Payment:</span><span>${paymentMethod.toUpperCase()}</span></div>
        <div class="item"><span>Amount Received:</span><span>$${parseFloat(amountReceived).toFixed(2)}</span></div>
        <div class="item"><span>Change:</span><span>$${Math.max(0, change).toFixed(2)}</span></div>
        <div class="divider"></div>
        <div class="footer">
          <p>Thank you for your purchase!</p>
          <p>Please come again</p>
        </div>
      </body>
      </html>
    `;

        // Use Electron print if available
        if (window.electron?.print?.receipt) {
            window.electron.print.receipt(receiptContent);
        } else {
            // Fallback to browser print
            const printWindow = window.open('', '_blank');
            printWindow.document.write(receiptContent);
            printWindow.document.close();
            printWindow.print();
        }
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    return (
        <div className="h-[calc(100vh-7rem)] flex gap-4">
            {/* Products Section */}
            <div className="flex-1 flex flex-col">
                {/* Search and Filter */}
                <div className="card p-4 mb-4">
                    <div className="flex gap-4">
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
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="form-input w-48"
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

                {/* Products Grid */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredProducts.map((product) => (
                                <button
                                    key={product.id}
                                    onClick={() => handleAddToCart(product)}
                                    className="card p-4 text-left hover:ring-2 hover:ring-blue-500 transition-all"
                                >
                                    <div className="w-full h-24 bg-gray-100 dark:bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                                        ) : (
                                            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                            </svg>
                                        )}
                                    </div>
                                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                                        {product.name}
                                    </h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {product.stock_quantity} in stock
                                    </p>
                                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
                                        {formatCurrency(product.price)}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Cart Section */}
            <div className="w-96 card flex flex-col">
                {/* Cart Header */}
                <div className="card-header flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Cart ({cart.length})
                    </h3>
                    {cart.length > 0 && (
                        <button
                            onClick={handleClearCart}
                            className="text-sm text-red-600 hover:text-red-700"
                        >
                            Clear All
                        </button>
                    )}
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <p>Cart is empty</p>
                            <p className="text-sm">Add products to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {cart.map((item) => (
                                <div key={item.id} className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div className="flex-1">
                                        <h4 className="font-medium text-gray-900 dark:text-white">
                                            {item.name}
                                        </h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {formatCurrency(parseFloat(item.price) || 0)} each
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleUpdateCartQuantity(item.id, item.quantity - 1)}
                                            className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500"
                                        >
                                            -
                                        </button>
                                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                                        <button
                                            onClick={() => handleUpdateCartQuantity(item.id, item.quantity + 1)}
                                            className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500"
                                        >
                                            +
                                        </button>
                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Cart Summary */}
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
                    {/* Discount */}
                    <div className="flex items-center gap-2">
                        <select
                            value={discount.type}
                            onChange={(e) => setDiscount((prev) => ({ ...prev, type: e.target.value }))}
                            className="form-input w-24 text-sm"
                        >
                            <option value="percentage">%</option>
                            <option value="fixed">$</option>
                        </select>
                        <input
                            type="number"
                            value={discount.value}
                            onChange={(e) => setDiscount((prev) => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                            min="0"
                            className="form-input flex-1 text-sm"
                            placeholder="Discount"
                        />
                    </div>

                    {/* Totals */}
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                            <span>Subtotal</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                        {discountAmount > 0 && (
                            <div className="flex justify-between text-green-600 dark:text-green-400">
                                <span>Discount</span>
                                <span>-{formatCurrency(discountAmount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                            <span>Tax (10%)</span>
                            <span>{formatCurrency(taxAmount)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
                            <span>Total</span>
                            <span>{formatCurrency(total)}</span>
                        </div>
                    </div>

                    {/* Pay Button */}
                    <button
                        onClick={() => setShowPaymentModal(true)}
                        disabled={cart.length === 0}
                        className="w-full btn btn-primary py-3 text-lg"
                    >
                        Pay {formatCurrency(total)}
                    </button>
                </div>
            </div>

            {/* Payment Modal */}
            <Modal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                title="Complete Payment"
                size="md"
            >
                <div className="p-6 space-y-4">
                    {/* Total */}
                    <div className="text-center py-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Amount</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(total)}
                        </p>
                    </div>

                    {/* Payment Method */}
                    <div>
                        <label className="form-label">Payment Method</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setPaymentMethod('cash')}
                                className={`p-4 rounded-lg border-2 transition-colors ${paymentMethod === 'cash'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-200 dark:border-gray-700'
                                    }`}
                            >
                                <svg className="w-8 h-8 mx-auto mb-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span className="font-medium">Cash</span>
                            </button>
                            <button
                                onClick={() => setPaymentMethod('card')}
                                className={`p-4 rounded-lg border-2 transition-colors ${paymentMethod === 'card'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-200 dark:border-gray-700'
                                    }`}
                            >
                                <svg className="w-8 h-8 mx-auto mb-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                <span className="font-medium">Card</span>
                            </button>
                        </div>
                    </div>

                    {/* Amount Received (Cash only) */}
                    {paymentMethod === 'cash' && (
                        <div>
                            <label className="form-label">Amount Received</label>
                            <input
                                type="number"
                                value={amountReceived}
                                onChange={(e) => setAmountReceived(e.target.value)}
                                min="0"
                                step="0.01"
                                className="form-input text-lg"
                                placeholder="Enter amount received"
                            />
                            {parseFloat(amountReceived) >= total && (
                                <p className="mt-2 text-green-600 dark:text-green-400 font-medium">
                                    Change: {formatCurrency(Math.max(0, change))}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Quick amounts */}
                    {paymentMethod === 'cash' && (
                        <div className="flex gap-2 flex-wrap">
                            {[10, 20, 50, 100].map((amount) => (
                                <button
                                    key={amount}
                                    onClick={() => setAmountReceived(amount.toString())}
                                    className="btn btn-secondary btn-sm"
                                >
                                    ${amount}
                                </button>
                            ))}
                            <button
                                onClick={() => setAmountReceived(Math.ceil(total).toString())}
                                className="btn btn-secondary btn-sm"
                            >
                                Exact
                            </button>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={() => setShowPaymentModal(false)}
                            className="flex-1 btn btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handlePayment}
                            disabled={paymentMethod === 'cash' && parseFloat(amountReceived) < total}
                            className="flex-1 btn btn-success"
                        >
                            {isProcessing ? 'Processing...' : 'Complete Sale'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default POSPage;

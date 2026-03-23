/**
 * Cart Example Component
 * 
 * This component demonstrates how to use the CartContext
 * for various cart operations
 */

import React from 'react';
import { useCart } from '../../context/CartContext';

const CartExample = () => {
    const {
        cart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        getCartItemCount,
        getCartSubtotal,
        isInCart,
        getCartItem
    } = useCart();

    // Example product data
    const exampleProduct = {
        id: 1,
        name: 'Example Product',
        price: 29.99,
        stock_quantity: 10,
        image_url: null
    };

    const itemCount = getCartItemCount();
    const subtotal = getCartSubtotal();

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Cart System Example</h1>

            {/* Example Product Card */}
            <div className="card p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Example Product</h2>
                <div className="flex items-center gap-4">
                    <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-gray-500">No Image</span>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-medium">{exampleProduct.name}</h3>
                        <p className="text-gray-600">${exampleProduct.price.toFixed(2)}</p>
                        <p className="text-sm text-gray-500">{exampleProduct.stock_quantity} in stock</p>
                    </div>
                    <button
                        onClick={() => addToCart(exampleProduct)}
                        className="btn btn-primary"
                    >
                        {isInCart(exampleProduct.id) ? 'Add More' : 'Add to Cart'}
                    </button>
                </div>
            </div>

            {/* Cart Display */}
            <div className="card p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">
                        Shopping Cart ({itemCount} items)
                    </h2>
                    {cart.length > 0 && (
                        <button
                            onClick={clearCart}
                            className="text-red-600 hover:text-red-700"
                        >
                            Clear All
                        </button>
                    )}
                </div>

                {cart.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p>Your cart is empty</p>
                        <p className="text-sm">Add some products to get started</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {cart.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                            >
                                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                                    <span className="text-xs text-gray-500">No Image</span>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-medium">{item.name}</h4>
                                    <p className="text-sm text-gray-600">
                                        ${item.price.toFixed(2)} each
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                                        className="w-8 h-8 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                                    >
                                        -
                                    </button>
                                    <span className="w-8 text-center font-medium">
                                        {item.quantity}
                                    </span>
                                    <button
                                        onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                                        className="w-8 h-8 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                                    >
                                        +
                                    </button>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium">
                                        ${(item.price * item.quantity).toFixed(2)}
                                    </p>
                                </div>
                                <button
                                    onClick={() => removeFromCart(item.id)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Cart Summary */}
            {cart.length > 0 && (
                <div className="card p-6">
                    <h2 className="text-xl font-semibold mb-4">Cart Summary</h2>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Tax (10%):</span>
                            <span>${(subtotal * 0.1).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold pt-2 border-t">
                            <span>Total:</span>
                            <span>${(subtotal * 1.1).toFixed(2)}</span>
                        </div>
                    </div>
                    <button className="w-full btn btn-primary mt-4">
                        Proceed to Checkout
                    </button>
                </div>
            )}

            {/* Usage Examples */}
            <div className="card p-6 mt-6">
                <h2 className="text-xl font-semibold mb-4">Usage Examples</h2>
                <div className="space-y-4 text-sm">
                    <div>
                        <h3 className="font-medium mb-2">Check if product is in cart:</h3>
                        <code className="bg-gray-100 p-2 rounded block">
                            const inCart = isInCart(productId);
                        </code>
                    </div>
                    <div>
                        <h3 className="font-medium mb-2">Get cart item details:</h3>
                        <code className="bg-gray-100 p-2 rounded block">
                            const item = getCartItem(productId);
                        </code>
                    </div>
                    <div>
                        <h3 className="font-medium mb-2">Get total item count:</h3>
                        <code className="bg-gray-100 p-2 rounded block">
                            const count = getCartItemCount();
                        </code>
                    </div>
                    <div>
                        <h3 className="font-medium mb-2">Get cart subtotal:</h3>
                        <code className="bg-gray-100 p-2 rounded block">
                            const subtotal = getCartSubtotal();
                        </code>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CartExample;

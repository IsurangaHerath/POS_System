/**
 * Cart Context
 * 
 * Provides cart state management throughout the application
 * with localStorage persistence
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useToast } from './ToastContext';

const CartContext = createContext(null);

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};

// localStorage key
const CART_STORAGE_KEY = 'pos_cart';

export const CartProvider = ({ children }) => {
    const { success, error, warning } = useToast();
    const [cart, setCart] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load cart from localStorage on mount
    useEffect(() => {
        try {
            const savedCart = localStorage.getItem(CART_STORAGE_KEY);
            if (savedCart) {
                const parsedCart = JSON.parse(savedCart);
                setCart(parsedCart);
            }
        } catch (err) {
            console.error('Failed to load cart from localStorage:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        if (!isLoading) {
            try {
                localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
            } catch (err) {
                console.error('Failed to save cart to localStorage:', err);
            }
        }
    }, [cart, isLoading]);

    // Add item to cart
    const addToCart = useCallback((product) => {
        setCart((prevCart) => {
            const existingItem = prevCart.find((item) => item.id === product.id);

            if (existingItem) {
                // Check stock
                if (existingItem.quantity >= product.stock_quantity) {
                    error(`Cannot add more ${product.name}. Stock limit reached.`);
                    return prevCart;
                }
                
                success(`${product.name} quantity updated in cart`);
                return prevCart.map((item) =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }

            // Check if product is in stock
            if (product.stock_quantity < 1) {
                error(`${product.name} is out of stock`);
                return prevCart;
            }

            success(`${product.name} added to cart`);
            return [...prevCart, { ...product, quantity: 1, price: parseFloat(product.price) || 0 }];
        });
    }, [success, error]);

    // Update cart item quantity
    const updateCartQuantity = useCallback((productId, quantity, products = []) => {
        if (quantity < 1) {
            removeFromCart(productId);
            return;
        }

        const product = products.find((p) => p.id === productId);
        if (product && quantity > product.stock_quantity) {
            error(`Cannot set quantity to ${quantity}. Only ${product.stock_quantity} in stock.`);
            return;
        }

        setCart((prevCart) =>
            prevCart.map((item) =>
                item.id === productId ? { ...item, quantity } : item
            )
        );
    }, [error]);

    // Remove item from cart
    const removeFromCart = useCallback((productId) => {
        setCart((prevCart) => {
            const item = prevCart.find((i) => i.id === productId);
            if (item) {
                warning(`${item.name} removed from cart`);
            }
            return prevCart.filter((item) => item.id !== productId);
        });
    }, [warning]);

    // Clear entire cart
    const clearCart = useCallback(() => {
        setCart([]);
        success('Cart cleared');
    }, [success]);

    // Get cart item count
    const getCartItemCount = useCallback(() => {
        return cart.reduce((sum, item) => sum + item.quantity, 0);
    }, [cart]);

    // Get cart subtotal
    const getCartSubtotal = useCallback(() => {
        return cart.reduce((sum, item) => {
            const price = parseFloat(item.price) || 0;
            return sum + price * item.quantity;
        }, 0);
    }, [cart]);

    // Check if product is in cart
    const isInCart = useCallback((productId) => {
        return cart.some((item) => item.id === productId);
    }, [cart]);

    // Get cart item by product ID
    const getCartItem = useCallback((productId) => {
        return cart.find((item) => item.id === productId);
    }, [cart]);

    // Validate cart against current product stock
    const validateCart = useCallback((products) => {
        const invalidItems = [];
        
        cart.forEach((cartItem) => {
            const product = products.find((p) => p.id === cartItem.id);
            if (!product) {
                invalidItems.push({ item: cartItem, reason: 'Product no longer exists' });
            } else if (product.stock_quantity < cartItem.quantity) {
                invalidItems.push({ 
                    item: cartItem, 
                    reason: `Only ${product.stock_quantity} in stock` 
                });
            }
        });

        return invalidItems;
    }, [cart]);

    // Update cart items with latest product data
    const refreshCart = useCallback((products) => {
        setCart((prevCart) => {
            return prevCart.map((cartItem) => {
                const product = products.find((p) => p.id === cartItem.id);
                if (product) {
                    // Update price and stock info, but keep quantity
                    return {
                        ...cartItem,
                        price: parseFloat(product.price) || 0,
                        stock_quantity: product.stock_quantity,
                        name: product.name,
                        image_url: product.image_url
                    };
                }
                return cartItem;
            }).filter((item) => {
                // Remove items that no longer exist
                const product = products.find((p) => p.id === item.id);
                return product !== undefined;
            });
        });
    }, []);

    const value = {
        cart,
        isLoading,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        getCartItemCount,
        getCartSubtotal,
        isInCart,
        getCartItem,
        validateCart,
        refreshCart
    };

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
};

export default CartContext;

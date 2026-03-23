# Cart System Implementation Guide

## Overview

This document provides a comprehensive guide to the cart system implementation in the POS application. The cart system uses React Context API for state management with localStorage persistence.

## Architecture

### 1. CartContext (`CartContext.jsx`)

The CartContext provides centralized cart state management across the entire application.

**Key Features:**
- Global state management using React Context API
- Automatic localStorage persistence
- Stock validation
- Toast notifications for user feedback
- Cart refresh with latest product data

### 2. State Management

```javascript
// Cart state structure
const cart = [
  {
    id: 1,
    name: "Product Name",
    price: 29.99,
    stock_quantity: 10,
    image_url: "https://example.com/image.jpg",
    quantity: 2
  }
]
```

## Implementation Details

### CartContext Provider

```javascript
// frontend/src/renderer/src/context/CartContext.jsx

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

    // ... (rest of the implementation)
};
```

### Available Methods

#### 1. `addToCart(product)`
Adds a product to the cart or increases quantity if already exists.

```javascript
const { addToCart } = useCart();

// Usage
addToCart({
  id: 1,
  name: "Product Name",
  price: 29.99,
  stock_quantity: 10
});
```

**Features:**
- Validates stock before adding
- Shows toast notification on success
- Prevents adding out-of-stock items
- Increases quantity if item already in cart

#### 2. `updateCartQuantity(productId, quantity, products)`
Updates the quantity of a specific item in the cart.

```javascript
const { updateCartQuantity } = useCart();

// Usage
updateCartQuantity(productId, newQuantity, products);
```

**Features:**
- Validates against available stock
- Automatically removes item if quantity < 1
- Shows error toast if stock limit exceeded

#### 3. `removeFromCart(productId)`
Removes an item from the cart.

```javascript
const { removeFromCart } = useCart();

// Usage
removeFromCart(productId);
```

**Features:**
- Shows warning toast when item is removed
- Immediately updates cart state

#### 4. `clearCart()`
Clears all items from the cart.

```javascript
const { clearCart } = useCart();

// Usage
clearCart();
```

**Features:**
- Shows success toast notification
- Resets cart to empty array

#### 5. `getCartItemCount()`
Returns the total number of items in the cart.

```javascript
const { getCartItemCount } = useCart();

// Usage
const itemCount = getCartItemCount(); // Returns: 5
```

#### 6. `getCartSubtotal()`
Returns the subtotal of all items in the cart.

```javascript
const { getCartSubtotal } = useCart();

// Usage
const subtotal = getCartSubtotal(); // Returns: 149.95
```

#### 7. `isInCart(productId)`
Checks if a product is in the cart.

```javascript
const { isInCart } = useCart();

// Usage
const inCart = isInCart(productId); // Returns: true/false
```

#### 8. `getCartItem(productId)`
Returns a specific cart item by product ID.

```javascript
const { getCartItem } = useCart();

// Usage
const cartItem = getCartItem(productId);
// Returns: { id: 1, name: "Product", quantity: 2, ... }
```

#### 9. `validateCart(products)`
Validates cart items against current product stock.

```javascript
const { validateCart } = useCart();

// Usage
const invalidItems = validateCart(products);
// Returns: [{ item: {...}, reason: "Only 5 in stock" }]
```

#### 10. `refreshCart(products)`
Updates cart items with latest product data.

```javascript
const { refreshCart } = useCart();

// Usage
refreshCart(products);
```

**Features:**
- Updates prices if changed
- Updates stock quantities
- Removes products that no longer exist
- Preserves cart quantities

## Component Integration

### POSPage Component

The POSPage component demonstrates full cart integration:

```javascript
// frontend/src/renderer/src/pages/pos/POSPage.jsx

import React, { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';

const POSPage = () => {
    const { 
        cart, 
        addToCart, 
        updateCartQuantity, 
        removeFromCart, 
        clearCart,
        refreshCart 
    } = useCart();

    const [products, setProducts] = useState([]);

    // Fetch products and refresh cart
    useEffect(() => {
        const fetchData = async () => {
            const productsRes = await api.get('/products');
            const productsData = productsRes.data.data || [];
            setProducts(productsData);
            
            // Refresh cart with latest product data
            refreshCart(productsData);
        };
        fetchData();
    }, [refreshCart]);

    // Handle add to cart
    const handleAddToCart = (product) => {
        addToCart(product);
    };

    // Handle quantity update
    const handleUpdateCartQuantity = (productId, quantity) => {
        updateCartQuantity(productId, quantity, products);
    };

    return (
        <div>
            {/* Product List */}
            {products.map((product) => (
                <button onClick={() => handleAddToCart(product)}>
                    Add to Cart
                </button>
            ))}

            {/* Cart Display */}
            {cart.map((item) => (
                <div key={item.id}>
                    <span>{item.name}</span>
                    <span>Qty: {item.quantity}</span>
                    <button onClick={() => handleUpdateCartQuantity(item.id, item.quantity - 1)}>
                        -
                    </button>
                    <button onClick={() => handleUpdateCartQuantity(item.id, item.quantity + 1)}>
                        +
                    </button>
                    <button onClick={() => removeFromCart(item.id)}>
                        Remove
                    </button>
                </div>
            ))}
        </div>
    );
};
```

## Edge Cases Handled

### 1. Out of Stock Products
```javascript
// Prevents adding out-of-stock items
if (product.stock_quantity < 1) {
    error(`${product.name} is out of stock`);
    return prevCart;
}
```

### 2. Stock Limit Exceeded
```javascript
// Prevents exceeding available stock
if (existingItem.quantity >= product.stock_quantity) {
    error(`Cannot add more ${product.name}. Stock limit reached.`);
    return prevCart;
}
```

### 3. Product No Longer Exists
```javascript
// Removes items that no longer exist
const refreshCart = useCallback((products) => {
    setCart((prevCart) => {
        return prevCart.map((cartItem) => {
            const product = products.find((p) => p.id === cartItem.id);
            if (product) {
                return {
                    ...cartItem,
                    price: product.price,
                    stock_quantity: product.stock_quantity,
                    name: product.name,
                    image_url: product.image_url
                };
            }
            return cartItem;
        }).filter((item) => {
            const product = products.find((p) => p.id === item.id);
            return product !== undefined;
        });
    });
}, []);
```

### 4. Price Changes
```javascript
// Updates prices when products are refreshed
refreshCart(products);
```

### 5. localStorage Errors
```javascript
// Gracefully handles localStorage errors
try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
} catch (err) {
    console.error('Failed to save cart to localStorage:', err);
}
```

## Best Practices

### 1. Use Callbacks for Performance
All cart methods are wrapped in `useCallback` to prevent unnecessary re-renders:

```javascript
const addToCart = useCallback((product) => {
    // Implementation
}, [success, error]);
```

### 2. Validate Before Update
Always validate stock before updating cart:

```javascript
const updateCartQuantity = useCallback((productId, quantity, products) => {
    const product = products.find((p) => p.id === productId);
    if (product && quantity > product.stock_quantity) {
        error(`Cannot set quantity to ${quantity}. Only ${product.stock_quantity} in stock.`);
        return;
    }
    // Update cart
}, [error]);
```

### 3. Provide User Feedback
Use toast notifications for all cart operations:

```javascript
success(`${product.name} added to cart`);
error('Not enough stock');
warning(`${item.name} removed from cart`);
```

### 4. Persist State
Automatically save to localStorage on every change:

```javascript
useEffect(() => {
    if (!isLoading) {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    }
}, [cart, isLoading]);
```

## Testing Scenarios

### 1. Add Product to Cart
- Click "Add to Cart" on a product
- Verify product appears in cart with quantity 1
- Verify toast notification appears
- Verify localStorage is updated

### 2. Increase Quantity
- Click "+" button on cart item
- Verify quantity increases
- Verify stock validation works
- Verify toast notification appears

### 3. Decrease Quantity
- Click "-" button on cart item
- Verify quantity decreases
- Verify item is removed when quantity reaches 0
- Verify toast notification appears

### 4. Remove Item
- Click remove button on cart item
- Verify item is removed from cart
- Verify toast notification appears
- Verify localStorage is updated

### 5. Clear Cart
- Click "Clear All" button
- Verify all items are removed
- Verify toast notification appears
- Verify localStorage is updated

### 6. Stock Validation
- Try to add more items than available stock
- Verify error message appears
- Verify cart quantity doesn't exceed stock

### 7. Persistence
- Add items to cart
- Refresh the page
- Verify cart items are restored from localStorage

### 8. Price Updates
- Add product to cart
- Update product price in database
- Refresh products
- Verify cart shows updated price

## API Integration

### Backend Endpoints

The cart system integrates with the following backend endpoints:

```javascript
// Fetch products
GET /api/products?limit=100&is_active=true

// Create sale (checkout)
POST /api/sales
{
  items: [
    {
      product_id: 1,
      quantity: 2,
      unit_price: 29.99,
      discount: 0
    }
  ],
  payment_method: 'cash',
  amount_paid: 59.98,
  discount_amount: 0
}
```

## Performance Considerations

### 1. Memoization
All cart methods use `useCallback` to prevent unnecessary re-renders:

```javascript
const addToCart = useCallback((product) => {
    // Implementation
}, [success, error]);
```

### 2. Efficient Updates
Cart state updates are immutable and efficient:

```javascript
setCart((prevCart) => 
    prevCart.map((item) =>
        item.id === productId 
            ? { ...item, quantity: item.quantity + 1 }
            : item
    )
);
```

### 3. localStorage Optimization
Only save to localStorage when cart changes and not during initial load:

```javascript
useEffect(() => {
    if (!isLoading) {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    }
}, [cart, isLoading]);
```

## Troubleshooting

### Cart Not Persisting
- Check if CartProvider is wrapped around the app in main.jsx
- Check browser console for localStorage errors
- Verify CART_STORAGE_KEY is consistent

### Toast Notifications Not Showing
- Verify ToastProvider is wrapped around CartProvider
- Check if useToast is properly imported in CartContext

### Stock Validation Not Working
- Ensure products array is passed to updateCartQuantity
- Verify product.stock_quantity is available in product data

### Cart Not Refreshing
- Call refreshCart when products are loaded
- Verify products array is passed correctly

## Future Enhancements

### 1. Cart Sharing
- Share cart between devices
- Sync cart across sessions

### 2. Cart History
- Save cart history
- Restore previous carts

### 3. Bulk Operations
- Add multiple items at once
- Import cart from file

### 4. Advanced Validation
- Minimum order quantity
- Maximum order quantity
- Product bundles

### 5. Offline Support
- Queue cart operations when offline
- Sync when back online

## Conclusion

The cart system provides a robust, user-friendly shopping experience with:
- ✅ Persistent cart state across page refreshes
- ✅ Real-time stock validation
- ✅ User feedback via toast notifications
- ✅ Efficient state management with Context API
- ✅ Clean, modular code architecture
- ✅ Comprehensive error handling
- ✅ Performance optimization with memoization

The implementation follows React best practices and provides a solid foundation for future enhancements.

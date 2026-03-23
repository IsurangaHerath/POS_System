# Cart Components

This directory contains cart-related components for the POS application.

## Components

### CartExample.jsx

A demonstration component showing how to use the CartContext for various cart operations.

**Features:**
- Add products to cart
- Update quantities
- Remove items
- Clear cart
- Display cart summary
- Code examples for common operations

**Usage:**
```javascript
import CartExample from '../../components/cart/CartExample';

// In your route or component
<CartExample />
```

## Cart Context

The cart system is powered by `CartContext` which provides:

### Available Methods

| Method | Description |
|--------|-------------|
| `addToCart(product)` | Add a product to cart |
| `updateCartQuantity(id, qty, products)` | Update item quantity |
| `removeFromCart(id)` | Remove item from cart |
| `clearCart()` | Clear all items |
| `getCartItemCount()` | Get total number of items |
| `getCartSubtotal()` | Get cart subtotal |
| `isInCart(id)` | Check if product is in cart |
| `getCartItem(id)` | Get specific cart item |
| `validateCart(products)` | Validate cart against stock |
| `refreshCart(products)` | Refresh cart with latest data |

### State

- `cart` - Array of cart items
- `isLoading` - Loading state for initial localStorage read

## Integration

### 1. Wrap your app with CartProvider

```javascript
// main.jsx
import { CartProvider } from './context/CartContext';

root.render(
    <CartProvider>
        <App />
    </CartProvider>
);
```

### 2. Use cart in your components

```javascript
import { useCart } from '../../context/CartContext';

const MyComponent = () => {
    const { cart, addToCart } = useCart();
    
    return (
        <button onClick={() => addToCart(product)}>
            Add to Cart
        </button>
    );
};
```

## Features

- ✅ Global state management with Context API
- ✅ Automatic localStorage persistence
- ✅ Stock validation
- ✅ Toast notifications
- ✅ Performance optimized with useCallback
- ✅ TypeScript-ready structure

## Documentation

For detailed documentation, see:
- [Cart System Implementation Guide](../../../docs/CART_SYSTEM_IMPLEMENTATION.md)
- [Quick Reference](../../../docs/CART_QUICK_REFERENCE.md)

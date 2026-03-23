# Cart System Quick Reference

## Quick Start

### 1. Import and Use Cart Context

```javascript
import { useCart } from '../../context/CartContext';

const MyComponent = () => {
    const { 
        cart, 
        addToCart, 
        updateCartQuantity, 
        removeFromCart, 
        clearCart 
    } = useCart();

    return (
        <div>
            {/* Your component JSX */}
        </div>
    );
};
```

## Common Use Cases

### Display Cart Items

```javascript
const CartDisplay = () => {
    const { cart } = useCart();

    return (
        <div>
            {cart.length === 0 ? (
                <p>Your cart is empty</p>
            ) : (
                <ul>
                    {cart.map((item) => (
                        <li key={item.id}>
                            <span>{item.name}</span>
                            <span>Qty: {item.quantity}</span>
                            <span>Price: ${(item.price * item.quantity).toFixed(2)}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
```

### Add Product to Cart Button

```javascript
const AddToCartButton = ({ product }) => {
    const { addToCart, isInCart, getCartItem } = useCart();
    const inCart = isInCart(product.id);
    const cartItem = getCartItem(product.id);

    return (
        <button 
            onClick={() => addToCart(product)}
            disabled={product.stock_quantity < 1}
        >
            {inCart ? `In Cart (${cartItem.quantity})` : 'Add to Cart'}
        </button>
    );
};
```

### Quantity Controls

```javascript
const QuantityControls = ({ productId, currentQuantity }) => {
    const { updateCartQuantity, removeFromCart } = useCart();

    const handleDecrease = () => {
        if (currentQuantity === 1) {
            removeFromCart(productId);
        } else {
            updateCartQuantity(productId, currentQuantity - 1);
        }
    };

    const handleIncrease = () => {
        updateCartQuantity(productId, currentQuantity + 1);
    };

    return (
        <div className="flex items-center gap-2">
            <button onClick={handleDecrease}>-</button>
            <span>{currentQuantity}</span>
            <button onClick={handleIncrease}>+</button>
        </div>
    );
};
```

### Cart Summary

```javascript
const CartSummary = () => {
    const { cart, getCartSubtotal, getCartItemCount } = useCart();
    const subtotal = getCartSubtotal();
    const itemCount = getCartItemCount();
    const taxRate = 0.1;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    return (
        <div className="cart-summary">
            <div className="flex justify-between">
                <span>Items ({itemCount})</span>
                <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
                <span>Tax (10%)</span>
                <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
            </div>
        </div>
    );
};
```

### Clear Cart Button

```javascript
const ClearCartButton = () => {
    const { cart, clearCart } = useCart();

    if (cart.length === 0) return null;

    return (
        <button 
            onClick={clearCart}
            className="text-red-600 hover:text-red-700"
        >
            Clear All
        </button>
    );
};
```

### Remove Item Button

```javascript
const RemoveItemButton = ({ productId }) => {
    const { removeFromCart } = useCart();

    return (
        <button 
            onClick={() => removeFromCart(productId)}
            className="text-red-500 hover:text-red-700"
        >
            Remove
        </button>
    );
};
```

### Cart Icon with Badge

```javascript
const CartIcon = () => {
    const { getCartItemCount } = useCart();
    const itemCount = getCartItemCount();

    return (
        <div className="relative">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {itemCount}
                </span>
            )}
        </div>
    );
};
```

### Product Card with Add to Cart

```javascript
const ProductCard = ({ product }) => {
    const { addToCart, isInCart, getCartItem } = useCart();
    const inCart = isInCart(product.id);
    const cartItem = getCartItem(product.id);

    return (
        <div className="product-card">
            <img src={product.image_url} alt={product.name} />
            <h3>{product.name}</h3>
            <p className="price">${product.price.toFixed(2)}</p>
            <p className="stock">{product.stock_quantity} in stock</p>
            
            <button 
                onClick={() => addToCart(product)}
                disabled={product.stock_quantity < 1}
                className={inCart ? 'in-cart' : ''}
            >
                {product.stock_quantity < 1 
                    ? 'Out of Stock' 
                    : inCart 
                        ? `In Cart (${cartItem.quantity})` 
                        : 'Add to Cart'}
            </button>
        </div>
    );
};
```

### Cart Item Component

```javascript
const CartItem = ({ item }) => {
    const { updateCartQuantity, removeFromCart } = useCart();

    return (
        <div className="cart-item">
            <img src={item.image_url} alt={item.name} />
            <div className="item-details">
                <h4>{item.name}</h4>
                <p className="price">${item.price.toFixed(2)} each</p>
            </div>
            <div className="quantity-controls">
                <button 
                    onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                >
                    -
                </button>
                <span>{item.quantity}</span>
                <button 
                    onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                >
                    +
                </button>
            </div>
            <div className="item-total">
                ${(item.price * item.quantity).toFixed(2)}
            </div>
            <button 
                onClick={() => removeFromCart(item.id)}
                className="remove-btn"
            >
                ×
            </button>
        </div>
    );
};
```

### Empty Cart Component

```javascript
const EmptyCart = () => {
    return (
        <div className="empty-cart">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p>Your cart is empty</p>
            <p className="text-sm">Add products to get started</p>
        </div>
    );
};
```

### Checkout Button

```javascript
const CheckoutButton = () => {
    const { cart, getCartSubtotal } = useCart();
    const subtotal = getCartSubtotal();
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    const handleCheckout = async () => {
        // Your checkout logic here
        console.log('Processing checkout...', { cart, total });
    };

    return (
        <button 
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="checkout-btn"
        >
            Checkout - ${total.toFixed(2)}
        </button>
    );
};
```

### Stock Validation Display

```javascript
const StockWarning = ({ product }) => {
    const { getCartItem } = useCart();
    const cartItem = getCartItem(product.id);
    const quantityInCart = cartItem?.quantity || 0;
    const availableStock = product.stock_quantity - quantityInCart;

    if (availableStock <= 0) {
        return <span className="text-red-500">Out of Stock</span>;
    }

    if (availableStock <= 5) {
        return <span className="text-yellow-500">Only {availableStock} left</span>;
    }

    return <span className="text-green-500">{availableStock} in stock</span>;
};
```

### Cart Persistence Indicator

```javascript
const CartPersistenceIndicator = () => {
    const { cart } = useCart();

    if (cart.length === 0) return null;

    return (
        <div className="text-xs text-gray-500">
            Cart saved automatically
        </div>
    );
};
```

## Advanced Patterns

### Cart with Discount

```javascript
const CartWithDiscount = () => {
    const { cart, getCartSubtotal } = useCart();
    const [discount, setDiscount] = useState({ type: 'percentage', value: 0 });
    
    const subtotal = getCartSubtotal();
    const discountAmount = discount.type === 'percentage'
        ? (subtotal * discount.value) / 100
        : discount.value;
    const total = subtotal - discountAmount;

    return (
        <div>
            <div className="discount-input">
                <select 
                    value={discount.type}
                    onChange={(e) => setDiscount(prev => ({ ...prev, type: e.target.value }))}
                >
                    <option value="percentage">%</option>
                    <option value="fixed">$</option>
                </select>
                <input
                    type="number"
                    value={discount.value}
                    onChange={(e) => setDiscount(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                    placeholder="Discount"
                />
            </div>
            <div className="totals">
                <div>Subtotal: ${subtotal.toFixed(2)}</div>
                {discountAmount > 0 && (
                    <div>Discount: -${discountAmount.toFixed(2)}</div>
                )}
                <div className="font-bold">Total: ${total.toFixed(2)}</div>
            </div>
        </div>
    );
};
```

### Cart Validation Before Checkout

```javascript
const useCartValidation = () => {
    const { cart, validateCart } = useCart();
    const [validationErrors, setValidationErrors] = useState([]);

    const validate = (products) => {
        const errors = validateCart(products);
        setValidationErrors(errors);
        return errors.length === 0;
    };

    return { validationErrors, validate };
};

// Usage
const CheckoutComponent = () => {
    const { cart } = useCart();
    const { validationErrors, validate } = useCartValidation();

    const handleCheckout = () => {
        if (validate(products)) {
            // Proceed with checkout
        } else {
            // Show validation errors
            console.log('Validation errors:', validationErrors);
        }
    };

    return (
        <div>
            {validationErrors.length > 0 && (
                <div className="errors">
                    {validationErrors.map((error, index) => (
                        <div key={index} className="error">
                            {error.item.name}: {error.reason}
                        </div>
                    ))}
                </div>
            )}
            <button onClick={handleCheckout}>Checkout</button>
        </div>
    );
};
```

### Cart with Local Storage Backup

```javascript
// The CartContext already handles localStorage automatically
// But you can add manual backup/restore if needed

const useCartBackup = () => {
    const { cart } = useCart();

    const exportCart = () => {
        const dataStr = JSON.stringify(cart, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = 'cart-backup.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const importCart = (jsonString) => {
        try {
            const importedCart = JSON.parse(jsonString);
            // Validate and add items
            importedCart.forEach(item => {
                addToCart(item);
            });
        } catch (error) {
            console.error('Failed to import cart:', error);
        }
    };

    return { exportCart, importCart };
};
```

## Styling Examples

### Tailwind CSS Classes

```javascript
// Cart container
<div className="w-96 card flex flex-col">

// Cart item
<div className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">

// Quantity button
<button className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500">

// Remove button
<button className="w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center">

// Cart summary
<div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">

// Checkout button
<button className="w-full btn btn-primary py-3 text-lg">
```

## Common Mistakes to Avoid

### ❌ Don't mutate cart directly
```javascript
// Wrong
cart.push(newItem);
cart[0].quantity = 5;

// Correct
addToCart(newItem);
updateCartQuantity(cart[0].id, 5);
```

### ❌ Don't forget to pass products array
```javascript
// Wrong
updateCartQuantity(productId, quantity);

// Correct
updateCartQuantity(productId, quantity, products);
```

### ❌ Don't ignore stock validation
```javascript
// Wrong
const handleAdd = () => {
    addToCart(product); // No stock check
};

// Correct
const handleAdd = () => {
    if (product.stock_quantity > 0) {
        addToCart(product);
    }
};
```

### ❌ Don't forget error handling
```javascript
// Wrong
const handleCheckout = async () => {
    await api.post('/sales', saleData);
};

// Correct
const handleCheckout = async () => {
    try {
        await api.post('/sales', saleData);
        success('Sale completed!');
    } catch (err) {
        error(err.response?.data?.message || 'Failed to process sale');
    }
};
```

## Tips & Tricks

### 1. Use `isInCart` for conditional rendering
```javascript
{isInCart(product.id) ? (
    <span className="in-cart-badge">In Cart</span>
) : (
    <button onClick={() => addToCart(product)}>Add to Cart</button>
)}
```

### 2. Use `getCartItem` for quantity display
```javascript
const cartItem = getCartItem(product.id);
if (cartItem) {
    return <span>{cartItem.quantity} in cart</span>;
}
```

### 3. Use `refreshCart` after product updates
```javascript
useEffect(() => {
    fetchProducts().then(products => {
        setProducts(products);
        refreshCart(products); // Update cart with latest data
    });
}, []);
```

### 4. Use `validateCart` before checkout
```javascript
const handleCheckout = () => {
    const errors = validateCart(products);
    if (errors.length > 0) {
        error('Some items are out of stock');
        return;
    }
    // Proceed with checkout
};
```

### 5. Use `getCartItemCount` for badges
```javascript
const itemCount = getCartItemCount();
if (itemCount > 0) {
    return <span className="badge">{itemCount}</span>;
}
```

## Resources

- [Full Implementation Guide](./CART_SYSTEM_IMPLEMENTATION.md)
- [React Context API Documentation](https://react.dev/reference/react/useContext)
- [localStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)

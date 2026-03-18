/**
 * Product Form Component
 * 
 * Form for creating and editing products
 */

import React, { useState, useEffect } from 'react';

const ProductForm = ({ product, categories, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        barcode: '',
        category_id: '',
        description: '',
        price: '',
        cost_price: '',
        stock_quantity: '',
        min_stock_level: '',
        unit: 'piece',
        is_active: true
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Populate form if editing
    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || '',
                sku: product.sku || '',
                barcode: product.barcode || '',
                category_id: product.category_id || '',
                description: product.description || '',
                price: product.price || '',
                cost_price: product.cost_price || '',
                stock_quantity: product.stock_quantity || '',
                min_stock_level: product.min_stock_level || '',
                unit: product.unit || 'piece',
                is_active: product.is_active !== false
            });
        }
    }, [product]);

    // Handle input change
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    // Validate form
    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Product name is required';
        }

        if (!formData.sku.trim()) {
            newErrors.sku = 'SKU is required';
        }

        if (!formData.price || parseFloat(formData.price) <= 0) {
            newErrors.price = 'Valid price is required';
        }

        if (formData.cost_price && parseFloat(formData.cost_price) < 0) {
            newErrors.cost_price = 'Cost price cannot be negative';
        }

        if (formData.stock_quantity && parseInt(formData.stock_quantity) < 0) {
            newErrors.stock_quantity = 'Stock quantity cannot be negative';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsSubmitting(true);

        // Map frontend field names to backend expected field names
        // Frontend: price -> Backend: selling_price
        // Frontend: stock_quantity -> Backend: quantity_in_stock
        // Frontend: min_stock_level -> Backend: reorder_level
        const submitData = {
            name: formData.name,
            sku: formData.sku,
            barcode: formData.barcode || null,
            category_id: formData.category_id ? parseInt(formData.category_id) : null,
            description: formData.description || null,
            selling_price: parseFloat(formData.price) || 0,
            cost_price: parseFloat(formData.cost_price) || 0,
            quantity_in_stock: parseInt(formData.stock_quantity) || 0,
            reorder_level: parseInt(formData.min_stock_level) || 10,
            unit: formData.unit,
            is_active: formData.is_active
        };

        await onSave(submitData);
        setIsSubmitting(false);
    };

    return (
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Name */}
                <div className="md:col-span-2">
                    <label className="form-label">Product Name *</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`form-input ${errors.name ? 'border-red-500' : ''}`}
                        placeholder="Enter product name"
                    />
                    {errors.name && <p className="form-error">{errors.name}</p>}
                </div>

                {/* SKU */}
                <div>
                    <label className="form-label">SKU *</label>
                    <input
                        type="text"
                        name="sku"
                        value={formData.sku}
                        onChange={handleChange}
                        className={`form-input ${errors.sku ? 'border-red-500' : ''}`}
                        placeholder="e.g., PRD-001"
                    />
                    {errors.sku && <p className="form-error">{errors.sku}</p>}
                </div>

                {/* Barcode */}
                <div>
                    <label className="form-label">Barcode</label>
                    <input
                        type="text"
                        name="barcode"
                        value={formData.barcode}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="Enter barcode (optional)"
                    />
                </div>

                {/* Category */}
                <div>
                    <label className="form-label">Category</label>
                    <select
                        name="category_id"
                        value={formData.category_id}
                        onChange={handleChange}
                        className="form-input"
                    >
                        <option value="">Select category</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Unit */}
                <div>
                    <label className="form-label">Unit</label>
                    <select
                        name="unit"
                        value={formData.unit}
                        onChange={handleChange}
                        className="form-input"
                    >
                        <option value="piece">Piece</option>
                        <option value="kg">Kilogram (kg)</option>
                        <option value="g">Gram (g)</option>
                        <option value="l">Liter (l)</option>
                        <option value="ml">Milliliter (ml)</option>
                        <option value="box">Box</option>
                        <option value="pack">Pack</option>
                    </select>
                </div>

                {/* Price */}
                <div>
                    <label className="form-label">Selling Price *</label>
                    <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        className={`form-input ${errors.price ? 'border-red-500' : ''}`}
                        placeholder="0.00"
                    />
                    {errors.price && <p className="form-error">{errors.price}</p>}
                </div>

                {/* Cost Price */}
                <div>
                    <label className="form-label">Cost Price</label>
                    <input
                        type="number"
                        name="cost_price"
                        value={formData.cost_price}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        className={`form-input ${errors.cost_price ? 'border-red-500' : ''}`}
                        placeholder="0.00"
                    />
                    {errors.cost_price && <p className="form-error">{errors.cost_price}</p>}
                </div>

                {/* Stock Quantity */}
                <div>
                    <label className="form-label">Stock Quantity</label>
                    <input
                        type="number"
                        name="stock_quantity"
                        value={formData.stock_quantity}
                        onChange={handleChange}
                        min="0"
                        className={`form-input ${errors.stock_quantity ? 'border-red-500' : ''}`}
                        placeholder="0"
                    />
                    {errors.stock_quantity && <p className="form-error">{errors.stock_quantity}</p>}
                </div>

                {/* Min Stock Level */}
                <div>
                    <label className="form-label">Min Stock Level</label>
                    <input
                        type="number"
                        name="min_stock_level"
                        value={formData.min_stock_level}
                        onChange={handleChange}
                        min="0"
                        className="form-input"
                        placeholder="10"
                    />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                    <label className="form-label">Description</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={3}
                        className="form-input"
                        placeholder="Product description (optional)"
                    />
                </div>

                {/* Is Active */}
                <div className="md:col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            name="is_active"
                            checked={formData.is_active}
                            onChange={handleChange}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Active product</span>
                    </label>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                    type="button"
                    onClick={onCancel}
                    className="btn btn-secondary"
                    disabled={isSubmitting}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
                </button>
            </div>
        </form>
    );
};

export default ProductForm;

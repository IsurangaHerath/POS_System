/**
 * Product Routes
 * 
 * Routes for product management operations.
 */

const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();

const productController = require('../controllers/productController');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');
const { managerOrAdmin, adminOnly } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/products
 * @desc    Get all products with pagination
 * @access  Private
 */
router.get('/',
    authenticate,
    asyncHandler(productController.getProducts)
);

/**
 * @route   GET /api/products/low-stock
 * @desc    Get low stock products
 * @access  Private
 */
router.get('/low-stock',
    authenticate,
    asyncHandler(productController.getLowStockProducts)
);

/**
 * @route   GET /api/products/barcode/:barcode
 * @desc    Get product by barcode
 * @access  Private
 */
router.get('/barcode/:barcode',
    authenticate,
    asyncHandler(productController.getProductByBarcode)
);

/**
 * @route   GET /api/products/:id
 * @desc    Get product by ID
 * @access  Private
 */
router.get('/:id',
    authenticate,
    asyncHandler(productController.getProductById)
);

/**
 * @route   POST /api/products
 * @desc    Create new product
 * @access  Private (Manager, Admin)
 */
router.post('/',
    authenticate,
    managerOrAdmin,
    [
        body('name')
            .trim()
            .notEmpty()
            .withMessage('Product name is required'),
        body('sku')
            .trim()
            .notEmpty()
            .withMessage('SKU is required'),
        body('selling_price')
            .isFloat({ min: 0 })
            .withMessage('Selling price must be a positive number'),
        body('cost_price')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('Cost price must be a positive number'),
        body('quantity_in_stock')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Quantity must be a non-negative integer'),
        body('category_id')
            .optional()
            .isInt()
            .withMessage('Category ID must be an integer')
    ],
    validateRequest,
    asyncHandler(productController.createProduct)
);

/**
 * @route   PUT /api/products/:id
 * @desc    Update product
 * @access  Private (Manager, Admin)
 */
router.put('/:id',
    authenticate,
    managerOrAdmin,
    asyncHandler(productController.updateProduct)
);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete product (soft delete)
 * @access  Private (Admin only)
 */
router.delete('/:id',
    authenticate,
    adminOnly,
    asyncHandler(productController.deleteProduct)
);

module.exports = router;

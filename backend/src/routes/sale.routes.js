/**
 * Sale Routes
 * 
 * Routes for sales transaction operations.
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const saleController = require('../controllers/saleController');
const { authenticate } = require('../middleware/auth');
const { managerOrAdmin } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/sales
 * @desc    Get all sales with pagination
 * @access  Private
 */
router.get('/',
    authenticate,
    asyncHandler(saleController.getSales)
);

/**
 * @route   GET /api/sales/:id
 * @desc    Get sale by ID with items
 * @access  Private
 */
router.get('/:id',
    authenticate,
    asyncHandler(saleController.getSaleById)
);

/**
 * @route   POST /api/sales
 * @desc    Create new sale
 * @access  Private
 */
router.post('/',
    authenticate,
    [
        body('items')
            .isArray({ min: 1 })
            .withMessage('At least one item is required'),
        body('items.*.product_id')
            .isInt()
            .withMessage('Product ID is required'),
        body('items.*.quantity')
            .isInt({ min: 1 })
            .withMessage('Quantity must be at least 1'),
        body('payment_method')
            .isIn(['cash', 'card', 'bank_transfer', 'qr', 'credit', 'mixed'])
            .withMessage('Invalid payment method'),
        body('amount_paid')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('Amount paid must be a positive number'),
        body('discount_type')
            .optional()
            .isIn(['fixed', 'percent'])
            .withMessage('Invalid discount type'),
        body('customer_id')
            .optional()
            .isInt()
            .withMessage('Invalid customer'),
        body('payments')
            .optional()
            .isArray()
            .withMessage('Payments must be an array')
    ],
    asyncHandler(saleController.createSale)
);

/**
 * @route   PUT /api/sales/:id/void
 * @desc    Void a sale
 * @access  Private (Manager, Admin)
 */
router.put('/:id/void',
    authenticate,
    managerOrAdmin,
    asyncHandler(saleController.voidSale)
);

/**
 * @route   GET /api/sales/:id/invoice
 * @desc    Generate invoice PDF
 * @access  Private
 */
router.get('/:id/invoice',
    authenticate,
    asyncHandler(saleController.generateInvoice)
);

/**
 * @route   GET /api/sales/:id/receipt
 * @desc    Generate receipt HTML
 * @access  Private
 */
router.get('/:id/receipt',
    authenticate,
    asyncHandler(saleController.generateReceipt)
);

module.exports = router;

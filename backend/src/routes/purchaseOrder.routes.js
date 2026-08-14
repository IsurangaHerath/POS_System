/**
 * Purchase Order Routes
 * 
 * Routes for purchase order operations.
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const purchaseOrderController = require('../controllers/purchaseOrderController');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');
const { managerOrAdmin } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/purchase-orders
 * @desc    Get all purchase orders
 * @access  Private
 */
router.get('/',
    authenticate,
    asyncHandler(purchaseOrderController.getPurchaseOrders)
);

/**
 * @route   GET /api/purchase-orders/:id
 * @desc    Get purchase order by ID
 * @access  Private
 */
router.get('/:id',
    authenticate,
    asyncHandler(purchaseOrderController.getPurchaseOrderById)
);

/**
 * @route   POST /api/purchase-orders
 * @desc    Create new purchase order
 * @access  Private (Manager, Admin)
 */
router.post('/',
    authenticate,
    managerOrAdmin,
    [
        body('supplier_id')
            .isInt()
            .withMessage('Supplier ID is required'),
        body('items')
            .isArray({ min: 1 })
            .withMessage('At least one item is required'),
        body('items.*.product_id')
            .isInt()
            .withMessage('Product ID is required'),
        body('items.*.quantity')
            .isInt({ min: 1 })
            .withMessage('Quantity must be at least 1'),
        body('items.*.unit_cost')
            .isFloat({ min: 0 })
            .withMessage('Unit cost is required')
    ],
    validateRequest,
    asyncHandler(purchaseOrderController.createPurchaseOrder)
);

/**
 * @route   PUT /api/purchase-orders/:id/receive
 * @desc    Receive purchase order items
 * @access  Private (Manager, Admin)
 */
router.put('/:id/receive',
    authenticate,
    managerOrAdmin,
    asyncHandler(purchaseOrderController.receivePurchaseOrder)
);

/**
 * @route   PUT /api/purchase-orders/:id/cancel
 * @desc    Cancel purchase order
 * @access  Private (Manager, Admin)
 */
router.put('/:id/cancel',
    authenticate,
    managerOrAdmin,
    asyncHandler(purchaseOrderController.cancelPurchaseOrder)
);

module.exports = router;

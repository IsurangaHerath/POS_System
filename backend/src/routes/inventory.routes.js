/**
 * Inventory Routes
 * 
 * Routes for inventory management operations.
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const inventoryController = require('../controllers/inventoryController');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');
const { managerOrAdmin } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/inventory
 * @desc    Get inventory status for all products
 * @access  Private
 */
router.get('/',
    authenticate,
    asyncHandler(inventoryController.getInventory)
);

/**
 * @route   GET /api/inventory/logs
 * @desc    Get inventory change logs
 * @access  Private
 */
router.get('/logs',
    authenticate,
    asyncHandler(inventoryController.getInventoryLogs)
);

/**
 * @route   POST /api/inventory/adjust
 * @desc    Adjust inventory manually
 * @access  Private (Manager, Admin)
 */
router.post('/adjust',
    authenticate,
    managerOrAdmin,
    [
        body('product_id')
            .isInt()
            .withMessage('Product ID is required'),
        body('adjustment_type')
            .isIn(['add', 'subtract', 'set'])
            .withMessage('Invalid adjustment type'),
        body('quantity')
            .isInt({ min: 1 })
            .withMessage('Quantity must be at least 1'),
        body('notes')
            .optional()
            .trim()
    ],
    validateRequest,
    asyncHandler(inventoryController.adjustInventory)
);

module.exports = router;

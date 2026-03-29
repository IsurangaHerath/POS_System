/**
 * Settings Routes
 * 
 * Routes for system settings operations.
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const settingsController = require('../controllers/settingsController');
const { authenticate } = require('../middleware/auth');
const { adminOnly } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/settings
 * @desc    Get all settings
 * @access  Private (Admin only)
 */
router.get('/',
    authenticate,
    adminOnly,
    asyncHandler(settingsController.getSettings)
);

/**
 * @route   GET /api/settings/currency
 * @desc    Get currency settings
 * @access  Public (no auth required for app initialization)
 */
// IMPORTANT: This route must be BEFORE /:key to prevent it from being matched as a parameter
router.get('/currency',
    asyncHandler(settingsController.getCurrencySettings)
);

/**
 * @route   PUT /api/settings/currency
 * @desc    Update currency settings
 * @access  Private (Admin only)
 */
router.put('/currency',
    authenticate,
    adminOnly,
    [
        body('currency_code')
            .notEmpty()
            .withMessage('Currency code is required')
    ],
    asyncHandler(settingsController.updateCurrencySettings)
);

/**
 * @route   GET /api/settings/:key
 * @desc    Get setting by key
 * @access  Private (Admin only)
 */
router.get('/:key',
    authenticate,
    adminOnly,
    asyncHandler(settingsController.getSettingByKey)
);

module.exports = router;

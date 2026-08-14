/**
 * Return Routes
 *
 * Routes for sales return and refund operations.
 */

const express = require('express');
const router = express.Router();

const returnController = require('../controllers/returnController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { PERMISSIONS } = require('../utils/constants');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/returns
 * @access  Private
 */
router.get('/', authenticate, asyncHandler(returnController.getReturns));

/**
 * @route   GET /api/returns/:id
 * @access  Private
 */
router.get('/:id', authenticate, asyncHandler(returnController.getReturnById));

/**
 * @route   POST /api/returns
 * @access  Private (requires return permission)
 */
router.post('/',
    authenticate,
    requirePermission(PERMISSIONS.CREATE_RETURNS),
    asyncHandler(returnController.createReturn)
);

module.exports = router;
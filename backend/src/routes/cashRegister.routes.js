/**
 * Cash Register Routes
 *
 * Routes for cashier shift open/close and reconciliation.
 */

const express = require('express');
const router = express.Router();

const cashRegisterController = require('../controllers/cashRegisterController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { PERMISSIONS } = require('../utils/constants');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/cash-registers
 * @access  Private
 */
router.get('/', authenticate, asyncHandler(cashRegisterController.listRegisters));

/**
 * @route   GET /api/cash-registers/current
 * @access  Private
 */
router.get('/current', authenticate, asyncHandler(cashRegisterController.getCurrent));

/**
 * @route   GET /api/cash-registers/:id
 * @access  Private
 */
router.get('/:id', authenticate, asyncHandler(cashRegisterController.getRegister));

/**
 * @route   POST /api/cash-registers/open
 * @access  Private (requires open permission)
 */
router.post('/open',
    authenticate,
    requirePermission(PERMISSIONS.OPEN_CASH_REGISTER),
    asyncHandler(cashRegisterController.openRegister)
);

/**
 * @route   POST /api/cash-registers/:id/close
 * @access  Private (requires close permission)
 */
router.post('/:id/close',
    authenticate,
    requirePermission(PERMISSIONS.CLOSE_CASH_REGISTER),
    asyncHandler(cashRegisterController.closeRegister)
);

module.exports = router;
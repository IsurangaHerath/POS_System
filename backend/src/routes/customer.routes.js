/**
 * Customer Routes
 *
 * Routes for customer management and credit (udharata) payments.
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const customerController = require('../controllers/customerController');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');
const { managerOrAdmin, adminOnly, requirePermission } = require('../middleware/rbac');
const { PERMISSIONS } = require('../utils/constants');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/customers
 * @access  Private
 */
router.get('/', authenticate, asyncHandler(customerController.getCustomers));

/**
 * @route   GET /api/customers/:id
 * @access  Private
 */
router.get('/:id', authenticate, asyncHandler(customerController.getCustomerById));

/**
 * @route   GET /api/customers/:id/statement
 * @access  Private
 */
router.get('/:id/statement', authenticate, asyncHandler(customerController.getStatement));

/**
 * @route   POST /api/customers/:id/payments
 * @access  Private (requires customer credit management)
 */
router.post('/:id/payments', authenticate, asyncHandler(customerController.recordPayment));

/**
 * @route   POST /api/customers
 * @access  Private (Manager, Admin)
 */
router.post('/',
    authenticate,
    requirePermission(PERMISSIONS.MANAGE_CUSTOMERS),
    [
        body('name').trim().notEmpty().withMessage('Customer name is required')
    ],
    validateRequest,
    asyncHandler(customerController.createCustomer)
);

/**
 * @route   PUT /api/customers/:id
 * @access  Private (Manager, Admin)
 */
router.put('/:id',
    authenticate,
    requirePermission(PERMISSIONS.MANAGE_CUSTOMERS),
    asyncHandler(customerController.updateCustomer)
);

/**
 * @route   DELETE /api/customers/:id
 * @access  Private (Admin)
 */
router.delete('/:id', authenticate, adminOnly, asyncHandler(customerController.deleteCustomer));

module.exports = router;
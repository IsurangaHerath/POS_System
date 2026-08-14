/**
 * Expense Routes
 *
 * Routes for expense management.
 */

const express = require('express');
const router = express.Router();

const expenseController = require('../controllers/expenseController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { PERMISSIONS } = require('../utils/constants');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/expenses
 * @access  Private
 */
router.get('/', authenticate, asyncHandler(expenseController.getExpenses));

/**
 * @route   GET /api/expenses/categories
 * @access  Private
 */
router.get('/categories', authenticate, asyncHandler(expenseController.getCategories));

/**
 * @route   POST /api/expenses/categories
 * @access  Private (Manager, Admin)
 */
router.post('/categories',
    authenticate,
    requirePermission(PERMISSIONS.MANAGE_EXPENSES),
    asyncHandler(expenseController.createCategory)
);

/**
 * @route   POST /api/expenses
 * @access  Private (Manager, Admin)
 */
router.post('/',
    authenticate,
    requirePermission(PERMISSIONS.MANAGE_EXPENSES),
    asyncHandler(expenseController.createExpense)
);

/**
 * @route   PUT /api/expenses/:id
 * @access  Private (Manager, Admin)
 */
router.put('/:id',
    authenticate,
    requirePermission(PERMISSIONS.MANAGE_EXPENSES),
    asyncHandler(expenseController.updateExpense)
);

/**
 * @route   DELETE /api/expenses/:id
 * @access  Private (Admin)
 */
router.delete('/:id',
    authenticate,
    requirePermission(PERMISSIONS.MANAGE_EXPENSES),
    asyncHandler(expenseController.deleteExpense)
);

module.exports = router;
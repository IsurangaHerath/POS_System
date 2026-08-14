/**
 * User Routes
 * 
 * Routes for user management operations.
 */

const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();

const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');
const { adminOnly } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/users
 * @desc    Get all users with pagination
 * @access  Private (Admin only)
 */
router.get('/',
    authenticate,
    adminOnly,
    asyncHandler(userController.getUsers)
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin only)
 */
router.get('/:id',
    authenticate,
    adminOnly,
    asyncHandler(userController.getUserById)
);

/**
 * @route   POST /api/users
 * @desc    Create new user
 * @access  Private (Admin only)
 */
router.post('/',
    authenticate,
    adminOnly,
    [
        body('username')
            .trim()
            .isLength({ min: 3, max: 50 })
            .withMessage('Username must be between 3 and 50 characters'),
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Valid email is required'),
        body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters long'),
        body('full_name')
            .trim()
            .notEmpty()
            .withMessage('Full name is required'),
        body('role')
            .isIn(['admin', 'manager', 'cashier'])
            .withMessage('Invalid role'),
        body('phone')
            .optional()
            .trim()
    ],
    validateRequest,
    asyncHandler(userController.createUser)
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (Admin only)
 */
router.put('/:id',
    authenticate,
    adminOnly,
    [
        body('username')
            .optional()
            .trim()
            .isLength({ min: 3, max: 50 })
            .withMessage('Username must be between 3 and 50 characters'),
        body('email')
            .optional()
            .isEmail()
            .normalizeEmail()
            .withMessage('Valid email is required'),
        body('full_name')
            .optional()
            .trim()
            .notEmpty()
            .withMessage('Full name cannot be empty'),
        body('role')
            .optional()
            .isIn(['admin', 'manager', 'cashier'])
            .withMessage('Invalid role'),
        body('phone')
            .optional()
            .trim(),
        body('is_active')
            .optional()
            .isBoolean()
            .withMessage('is_active must be a boolean')
    ],
    validateRequest,
    asyncHandler(userController.updateUser)
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (soft delete)
 * @access  Private (Admin only)
 */
router.delete('/:id',
    authenticate,
    adminOnly,
    asyncHandler(userController.deleteUser)
);

module.exports = router;

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { adminOnly } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateRequest } = require('../middleware/validate');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (self-registration)
 * @access  Public
 */
router.post('/register',
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
            .optional()
            .isIn(['admin', 'manager', 'cashier'])
            .withMessage('Invalid role'),
        body('phone')
            .optional()
            .trim()
    ],
    validateRequest,
    asyncHandler(authController.register)
);

router.post('/login',
    [
        body('username')
            .trim()
            .notEmpty()
            .withMessage('Username is required'),
        body('password')
            .notEmpty()
            .withMessage('Password is required')
    ],
    validateRequest,
    asyncHandler(authController.login)
);

router.post('/logout',
    authenticate,
    asyncHandler(authController.logout)
);

router.post('/refresh',
    [
        body('refreshToken')
            .notEmpty()
            .withMessage('Refresh token is required')
    ],
    validateRequest,
    asyncHandler(authController.refresh)
);

router.get('/me',
    authenticate,
    asyncHandler(authController.getCurrentUser)
);

router.put('/password',
    authenticate,
    [
        body('currentPassword')
            .notEmpty()
            .withMessage('Current password is required'),
        body('newPassword')
            .isLength({ min: 8 })
            .withMessage('New password must be at least 8 characters long'),
        body('confirmPassword')
            .custom((value, { req }) => value === req.body.newPassword)
            .withMessage('Passwords do not match')
    ],
    validateRequest,
    asyncHandler(authController.changePassword)
);

router.post('/reset-password/:userId',
    authenticate,
    adminOnly,
    [
        body('newPassword')
            .isLength({ min: 8 })
            .withMessage('New password must be at least 8 characters long')
    ],
    validateRequest,
    asyncHandler(authController.resetPassword)
);

module.exports = router;

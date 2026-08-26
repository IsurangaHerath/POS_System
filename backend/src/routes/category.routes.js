/**
 * Category Routes
 * 
 * Routes for category management operations.
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const categoryController = require('../controllers/categoryController');
const { authenticate } = require('../middleware/auth');
const { managerOrAdmin, adminOnly } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/categories
 * @desc    Get all categories
 * @access  Private
 */
router.get('/',
    authenticate,
    asyncHandler(categoryController.getCategories)
);

/**
 * @route   GET /api/categories/:id
 * @desc    Get category by ID
 * @access  Private
 */
router.get('/:id',
    authenticate,
    asyncHandler(categoryController.getCategoryById)
);

/**
 * @route   POST /api/categories
 * @desc    Create new category
 * @access  Private (Manager, Admin)
 */
router.post('/',
    authenticate,
    managerOrAdmin,
    [
        body('name')
            .trim()
            .notEmpty()
            .withMessage('Category name is required'),
        body('parent_id')
            .optional({ nullable: true })
            .isInt()
            .withMessage('Parent ID must be an integer')
    ],
    asyncHandler(categoryController.createCategory)
);

/**
 * @route   PUT /api/categories/:id
 * @desc    Update category
 * @access  Private (Manager, Admin)
 */
router.put('/:id',
    authenticate,
    managerOrAdmin,
    asyncHandler(categoryController.updateCategory)
);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Delete category
 * @access  Private (Admin only)
 */
router.delete('/:id',
    authenticate,
    adminOnly,
    asyncHandler(categoryController.deleteCategory)
);

module.exports = router;

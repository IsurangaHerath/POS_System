/**
 * Supplier Routes
 * 
 * Routes for supplier management operations.
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const supplierController = require('../controllers/supplierController');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');
const { managerOrAdmin, adminOnly } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/suppliers
 * @desc    Get all suppliers
 * @access  Private
 */
router.get('/',
    authenticate,
    asyncHandler(supplierController.getSuppliers)
);

/**
 * @route   GET /api/suppliers/:id
 * @desc    Get supplier by ID
 * @access  Private
 */
router.get('/:id',
    authenticate,
    asyncHandler(supplierController.getSupplierById)
);

/**
 * @route   POST /api/suppliers
 * @desc    Create new supplier
 * @access  Private (Manager, Admin)
 */
router.post('/',
    authenticate,
    managerOrAdmin,
    [
        body('name')
            .trim()
            .notEmpty()
            .withMessage('Supplier name is required'),
        body('email')
            .optional()
            .isEmail()
            .withMessage('Valid email is required')
    ],
    validateRequest,
    asyncHandler(supplierController.createSupplier)
);

/**
 * @route   PUT /api/suppliers/:id
 * @desc    Update supplier
 * @access  Private (Manager, Admin)
 */
router.put('/:id',
    authenticate,
    managerOrAdmin,
    asyncHandler(supplierController.updateSupplier)
);

/**
 * @route   DELETE /api/suppliers/:id
 * @desc    Delete supplier
 * @access  Private (Admin only)
 */
router.delete('/:id',
    authenticate,
    adminOnly,
    asyncHandler(supplierController.deleteSupplier)
);

module.exports = router;

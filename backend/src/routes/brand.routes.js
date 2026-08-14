const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const brandController = require('../controllers/brandController');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');
const { requirePermission } = require('../middleware/rbac');
const { PERMISSIONS } = require('../utils/constants');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/',
    authenticate,
    asyncHandler(brandController.getAll)
);

router.get('/:id',
    authenticate,
    asyncHandler(brandController.getById)
);

router.post('/',
    authenticate,
    requirePermission(PERMISSIONS.MANAGE_PRODUCTS),
    [
        body('name').notEmpty().withMessage('Brand name is required')
    ],
    validateRequest,
    asyncHandler(brandController.create)
);

router.put('/:id',
    authenticate,
    requirePermission(PERMISSIONS.EDIT_PRODUCTS),
    asyncHandler(brandController.update)
);

router.delete('/:id',
    authenticate,
    requirePermission(PERMISSIONS.DELETE_PRODUCTS),
    asyncHandler(brandController.delete)
);

module.exports = router;
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const unitController = require('../controllers/unitController');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');
const { requirePermission } = require('../middleware/rbac');
const { PERMISSIONS } = require('../utils/constants');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/',
    authenticate,
    asyncHandler(unitController.getAll)
);

router.get('/all',
    authenticate,
    asyncHandler(unitController.getAll)
);

router.get('/:id',
    authenticate,
    asyncHandler(unitController.getById)
);

router.post('/',
    authenticate,
    requirePermission(PERMISSIONS.MANAGE_PRODUCTS),
    [
        body('name').notEmpty().withMessage('Unit name is required')
    ],
    validateRequest,
    asyncHandler(unitController.create)
);

router.put('/:id',
    authenticate,
    requirePermission(PERMISSIONS.EDIT_PRODUCTS),
    asyncHandler(unitController.update)
);

router.delete('/:id',
    authenticate,
    requirePermission(PERMISSIONS.DELETE_PRODUCTS),
    asyncHandler(unitController.delete)
);

module.exports = router;
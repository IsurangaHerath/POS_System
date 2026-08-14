/**
 * Held Bill Routes
 *
 * Routes for holding and resuming pending bills.
 */

const express = require('express');
const router = express.Router();

const heldBillController = require('../controllers/heldBillController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { PERMISSIONS } = require('../utils/constants');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/', authenticate, asyncHandler(heldBillController.getHeldBills));
router.get('/:id', authenticate, asyncHandler(heldBillController.getHeldBill));

router.post('/',
    authenticate,
    requirePermission(PERMISSIONS.HOLD_BILLS),
    asyncHandler(heldBillController.createHeldBill)
);

router.delete('/:id', authenticate, asyncHandler(heldBillController.deleteHeldBill));

module.exports = router;
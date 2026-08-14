/**
 * Report Routes
 * 
 * Routes for report generation operations.
 */

const express = require('express');
const router = express.Router();

const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validate');
const { managerOrAdmin } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/reports/daily-sales
 * @desc    Get daily sales report
 * @access  Private (Manager, Admin)
 */
router.get('/daily-sales',
    authenticate,
    managerOrAdmin,
    asyncHandler(reportController.getDailySalesReport)
);

/**
 * @route   GET /api/reports/monthly-sales
 * @desc    Get monthly sales report
 * @access  Private (Manager, Admin)
 */
router.get('/monthly-sales',
    authenticate,
    managerOrAdmin,
    asyncHandler(reportController.getMonthlySalesReport)
);

/**
 * @route   GET /api/reports/product-performance
 * @desc    Get product performance report
 * @access  Private (Manager, Admin)
 */
router.get('/product-performance',
    authenticate,
    managerOrAdmin,
    asyncHandler(reportController.getProductPerformanceReport)
);

/**
 * @route   GET /api/reports/export/csv
 * @desc    Export report to CSV
 * @access  Private (Manager, Admin)
 */
router.get('/export/csv',
    authenticate,
    managerOrAdmin,
    asyncHandler(reportController.exportToCSV)
);

/**
 * @route   GET /api/reports/export/pdf
 * @desc    Export report to PDF
 * @access  Private (Manager, Admin)
 */
router.get('/export/pdf',
    authenticate,
    managerOrAdmin,
    asyncHandler(reportController.exportToPDF)
);

module.exports = router;

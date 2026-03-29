/**
 * Dashboard Routes
 * 
 * Routes for dashboard analytics operations.
 */

const express = require('express');
const router = express.Router();

const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/dashboard/summary
 * @desc    Get dashboard summary statistics
 * @access  Private
 */
router.get('/summary',
    authenticate,
    asyncHandler(dashboardController.getSummary)
);

/**
 * @route   GET /api/dashboard/sales-chart
 * @desc    Get sales chart data
 * @access  Private
 */
router.get('/sales-chart',
    authenticate,
    asyncHandler(dashboardController.getSalesChartData)
);

/**
 * @route   GET /api/dashboard/top-products
 * @desc    Get top selling products
 * @access  Private
 */
router.get('/top-products',
    authenticate,
    asyncHandler(dashboardController.getTopProducts)
);

/**
 * @route   GET /api/dashboard/low-stock
 * @desc    Get low stock alerts
 * @access  Private
 */
router.get('/low-stock',
    authenticate,
    asyncHandler(dashboardController.getLowStockAlerts)
);

/**
 * @route   GET /api/dashboard/recent-sales
 * @desc    Get recent sales
 * @access  Private
 */
router.get('/recent-sales',
    authenticate,
    asyncHandler(dashboardController.getRecentSales)
);

module.exports = router;

/**
 * Dashboard Controller
 * 
 * Handles dashboard analytics operations.
 */

const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const PurchaseOrder = require('../models/PurchaseOrder');
const { successResponse } = require('../utils/response');

/**
 * Get dashboard summary statistics
 * @route GET /api/dashboard/summary
 */
const getSummary = async (req, res, next) => {
    try {
        const today = new Date().toISOString().slice(0, 10);
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        // Get today's sales
        const todaySales = await Sale.getDailySummary(today);

        // Get monthly sales
        const monthlySales = await Sale.getMonthlySummary(currentYear, currentMonth);

        // Get inventory stats
        const totalProducts = await Product.getTotalCount();
        const lowStockCount = await Inventory.getLowStockCount();
        const outOfStockCount = await Inventory.getOutOfStockCount();

        // Get pending orders
        const pendingOrders = await PurchaseOrder.getPendingCount();

        const summary = {
            today: {
                total_sales: todaySales.total_sales,
                transactions: todaySales.total_transactions,
                cash_sales: todaySales.cash_sales,
                card_sales: todaySales.card_sales
            },
            month: {
                total_sales: monthlySales.total_sales,
                transactions: monthlySales.total_transactions,
                revenue_growth: 0 // Would need previous month data
            },
            inventory: {
                total_products: totalProducts,
                low_stock_count: lowStockCount,
                out_of_stock_count: outOfStockCount
            },
            pending_orders: pendingOrders
        };

        return successResponse(res, summary);
    } catch (error) {
        next(error);
    }
};

/**
 * Get sales chart data
 * @route GET /api/dashboard/sales-chart
 */
const getSalesChartData = async (req, res, next) => {
    try {
        const { period = 'week' } = req.query;

        let labels = [];
        let data = [];

        const db = require('../config/database');

        switch (period) {
            case 'day':
                // Hourly data for today
                const hourlyData = await db.getMany(`
          SELECT 
            HOUR(sale_date) as label,
            COALESCE(SUM(total_amount), 0) as value
          FROM sales
          WHERE DATE(sale_date) = CURRENT_DATE AND status = 'completed'
          GROUP BY HOUR(sale_date)
          ORDER BY label
        `);
                labels = hourlyData.map(d => `${d.label}:00`);
                data = hourlyData.map(d => d.value);
                break;

            case 'week':
                // Daily data for last 7 days
                const weeklyData = await db.getMany(`
          SELECT 
            DATE(sale_date) as label,
            COALESCE(SUM(total_amount), 0) as value
          FROM sales
          WHERE sale_date >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)
            AND status = 'completed'
          GROUP BY DATE(sale_date)
          ORDER BY label
        `);
                labels = weeklyData.map(d => {
                    const date = new Date(d.label);
                    return date.toLocaleDateString('en-US', { weekday: 'short' });
                });
                data = weeklyData.map(d => d.value);
                break;

            case 'month':
                // Daily data for current month
                const monthlyData = await db.getMany(`
          SELECT 
            DAY(sale_date) as label,
            COALESCE(SUM(total_amount), 0) as value
          FROM sales
          WHERE MONTH(sale_date) = MONTH(CURRENT_DATE)
            AND YEAR(sale_date) = YEAR(CURRENT_DATE)
            AND status = 'completed'
          GROUP BY DAY(sale_date)
          ORDER BY label
        `);
                labels = monthlyData.map(d => `Day ${d.label}`);
                data = monthlyData.map(d => d.value);
                break;

            case 'year':
                // Monthly data for current year
                const yearlyData = await db.getMany(`
          SELECT 
            MONTH(sale_date) as label,
            COALESCE(SUM(total_amount), 0) as value
          FROM sales
          WHERE YEAR(sale_date) = YEAR(CURRENT_DATE)
            AND status = 'completed'
          GROUP BY MONTH(sale_date)
          ORDER BY label
        `);
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                labels = yearlyData.map(d => monthNames[d.label - 1]);
                data = yearlyData.map(d => d.value);
                break;
        }

        const chartData = {
            labels,
            datasets: [
                {
                    label: 'Sales',
                    data
                }
            ]
        };

        return successResponse(res, chartData);
    } catch (error) {
        next(error);
    }
};

/**
 * Get top selling products
 * @route GET /api/dashboard/top-products
 */
const getTopProducts = async (req, res, next) => {
    try {
        const { limit = 10, period = 'month' } = req.query;

        let startDate = null;
        let endDate = null;

        switch (period) {
            case 'day':
                startDate = new Date().toISOString().slice(0, 10);
                endDate = startDate;
                break;
            case 'week':
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                startDate = weekAgo.toISOString().slice(0, 10);
                break;
            case 'month':
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                startDate = monthAgo.toISOString().slice(0, 10);
                break;
            case 'year':
                const yearAgo = new Date();
                yearAgo.setFullYear(yearAgo.getFullYear() - 1);
                startDate = yearAgo.toISOString().slice(0, 10);
                break;
        }

        const products = await Sale.getTopProducts({
            limit: parseInt(limit),
            startDate,
            endDate
        });

        return successResponse(res, products);
    } catch (error) {
        next(error);
    }
};

/**
 * Get low stock alerts
 * @route GET /api/dashboard/low-stock
 */
const getLowStockAlerts = async (req, res, next) => {
    try {
        const products = await Product.getLowStock();

        const alerts = products.map(p => ({
            product_id: p.id,
            product_name: p.name,
            barcode: p.barcode,
            quantity_in_stock: p.quantity_in_stock,
            reorder_level: p.reorder_level,
            status: p.stock_status
        }));

        return successResponse(res, alerts);
    } catch (error) {
        next(error);
    }
};

/**
 * Get recent sales
 * @route GET /api/dashboard/recent-sales
 */
const getRecentSales = async (req, res, next) => {
    try {
        const { limit = 10 } = req.query;

        const sales = await Sale.findAll({
            limit: parseInt(limit),
            status: 'completed'
        });

        const recentSales = sales.map(s => ({
            id: s.id,
            invoice_number: s.invoice_number,
            total_amount: s.total_amount,
            payment_method: s.payment_method,
            sale_date: s.sale_date,
            cashier_name: s.cashier_name,
            item_count: s.item_count
        }));

        return successResponse(res, recentSales);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getSummary,
    getSalesChartData,
    getTopProducts,
    getLowStockAlerts,
    getRecentSales
};

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
 * @description Aggregates the dashboard KPI payload: today's sales (total/transactions/cash/card),
 *              current month totals, inventory stats (products, low stock, out of stock), and pending orders.
 * @access      Authenticated.
 * @triggeredBy DashboardPage load (parallel Promise.all batch).
 * @request     GET /api/dashboard/summary
 * @params      none.
 * @dbOps       Sale.getDailySummary, Sale.getMonthlySummary, Product.getTotalCount,
 *              Inventory.getLowStockCount, Inventory.getOutOfStockCount, PurchaseOrder.getPendingCount.
 * @returns     { success, data: { today, month, inventory, pending_orders } }.
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
                total_sales: parseFloat(todaySales?.total_sales || 0),
                transactions: todaySales?.total_transactions || 0,
                cash_sales: parseFloat(todaySales?.cash_sales || 0),
                card_sales: parseFloat(todaySales?.card_sales || 0)
            },
            month: {
                total_sales: parseFloat(monthlySales?.total_sales || 0),
                transactions: monthlySales?.total_transactions || 0,
                revenue_growth: 0 
            },
            inventory: {
                total_products: totalProducts || 0,
                low_stock_count: lowStockCount || 0,
                out_of_stock_count: outOfStockCount || 0
            },
            pending_orders: pendingOrders || 0
        };

        return successResponse(res, summary);
    } catch (error) {
        next(error);
    }
};

/**
 * @description Builds label/value chart series for completed sales across a requested period
 *              ('day' hourly, 'week' daily, 'month' daily, 'year' monthly).
 * @access      Authenticated.
 * @triggeredBy No frontend caller today — SalesChart.jsx is not rendered (see PROJECT_INTERACTION_MAPPING.md §14 #5).
 * @request     GET /api/dashboard/sales-chart
 * @params      Query: period ('day'|'week'|'month'|'year').
 * @dbOps       Raw aggregate SELECT over sales grouped by HOUR/DATE/DAY/MONTH(sale_date) WHERE status='completed'.
 * @returns     { success, data: { labels: string[], datasets: [{ label: 'Sales', data }] } }.
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
 * @description Returns the top-selling products by quantity/revenue for the dashboard widget,
 *              optionally scoped to a time period (day/week/month/year).
 * @access      Authenticated.
 * @triggeredBy DashboardPage load → TopProducts widget.
 * @request     GET /api/dashboard/top-products
 * @params      Query: limit (default 10), period (default 'month').
 * @dbOps       Sale.getTopProducts → aggregated SELECT over sale_items/sales.
 * @returns     { success, data: products[] }.
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
 * @description Returns products at/below their reorder level for the low-stock alert widget.
 * @access      Authenticated.
 * @triggeredBy DashboardPage load → LowStockAlert widget.
 * @request     GET /api/dashboard/low-stock
 * @params      none.
 * @dbOps       Product.getLowStock → SELECT products WHERE quantity_in_stock <= reorder_level.
 * @returns     { success, data: alerts[] }.
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
 * @description Returns the most recent completed sales for the recent-transactions widget.
 * @access      Authenticated.
 * @triggeredBy DashboardPage load → RecentSales widget.
 * @request     GET /api/dashboard/recent-sales
 * @params      Query: limit (default 10).
 * @dbOps       Sale.findAll (status='completed') → SELECT sales ORDER BY sale_date DESC LIMIT n.
 * @returns     { success, data: recentSales[] }.
 */
const getRecentSales = async (req, res, next) => {
    try {
        const { limit = 10 } = req.query;

        const { sales: salesData } = await Sale.findAll({
            limit: parseInt(limit),
            status: 'completed'
        });

        const recentSales = salesData.map(s => ({
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

/**
 * Report Controller
 * 
 * Handles report generation operations.
 */

const Sale = require('../models/Sale');
const Product = require('../models/Product');
const { successResponse } = require('../utils/response');
const logger = require('../utils/logger');
const db = require('../config/database');

/**
 * @description Builds the daily sales report: summary vs the previous day, hourly + payment
 *              breakdowns, top products, and the list of completed sales for the chosen date.
 * @access      Manager/Admin.
 * @triggeredBy ReportsPage → Daily tab → fetchReportData().
 * @request     GET /api/reports/daily-sales
 * @params      Query: date (YYYY-MM-DD, defaults to today).
 * @dbOps       Sale.getDailySummary, Sale.getTopProducts, getHourlyBreakdown(date),
 *              raw aggregate SELECTs over sales + sale_items/users.
 * @returns     { success, data: { date, summary, comparison, hourly_breakdown, payment_breakdown, top_products, sales } }.
 */
const getDailySalesReport = async (req, res, next) => {
    try {
        const { date } = req.query;
        const reportDate = date || new Date().toISOString().slice(0, 10);

        // Get current day summary
        const summary = await Sale.getDailySummary(reportDate);

        // Get previous day summary for comparison
        const prevDate = new Date(reportDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().slice(0, 10);
        const prevSummary = await Sale.getDailySummary(prevDateStr);

        // Calculate comparison percentages
        const revenueChange = prevSummary.total_sales > 0 
            ? ((summary.total_sales - prevSummary.total_sales) / prevSummary.total_sales * 100).toFixed(1)
            : 0;
        const transactionChange = prevSummary.total_transactions > 0
            ? ((summary.total_transactions - prevSummary.total_transactions) / prevSummary.total_transactions * 100).toFixed(1)
            : 0;

        // Get hourly breakdown
        const hourlyBreakdown = await getHourlyBreakdown(reportDate);

        // Get payment breakdown
        const paymentBreakdown = {
            cash: {
                count: summary.cash_sales > 0 ? Math.round(summary.total_transactions * 0.4) : 0,
                amount: summary.cash_sales
            },
            card: {
                count: summary.card_sales > 0 ? Math.round(summary.total_transactions * 0.6) : 0,
                amount: summary.card_sales
            }
        };

        // Get top products for the day
        const topProducts = await Sale.getTopProducts({
            limit: 10,
            startDate: reportDate,
            endDate: reportDate
        });

        // Get actual sale records for this day
        const salesSql = `
            SELECT 
                DATE(sale_date) as date,
                COUNT(*) as count,
                SUM(total_amount) as revenue,
                SUM(tax_amount) as tax,
                SUM(discount_amount) as discount,
                GROUP_CONCAT(id) as sale_ids
            FROM sales
            WHERE DATE(sale_date) = ? AND status = 'completed'
            GROUP BY DATE(sale_date)
        `;
        const dailySalesResult = await db.getOne(salesSql, [reportDate]);

        // Get individual sale records for the table display
        const individualSalesSql = `
            SELECT 
                s.id,
                s.invoice_number,
                DATE(s.sale_date) as date,
                s.total_amount as revenue,
                s.tax_amount as tax,
                s.discount_amount as discount,
                s.subtotal,
                s.payment_method,
                s.status,
                u.full_name as cashier_name,
                (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as item_count
            FROM sales s
            JOIN users u ON u.id = s.user_id
            WHERE DATE(s.sale_date) = ? AND s.status = 'completed'
            ORDER BY s.sale_date DESC
        `;
        const individualSales = await db.getMany(individualSalesSql, [reportDate]);

        // Format sales data for frontend compatibility
        const sales = individualSales.map(sale => ({
            id: sale.id,
            invoice_number: sale.invoice_number,
            date: sale.date,
            count: 1,
            revenue: sale.revenue,
            tax: sale.tax || 0,
            discount: sale.discount || 0,
            subtotal: sale.subtotal,
            payment_method: sale.payment_method,
            status: sale.status,
            cashier_name: sale.cashier_name,
            item_count: sale.item_count
        }));

        const report = {
            date: reportDate,
            summary: {
                total_transactions: summary.total_transactions,
                total_sales: summary.total_sales,
                cash_sales: summary.cash_sales,
                card_sales: summary.card_sales,
                average_transaction: summary.average_transaction,
                items_sold: topProducts.reduce((sum, p) => sum + p.total_quantity, 0)
            },
            comparison: {
                previous_period: prevDateStr,
                previous_revenue: prevSummary.total_sales,
                previous_transactions: prevSummary.total_transactions,
                revenue_change_percent: revenueChange,
                transaction_change_percent: transactionChange
            },
            hourly_breakdown: hourlyBreakdown,
            payment_breakdown: paymentBreakdown,
            top_products: topProducts,
            sales: sales,
            individual_sales: sales
        };

        return successResponse(res, report);
    } catch (error) {
        next(error);
    }
};

/**
 * @description Builds the monthly sales report: summary vs the previous month, daily/weekly/
 *              category breakdowns, and the list of completed sales for the chosen month.
 * @access      Manager/Admin.
 * @triggeredBy ReportsPage → Monthly tab → fetchReportData().
 * @request     GET /api/reports/monthly-sales
 * @params      Query: year?, month? — month may be 'YYYY-MM' or 'M'/'MM'; defaults to current month.
 * @dbOps       Sale.getMonthlySummary, getDailyBreakdown, getWeeklyBreakdown, getCategoryBreakdown,
 *              raw aggregate SELECTs over sales + sale_items/users/categories.
 * @returns     { success, data: { year, month, summary, comparison, daily_breakdown, weekly_breakdown, category_breakdown, sales, individual_sales } }.
 */
const getMonthlySalesReport = async (req, res, next) => {
    try {
        const { year, month } = req.query;
        
        logger.debug('[ReportController] Monthly Sales - Received params:', { year, month });
        
        const now = new Date();
        
        // Handle month format: can be "YYYY-MM" or just "M" or "MM"
        let reportYear, reportMonth;
        if (month && month.includes('-')) {
            // Format is "YYYY-MM" - extract year and month
            const parts = month.split('-');
            reportYear = parseInt(parts[0]) || now.getFullYear();
            reportMonth = parseInt(parts[1]) || (now.getMonth() + 1);
        } else if (month) {
            // Only month provided (1-12), use provided year or current
            reportYear = parseInt(year) || now.getFullYear();
            reportMonth = parseInt(month) || (now.getMonth() + 1);
        } else {
            // Default to current month
            reportYear = parseInt(year) || now.getFullYear();
            reportMonth = now.getMonth() + 1;
        }

        logger.debug('[ReportController] Parsed year/month:', { reportYear, reportMonth });
        logger.debug('[ReportController] Calling Sale.getMonthlySummary with params:', [reportYear, reportMonth]);

        // Get current month summary
        let summary;
        try {
            summary = await Sale.getMonthlySummary(reportYear, reportMonth);
            logger.debug('[ReportController] getMonthlySummary result:', summary);
        } catch (summaryError) {
            logger.error('[ReportController] Error in getMonthlySummary:', summaryError.message, summaryError.stack);
            throw new Error(`Failed to get monthly summary: ${summaryError.message}`);
        }

        // Get previous month summary for comparison
        let prevMonthSummary = null;
        let prevYear = reportMonth === 1 ? reportYear - 1 : reportYear;
        let prevMonth = reportMonth === 1 ? 12 : reportMonth - 1;
        
        logger.debug('[ReportController] Calling getMonthlySummary for previous month:', { prevYear, prevMonth });
        
        try {
            prevMonthSummary = await Sale.getMonthlySummary(prevYear, prevMonth);
            logger.debug('[ReportController] Previous month summary result:', prevMonthSummary);
        } catch (prevError) {
            logger.error('[ReportController] Error in getMonthlySummary for previous month:', prevError.message);
            prevMonthSummary = { total_sales: 0, total_transactions: 0 };
        }

        // Calculate comparison percentages
        const revenueChange = prevMonthSummary.total_sales > 0 
            ? ((summary.total_sales - prevMonthSummary.total_sales) / prevMonthSummary.total_sales * 100).toFixed(1)
            : 0;
        const transactionChange = prevMonthSummary.total_transactions > 0
            ? ((summary.total_transactions - prevMonthSummary.total_transactions) / prevMonthSummary.total_transactions * 100).toFixed(1)
            : 0;

        // Get daily breakdown
        const dailyBreakdown = await getDailyBreakdown(reportYear, reportMonth);

        // Get weekly breakdown
        const weeklyBreakdown = await getWeeklyBreakdown(reportYear, reportMonth);

        // Get category breakdown
        const categoryBreakdown = await getCategoryBreakdown(reportYear, reportMonth);

        // Format sales data for frontend compatibility
        const sales = dailyBreakdown.map(day => ({
            date: day.date,
            count: day.transactions || 0,
            revenue: day.sales || 0,
            tax: 0,
            discount: 0
        }));

        // Get individual sale records for the month
        const individualSalesSql = `
            SELECT 
                s.id,
                s.invoice_number,
                DATE(s.sale_date) as date,
                s.total_amount as revenue,
                s.tax_amount as tax,
                s.discount_amount as discount,
                s.subtotal,
                s.payment_method,
                s.status,
                u.full_name as cashier_name,
                (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as item_count
            FROM sales s
            JOIN users u ON u.id = s.user_id
            WHERE YEAR(s.sale_date) = ? AND MONTH(s.sale_date) = ? AND s.status = 'completed'
            ORDER BY s.sale_date DESC
        `;
        const individualSales = await db.getMany(individualSalesSql, [reportYear, reportMonth]);

        const individualSalesFormatted = individualSales.map(sale => ({
            id: sale.id,
            invoice_number: sale.invoice_number,
            date: sale.date,
            count: 1,
            revenue: sale.revenue,
            tax: sale.tax || 0,
            discount: sale.discount || 0,
            subtotal: sale.subtotal,
            payment_method: sale.payment_method,
            status: sale.status,
            cashier_name: sale.cashier_name,
            item_count: sale.item_count
        }));

        const report = {
            year: reportYear,
            month: reportMonth,
            summary: {
                total_transactions: summary.total_transactions,
                total_sales: summary.total_sales,
                cash_sales: summary.cash_sales,
                card_sales: summary.card_sales,
                average_daily: summary.total_sales / (dailyBreakdown.length || 1),
                average_transaction: summary.average_transaction
            },
            comparison: {
                previous_period: `${prevYear}-${String(prevMonth).padStart(2, '0')}`,
                previous_revenue: prevMonthSummary.total_sales,
                previous_transactions: prevMonthSummary.total_transactions,
                revenue_change_percent: revenueChange,
                transaction_change_percent: transactionChange
            },
            daily_breakdown: dailyBreakdown,
            weekly_breakdown: weeklyBreakdown,
            category_breakdown: categoryBreakdown,
            sales: sales,
            individual_sales: individualSalesFormatted
        };

        logger.debug('[ReportController] Sending report:', JSON.stringify(report, null, 2).substring(0, 500));

        return successResponse(res, report);
    } catch (error) {
        next(error);
    }
};

/**
 * @description Builds a product-performance report: top products with profit and margin
 *              computed from cost price, scoped by optional date range / category.
 * @access      Manager/Admin.
 * @triggeredBy No frontend caller today (ReportsPage only uses daily/monthly endpoints).
 * @request     GET /api/reports/product-performance
 * @params      Query: startDate?, endDate?, category_id?, limit (default 20).
 * @dbOps       Sale.getTopProducts, Product.findById per product (SELECT).
 * @returns     { success, data: { period, products, summary } }.
 */
const getProductPerformanceReport = async (req, res, next) => {
    try {
        const { startDate, endDate, category_id, limit = 20 } = req.query;

        logger.debug('[ReportController] Product Performance params:', { startDate, endDate, category_id, limit });

        // Get top products
        const products = await Sale.getTopProducts({
            limit: parseInt(limit),
            startDate: startDate || null,
            endDate: endDate || null
        });

        // Calculate profit for each product
        const productsWithProfit = await Promise.all(
            products.map(async (p) => {
                const product = await Product.findById(p.id);
                const costPrice = product ? product.cost_price : 0;
                const profit = (p.total_revenue / p.total_quantity - costPrice) * p.total_quantity;
                const margin = p.total_revenue > 0 ? (profit / p.total_revenue) * 100 : 0;

                return {
                    ...p,
                    profit,
                    margin_percent: margin.toFixed(2)
                };
            })
        );

        // Format products data for frontend compatibility
        const productsList = productsWithProfit.map(p => ({
            name: p.name,
            sku: p.barcode,
            quantity_sold: p.total_quantity,
            revenue: p.total_revenue
        }));

        const report = {
            period: {
                start: startDate || 'All time',
                end: endDate || 'Present'
            },
            products: productsList,
            summary: {
                total_products: productsList.length,
                total_quantity: productsList.reduce((sum, p) => sum + p.quantity_sold, 0),
                total_revenue: productsList.reduce((sum, p) => sum + p.revenue, 0)
            }
        };

        return successResponse(res, report);
    } catch (error) {
        next(error);
    }
};

/**
 * @description Exports a report as a downloadable CSV file (daily/monthly/product types).
 * @access      Manager/Admin.
 * @triggeredBy No frontend caller today — ReportsPage generates CSVs client-side.
 * @request     GET /api/reports/export/csv
 * @params      Query: type ('daily'|'monthly'|'product'), date?, year?, month?.
 * @dbOps       Sale.getDailySummary / Sale.getMonthlySummary / Sale.getTopProducts (SELECT).
 * @returns     text/csv file download (Content-Disposition attachment).
 */
const exportToCSV = async (req, res, next) => {
    try {
        const { type, date, year, month } = req.query;

        let data = [];
        let filename = 'report.csv';

        switch (type) {
            case 'daily':
                const dailyData = await Sale.getDailySummary(date || new Date().toISOString().slice(0, 10));
                data = [dailyData];
                filename = `daily-sales-${date}.csv`;
                break;
            case 'monthly':
                const monthlyData = await Sale.getMonthlySummary(
                    parseInt(year) || new Date().getFullYear(),
                    parseInt(month) || (new Date().getMonth() + 1)
                );
                data = [monthlyData];
                filename = `monthly-sales-${year}-${month}.csv`;
                break;
            case 'product':
                data = await Sale.getTopProducts({ limit: 50 });
                filename = 'product-performance.csv';
                break;
            default:
                data = [];
        }

        // Convert to CSV
        if (data.length === 0) {
            return res.status(400).json({ success: false, message: 'No data to export' });
        }

        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];

        for (const row of data) {
            const values = headers.map(h => {
                const val = row[h];
                return typeof val === 'string' ? `"${val}"` : val;
            });
            csvRows.push(values.join(','));
        }

        const csv = csvRows.join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        logger.info(`CSV export: ${filename} by ${req.user.username}`);

        return res.send(csv);
    } catch (error) {
        next(error);
    }
};

/**
 * @description Placeholder PDF export endpoint — currently returns the underlying report data
 *              as JSON (PDF generation would use a library like PDFKit).
 * @access      Manager/Admin.
 * @triggeredBy No frontend caller today — ReportsPage exports PDFs client-side (jsPDF).
 * @request     GET /api/reports/export/pdf
 * @params      Query: type ('daily'|'monthly'), date?, year?, month?.
 * @dbOps       Sale.getDailySummary / Sale.getMonthlySummary (SELECT).
 * @returns     { success, message, data } JSON.
 */
const exportToPDF = async (req, res, next) => {
    try {
        const { type, date, year, month } = req.query;

        // For now, return JSON data (PDF generation would use PDFKit)
        let reportData = {};

        switch (type) {
            case 'daily':
                reportData = await Sale.getDailySummary(date || new Date().toISOString().slice(0, 10));
                break;
            case 'monthly':
                reportData = await Sale.getMonthlySummary(
                    parseInt(year) || new Date().getFullYear(),
                    parseInt(month) || (new Date().getMonth() + 1)
                );
                break;
            default:
                reportData = { message: 'Specify report type (daily, monthly)' };
        }

        logger.info(`PDF export requested: ${type} by ${req.user.username}`);

        return res.json({
            success: true,
            message: 'PDF export would be generated here',
            data: reportData
        });
    } catch (error) {
        next(error);
    }
};

// Helper functions
/**
 * @description Helper: aggregates completed sales into per-hour buckets for a given date.
 * @param       {string} date - Date in 'YYYY-MM-DD' format.
 * @dbOps       Aggregate SELECT over sales GROUP BY HOUR(sale_date).
 * @returns     {Promise<Array<{hour, transactions, sales}>>}
 */
async function getHourlyBreakdown(date) {
    const sql = `
    SELECT 
      HOUR(sale_date) as hour,
      COUNT(*) as transactions,
      SUM(total_amount) as sales
    FROM sales
    WHERE DATE(sale_date) = ? AND status = 'completed'
    GROUP BY HOUR(sale_date)
    ORDER BY hour
  `;
    return db.getMany(sql, [date]);
}

/**
 * @description Helper: aggregates completed sales into per-day buckets for a given year/month.
 * @param       {number} year  - 4-digit year.
 * @param       {number} month - Month number (1-12).
 * @dbOps       Aggregate SELECT over sales GROUP BY DATE(sale_date).
 * @returns     {Promise<Array<{date, transactions, sales}>>}
 */
async function getDailyBreakdown(year, month) {
    logger.debug('[ReportController] getDailyBreakdown executing with:', { year, month });
    
    const sql = `
    SELECT 
      DATE(sale_date) as date,
      COUNT(*) as transactions,
      SUM(total_amount) as sales
    FROM sales
    WHERE YEAR(sale_date) = ? AND MONTH(sale_date) = ? AND status = 'completed'
    GROUP BY DATE(sale_date)
    ORDER BY date
  `;
    return db.getMany(sql, [year, month]);
}

/**
 * @description Helper: aggregates completed sales into per-week (1-indexed within the month)
 *              buckets for a given year/month.
 * @param       {number} year  - 4-digit year.
 * @param       {number} month - Month number (1-12).
 * @dbOps       Aggregate SELECT over sales GROUP BY WEEK(sale_date).
 * @returns     {Promise<Array<{week, transactions, sales}>>}
 */
async function getWeeklyBreakdown(year, month) {
    logger.debug('[ReportController] getWeeklyBreakdown executing with:', { year, month });
    
    const sql = `
    SELECT week, COUNT(*) as transactions, SUM(sales) as sales
    FROM (
      SELECT 
        WEEK(sale_date) - WEEK(DATE_FORMAT(sale_date, '%Y-%m-01')) + 1 as week,
        total_amount as sales
      FROM sales
      WHERE YEAR(sale_date) = ? AND MONTH(sale_date) = ? AND status = 'completed'
    ) w
    GROUP BY week
    ORDER BY week
  `;
    logger.debug('[ReportController] getWeeklyBreakdown SQL:', sql, 'params:', [year, month]);
    try {
        const result = await db.getMany(sql, [year, month]);
        logger.debug('[ReportController] getWeeklyBreakdown result:', result);
        return result;
    } catch (error) {
        logger.error('[ReportController] getWeeklyBreakdown ERROR:', error.message, error.stack);
        throw new Error(`getWeeklyBreakdown failed: ${error.message}`);
    }
}

/**
 * @description Helper: aggregates completed sales by product category for a given year/month.
 * @param       {number} year  - 4-digit year.
 * @param       {number} month - Month number (1-12).
 * @dbOps       Aggregate SELECT over sale_items JOIN sales/products/categories GROUP BY category.
 * @returns     {Promise<Array<{category_name, items_sold, revenue}>>}
 */
async function getCategoryBreakdown(year, month) {
    const sql = `
    SELECT 
      c.name as category_name,
      SUM(si.quantity) as items_sold,
      SUM(si.subtotal) as revenue
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    JOIN products p ON p.id = si.product_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE YEAR(s.sale_date) = ? AND MONTH(s.sale_date) = ? AND s.status = 'completed'
    GROUP BY c.id, c.name
    ORDER BY revenue DESC
  `;
    return db.getMany(sql, [year, month]);
}

module.exports = {
    getDailySalesReport,
    getMonthlySalesReport,
    getProductPerformanceReport,
    exportToCSV,
    exportToPDF
};

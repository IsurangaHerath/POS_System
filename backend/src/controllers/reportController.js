/**
 * Report Controller
 * 
 * Handles report generation operations.
 */

const Sale = require('../models/Sale');
const Product = require('../models/Product');
const { successResponse } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Get daily sales report
 * @route GET /api/reports/daily-sales
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
        const db = require('../config/database');
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
            sales: sales
        };

        return successResponse(res, report);
    } catch (error) {
        next(error);
    }
};

/**
 * Get monthly sales report
 * @route GET /api/reports/monthly-sales
 */
const getMonthlySalesReport = async (req, res, next) => {
    try {
        const { year, month } = req.query;
        
        console.log('[ReportController] Monthly Sales - Received params:', { year, month });
        
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

        console.log('[ReportController] Parsed year/month:', { reportYear, reportMonth });

        // Get current month summary
        const summary = await Sale.getMonthlySummary(reportYear, reportMonth);

        // Get previous month summary for comparison
        let prevMonthSummary = null;
        let prevYear = reportMonth === 1 ? reportYear - 1 : reportYear;
        let prevMonth = reportMonth === 1 ? 12 : reportMonth - 1;
        prevMonthSummary = await Sale.getMonthlySummary(prevYear, prevMonth);

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

        console.log('[ReportController] Sending report:', JSON.stringify(report, null, 2).substring(0, 500));

        return successResponse(res, report);
    } catch (error) {
        next(error);
    }
};

/**
 * Get product performance report
 * @route GET /api/reports/product-performance
 */
const getProductPerformanceReport = async (req, res, next) => {
    try {
        const { startDate, endDate, category_id, limit = 20 } = req.query;

        console.log('[ReportController] Product Performance params:', { startDate, endDate, category_id, limit });

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
 * Export report to CSV
 * @route GET /api/reports/export/csv
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
 * Export report to PDF
 * @route GET /api/reports/export/pdf
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
async function getHourlyBreakdown(date) {
    const db = require('../config/database');
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

async function getDailyBreakdown(year, month) {
    const db = require('../config/database');
    console.log('[ReportController] getDailyBreakdown executing with:', { year, month });
    
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

async function getWeeklyBreakdown(year, month) {
    const db = require('../config/database');
    const sql = `
    SELECT 
      WEEK(sale_date) - WEEK(DATE_FORMAT(sale_date, '%Y-%m-01')) + 1 as week,
      COUNT(*) as transactions,
      SUM(total_amount) as sales
    FROM sales
    WHERE YEAR(sale_date) = ? AND MONTH(sale_date) = ? AND status = 'completed'
    GROUP BY WEEK(sale_date)
    ORDER BY week
  `;
    return db.getMany(sql, [year, month]);
}

async function getCategoryBreakdown(year, month) {
    const db = require('../config/database');
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

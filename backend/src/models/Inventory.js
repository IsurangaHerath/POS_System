/**
 * Inventory Model
 * 
 * Database operations for inventory management.
 */

const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Inventory model class
 */
class Inventory {
    /**
     * Get inventory status for all products
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Inventory and pagination info
     */
    static async findAll(options = {}) {
        const {
            page = 1,
            limit = 20,
            low_stock = false,
            category_id = null,
            search = null
        } = options;

        // Build WHERE clause
        const conditions = ['p.is_active = TRUE'];
        const params = [];

        if (low_stock) {
            conditions.push('p.quantity_in_stock <= p.reorder_level');
        }

        if (category_id) {
            conditions.push('p.category_id = ?');
            params.push(category_id);
        }

        if (search) {
            conditions.push('(p.name LIKE ? OR p.barcode LIKE ? OR p.sku LIKE ?)');
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        const whereClause = `WHERE ${conditions.join(' AND ')}`;

        // Get total count
        const countSql = `
      SELECT COUNT(*) as total 
      FROM products p
      ${whereClause}
    `;
        logger.info('Inventory count SQL:', countSql, 'Params:', params);
        
        try {
            const countResult = await db.getOne(countSql, params);
            const total = countResult?.total || 0;

            // Get paginated results
            const offset = (page - 1) * limit;
            const sql = `
          SELECT 
            p.id as product_id,
            p.name as product_name,
            p.barcode,
            p.sku,
            p.quantity_in_stock,
            p.reorder_level,
            COALESCE(i.quantity_available, p.quantity_in_stock) as quantity_available,
            COALESCE(i.quantity_reserved, 0) as quantity_reserved,
            COALESCE(i.quantity_ordered, 0) as quantity_ordered,
            i.last_stock_check,
            CASE 
              WHEN p.quantity_in_stock <= 0 THEN 'out_of_stock'
              WHEN p.quantity_in_stock <= p.reorder_level THEN 'low_stock'
              ELSE 'in_stock'
            END as stock_status
          FROM products p
          LEFT JOIN inventory i ON i.product_id = p.id
          ${whereClause}
          ORDER BY p.quantity_in_stock ASC
          LIMIT ? OFFSET ?
        `;

            logger.info('Inventory SQL:', sql, 'Params:', [...params, limit, offset]);
            const inventory = await db.getMany(sql, [...params, limit, offset]);

            return {
                inventory,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Inventory findAll error:', error.message);
            throw error;
        }
    }

    /**
     * Get inventory logs
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Logs and pagination info
     */
    static async getLogs(options = {}) {
        const {
            page = 1,
            limit = 20,
            product_id = null,
            transaction_type = null,
            startDate = null,
            endDate = null
        } = options;

        // Build WHERE clause
        const conditions = [];
        const params = [];

        if (product_id) {
            conditions.push('il.product_id = ?');
            params.push(product_id);
        }

        if (transaction_type) {
            conditions.push('il.transaction_type = ?');
            params.push(transaction_type);
        }

        if (startDate) {
            conditions.push('DATE(il.created_at) >= ?');
            params.push(startDate);
        }

        if (endDate) {
            conditions.push('DATE(il.created_at) <= ?');
            params.push(endDate);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Get total count
        const countSql = `
      SELECT COUNT(*) as total 
      FROM inventory_logs il
      ${whereClause}
    `;
        const countResult = await db.getOne(countSql, params);
        const total = countResult.total;

        // Get paginated results
        const offset = (page - 1) * limit;
        const sql = `
      SELECT 
        il.*,
        p.name as product_name,
        p.barcode,
        u.full_name as user_name
      FROM inventory_logs il
      JOIN products p ON p.id = il.product_id
      JOIN users u ON u.id = il.user_id
      ${whereClause}
      ORDER BY il.created_at DESC
      LIMIT ? OFFSET ?
    `;

        const logs = await db.getMany(sql, [...params, limit, offset]);

        return {
            logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Log inventory change
     * @param {Object} logData - Log data
     * @returns {Promise<number>} Inserted log ID
     */
    static async logChange(logData, tx = null) {
        const {
            product_id,
            transaction_type,
            quantity_change,
            quantity_before,
            quantity_after,
            reference_id = null,
            reference_type = null,
            user_id,
            notes = null
        } = logData;

        const sql = `
      INSERT INTO inventory_logs (
        product_id, transaction_type, quantity_change,
        quantity_before, quantity_after, reference_id,
        reference_type, user_id, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const result = await db.query(sql, [
            product_id, transaction_type, quantity_change,
            quantity_before, quantity_after, reference_id,
            reference_type, user_id, notes
        ], tx);

        return result.insertId;
    }

    /**
     * Get low stock count
     * @returns {Promise<number>} Low stock count
     */
    static async getLowStockCount() {
        const sql = `
      SELECT COUNT(*) as count 
      FROM products 
      WHERE quantity_in_stock <= reorder_level AND is_active = TRUE
    `;
        const result = await db.getOne(sql);

        return result.count;
    }

    /**
     * Get out of stock count
     * @returns {Promise<number>} Out of stock count
     */
    static async getOutOfStockCount() {
        const sql = `
      SELECT COUNT(*) as count 
      FROM products 
      WHERE quantity_in_stock <= 0 AND is_active = TRUE
    `;
        const result = await db.getOne(sql);

        return result.count;
    }
}

module.exports = Inventory;

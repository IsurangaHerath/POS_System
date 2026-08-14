/**
 * Return Model
 *
 * Database operations for sales returns (full / partial) and refunds.
 */

const db = require('../config/database');

class Return {
    /**
     * Create a return header within a transaction.
     */
    static async create(data, tx = null) {
        const {
            return_number,
            sale_id,
            user_id,
            return_type,
            subtotal,
            tax_amount,
            refund_amount,
            refund_method,
            customer_id = null,
            notes = null
        } = data;

        const sql = `
      INSERT INTO returns (
        return_number, sale_id, user_id, return_type, subtotal,
        tax_amount, refund_amount, refund_method, customer_id, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const result = await db.query(sql, [
            return_number, sale_id, user_id, return_type, subtotal,
            tax_amount, refund_amount, refund_method, customer_id, notes
        ], tx);

        return result.insertId;
    }

    /**
     * Create a return line item within a transaction.
     */
    static async createItem(returnId, item, tx = null) {
        const {
            product_id = null,
            product_name,
            product_barcode = null,
            unit_price,
            quantity,
            subtotal
        } = item;

        const sql = `
      INSERT INTO return_items (
        return_id, product_id, product_name, product_barcode,
        unit_price, quantity, subtotal
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

        return db.query(sql, [
            returnId, product_id, product_name, product_barcode,
            unit_price, quantity, subtotal
        ], tx);
    }

    /**
     * Find return by ID with items.
     */
    static async findByIdWithItems(id) {
        const sql = `
      SELECT r.*, u.full_name AS cashier_name, s.invoice_number AS sale_invoice
      FROM returns r
      JOIN users u ON u.id = r.user_id
      JOIN sales s ON s.id = r.sale_id
      WHERE r.id = ?
    `;
        const returnData = await db.getOne(sql, [id]);

        if (!returnData) {
            return null;
        }

        returnData.items = await db.getMany(
            'SELECT * FROM return_items WHERE return_id = ? ORDER BY id',
            [id]
        );

        return returnData;
    }

    /**
     * List returns with pagination.
     */
    static async findAll(options = {}) {
        const { page = 1, limit = 20, startDate = null, endDate = null, sale_id = null } = options;

        const conditions = [];
        const params = [];

        if (startDate) {
            conditions.push('DATE(r.created_at) >= ?');
            params.push(startDate);
        }
        if (endDate) {
            conditions.push('DATE(r.created_at) <= ?');
            params.push(endDate);
        }
        if (sale_id) {
            conditions.push('r.sale_id = ?');
            params.push(sale_id);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const countResult = await db.getOne(
            `SELECT COUNT(*) AS total FROM returns r ${whereClause}`,
            params
        );

        const offset = (page - 1) * limit;
        const sql = `
      SELECT r.*, u.full_name AS cashier_name, s.invoice_number AS sale_invoice
      FROM returns r
      JOIN users u ON u.id = r.user_id
      JOIN sales s ON s.id = r.sale_id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `;

        const returnsData = await db.getMany(sql, [...params, limit, offset]);

        return {
            returns: returnsData,
            pagination: {
                page,
                limit,
                total: countResult.total,
                totalPages: Math.ceil(countResult.total / limit)
            }
        };
    }

    /**
     * Generate the next return number.
     */
    static async generateNumber() {
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const result = await db.getOne(
            `SELECT COUNT(*) AS count FROM returns WHERE DATE(created_at) = CURDATE()`
        );
        const sequence = (result.count + 1).toString().padStart(4, '0');
        return `RTN${datePart}${sequence}`;
    }
}

module.exports = Return;
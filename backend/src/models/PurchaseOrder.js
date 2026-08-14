/**
 * Purchase Order Model
 * 
 * Database operations for purchase order management.
 */

const db = require('../config/database');

/**
 * PurchaseOrder model class
 */
class PurchaseOrder {
    /**
     * Create a new purchase order
     * @param {Object} poData - Purchase order data
     * @returns {Promise<number>} Inserted PO ID
     */
    static async create(poData, tx = null) {
        const {
            po_number,
            supplier_id,
            user_id,
            subtotal,
            total_amount,
            expected_date = null,
            notes = null
        } = poData;

        const sql = `
      INSERT INTO purchase_orders (
        po_number, supplier_id, user_id, subtotal, tax_amount,
        total_amount, status, order_date, expected_date, notes
      )
      VALUES (?, ?, ?, ?, 0, ?, 'pending', CURRENT_DATE, ?, ?)
    `;

        const result = await db.query(sql, [
            po_number, supplier_id, user_id, subtotal,
            total_amount, expected_date, notes
        ], tx);

        return result.insertId;
    }

    /**
     * Create PO item
     * @param {number} poId - PO ID
     * @param {Object} itemData - Item data
     * @returns {Promise<number>} Inserted item ID
     */
    static async createItem(poId, itemData, tx = null) {
        const {
            product_id,
            unit_cost,
            quantity_ordered,
            quantity_received,
            subtotal
        } = itemData;

        const sql = `
      INSERT INTO purchase_order_items (
        purchase_order_id, product_id, unit_cost,
        quantity_ordered, quantity_received, subtotal
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `;

        const result = await db.query(sql, [
            poId, product_id, unit_cost,
            quantity_ordered, quantity_received, subtotal
        ], tx);

        return result.insertId;
    }

    /**
     * Find PO by ID
     * @param {number} id - PO ID
     * @returns {Promise<Object|null>} PO object or null
     */
    static async findById(id, tx = null) {
        const sql = `
      SELECT po.*, s.name as supplier_name, u.full_name as user_name
      FROM purchase_orders po
      JOIN suppliers s ON s.id = po.supplier_id
      JOIN users u ON u.id = po.user_id
      WHERE po.id = ?
    `;

        return db.getOne(sql, [id], tx);
    }

    /**
     * Find PO by ID with items
     * @param {number} id - PO ID
     * @returns {Promise<Object|null>} PO with items or null
     */
    static async findByIdWithItems(id) {
        const po = await this.findById(id);

        if (!po) {
            return null;
        }

        const itemsSql = `
      SELECT poi.*, p.name as product_name, p.sku, p.barcode
      FROM purchase_order_items poi
      JOIN products p ON p.id = poi.product_id
      WHERE poi.purchase_order_id = ?
      ORDER BY poi.id
    `;

        const items = await db.getMany(itemsSql, [id]);
        po.items = items;

        return po;
    }

    /**
     * Get all purchase orders with pagination
     * @param {Object} options - Query options
     * @returns {Promise<Object>} POs and pagination info
     */
    static async findAll(options = {}) {
        const {
            page = 1,
            limit = 20,
            status = null,
            supplier_id = null
        } = options;

        // Build WHERE clause
        const conditions = [];
        const params = [];

        if (status) {
            conditions.push('po.status = ?');
            params.push(status);
        }

        if (supplier_id) {
            conditions.push('po.supplier_id = ?');
            params.push(supplier_id);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Get total count
        const countSql = `
      SELECT COUNT(*) as total 
      FROM purchase_orders po
      ${whereClause}
    `;
        const countResult = await db.getOne(countSql, params);
        const total = countResult.total;

        // Get paginated results
        const offset = (page - 1) * limit;
        const sql = `
      SELECT po.*, s.name as supplier_name, u.full_name as user_name
      FROM purchase_orders po
      JOIN suppliers s ON s.id = po.supplier_id
      JOIN users u ON u.id = po.user_id
      ${whereClause}
      ORDER BY po.order_date DESC
      LIMIT ? OFFSET ?
    `;

        const purchaseOrders = await db.getMany(sql, [...params, limit, offset]);

        return {
            purchaseOrders,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Update PO status
     * @param {number} id - PO ID
     * @param {string} status - New status
     * @param {Date} receivedDate - Received date
     * @returns {Promise<boolean>} Update success
     */
    static async updateStatus(id, status, receivedDate = null, tx = null) {
        const sql = `
      UPDATE purchase_orders 
      SET status = ?, received_date = ?
      WHERE id = ?
    `;
        const result = await db.query(sql, [status, receivedDate, id], tx);

        return result.affectedRows > 0;
    }

    /**
     * Find PO item
     * @param {number} poId - PO ID
     * @param {number} productId - Product ID
     * @returns {Promise<Object|null>} PO item or null
     */
    static async findItem(poId, productId, tx = null) {
        const sql = `
      SELECT * FROM purchase_order_items
      WHERE purchase_order_id = ? AND product_id = ?
    `;

        return db.getOne(sql, [poId, productId], tx);
    }

    /**
     * Get PO items
     * @param {number} poId - PO ID
     * @returns {Promise<Array>} Array of items
     */
    static async getItems(poId, tx = null) {
        const sql = 'SELECT * FROM purchase_order_items WHERE purchase_order_id = ?';
        return db.getMany(sql, [poId], tx);
    }

    /**
     * Update item received quantity
     * @param {number} poId - PO ID
     * @param {number} productId - Product ID
     * @param {number} quantityReceived - Received quantity
     * @returns {Promise<boolean>} Update success
     */
    static async updateItemReceived(poId, productId, quantityReceived, tx = null) {
        const sql = `
      UPDATE purchase_order_items
      SET quantity_received = ?
      WHERE purchase_order_id = ? AND product_id = ?
    `;
        const result = await db.query(sql, [quantityReceived, poId, productId], tx);

        return result.affectedRows > 0;
    }

    /**
     * Generate PO number
     * @returns {Promise<string>} PO number
     */
    static async generatePONumber() {
        const date = new Date();
        const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');

        const sql = `
      SELECT COUNT(*) as count 
      FROM purchase_orders 
      WHERE DATE(order_date) = CURRENT_DATE
    `;
        const result = await db.getOne(sql);
        const sequence = (result.count + 1).toString().padStart(4, '0');

        return `PO${datePart}${sequence}`;
    }

    /**
     * Log inventory change for PO
     * @param {number} productId - Product ID
     * @param {number} quantityChange - Quantity change
     * @param {number} poId - PO ID
     * @param {number} userId - User ID
     */
    static async logInventoryChange(productId, quantityChange, poId, userId, tx = null) {
        // NOTE: called AFTER Product.updateStock, so current quantity is the "after" value.
        const productSql = 'SELECT quantity_in_stock FROM products WHERE id = ?';
        const product = await db.getOne(productSql, [productId], tx);

        if (!product) return;

        const quantityAfter = product.quantity_in_stock;
        const quantityBefore = quantityAfter - quantityChange;

        const sql = `
      INSERT INTO inventory_logs (
        product_id, transaction_type, quantity_change,
        quantity_before, quantity_after, reference_id,
        reference_type, user_id, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        await db.query(sql, [
            productId,
            'purchase',
            quantityChange,
            quantityBefore,
            quantityAfter,
            poId,
            'purchase_order',
            userId,
            'Purchase order receipt'
        ], tx);
    }

    /**
     * Get pending PO count
     * @returns {Promise<number>} Pending PO count
     */
    static async getPendingCount() {
        const sql = "SELECT COUNT(*) as count FROM purchase_orders WHERE status = 'pending'";
        const result = await db.getOne(sql);

        return result.count;
    }
}

module.exports = PurchaseOrder;

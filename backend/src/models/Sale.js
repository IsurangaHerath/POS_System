const db = require('../config/database');

class Sale {
    static async create(saleData, tx = null) {
        const {
            invoice_number,
            user_id,
            subtotal,
            tax_amount,
            discount_amount,
            total_amount,
            payment_method,
            amount_paid,
            change_amount,
            notes = null
        } = saleData;

        const sql = `
      INSERT INTO sales (
        invoice_number, user_id, subtotal, tax_amount, discount_amount,
        total_amount, payment_method, amount_paid, change_amount, notes, sale_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

        const result = await db.query(sql, [
            invoice_number, user_id, subtotal, tax_amount, discount_amount,
            total_amount, payment_method, amount_paid, change_amount, notes
        ], tx);

        return result.insertId;
    }

    static async createItem(saleId, itemData, tx = null) {
        const {
            product_id,
            product_name,
            product_barcode,
            unit_price,
            quantity,
            subtotal,
            discount,
            tax_amount
        } = itemData;

        const sql = `
      INSERT INTO sale_items (
        sale_id, product_id, product_name, product_barcode,
        unit_price, quantity, subtotal, discount, tax_amount
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const result = await db.query(sql, [
            saleId, product_id, product_name, product_barcode,
            unit_price, quantity, subtotal, discount, tax_amount
        ], tx);

        return result.insertId;
    }

    static async findById(id, tx = null) {
        const sql = `
      SELECT s.*, u.full_name as cashier_name
      FROM sales s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = ?
    `;

        return db.getOne(sql, [id], tx);
    }

    static async findByIdWithItems(id, tx = null) {
        const sale = await this.findById(id, tx);

        if (!sale) {
            return null;
        }

        const itemsSql = `
      SELECT * FROM sale_items
      WHERE sale_id = ?
      ORDER BY id
    `;

        const items = await db.getMany(itemsSql, [id], tx);
        sale.items = items;

        return sale;
    }

    static async findAll(options = {}) {
        const {
            page = 1,
            limit = 20,
            startDate = null,
            endDate = null,
            status = null,
            payment_method = null,
            user_id = null
        } = options;

        const conditions = [];
        const params = [];

        if (startDate) {
            conditions.push('DATE(s.sale_date) >= ?');
            params.push(startDate);
        }

        if (endDate) {
            conditions.push('DATE(s.sale_date) <= ?');
            params.push(endDate);
        }

        if (status) {
            conditions.push('s.status = ?');
            params.push(status);
        }

        if (payment_method) {
            conditions.push('s.payment_method = ?');
            params.push(payment_method);
        }

        if (user_id) {
            conditions.push('s.user_id = ?');
            params.push(user_id);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countSql = `
      SELECT COUNT(*) as total 
      FROM sales s
      ${whereClause}
    `;
        const countResult = await db.getOne(countSql, params);
        const total = countResult.total;

        const offset = (page - 1) * limit;
        const sql = `
      SELECT s.*, u.full_name as cashier_name,
        (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as item_count
      FROM sales s
      JOIN users u ON u.id = s.user_id
      ${whereClause}
      ORDER BY s.sale_date DESC
      LIMIT ? OFFSET ?
    `;

        const sales = await db.getMany(sql, [...params, limit, offset]);

        return {
            sales,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    static async voidSale(id, tx = null) {
        const sql = 'UPDATE sales SET status = ? WHERE id = ?';
        const result = await db.query(sql, ['voided', id], tx);

        return result.affectedRows > 0;
    }

    static async getSaleItems(saleId, tx = null) {
        const sql = 'SELECT * FROM sale_items WHERE sale_id = ?';
        return db.getMany(sql, [saleId], tx);
    }

    static async generateInvoiceNumber(tx = null) {
        const date = new Date();
        const datePart = date.toISOString().slice(0, 10).replace(/-/g, '');

        const sql = `
      SELECT COUNT(*) as count 
      FROM sales 
      WHERE DATE(sale_date) = CURRENT_DATE
    `;
        const result = await db.getOne(sql, [], tx);
        const sequence = (result.count + 1).toString().padStart(4, '0');

        return `INV${datePart}${sequence}`;
    }

    static async logInventoryChange(productId, quantityChange, referenceId, referenceType, userId, notes = null, tx = null) {
        const productSql = 'SELECT quantity_in_stock FROM products WHERE id = ?';
        const product = await db.getOne(productSql, [productId], tx);

        if (!product) return;

        const quantityBefore = product.quantity_in_stock;
        const quantityAfter = quantityBefore + quantityChange;

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
            quantityChange < 0 ? 'sale' : 'return',
            quantityChange,
            quantityBefore,
            quantityAfter,
            referenceId,
            referenceType,
            userId,
            notes
        ], tx);
    }

    static async getDailySummary(date) {
        const sql = `
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(total_amount), 0) as total_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END), 0) as card_sales,
        COALESCE(AVG(total_amount), 0) as average_transaction
      FROM sales
      WHERE DATE(sale_date) = ? AND status = 'completed'
    `;

        return db.getOne(sql, [date]);
    }

    static async getMonthlySummary(year, month) {
        const sql = `
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(total_amount), 0) as total_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END), 0) as card_sales,
        COALESCE(AVG(total_amount), 0) as average_transaction
      FROM sales
      WHERE YEAR(sale_date) = ? AND MONTH(sale_date) = ? AND status = 'completed'
    `;

        return db.getOne(sql, [year, month]);
    }

    static async getTopProducts(options = {}) {
        const { limit = 10, startDate = null, endDate = null } = options;

        const conditions = ["s.status = 'completed'"];
        const params = [];

        if (startDate) {
            conditions.push('DATE(s.sale_date) >= ?');
            params.push(startDate);
        }

        if (endDate) {
            conditions.push('DATE(s.sale_date) <= ?');
            params.push(endDate);
        }

        const whereClause = `WHERE ${conditions.join(' AND ')}`;

        const sql = `
      SELECT 
        p.id, p.name, p.barcode,
        SUM(si.quantity) as total_quantity,
        SUM(si.subtotal) as total_revenue
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      JOIN products p ON p.id = si.product_id
      ${whereClause}
      GROUP BY p.id, p.name, p.barcode
      ORDER BY total_quantity DESC
      LIMIT ?
    `;

        return db.getMany(sql, [...params, limit]);
    }
}

module.exports = Sale;

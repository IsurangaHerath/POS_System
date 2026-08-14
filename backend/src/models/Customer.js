const db = require('../config/database');

class Customer {
    static async create(data) {
        const {
            code = null,
            name,
            phone = null,
            email = null,
            address = null,
            city = null,
            date_of_birth = null,
            nic = null,
            credit_limit = 0.00,
            discount = 0.00,
            notes = null
        } = data;

        const sql = `
      INSERT INTO customers (
        code, name, phone, email, address, city, date_of_birth, nic,
        credit_limit, discount, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const result = await db.query(sql, [
            code, name, phone, email, address, city, date_of_birth, nic,
            credit_limit, discount, notes
        ]);

        return result.insertId;
    }

    static async findById(id, tx = null) {
        const sql = `
      SELECT c.*, 
             (SELECT COUNT(*) FROM sales WHERE customer_id = c.id) as purchase_count,
             (SELECT COUNT(*) FROM payments WHERE customer_id = c.id AND payment_type = 'credit') as payment_count
      FROM customers c
      WHERE c.id = ?
    `;

        return db.getOne(sql, [id], tx);
    }

    static async findByCode(code) {
        const sql = `SELECT * FROM customers WHERE code = ?`;
        return db.getOne(sql, [code]);
    }

    static async findByPhone(phone) {
        const sql = `SELECT * FROM customers WHERE phone LIKE ? OR phone = ?`;
        return db.getMany(sql, [`%${phone}%`, phone]);
    }

    static async findAll(options = {}) {
        const {
            page = 1,
            limit = 20,
            search = null,
            is_active = null,
            has_balance = false
        } = options;

        const conditions = [];
        const params = [];

        if (search) {
            conditions.push('(name LIKE ? OR phone LIKE ? OR email LIKE ? OR code LIKE ? OR nic LIKE ?)');
            const like = `%${search}%`;
            params.push(like, like, like, like, like);
        }

        if (is_active !== null) {
            conditions.push('is_active = ?');
            params.push(is_active);
        }

        if (has_balance) {
            conditions.push('balance > 0');
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countSql = `SELECT COUNT(*) AS total FROM customers ${whereClause}`;
        const countResult = await db.getOne(countSql, params);

        const offset = (page - 1) * limit;
        const sql = `
      SELECT c.*, 
             (SELECT COUNT(*) FROM sales WHERE customer_id = c.id) as purchase_count
      FROM customers c
      ${whereClause}
      ORDER BY name
      LIMIT ? OFFSET ?
    `;

        const customers = await db.getMany(sql, [...params, limit, offset]);

        return {
            customers,
            pagination: {
                page,
                limit,
                total: countResult.total,
                totalPages: Math.ceil(countResult.total / limit)
            }
        };
    }

    static async update(id, updateData) {
        const allowedFields = [
            'code', 'name', 'phone', 'email', 'address', 'city',
            'date_of_birth', 'nic', 'credit_limit', 'discount', 'notes', 'is_active'
        ];
        const updates = [];
        const values = [];

        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key) && value !== undefined) {
                updates.push(`${key} = ?`);
                values.push(value ?? null);
            }
        }

        if (updates.length === 0) {
            return false;
        }

        values.push(id);
        const sql = `UPDATE customers SET ${updates.join(', ')} WHERE id = ?`;
        const result = await db.query(sql, values);

        return result.affectedRows > 0;
    }

    static async delete(id) {
        const sql = 'UPDATE customers SET is_active = FALSE WHERE id = ?';
        const result = await db.query(sql, [id]);
        return result.affectedRows > 0;
    }

    static async hardDelete(id) {
        const sql = 'DELETE FROM customers WHERE id = ?';
        const result = await db.query(sql, [id]);
        return result.affectedRows > 0;
    }

    static async adjustBalance(id, delta, tx = null) {
        const sql = 'UPDATE customers SET balance = balance + ? WHERE id = ?';
        await db.query(sql, [delta, id], tx);
    }

    static async getHistory(id, options = {}) {
        const { page = 1, limit = 50 } = options;

        const sales = await db.getMany(
            `SELECT 'sale' AS type, id, invoice_number AS reference_no, total_amount AS amount,
                    sale_date AS date, status, payment_method
             FROM sales WHERE customer_id = ? ORDER BY sale_date DESC LIMIT ?`,
            [id, limit],
            tx
        );

        const returns = await db.getMany(
            `SELECT 'return' AS type, id, return_number AS reference_no, refund_amount AS amount,
                    created_at AS date, status, refund_method AS payment_method
             FROM returns WHERE customer_id = ? ORDER BY created_at DESC LIMIT ?`,
            [id, limit],
            tx
        );

        const payments = await db.getMany(
            `SELECT 'payment' AS type, id, reference AS reference_no, amount,
                    created_at AS date, 'completed' AS status, method AS payment_method
             FROM payments WHERE customer_id = ? AND payment_type = 'credit'
             ORDER BY created_at DESC LIMIT ?`,
            [id, limit],
            tx
        );

        const events = [...sales, ...returns, ...payments]
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        return events;
    }

    static async getStatement(id, options = {}) {
        const events = await this.getHistory(id, options);
        let runningBalance = 0.00;

        const ordered = events.slice().reverse();
        const statement = ordered.map((event) => {
            if (event.type === 'sale' && event.status === 'completed') {
                runningBalance += Number(event.amount) || 0;
            } else if (event.type === 'payment') {
                runningBalance -= Number(event.amount) || 0;
            } else if (event.type === 'return' && event.status === 'completed') {
                runningBalance -= Number(event.amount) || 0;
            }
            return { ...event, running_balance: runningBalance };
        }).reverse();

        return statement;
    }

    static async codeExists(code, excludeId = null) {
        let sql = 'SELECT COUNT(*) AS count FROM customers WHERE code = ?';
        const params = [code];
        if (excludeId) {
            sql += ' AND id != ?';
            params.push(excludeId);
        }
        const result = await db.getOne(sql, params);
        return result.count > 0;
    }

    static async generateCode() {
        const result = await db.getOne('SELECT COUNT(*) AS count FROM customers');
        const sequence = (result.count + 1).toString().padStart(4, '0');
        return `CUS${sequence}`;
    }

    static async getTopCustomers(options = {}) {
        const { limit = 10, startDate = null, endDate = null } = options;

        const conditions = ['c.balance > 0'];
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
      SELECT c.id, c.code, c.name, c.phone, c.balance, c.credit_limit,
             COALESCE(SUM(s.total_amount), 0) as total_spent,
             COUNT(s.id) as transaction_count
      FROM customers c
      LEFT JOIN sales s ON s.customer_id = c.id
      ${whereClause}
      GROUP BY c.id, c.code, c.name, c.phone, c.balance, c.credit_limit
      ORDER BY c.balance DESC
      LIMIT ?
    `;

        return db.getMany(sql, [...params, limit]);
    }

    static async getOverdueBalance() {
        const sql = `
      SELECT c.id, c.code, c.name, c.phone, c.balance, c.credit_limit
      FROM customers c
      WHERE c.balance > 0
      ORDER BY c.balance DESC
    `;
        return db.getMany(sql);
    }
}

module.exports = Customer;
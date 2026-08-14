/**
 * Expense Model
 *
 * Database operations for expense tracking.
 */

const db = require('../config/database');

class Expense {
    static async create(data) {
        const {
            category_id = null,
            amount,
            expense_date,
            description = null,
            payment_method = 'cash',
            employee_id = null,
            reference = null,
            user_id
        } = data;

        const sql = `
      INSERT INTO expenses (
        category_id, amount, expense_date, description, payment_method,
        employee_id, reference, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const result = await db.query(sql, [
            category_id, amount, expense_date, description, payment_method,
            employee_id, reference, user_id
        ]);

        return result.insertId;
    }

    static async findById(id) {
        const sql = `
      SELECT e.*, ec.name AS category_name, u.full_name AS entered_by
      FROM expenses e
      LEFT JOIN expense_categories ec ON ec.id = e.category_id
      LEFT JOIN users u ON u.id = e.user_id
      WHERE e.id = ?
    `;
        return db.getOne(sql, [id]);
    }

    static async findAll(options = {}) {
        const { page = 1, limit = 20, startDate = null, endDate = null, category_id = null } = options;

        const conditions = [];
        const params = [];

        if (startDate) {
            conditions.push('DATE(e.expense_date) >= ?');
            params.push(startDate);
        }
        if (endDate) {
            conditions.push('DATE(e.expense_date) <= ?');
            params.push(endDate);
        }
        if (category_id) {
            conditions.push('e.category_id = ?');
            params.push(category_id);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const countResult = await db.getOne(
            `SELECT COUNT(*) AS total FROM expenses e ${whereClause}`,
            params
        );

        const offset = (page - 1) * limit;
        const sql = `
      SELECT e.*, ec.name AS category_name, u.full_name AS entered_by
      FROM expenses e
      LEFT JOIN expense_categories ec ON ec.id = e.category_id
      LEFT JOIN users u ON u.id = e.user_id
      ${whereClause}
      ORDER BY e.expense_date DESC, e.created_at DESC
      LIMIT ? OFFSET ?
    `;

        const expenses = await db.getMany(sql, [...params, limit, offset]);

        return {
            expenses,
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
            'category_id', 'amount', 'expense_date', 'description',
            'payment_method', 'employee_id', 'reference'
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
        const sql = `UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`;
        const result = await db.query(sql, values);

        return result.affectedRows > 0;
    }

    static async delete(id) {
        const sql = 'DELETE FROM expenses WHERE id = ?';
        const result = await db.query(sql, [id]);
        return result.affectedRows > 0;
    }

    static async getCategories() {
        return db.getMany('SELECT * FROM expense_categories ORDER BY name');
    }

    static async createCategory(name, description = null) {
        const result = await db.query(
            'INSERT INTO expense_categories (name, description) VALUES (?, ?)',
            [name, description]
        );
        return result.insertId;
    }

    static async getTotal(startDate = null, endDate = null) {
        const conditions = [];
        const params = [];
        if (startDate) {
            conditions.push('expense_date >= ?');
            params.push(startDate);
        }
        if (endDate) {
            conditions.push('expense_date <= ?');
            params.push(endDate);
        }
        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const sql = `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses ${whereClause}`;
        return db.getOne(sql, params);
    }
}

module.exports = Expense;
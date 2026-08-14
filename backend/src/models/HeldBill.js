/**
 * Held Bill Model
 *
 * Database operations for holding and resuming pending bills.
 */

const db = require('../config/database');

class HeldBill {
    static async create(data) {
        const {
            reference = null,
            user_id,
            customer_id = null,
            cart,
            notes = null
        } = data;

        const sql = `
      INSERT INTO held_bills (reference, user_id, customer_id, cart, notes)
      VALUES (?, ?, ?, ?, ?)
    `;

        const result = await db.query(sql, [
            reference, user_id, customer_id, JSON.stringify(cart), notes
        ]);

        return result.insertId;
    }

    static async findById(id) {
        const sql = `
      SELECT hb.*, u.full_name AS cashier_name
      FROM held_bills hb
      LEFT JOIN users u ON u.id = hb.user_id
      WHERE hb.id = ?
    `;
        const bill = await db.getOne(sql, [id]);
        if (bill && bill.cart) {
            try {
                bill.cart = JSON.parse(bill.cart);
            } catch (e) {
                bill.cart = [];
            }
        }
        return bill;
    }

    static async findAll(options = {}) {
        const { page = 1, limit = 20, user_id = null } = options;

        const conditions = [];
        const params = [];
        if (user_id) {
            conditions.push('hb.user_id = ?');
            params.push(user_id);
        }
        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const countResult = await db.getOne(
            `SELECT COUNT(*) AS total FROM held_bills hb ${whereClause}`,
            params
        );

        const offset = (page - 1) * limit;
        const sql = `
      SELECT hb.*, u.full_name AS cashier_name
      FROM held_bills hb
      LEFT JOIN users u ON u.id = hb.user_id
      ${whereClause}
      ORDER BY hb.created_at DESC
      LIMIT ? OFFSET ?
    `;

        const bills = await db.getMany(sql, [...params, limit, offset]);
        for (const bill of bills) {
            try {
                bill.cart = JSON.parse(bill.cart);
            } catch (e) {
                bill.cart = [];
            }
        }

        return {
            bills,
            pagination: {
                page,
                limit,
                total: countResult.total,
                totalPages: Math.ceil(countResult.total / limit)
            }
        };
    }

    static async delete(id) {
        const sql = 'DELETE FROM held_bills WHERE id = ?';
        const result = await db.query(sql, [id]);
        return result.affectedRows > 0;
    }
}

module.exports = HeldBill;
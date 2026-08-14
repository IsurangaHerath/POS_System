/**
 * Cash Register (Shift) Model
 *
 * Database operations for cashier shift open/close, expected/actual cash
 * reconciliation, and cash movement entries.
 */

const db = require('../config/database');
const { NotFoundError, ConflictError } = require('../middleware/errorHandler');

class CashRegister {
    /**
     * Open a new cash register for a cashier.
     */
    static async open(data) {
        const { cashier_id, opening_cash = 0.00, notes = null } = data;
        const sql = `
      INSERT INTO cash_registers (cashier_id, opening_cash, opening_time, status, notes)
      VALUES (?, ?, CURRENT_TIMESTAMP, 'open', ?)
    `;
        const result = await db.query(sql, [cashier_id, opening_cash, notes]);
        return result.insertId;
    }

    /**
     * Find the currently-open register for a cashier.
     */
    static async findOpenByUser(cashierId) {
        const sql = `
      SELECT * FROM cash_registers
      WHERE cashier_id = ? AND status = 'open'
      ORDER BY opening_time DESC LIMIT 1
    `;
        return db.getOne(sql, [cashierId]);
    }

    /**
     * Find register by ID with cashier name.
     */
    static async findById(id) {
        const sql = `
      SELECT cr.*, u.full_name AS cashier_name
      FROM cash_registers cr
      LEFT JOIN users u ON u.id = cr.cashier_id
      WHERE cr.id = ?
    `;
        return db.getOne(sql, [id]);
    }

    /**
     * Add a cash movement entry to a register.
     */
    static async addEntry(registerId, entryType, amount, referenceId = null, notes = null, tx = null) {
        const sql = `
      INSERT INTO cash_register_entries (register_id, entry_type, amount, reference_id, notes)
      VALUES (?, ?, ?, ?, ?)
    `;
        return db.query(sql, [registerId, entryType, amount, referenceId, notes], tx);
    }

    /**
     * Get all entries for a register.
     */
    static async getEntries(registerId) {
        const sql = `
      SELECT * FROM cash_register_entries
      WHERE register_id = ?
      ORDER BY created_at
    `;
        return db.getMany(sql, [registerId]);
    }

    /**
     * Compute the expected cash for an open register based on its entries.
     * opening_cash + cash sales - refunds - expenses - withdrawals + additions.
     */
    static async computeExpected(registerId) {
        const register = await this.findById(registerId);
        if (!register) {
            return 0.00;
        }

        const entries = await this.getEntries(registerId);

        let expected = Number(register.opening_cash) || 0;
        for (const entry of entries) {
            if (entry.entry_type === 'sale' || entry.entry_type === 'addition') {
                expected += Number(entry.amount);
            } else if (entry.entry_type === 'refund' || entry.entry_type === 'expense' || entry.entry_type === 'withdrawal') {
                expected -= Number(entry.amount);
            }
        }

        return expected;
    }

    /**
     * Close a register, computing expected vs actual cash and variance.
     */
    static async close(id, actualCash, notes = null) {
        const register = await this.findById(id);
        if (!register) {
            throw new NotFoundError('Cash register not found');
        }
        if (register.status !== 'open') {
            throw new ConflictError('Cash register is already closed');
        }

        const expected = await this.computeExpected(id);
        const variance = Number(actualCash) - expected;

        const sql = `
      UPDATE cash_registers
      SET status = 'closed', closing_time = CURRENT_TIMESTAMP,
          expected_cash = ?, actual_cash = ?, variance = ?, notes = ?
      WHERE id = ?
    `;
        await db.query(sql, [expected, actualCash, variance, notes, id]);

        return this.findById(id);
    }

    /**
     * List registers (shift history) with pagination.
     */
    static async findAll(options = {}) {
        const { page = 1, limit = 20, cashier_id = null, status = null } = options;

        const conditions = [];
        const params = [];

        if (cashier_id) {
            conditions.push('cr.cashier_id = ?');
            params.push(cashier_id);
        }
        if (status) {
            conditions.push('cr.status = ?');
            params.push(status);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const countResult = await db.getOne(
            `SELECT COUNT(*) AS total FROM cash_registers cr ${whereClause}`,
            params
        );

        const offset = (page - 1) * limit;
        const sql = `
      SELECT cr.*, u.full_name AS cashier_name
      FROM cash_registers cr
      LEFT JOIN users u ON u.id = cr.cashier_id
      ${whereClause}
      ORDER BY cr.opening_time DESC
      LIMIT ? OFFSET ?
    `;

        const registers = await db.getMany(sql, [...params, limit, offset]);

        return {
            registers,
            pagination: {
                page,
                limit,
                total: countResult.total,
                totalPages: Math.ceil(countResult.total / limit)
            }
        };
    }
}

module.exports = CashRegister;
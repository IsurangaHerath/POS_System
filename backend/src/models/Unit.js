const db = require('../config/database');

class Unit {
    static async create(data) {
        const { name, abbreviation = null } = data;

        const sql = `
      INSERT INTO units (name, abbreviation)
      VALUES (?, ?)
    `;

        const result = await db.query(sql, [name, abbreviation]);
        return result.insertId;
    }

    static async findById(id) {
        const sql = `
      SELECT * FROM units
      WHERE id = ?
    `;
        return db.getOne(sql, [id]);
    }

    static async findByAbbreviation(abbreviation) {
        const sql = `
      SELECT * FROM units
      WHERE abbreviation = ?
    `;
        return db.getOne(sql, [abbreviation]);
    }

    static async findAll(options = {}) {
        const { page = 1, limit = 50, search = null, is_active = null } = options;

        const conditions = [];
        const params = [];

        if (search) {
            conditions.push('(name LIKE ? OR abbreviation LIKE ?)');
            const like = `%${search}%`;
            params.push(like, like);
        }

        if (is_active !== null) {
            conditions.push('is_active = ?');
            params.push(is_active);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countSql = `SELECT COUNT(*) AS total FROM units ${whereClause}`;
        const countResult = await db.getOne(countSql, params);

        const offset = (page - 1) * limit;
        const sql = `
      SELECT * FROM units
      ${whereClause}
      ORDER BY name
      LIMIT ? OFFSET ?
    `;

        const units = await db.getMany(sql, [...params, limit, offset]);

        return {
            units,
            pagination: {
                page,
                limit,
                total: countResult.total,
                totalPages: Math.ceil(countResult.total / limit)
            }
        };
    }

    static async getAll() {
        const sql = `
      SELECT * FROM units
      ORDER BY name
    `;
        return db.getMany(sql, []);
    }

    static async update(id, updateData) {
        const allowedFields = ['name', 'abbreviation'];
        const updates = [];
        const values = [];

        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key)) {
                updates.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (updates.length === 0) {
            return false;
        }

        values.push(id);
        const sql = `UPDATE units SET ${updates.join(', ')} WHERE id = ?`;
        const result = await db.query(sql, values);

        return result.affectedRows > 0;
    }

    static async delete(id) {
        const sql = 'DELETE FROM units WHERE id = ?';
        const result = await db.query(sql, [id]);
        return result.affectedRows > 0;
    }

    static async nameExists(name, excludeId = null) {
        let sql = 'SELECT COUNT(*) as count FROM units WHERE name = ?';
        const params = [name];
        if (excludeId) {
            sql += ' AND id != ?';
            params.push(excludeId);
        }
        const result = await db.getOne(sql, params);
        return result.count > 0;
    }
}

module.exports = Unit;
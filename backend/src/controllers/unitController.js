const db = require('../config/database');
const { successResponse, createdResponse, paginatedResponse } = require('../utils/response');
const { NotFoundError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const getAll = async (req, res, next) => {
    try {
        const { page = 1, limit = 50, search = null, is_active = null } = req.query;

        const conditions = [];
        const params = [];

        if (search) {
            conditions.push('(name LIKE ? OR abbreviation LIKE ?)');
            const like = `%${search}%`;
            params.push(like, like);
        }

        if (is_active !== null) {
            conditions.push('is_active = ?');
            params.push(is_active === 'true');
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countSql = `SELECT COUNT(*) AS total FROM units ${whereClause}`;
        const sql = `SELECT * FROM units ${whereClause} ORDER BY name LIMIT ? OFFSET ?`;

        const countResult = await db.getOne(countSql, params);
        const units = await db.getMany(sql, [...params, parseInt(limit), (parseInt(page) - 1) * parseInt(limit)]);

        return paginatedResponse(res, units, {
            page: parseInt(page),
            limit: parseInt(limit),
            total: countResult.total,
            totalPages: Math.ceil(countResult.total / parseInt(limit))
        });
    } catch (error) {
        next(error);
    }
};

const getAllUnits = async (req, res, next) => {
    try {
        const units = await db.getMany('SELECT * FROM units ORDER BY name');
        return successResponse(res, units);
    } catch (error) {
        next(error);
    }
};

const getById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const unit = await db.getOne('SELECT * FROM units WHERE id = ?', [id]);

        if (!unit) {
            throw new NotFoundError('Unit not found');
        }

        return successResponse(res, unit);
    } catch (error) {
        next(error);
    }
};

const create = async (req, res, next) => {
    try {
        const { name, abbreviation = null } = req.body;

        const result = await db.query(
            'INSERT INTO units (name, abbreviation) VALUES (?, ?)',
            [name, abbreviation]
        );

        logger.info(`Unit created: ${name} by ${req.user.username}`);

        return createdResponse(res, { id: result.insertId, name, abbreviation });
    } catch (error) {
        next(error);
    }
};

const update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, abbreviation } = req.body;

        const unit = await db.getOne('SELECT * FROM units WHERE id = ?', [id]);
        if (!unit) {
            throw new NotFoundError('Unit not found');
        }

        const updates = [];
        const values = [];

        if (name !== undefined) {
            updates.push('name = ?');
            values.push(name);
        }
        if (abbreviation !== undefined) {
            updates.push('abbreviation = ?');
            values.push(abbreviation);
        }

        if (updates.length === 0) {
            return successResponse(res, unit);
        }

        values.push(id);
        await db.query(`UPDATE units SET ${updates.join(', ')} WHERE id = ?`, values);

        logger.info(`Unit updated: ${id} by ${req.user.username}`);

        const updatedUnit = await db.getOne('SELECT * FROM units WHERE id = ?', [id]);
        return successResponse(res, updatedUnit);
    } catch (error) {
        next(error);
    }
};

const deleteUnit = async (req, res, next) => {
    try {
        const { id } = req.params;

        const unit = await db.getOne('SELECT * FROM units WHERE id = ?', [id]);
        if (!unit) {
            throw new NotFoundError('Unit not found');
        }

        await db.query('DELETE FROM units WHERE id = ?', [id]);

        logger.info(`Unit deleted: ${unit.name} by ${req.user.username}`);

        return successResponse(res, { id, deleted: true });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAll,
    getAllUnits,
    getById,
    create,
    update,
    delete: deleteUnit
};
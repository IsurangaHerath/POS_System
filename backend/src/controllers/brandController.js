const db = require('../config/database');
const { successResponse, createdResponse, paginatedResponse } = require('../utils/response');
const { NotFoundError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const getAll = async (req, res, next) => {
    try {
        const { page = 1, limit = 50, search = null, is_active = null } = req.query;

        let sql = 'SELECT * FROM brands ORDER BY name LIMIT ? OFFSET ?';
        let params = [limit, (page - 1) * limit];

        const countSql = 'SELECT COUNT(*) AS total FROM brands';
        let countParams = [];
        const conditions = [];

        if (search) {
            conditions.push('(name LIKE ? OR description LIKE ?)');
            const like = `%${search}%`;
            countSql += ' WHERE ' + conditions.join(' AND ');
            countParams = [like, like];
        }

        if (is_active !== null) {
            conditions.push('is_active = ?');
            countParams.push(is_active === 'true');
        }

        if (conditions.length > 0) {
            sql = `SELECT * FROM brands WHERE ${conditions.join(' AND ')} ORDER BY name LIMIT ? OFFSET ?`;
        }

        const countResult = await db.getOne(countSql, countParams);
        const brands = await db.getMany(sql, [...params]);

        return paginatedResponse(res, brands, {
            page: parseInt(page),
            limit: parseInt(limit),
            total: countResult.total,
            totalPages: Math.ceil(countResult.total / parseInt(limit))
        });
    } catch (error) {
        next(error);
    }
};

const getById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const brand = await db.getOne('SELECT * FROM brands WHERE id = ?', [id]);

        if (!brand) {
            throw new NotFoundError('Brand not found');
        }

        return successResponse(res, brand);
    } catch (error) {
        next(error);
    }
};

const create = async (req, res, next) => {
    try {
        const { name, description = null } = req.body;

        const result = await db.query(
            'INSERT INTO brands (name, description) VALUES (?, ?)',
            [name, description]
        );

        logger.info(`Brand created: ${name} by ${req.user.username}`);

        return createdResponse(res, { id: result.insertId, name, description });
    } catch (error) {
        next(error);
    }
};

const update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, is_active } = req.body;

        const brand = await db.getOne('SELECT * FROM brands WHERE id = ?', [id]);
        if (!brand) {
            throw new NotFoundError('Brand not found');
        }

        const updates = [];
        const values = [];

        if (name !== undefined) {
            updates.push('name = ?');
            values.push(name);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }
        if (is_active !== undefined) {
            updates.push('is_active = ?');
            values.push(is_active);
        }

        if (updates.length === 0) {
            return successResponse(res, brand);
        }

        values.push(id);
        await db.query(`UPDATE brands SET ${updates.join(', ')} WHERE id = ?`, values);

        logger.info(`Brand updated: ${id} by ${req.user.username}`);

        const updatedBrand = await db.getOne('SELECT * FROM brands WHERE id = ?', [id]);
        return successResponse(res, updatedBrand);
    } catch (error) {
        next(error);
    }
};

const deleteBrand = async (req, res, next) => {
    try {
        const { id } = req.params;

        const brand = await db.getOne('SELECT * FROM brands WHERE id = ?', [id]);
        if (!brand) {
            throw new NotFoundError('Brand not found');
        }

        await db.query('DELETE FROM brands WHERE id = ?', [id]);

        logger.info(`Brand deleted: ${brand.name} by ${req.user.username}`);

        return successResponse(res, { id, deleted: true });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    delete: deleteBrand
};
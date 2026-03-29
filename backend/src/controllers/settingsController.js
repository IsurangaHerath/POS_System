/**
 * Settings Controller
 * 
 * Handles system settings operations.
 */

const db = require('../config/database');
const { successResponse } = require('../utils/response');
const { NotFoundError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Get all settings
 * @route GET /api/settings
 */
const getSettings = async (req, res, next) => {
    try {
        const sql = 'SELECT * FROM settings ORDER BY setting_key';
        const settings = await db.getMany(sql);

        return successResponse(res, settings);
    } catch (error) {
        next(error);
    }
};

/**
 * Get setting by key
 * @route GET /api/settings/:key
 */
const getSettingByKey = async (req, res, next) => {
    try {
        const { key } = req.params;

        const sql = 'SELECT * FROM settings WHERE setting_key = ?';
        const setting = await db.getOne(sql, [key]);

        if (!setting) {
            throw new NotFoundError('Setting not found');
        }

        return successResponse(res, setting);
    } catch (error) {
        next(error);
    }
};

/**
 * Update setting
 * @route PUT /api/settings/:key
 */
const updateSetting = async (req, res, next) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        // Check if setting exists
        const checkSql = 'SELECT * FROM settings WHERE setting_key = ?';
        const existing = await db.getOne(checkSql, [key]);

        if (!existing) {
            // Insert new setting
            const insertSql = 'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)';
            await db.query(insertSql, [key, value]);
        } else {
            // Update existing setting
            const updateSql = 'UPDATE settings SET setting_value = ? WHERE setting_key = ?';
            await db.query(updateSql, [value, key]);
        }

        logger.info(`Setting '${key}' updated by ${req.user?.username || 'unknown'}`);

        // Return the updated setting
        return getSettingByKey(req, res, next);
    } catch (error) {
        next(error);
    }
};

/**
 * Get currency settings
 * @route GET /api/settings/currency
 */
const getCurrencySettings = async (req, res, next) => {
    try {
        const sql = 'SELECT * FROM settings WHERE setting_key LIKE "currency_%"';
        const settings = await db.getMany(sql);

        // Convert array to object
        const currencySettings = {};
        settings.forEach(setting => {
            currencySettings[setting.setting_key] = setting.setting_value;
        });

        // Set defaults if not found
        if (!currencySettings.currency_code) {
            currencySettings.currency_code = 'USD';
        }
        if (!currencySettings.exchange_rate) {
            currencySettings.exchange_rate = '1';
        }
        if (!currencySettings.currency_symbol) {
            currencySettings.currency_symbol = '$';
        }

        return successResponse(res, currencySettings);
    } catch (error) {
        next(error);
    }
};

/**
 * Update currency settings
 * @route PUT /api/settings/currency
 */
const updateCurrencySettings = async (req, res, next) => {
    try {
        const { currency_code, exchange_rate, currency_symbol } = req.body;

        const settingsToUpdate = [
            { key: 'currency_code', value: currency_code },
            { key: 'exchange_rate', value: exchange_rate },
            { key: 'currency_symbol', value: currency_symbol }
        ];

        for (const setting of settingsToUpdate) {
            if (setting.value !== undefined) {
                const checkSql = 'SELECT * FROM settings WHERE setting_key = ?';
                const existing = await db.getOne(checkSql, [setting.key]);

                if (!existing) {
                    const insertSql = 'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)';
                    await db.query(insertSql, [setting.key, setting.value.toString()]);
                } else {
                    const updateSql = 'UPDATE settings SET setting_value = ? WHERE setting_key = ?';
                    await db.query(updateSql, [setting.value.toString(), setting.key]);
                }
            }
        }

        logger.info(`Currency settings updated by ${req.user.username}`);

        // Return updated settings
        return getCurrencySettings(req, res, next);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getSettings,
    getSettingByKey,
    updateSetting,
    getCurrencySettings,
    updateCurrencySettings
};

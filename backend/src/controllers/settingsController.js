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
 * @description Returns every system setting ordered by key.
 * @access      Admin (route middleware).
 * @triggeredBy No frontend caller today.
 * @request     GET /api/settings
 * @params      none.
 * @dbOps       SELECT * FROM settings.
 * @returns     { success, data: settings[] }.
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
 * @description Returns a single setting by its key.
 * @access      Admin (route middleware).
 * @triggeredBy No frontend caller today.
 * @request     GET /api/settings/:key
 * @params      Param: key.
 * @dbOps       SELECT * FROM settings WHERE setting_key = ?.
 * @returns     { success, data: setting }.
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
 * @description Upserts a setting value by key (insert if missing, update otherwise).
 *              NOTE: exported but NO route registers it — currently dead code.
 * @access      Admin.
 * @triggeredBy No caller (no route mounted).
 * @request     PUT /api/settings/:key (never registered in settings.routes.js)
 * @params      Param: key; Body: value.
 * @dbOps       SELECT settings; INSERT INTO settings / UPDATE settings SET setting_value.
 * @returns     Delegates to getSettingByKey → { success, data: setting }.
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
 * @description Returns the active currency configuration (code + symbol) with USD/$ defaults,
 *              used across the app for price formatting.
 * @access      Public (no auth — required before login to render prices correctly).
 * @triggeredBy CurrencyContext provider on app mount.
 * @request     GET /api/settings/currency
 * @params      none.
 * @dbOps       SELECT * FROM settings WHERE setting_key IN ('currency_code', 'currency_symbol').
 * @returns     { success, data: { currency_code, currency_symbol } }.
 */
const getCurrencySettings = async (req, res, next) => {
    try {
        const sql = 'SELECT * FROM settings WHERE setting_key IN ("currency_code", "currency_symbol")';
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
        if (!currencySettings.currency_symbol) {
            currencySettings.currency_symbol = '$';
        }

        return successResponse(res, currencySettings);
    } catch (error) {
        next(error);
    }
};

/**
 * @description Upserts the currency code/symbol settings (admin-only) and returns the fresh values.
 * @access      Admin (route middleware).
 * @triggeredBy SettingsPage → Save Currency → handleSaveCurrency().
 * @request     PUT /api/settings/currency
 * @params      Body: currency_code, currency_symbol?.
 * @dbOps       SELECT settings per key; INSERT INTO settings / UPDATE settings SET setting_value.
 * @returns     Delegates to getCurrencySettings → { success, data: { currency_code, currency_symbol } }.
 */
const updateCurrencySettings = async (req, res, next) => {
    try {
        const { currency_code, currency_symbol } = req.body;

        const settingsToUpdate = [
            { key: 'currency_code', value: currency_code },
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

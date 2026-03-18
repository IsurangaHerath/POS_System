/**
 * Database Configuration
 * 
 * MySQL database connection pool configuration using mysql2
 * with promise-based interface for async/await support.
 */

const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

// Database configuration from environment variables
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pos_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    timezone: '+00:00',
    charset: 'utf8mb4'
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

/**
 * Test database connection
 * @returns {Promise<boolean>} Connection status
 */
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        return true;
    } catch (error) {
        logger.error('Database connection failed:', error.message);
        throw error;
    }
}

/**
 * Close database connection pool
 * @returns {Promise<void>}
 */
async function closeConnection() {
    try {
        await pool.end();
        logger.info('Database connection pool closed');
    } catch (error) {
        logger.error('Error closing database connection:', error);
        throw error;
    }
}

/**
 * Execute a query with parameters
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Query results
 */
async function query(sql, params = []) {
    const startTime = Date.now();
    try {
        // Use query() instead of execute() to properly handle LIMIT/OFFSET parameters
        // execute() uses prepared statements which have issues with integer params in LIMIT
        const [results] = await pool.query(sql, params);
        const duration = Date.now() - startTime;

        // Log slow queries (> 100ms)
        if (duration > 100) {
            logger.warn(`Slow query (${duration}ms): ${sql.substring(0, 100)}...`);
        }

        return results;
    } catch (error) {
        logger.error('Query error:', {
            sql: sql.substring(0, 200),
            params: JSON.stringify(params).substring(0, 200),
            error: error.message
        });
        throw error;
    }
}

/**
 * Get a single row
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object|null>} Single row or null
 */
async function getOne(sql, params = []) {
    const results = await query(sql, params);
    return results.length > 0 ? results[0] : null;
}

/**
 * Get multiple rows
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Array of rows
 */
async function getMany(sql, params = []) {
    return query(sql, params);
}

/**
 * Insert a row and return the insert ID
 * @param {string} table - Table name
 * @param {Object} data - Data to insert
 * @returns {Promise<number>} Insert ID
 */
async function insert(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const columns = keys.join(', ');

    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
    const result = await query(sql, values);

    return result.insertId;
}

/**
 * Update rows in a table
 * @param {string} table - Table name
 * @param {Object} data - Data to update
 * @param {string} where - WHERE clause
 * @param {Array} whereParams - WHERE parameters
 * @returns {Promise<number>} Number of affected rows
 */
async function update(table, data, where, whereParams = []) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map(key => `${key} = ?`).join(', ');

    const sql = `UPDATE ${table} SET ${setClause} WHERE ${where}`;
    const result = await query(sql, [...values, ...whereParams]);

    return result.affectedRows;
}

/**
 * Delete rows from a table
 * @param {string} table - Table name
 * @param {string} where - WHERE clause
 * @param {Array} whereParams - WHERE parameters
 * @returns {Promise<number>} Number of affected rows
 */
async function remove(table, where, whereParams = []) {
    const sql = `DELETE FROM ${table} WHERE ${where}`;
    const result = await query(sql, whereParams);

    return result.affectedRows;
}

/**
 * Begin a transaction
 * @returns {Promise<Object>} Connection object for transaction
 */
async function beginTransaction() {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    return connection;
}

/**
 * Commit a transaction
 * @param {Object} connection - Connection object
 */
async function commitTransaction(connection) {
    await connection.commit();
    connection.release();
}

/**
 * Rollback a transaction
 * @param {Object} connection - Connection object
 */
async function rollbackTransaction(connection) {
    await connection.rollback();
    connection.release();
}

/**
 * Execute queries within a transaction
 * @param {Function} callback - Callback function receiving connection
 * @returns {Promise<any>} Callback result
 */
async function transaction(callback) {
    const connection = await beginTransaction();

    try {
        const result = await callback(connection);
        await commitTransaction(connection);
        return result;
    } catch (error) {
        await rollbackTransaction(connection);
        throw error;
    }
}

module.exports = {
    pool,
    testConnection,
    closeConnection,
    query,
    getOne,
    getMany,
    insert,
    update,
    remove,
    beginTransaction,
    commitTransaction,
    rollbackTransaction,
    transaction
};

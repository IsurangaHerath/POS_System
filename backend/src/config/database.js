/**
 * Database Configuration Module
 * 
 * MySQL database connection pool configuration using mysql2/promise.
 * Provides a comprehensive database abstraction layer with:
 * - Connection pooling (optimized for cloud)
 * - Query execution helpers
 * - Transaction support
 * - Query performance logging
 * - SSL support for cloud databases
 * - Retry logic for connection failures
 */

const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

// ============================================
// DATABASE CONFIGURATION
// ============================================

/**
 * Database connection configuration
 * Values are loaded from environment variables with cloud-optimized defaults
 */
const databaseConfig = {
    // Connection settings
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pos_system',
    
    // Connection pooling (cloud-optimized)
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 20,
    queueLimit: parseInt(process.env.DB_QUEUE_LIMIT) || 0,
    
    // Keep-alive settings for long-running connections
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    
    // Timeout settings for cloud environments
    connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT) || 10000,
    acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 10000,
    
    // Timezone and charset
    timezone: process.env.DB_TIMEZONE || '+00:00',
    charset: process.env.DB_CHARSET || 'utf8mb4',
    
    // SSL configuration for cloud databases
    ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
    } : null
};

// Create the connection pool
const pool = mysql.createPool(databaseConfig);

// Track connection health
let connectionHealth = {
    lastSuccessfulConnection: null,
    consecutiveFailures: 0,
    maxConsecutiveFailures: 5
};

// ============================================
// CONNECTION MANAGEMENT
// ============================================

/**
 * Tests the database connection with retry logic for cloud environments
 * @returns {Promise<boolean>} True if connection successful
 * @throws {Error} If connection fails after retries
 */
async function testConnection(retries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            logger.info(`Database connection attempt ${attempt}/${retries}...`);
            
            const connection = await pool.getConnection();
            await connection.ping();
            connection.release();
            
            connectionHealth.lastSuccessfulConnection = new Date();
            connectionHealth.consecutiveFailures = 0;
            logger.info('Database connection established successfully');
            
            return true;
        } catch (error) {
            logger.error(`Database connection attempt ${attempt} failed:`, error.message);
            
            if (attempt < retries) {
                logger.info(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            } else {
                connectionHealth.consecutiveFailures++;
                logger.error('All database connection attempts failed');
                throw error;
            }
        }
    }
}

/**
 * Checks if database connection is healthy
 * @returns {boolean} True if healthy
 */
function isHealthy() {
    if (connectionHealth.consecutiveFailures >= connectionHealth.maxConsecutiveFailures) {
        return false;
    }
    if (!connectionHealth.lastSuccessfulConnection) {
        return true;
    }
    // Consider unhealthy if no successful connection in last 5 minutes
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return connectionHealth.lastSuccessfulConnection.getTime() > fiveMinutesAgo;
}

/**
 * Closes the database connection pool
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

// ============================================
// QUERY EXECUTION
// ============================================

/**
 * Executes a raw SQL query with parameters
 * @param {string} sqlQuery - SQL query string
 * @param {Array} queryParams - Query parameter values
 * @returns {Promise<Array>} Query results
 */
async function executeQuery(sqlQuery, queryParams = []) {
    const queryStartTime = Date.now();
    
    try {
        // Use query() instead of execute() to properly handle LIMIT/OFFSET parameters
        // execute() uses prepared statements which have issues with integer params in LIMIT
        const [results] = await pool.query(sqlQuery, queryParams);
        const queryDuration = queryStartTime - Date.now();

        // Log slow queries (> 100ms)
        if (Math.abs(queryDuration) > 100) {
            logger.warn(`Slow query (${Math.abs(queryDuration)}ms): ${sqlQuery.substring(0, 100)}...`);
        }

        return results;
    } catch (error) {
        logger.error('Query error:', {
            sql: sqlQuery.substring(0, 200),
            params: JSON.stringify(queryParams).substring(0, 200),
            error: error.message
        });
        throw error;
    }
}

/**
 * Retrieves a single row from the database
 * @param {string} sqlQuery - SQL query string
 * @param {Array} queryParams - Query parameter values
 * @returns {Promise<Object|null>} First row or null if no results
 */
async function getSingleRow(sqlQuery, queryParams = []) {
    const results = await executeQuery(sqlQuery, queryParams);
    return results.length > 0 ? results[0] : null;
}

/**
 * Retrieves multiple rows from the database
 * @param {string} sqlQuery - SQL query string
 * @param {Array} queryParams - Query parameter values
 * @returns {Promise<Array>} Array of rows
 */
async function getMultipleRows(sqlQuery, queryParams = []) {
    return executeQuery(sqlQuery, queryParams);
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Inserts a row into a table
 * @param {string} tableName - Name of the table
 * @param {Object} rowData - Data to insert as key-value pairs
 * @returns {Promise<number>} Inserted row ID
 */
async function insertRow(tableName, rowData) {
    const columnNames = Object.keys(rowData);
    const columnValues = Object.values(rowData);
    const valuePlaceholders = columnNames.map(() => '?').join(', ');
    const columns = columnNames.join(', ');

    const sqlQuery = `INSERT INTO ${tableName} (${columns}) VALUES (${valuePlaceholders})`;
    const result = await executeQuery(sqlQuery, columnValues);

    return result.insertId;
}

/**
 * Updates rows in a table
 * @param {string} tableName - Name of the table
 * @param {Object} updateData - Data to update as key-value pairs
 * @param {string} whereClause - WHERE clause (without WHERE keyword)
 * @param {Array} whereParams - Parameters for WHERE clause
 * @returns {Promise<number>} Number of affected rows
 */
async function updateRows(tableName, updateData, whereClause, whereParams = []) {
    const columnNames = Object.keys(updateData);
    const columnValues = Object.values(updateData);
    const setClause = columnNames.map(column => `${column} = ?`).join(', ');

    const sqlQuery = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`;
    const result = await executeQuery(sqlQuery, [...columnValues, ...whereParams]);

    return result.affectedRows;
}

/**
 * Deletes rows from a table
 * @param {string} tableName - Name of the table
 * @param {string} whereClause - WHERE clause (without WHERE keyword)
 * @param {Array} whereParams - Parameters for WHERE clause
 * @returns {Promise<number>} Number of affected rows
 */
async function deleteRows(tableName, whereClause, whereParams = []) {
    const sqlQuery = `DELETE FROM ${tableName} WHERE ${whereClause}`;
    const result = await executeQuery(sqlQuery, whereParams);

    return result.affectedRows;
}

// ============================================
// TRANSACTION MANAGEMENT
// ============================================

/**
 * Begins a new database transaction
 * @returns {Promise<Object>} Database connection with active transaction
 */
async function beginTransaction() {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    return connection;
}

/**
 * Commits a transaction
 * @param {Object} connection - Database connection from beginTransaction
 */
async function commitTransaction(connection) {
    await connection.commit();
    connection.release();
}

/**
 * Rolls back a transaction
 * @param {Object} connection - Database connection from beginTransaction
 */
async function rollbackTransaction(connection) {
    await connection.rollback();
    connection.release();
}

/**
 * Executes a callback within a transaction
 * Automatically commits on success or rolls back on error
 * @param {Function} transactionCallback - Async function receiving the connection
 * @returns {Promise<any>} Result from the callback
 */
async function runInTransaction(transactionCallback) {
    const transactionConnection = await beginTransaction();

    try {
        const transactionResult = await transactionCallback(transactionConnection);
        await commitTransaction(transactionConnection);
        return transactionResult;
    } catch (transactionError) {
        await rollbackTransaction(transactionConnection);
        throw transactionError;
    }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    pool,
    testConnection,
    closeConnection,
    query: executeQuery,
    getOne: getSingleRow,
    getMany: getMultipleRows,
    insert: insertRow,
    update: updateRows,
    remove: deleteRows,
    beginTransaction,
    commitTransaction,
    rollbackTransaction,
    transaction: runInTransaction
};

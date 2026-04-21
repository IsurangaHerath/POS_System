/**
 * Database Configuration Module (MySQL)
 * 
 * MySQL database connection pool configuration using mysql2.
 * Provides a comprehensive database abstraction layer with:
 * - Connection pooling
 * - Query execution helpers
 * - Transaction support
 * - Query performance logging
 */

const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

// ============================================
// DATABASE CONFIGURATION
// ============================================

/**
 * Database connection configuration
 * Values are loaded from environment variables
 */
const databaseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pos_system',
    // Connection pooling
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 20,
    queueLimit: 0,
    connectTimeout: 10000,
    // Enable multiple statements for schema execution if needed
    multipleStatements: false
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
 * Tests the database connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection(retries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            logger.info(`Database connection attempt ${attempt}/${retries}...`);
            
            const connection = await pool.getConnection();
            await connection.query('SELECT NOW()');
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
 */
function isHealthy() {
    if (connectionHealth.consecutiveFailures >= connectionHealth.maxConsecutiveFailures) {
        return false;
    }
    return true;
}

/**
 * Closes the database connection pool
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
 * Query execution helpers
 * All methods now accept an optional 'connection' parameter to support transactions
 */

/**
 * Executes a raw SQL query with parameters
 * @param {string} sqlQuery - SQL query string
 * @param {Array} queryParams - Query parameter values
 * @param {Object} [connection] - Optional transaction connection
 * @returns {Promise<Array|Object>} Query results
 */
async function executeQuery(sqlQuery, queryParams = [], connection = null) {
    const queryStartTime = Date.now();
    const executor = connection || pool;
    
    try {
        const [rows] = await executor.query(sqlQuery, queryParams);
        const queryDuration = Date.now() - queryStartTime;

        if (queryDuration > 100) {
            logger.warn(`Slow query (${queryDuration}ms): ${sqlQuery.substring(0, 100)}...`);
        }

        if (sqlQuery.trim().toUpperCase().startsWith('SELECT')) {
            return rows;
        }
        
        return {
            affectedRows: rows.affectedRows,
            insertId: rows.insertId,
            rows: rows
        };
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
 * Retrieves a single row
 */
async function getSingleRow(sqlQuery, queryParams = [], connection = null) {
    const results = await executeQuery(sqlQuery, queryParams, connection);
    return (Array.isArray(results) && results.length > 0) ? results[0] : null;
}

/**
 * Retrieves multiple rows
 */
async function getMultipleRows(sqlQuery, queryParams = [], connection = null) {
    return executeQuery(sqlQuery, queryParams, connection);
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Inserts a row into a table
 */
async function insertRow(tableName, rowData, connection = null) {
    const columnNames = Object.keys(rowData);
    const columnValues = Object.values(rowData);
    const valuePlaceholders = columnNames.map(() => '?').join(', ');
    const columns = columnNames.join(', ');

    const sqlQuery = `INSERT INTO ${tableName} (${columns}) VALUES (${valuePlaceholders})`;
    const result = await executeQuery(sqlQuery, columnValues, connection);

    return result.insertId;
}

/**
 * Updates rows in a table
 */
async function updateRows(tableName, updateData, whereClause, whereParams = [], connection = null) {
    const columnNames = Object.keys(updateData);
    const columnValues = Object.values(updateData);
    const setClause = columnNames.map(column => `${column} = ?`).join(', ');

    const sqlQuery = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`;
    const result = await executeQuery(sqlQuery, [...columnValues, ...whereParams], connection);

    return result.affectedRows;
}

/**
 * Deletes rows from a table
 */
async function deleteRows(tableName, whereClause, whereParams = [], connection = null) {
    const sqlQuery = `DELETE FROM ${tableName} WHERE ${whereClause}`;
    const result = await executeQuery(sqlQuery, whereParams, connection);

    return result.affectedRows;
}

// ============================================
// TRANSACTION MANAGEMENT
// ============================================

/**
 * Gets a single connection from the pool
 */
async function getConnection() {
    return await pool.getConnection();
}

/**
 * Begins a new database transaction
 */
async function beginTransaction() {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    return connection;
}

/**
 * Commits a transaction
 */
async function commitTransaction(connection) {
    await connection.commit();
    connection.release();
}

/**
 * Rolls back a transaction
 */
async function rollbackTransaction(connection) {
    await connection.rollback();
    connection.release();
}

/**
 * Executes a callback within a transaction
 */
async function runInTransaction(transactionCallback) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        const transactionResult = await transactionCallback(connection);
        await connection.commit();
        return transactionResult;
    } catch (transactionError) {
        await connection.rollback();
        throw transactionError;
    } finally {
        connection.release();
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

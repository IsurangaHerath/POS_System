/**
 * Logger Utility
 * 
 * Winston-based logging configuration for the application.
 * Provides structured logging with file rotation and multiple log levels.
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDirectory = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDirectory)) {
    fs.mkdirSync(logsDirectory, { recursive: true });
}

// ============================================
// LOG FORMATTERS
// ============================================

/**
 * Custom log format for file logging
 * Includes timestamp, level, message, metadata, and stack traces
 */
const fileLogFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack, ...metadata }) => {
        let logEntry = `${timestamp} [${level.toUpperCase()}]: ${message}`;

        // Include additional metadata if present
        if (Object.keys(metadata).length > 0) {
            logEntry += ` ${JSON.stringify(metadata)}`;
        }

        // Include stack trace for errors
        if (stack) {
            logEntry += `\n${stack}`;
        }

        return logEntry;
    })
);

/**
 * Colorized console log format for development
 * Makes it easier to read logs in terminal
 */
const consoleLogFormat = winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ level, message, timestamp, ...metadata }) => {
        let logEntry = `${timestamp} [${level}]: ${message}`;

        // Include additional metadata if present
        if (Object.keys(metadata).length > 0) {
            logEntry += ` ${JSON.stringify(metadata)}`;
        }

        return logEntry;
    })
);

// ============================================
// LOGGER CONFIGURATION
// ============================================

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: fileLogFormat,
    transports: [
        // Console transport for development
        new winston.transports.Console({
            format: consoleLogFormat,
            handleExceptions: true,
            handleRejections: true
        }),
        // Combined log file - all levels
        new winston.transports.File({
            filename: path.join(logsDirectory, 'combined.log'),
            handleExceptions: true,
            handleRejections: true,
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // Error log file - errors only
        new winston.transports.File({
            filename: path.join(logsDirectory, 'error.log'),
            level: 'error',
            handleExceptions: true,
            handleRejections: true,
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    ],
    exitOnError: false
});

// ============================================
// CUSTOM LOGGING METHODS
// ============================================

/**
 * Logs HTTP request information
 * @param {Object} req - Express request object
 * @param {number} statusCode - HTTP response status code
 * @param {number} duration - Request duration in milliseconds
 */
logger.logRequest = (req, statusCode, duration) => {
    const requestLogData = {
        method: req.method,
        url: req.originalUrl,
        status: statusCode,
        duration: `${duration}ms`,
        ip: req.ip || req.connection?.remoteAddress,
        userId: req.user?.id || 'anonymous'
    };

    // Log warnings for error status codes
    if (statusCode >= 400) {
        logger.warn('HTTP Request', requestLogData);
    } else {
        logger.info('HTTP Request', requestLogData);
    }
};

/**
 * Logs database query information
 * Tracks slow queries and errors
 * @param {string} sql - SQL query string
 * @param {number} duration - Query execution time in milliseconds
 * @param {Error} [error=null] - Optional error object
 */
logger.logQuery = (sql, duration, error = null) => {
    const queryLogData = {
        sql: sql.substring(0, 200), // Truncate long queries
        duration: `${duration}ms`
    };

    if (error) {
        // Log database errors
        logger.error('Database Query Error', { ...queryLogData, error: error.message });
    } else if (duration > 100) {
        // Log warnings for slow queries (> 100ms)
        logger.warn('Slow Query', queryLogData);
    } else {
        // Log all queries in debug mode
        logger.debug('Database Query', queryLogData);
    }
};

module.exports = logger;

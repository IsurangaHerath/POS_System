/**
 * Error Handling Middleware
 * 
 * Provides centralized error handling for the Express application including:
 * - Custom error classes for different error types
 * - Global error handler middleware
 * - 404 handler for undefined routes
 * - Async route handler wrapper
 */

// Logger utility for error logging
const logger = require('../utils/logger');

// Response utility for standardized error responses
const { errorResponse } = require('../utils/response');

// Error code constants
const { ERROR_CODES } = require('../utils/constants');

// ============================================
// CUSTOM ERROR CLASSES
// ============================================

/**
 * Base API Error class for operational errors
 * Extends built-in Error class with additional properties
 */
class ApiError extends Error {
    /**
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     * @param {string} code - Application-specific error code
     * @param {*} [details] - Additional error details
     */
    constructor(message, statusCode = 500, code = ERROR_CODES.INTERNAL_ERROR, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Error for 404 Not Found responses
 */
class NotFoundError extends ApiError {
    constructor(message = 'Resource not found') {
        super(message, 404, ERROR_CODES.NOT_FOUND);
    }
}

/**
 * Error for 400 Bad Request responses
 */
class ValidationError extends ApiError {
    constructor(message = 'Validation failed', details = null) {
        super(message, 400, ERROR_CODES.VALIDATION_ERROR, details);
    }
}

/**
 * Error for 401 Unauthorized responses
 */
class AuthenticationError extends ApiError {
    constructor(message = 'Authentication failed') {
        super(message, 401, ERROR_CODES.AUTHENTICATION_ERROR);
    }
}

/**
 * Error for 403 Forbidden responses
 */
class AuthorizationError extends ApiError {
    constructor(message = 'Access denied') {
        super(message, 403, ERROR_CODES.AUTHORIZATION_ERROR);
    }
}

/**
 * Error for 409 Conflict responses
 */
class ConflictError extends ApiError {
    constructor(message = 'Resource conflict') {
        super(message, 409, ERROR_CODES.CONFLICT_ERROR);
    }
}

/**
 * Error for database-related errors
 */
class DatabaseError extends ApiError {
    constructor(message = 'Database operation failed') {
        super(message, 500, ERROR_CODES.DATABASE_ERROR);
    }
}

/**
 * Error for rate limiting (429 Too Many Requests)
 */
class RateLimitError extends ApiError {
    constructor(message = 'Too many requests') {
        super(message, 429, ERROR_CODES.RATE_LIMIT_ERROR);
    }
}

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================

/**
 * Global error handler middleware
 * Catches all errors and returns appropriate responses
 * Logs errors based on their severity
 */
const errorHandler = (err, request, response, next) => {
    // Build error information object for logging
    const errorInfo = {
        message: err.message,
        code: err.code || ERROR_CODES.INTERNAL_ERROR,
        stack: err.stack,
        method: request.method,
        url: request.originalUrl,
        body: request.body,
        params: request.params,
        query: request.query,
        user: request.user?.id || 'anonymous',
        ip: request.ip || request.connection?.remoteAddress
    };

    const statusCode = err.statusCode || 500;

    // Log errors based on status code severity
    if (statusCode >= 500) {
        logger.error('Server Error:', errorInfo);
    } else if (statusCode >= 400) {
        logger.warn('Client Error:', {
            message: err.message,
            code: err.code,
            url: request.originalUrl,
            user: request.user?.id
        });
    }

    // Handle JSON parsing errors
    if (err.name === 'SyntaxError' && err.status === 400 && 'body' in err) {
        return errorResponse(response, 'Invalid JSON in request body', ERROR_CODES.VALIDATION_ERROR, 400);
    }

    // Handle MySQL duplicate entry errors
    if (err.code === 'ER_DUP_ENTRY') {
        const duplicateMatch = err.message.match(/Duplicate entry '(.+)' for key/);
        const duplicateValue = duplicateMatch ? duplicateMatch[1] : 'unknown';
        return errorResponse(
            response,
            `Duplicate entry: ${duplicateValue} already exists`,
            ERROR_CODES.CONFLICT_ERROR,
            409
        );
    }

    // Handle foreign key constraint violations
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return errorResponse(
            response,
            'Referenced record not found',
            ERROR_CODES.VALIDATION_ERROR,
            400
        );
    }

    // Handle records that are being referenced by other records
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        return errorResponse(
            response,
            'Cannot delete: record is referenced by other records',
            ERROR_CODES.CONFLICT_ERROR,
            409
        );
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        return errorResponse(response, 'Invalid token', ERROR_CODES.AUTHENTICATION_ERROR, 401);
    }

    if (err.name === 'TokenExpiredError') {
        return errorResponse(response, 'Token has expired', ERROR_CODES.AUTHENTICATION_ERROR, 401);
    }

    // Handle operational errors with known messages
    if (err.isOperational) {
        return errorResponse(response, err.message, err.code, statusCode, err.details);
    }

    // Hide error details in production
    if (process.env.NODE_ENV === 'production') {
        return errorResponse(response, 'An unexpected error occurred', ERROR_CODES.INTERNAL_ERROR, 500);
    }

    // Return full error details in development
    return response.status(statusCode).json({
        success: false,
        error: {
            code: err.code || ERROR_CODES.INTERNAL_ERROR,
            message: err.message,
            stack: err.stack,
            details: err.details
        },
        timestamp: new Date().toISOString()
    });
};

// ============================================
// 404 HANDLER
// ============================================

/**
 * Middleware to handle undefined routes
 * Creates a NotFoundError and passes it to the error handler
 */
const notFoundHandler = (request, response, next) => {
    const notFoundError = new NotFoundError(`Route ${request.originalUrl} not found`);
    next(notFoundError);
};

// ============================================
// ASYNC HANDLER WRAPPER
// ============================================

/**
 * Wraps async route handlers to catch errors and pass them to Express
 * Eliminates need for try-catch blocks in route handlers
 * @param {Function} asyncFn - Async route handler function
 * @returns {Function} Express route handler
 */
const asyncHandler = (asyncFn) => {
    return (request, response, next) => {
        Promise.resolve(asyncFn(request, response, next)).catch(next);
    };
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler,
    ApiError,
    NotFoundError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    ConflictError,
    DatabaseError,
    RateLimitError
};

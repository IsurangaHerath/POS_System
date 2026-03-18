/**
 * Response Utility Functions
 * 
 * Provides standardized HTTP response helpers for consistent API responses.
 * All responses follow a consistent format with success/error indicators.
 */

// ============================================
// SUCCESS RESPONSES
// ============================================

/**
 * Sends a successful response with optional data
 * @param {Object} res - Express response object
 * @param {*} [data=null] - Response data
 * @param {string} [message='Success'] - Success message
 * @param {number} [statusCode=200] - HTTP status code
 * @returns {Object} JSON response
 */
const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
    const response = {
        success: true,
        message,
        timestamp: new Date().toISOString()
    };

    if (data !== null) {
        response.data = data;
    }

    return res.status(statusCode).json(response);
};

/**
 * Sends a 201 Created response for new resources
 * @param {Object} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} [message='Resource created successfully'] - Success message
 * @returns {Object} JSON response
 */
const createdResponse = (res, data, message = 'Resource created successfully') => {
    return successResponse(res, data, message, 201);
};

/**
 * Sends a 200 OK response for delete operations
 * @param {Object} res - Express response object
 * @param {string} [message='Resource deleted successfully'] - Success message
 * @returns {Object} JSON response
 */
const noContentResponse = (res, message = 'Resource deleted successfully') => {
    return successResponse(res, null, message, 200);
};

// ============================================
// ERROR RESPONSES
// ============================================

/**
 * Sends an error response
 * @param {Object} res - Express response object
 * @param {string} [message='An error occurred'] - Error message
 * @param {string} [code='INTERNAL_ERROR'] - Application error code
 * @param {number} [statusCode=500] - HTTP status code
 * @param {*} [details=null] - Additional error details
 * @returns {Object} JSON response
 */
const errorResponse = (res, message = 'An error occurred', code = 'INTERNAL_ERROR', statusCode = 500, details = null) => {
    const response = {
        success: false,
        error: {
            code,
            message
        },
        timestamp: new Date().toISOString()
    };

    if (details) {
        response.error.details = details;
    }

    return res.status(statusCode).json(response);
};

/**
 * Sends a 400 Bad Request response for validation errors
 * @param {Object} res - Express response object
 * @param {Array} errors - Validation error array from express-validator
 * @returns {Object} JSON response
 */
const validationError = (res, errors) => {
    const formattedErrors = errors.map(error => ({
        field: error.path || error.param,
        message: error.msg
    }));

    return errorResponse(res, 'Validation failed', 'VALIDATION_ERROR', 400, formattedErrors);
};

/**
 * Sends a 404 Not Found response
 * @param {Object} res - Express response object
 * @param {string} [resource='Resource'] - Name of the resource that wasn't found
 * @returns {Object} JSON response
 */
const notFoundResponse = (res, resource = 'Resource') => {
    return errorResponse(res, `${resource} not found`, 'NOT_FOUND', 404);
};

/**
 * Sends a 401 Unauthorized response
 * @param {Object} res - Express response object
 * @param {string} [message='Unauthorized access'] - Error message
 * @returns {Object} JSON response
 */
const unauthorizedResponse = (res, message = 'Unauthorized access') => {
    return errorResponse(res, message, 'AUTHENTICATION_ERROR', 401);
};

/**
 * Sends a 403 Forbidden response
 * @param {Object} res - Express response object
 * @param {string} [message='Access denied'] - Error message
 * @returns {Object} JSON response
 */
const forbiddenResponse = (res, message = 'Access denied') => {
    return errorResponse(res, message, 'AUTHORIZATION_ERROR', 403);
};

/**
 * Sends a 409 Conflict response
 * @param {Object} res - Express response object
 * @param {string} [message='Resource conflict'] - Error message
 * @returns {Object} JSON response
 */
const conflictResponse = (res, message = 'Resource conflict') => {
    return errorResponse(res, message, 'CONFLICT_ERROR', 409);
};

// ============================================
// PAGINATED RESPONSE
// ============================================

/**
 * Sends a paginated response with metadata
 * @param {Object} res - Express response object
 * @param {Array|Object} data - Response data
 * @param {Object} pagination - Pagination information
 * @param {number} pagination.page - Current page number
 * @param {number} pagination.limit - Items per page
 * @param {number} pagination.total - Total number of items
 * @param {number} pagination.totalPages - Total number of pages
 * @param {string} [message='Success'] - Success message
 * @returns {Object} JSON response
 */
const paginatedResponse = (res, data, pagination, message = 'Success') => {
    return res.status(200).json({
        success: true,
        message,
        data,
        pagination: {
            page: pagination.page || 1,
            limit: pagination.limit || 20,
            total: pagination.total || 0,
            totalPages: pagination.totalPages || 0
        },
        timestamp: new Date().toISOString()
    });
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
    successResponse,
    errorResponse,
    paginatedResponse,
    validationError,
    notFoundResponse,
    unauthorizedResponse,
    forbiddenResponse,
    conflictResponse,
    createdResponse,
    noContentResponse
};

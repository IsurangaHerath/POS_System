/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Middleware for checking user roles and permissions.
 * Provides granular access control based on user roles.
 */

const { forbiddenResponse, unauthorizedResponse } = require('../utils/response');
const { ROLES, ROLE_HIERARCHY, ROLE_PERMISSIONS, PERMISSIONS } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Check if user has required role(s)
 * @param {...string} roles - Required roles
 * @returns {Function} Express middleware
 */
const requireRoles = (...roles) => {
    return (req, res, next) => {
        // First check if user is authenticated
        if (!req.user) {
            return unauthorizedResponse(res, 'Authentication required');
        }

        const userRole = req.user.role;

        // Check if user's role is in the allowed roles
        if (!roles.includes(userRole)) {
            logger.warn(`Access denied for user ${req.user.username} with role ${userRole}. Required roles: ${roles.join(', ')}`);
            return forbiddenResponse(res, 'Insufficient permissions');
        }

        next();
    };
};

/**
 * Check if user has minimum role level
 * @param {string} minimumRole - Minimum required role
 * @returns {Function} Express middleware
 */
const requireMinRole = (minimumRole) => {
    return (req, res, next) => {
        if (!req.user) {
            return unauthorizedResponse(res, 'Authentication required');
        }

        const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
        const requiredLevel = ROLE_HIERARCHY[minimumRole] || 0;

        if (userLevel < requiredLevel) {
            logger.warn(`Access denied for user ${req.user.username}. Required minimum role: ${minimumRole}`);
            return forbiddenResponse(res, 'Insufficient permissions');
        }

        next();
    };
};

/**
 * Check if user has specific permission
 * @param {string} permission - Required permission
 * @returns {Function} Express middleware
 */
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return unauthorizedResponse(res, 'Authentication required');
        }

        const userRole = req.user.role;
        const userPermissions = ROLE_PERMISSIONS[userRole] || [];

        if (!userPermissions.includes(permission)) {
            logger.warn(`Permission denied for user ${req.user.username}. Required permission: ${permission}`);
            return forbiddenResponse(res, 'You do not have permission to perform this action');
        }

        next();
    };
};

/**
 * Check if user has any of the specified permissions
 * @param {...string} permissions - Required permissions (any one)
 * @returns {Function} Express middleware
 */
const requireAnyPermission = (...permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return unauthorizedResponse(res, 'Authentication required');
        }

        const userRole = req.user.role;
        const userPermissions = ROLE_PERMISSIONS[userRole] || [];

        const hasPermission = permissions.some(permission => userPermissions.includes(permission));

        if (!hasPermission) {
            logger.warn(`Permission denied for user ${req.user.username}. Required any of: ${permissions.join(', ')}`);
            return forbiddenResponse(res, 'You do not have permission to perform this action');
        }

        next();
    };
};

/**
 * Check if user has all of the specified permissions
 * @param {...string} permissions - Required permissions (all)
 * @returns {Function} Express middleware
 */
const requireAllPermissions = (...permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return unauthorizedResponse(res, 'Authentication required');
        }

        const userRole = req.user.role;
        const userPermissions = ROLE_PERMISSIONS[userRole] || [];

        const hasAllPermissions = permissions.every(permission => userPermissions.includes(permission));

        if (!hasAllPermissions) {
            logger.warn(`Permission denied for user ${req.user.username}. Required all of: ${permissions.join(', ')}`);
            return forbiddenResponse(res, 'You do not have all required permissions');
        }

        next();
    };
};

/**
 * Owner or Admin only middleware
 * Owner and Admin have all permissions.
 */
const adminOnly = requireRoles(ROLES.ADMIN, ROLES.OWNER);

/**
 * Manager or Admin only middleware
 */
const managerOrAdmin = requireMinRole(ROLES.MANAGER);

/**
 * Check if user owns the resource or has admin role
 * @param {string} resourceIdParam - Request parameter name for resource user ID
 * @returns {Function} Express middleware
 */
const ownerOrAdmin = (resourceIdParam = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            return unauthorizedResponse(res, 'Authentication required');
        }

        // Admin can access any resource
        if (req.user.role === ROLES.ADMIN) {
            return next();
        }

        // Check if user owns the resource
        const resourceUserId = parseInt(req.params[resourceIdParam] || req.body[resourceIdParam]);

        if (req.user.id === resourceUserId) {
            return next();
        }

        logger.warn(`Access denied for user ${req.user.username} to resource owned by user ${resourceUserId}`);
        return forbiddenResponse(res, 'You can only access your own resources');
    };
};

/**
 * Get user permissions
 * @param {string} role - User role
 * @returns {Array} Array of permissions
 */
const getUserPermissions = (role) => {
    return ROLE_PERMISSIONS[role] || [];
};

/**
 * Check if role has permission (utility function)
 * @param {string} role - User role
 * @param {string} permission - Permission to check
 * @returns {boolean} Has permission
 */
const hasPermission = (role, permission) => {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(permission);
};

module.exports = {
    requireRoles,
    requireMinRole,
    requirePermission,
    requireAnyPermission,
    requireAllPermissions,
    adminOnly,
    managerOrAdmin,
    ownerOrAdmin,
    getUserPermissions,
    hasPermission
};

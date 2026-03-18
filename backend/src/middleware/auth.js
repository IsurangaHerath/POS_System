/**
 * Authentication Middleware
 * 
 * Provides JWT-based authentication functionality including:
 * - Token verification for protected routes
 * - Optional authentication (for routes that work with or without auth)
 * - Access and refresh token generation
 * - Token refresh validation
 */

// JWT library for token handling
const jwt = require('jsonwebtoken');

// Utility functions for standardized responses
const { unauthorizedResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Extracts user information from JWT token and attaches to request object.
 * Returns 401 if token is missing, invalid, or expired.
 */
const authenticate = async (request, response, next) => {
    try {
        const authHeader = request.headers.authorization;

        // Check for Bearer token in Authorization header
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return unauthorizedResponse(response, 'No token provided');
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return unauthorizedResponse(response, 'Invalid token format');
        }

        // Verify and decode the JWT token
        const decodedToken = jwt.verify(token, JWT_SECRET);

        // Attach user information to request object
        request.user = {
            id: decodedToken.id,
            username: decodedToken.username,
            email: decodedToken.email,
            role: decodedToken.role,
            full_name: decodedToken.full_name
        };

        next();
    } catch (error) {
        // Handle specific JWT errors
        if (error.name === 'TokenExpiredError') {
            return unauthorizedResponse(response, 'Token has expired');
        }

        if (error.name === 'JsonWebTokenError') {
            return unauthorizedResponse(response, 'Invalid token');
        }

        logger.error('Authentication error:', error);
        return errorResponse(response, 'Authentication failed', 'AUTHENTICATION_ERROR', 401);
    }
};

/**
 * Optional authentication middleware.
 * Attempts to verify token if present, but allows request to proceed regardless.
 * Useful for routes that behave differently based on authentication status.
 */
const optionalAuth = async (request, response, next) => {
    try {
        const authHeader = request.headers.authorization;

        // Attempt to extract and verify token if present
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];

            if (token) {
                const decodedToken = jwt.verify(token, JWT_SECRET);
                request.user = {
                    id: decodedToken.id,
                    username: decodedToken.username,
                    email: decodedToken.email,
                    role: decodedToken.role,
                    full_name: decodedToken.full_name
                };
            }
        }

        next();
    } catch (error) {
        // Continue regardless of token errors in optional auth
        next();
    }
};

/**
 * Generates a short-lived JWT access token for authenticated users.
 * @param {Object} user - User object containing id, username, email, role, full_name
 * @returns {string} JWT access token
 */
const generateAccessToken = (user) => {
    const tokenPayload = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        full_name: user.full_name
    };

    return jwt.sign(tokenPayload, JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '15m'
    });
};

/**
 * Generates a longer-lived JWT refresh token for obtaining new access tokens.
 * @param {Object} user - User object containing id
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (user) => {
    const tokenPayload = {
        id: user.id,
        type: 'refresh'
    };

    return jwt.sign(tokenPayload, JWT_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    });
};

/**
 * Verifies a refresh token and returns the decoded payload if valid.
 * @param {string} token - JWT refresh token to verify
 * @returns {Object|null} Decoded token payload or null if invalid
 */
const verifyRefreshToken = (token) => {
    try {
        const decodedToken = jwt.verify(token, JWT_SECRET);

        // Ensure this is actually a refresh token
        if (decodedToken.type !== 'refresh') {
            return null;
        }

        return decodedToken;
    } catch (error) {
        return null;
    }
};

module.exports = {
    authenticate,
    optionalAuth,
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken
};

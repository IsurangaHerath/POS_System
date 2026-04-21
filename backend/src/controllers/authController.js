const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../middleware/auth');
const { successResponse, errorResponse, unauthorizedResponse, createdResponse } = require('../utils/response');
const { AuthenticationError, ValidationError, NotFoundError, ConflictError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const SALT_ROUNDS = 12;

const register = async (req, res, next) => {
    try {
        const { username, email, password, full_name, role = 'cashier', phone } = req.body;

        // Check if username already exists
        const usernameExists = await User.usernameExists(username);
        if (usernameExists) {
            throw new ConflictError('Username already exists');
        }

        // Check if email already exists
        const emailExists = await User.emailExists(email);
        if (emailExists) {
            throw new ConflictError('Email already exists');
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        // Create user - default role is cashier for self-registration
        const userId = await User.create({
            username,
            email,
            password_hash,
            full_name,
            role: 'cashier', // Force cashier role for self-registration
            phone
        });

        const user = await User.findById(userId);

        logger.info(`New user registered: ${username}`);

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        return createdResponse(res, {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role: user.role
            },
            tokens: {
                accessToken,
                refreshToken
            }
        }, 'Registration successful. Welcome to POS System!');

    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { username, password } = req.body;
        
        logger.info(`[AUTH] Login attempt for username: ${username}`);
        logger.info(`[AUTH] Request body: ${JSON.stringify({ ...req.body, password: '[HIDDEN]' })}`);

        // Find user by username or email
        const user = await User.findByUsernameOrEmail(username);
        
        logger.info(`[AUTH] User lookup result: ${user ? 'User found' : 'User NOT found'}`);
        if (user) {
            logger.info(`[AUTH] Found user details: id=${user.id}, username=${user.username}, is_active=${user.is_active}`);
        }

        if (!user) {
            logger.warn(`Login failed - invalid username: ${username}`);
            throw new AuthenticationError('Invalid username or password');
        }

        if (!user.is_active) {
            logger.warn(`[AUTH] Login attempt on inactive account: ${username}`);
            throw new AuthenticationError('Account is deactivated. Please contact administrator.');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        
        logger.info(`[AUTH] Password verification result: ${isPasswordValid ? 'SUCCESS' : 'FAILED'}`);

        if (!isPasswordValid) {
            logger.warn(`Wrong password for user: ${username}`);
            throw new AuthenticationError('Invalid username or password');
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        await User.updateLastLogin(user.id);

        logger.info(`User logged in: ${username}`);

        return successResponse(res, {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role: user.role
            },
            tokens: {
                accessToken,
                refreshToken
            }
        }, 'Login successful');

    } catch (error) {
        next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        if (req.user) {
            logger.info(`User logged out: ${req.user.username}`);
        }

        return successResponse(res, null, 'Logout successful');
    } catch (error) {
        next(error);
    }
};

const refresh = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            throw new AuthenticationError('Refresh token is required');
        }

        const decoded = verifyRefreshToken(refreshToken);

        if (!decoded) {
            throw new AuthenticationError('Invalid or expired refresh token');
        }

        const user = await User.findById(decoded.id);

        if (!user || !user.is_active) {
            throw new AuthenticationError('User not found or inactive');
        }

        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);

        logger.info(`Token refreshed for user: ${user.username}`);

        return successResponse(res, {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        }, 'Token refreshed successfully');

    } catch (error) {
        next(error);
    }
};

const getCurrentUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            throw new NotFoundError('User not found');
        }

        return successResponse(res, user);
    } catch (error) {
        next(error);
    }
};

const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const userId = req.user.id;

        if (newPassword !== confirmPassword) {
            throw new ValidationError('New passwords do not match');
        }

        if (newPassword.length < 8) {
            throw new ValidationError('Password must be at least 8 characters long');
        }

        const user = await User.findById(userId);

        if (!user) {
            throw new NotFoundError('User not found');
        }

        const fullUser = await User.findByUsername(user.username);

        const isPasswordValid = await bcrypt.compare(currentPassword, fullUser.password_hash);

        if (!isPasswordValid) {
            throw new AuthenticationError('Current password is incorrect');
        }

        const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        await User.updatePassword(userId, newPasswordHash);

        logger.info(`Password changed for user: ${user.username}`);

        return successResponse(res, null, 'Password changed successfully');

    } catch (error) {
        next(error);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 8) {
            throw new ValidationError('Password must be at least 8 characters long');
        }

        const user = await User.findById(userId);

        if (!user) {
            throw new NotFoundError('User not found');
        }

        const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        await User.updatePassword(userId, passwordHash);

        logger.info(`Password reset by admin for user: ${user.username}`);

        return successResponse(res, null, 'Password reset successfully');

    } catch (error) {
        next(error);
    }
};

module.exports = {
    login,
    logout,
    refresh,
    getCurrentUser,
    changePassword,
    resetPassword,
    register
};

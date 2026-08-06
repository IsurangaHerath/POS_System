const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../middleware/auth');
const { successResponse, errorResponse, unauthorizedResponse, createdResponse } = require('../utils/response');
const { AuthenticationError, ValidationError, NotFoundError, ConflictError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const SALT_ROUNDS = 12;

/**
 * @description Registers a new self-service account; password is bcrypt-hashed before insert.
 *              Self-registration is forced to the 'cashier' role regardless of the submitted role.
 * @access      Public (no auth).
 * @triggeredBy LoginPage register mode → AuthContext.register().
 * @request     POST /api/auth/register
 * @params      Body: username, email, password, full_name, role (optional), phone (optional).
 * @dbOps       User.usernameExists / User.emailExists (SELECT); User.create (INSERT users, password_hash via bcrypt.hash); User.findById (SELECT).
 * @returns     { success, data: { user, tokens: { accessToken, refreshToken } } } (201).
 */
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

/**
 * @description Authenticates a user by username/email + password and issues JWT access/refresh tokens.
 *              Rejects inactive accounts and logs every attempt for security auditing.
 * @access      Public.
 * @triggeredBy LoginPage submit → AuthContext.login().
 * @request     POST /api/auth/login
 * @params      Body: username, password.
 * @dbOps       User.findByUsernameOrEmail (SELECT); bcrypt.compare; User.updateLastLogin (UPDATE last_login).
 * @returns     { success, data: { user, tokens: { accessToken, refreshToken } }, message }.
 */
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

/**
 * @description Ends the user's session server-side. No DB mutation required since the
 *              frontend (AuthContext) clears the stored tokens after the call succeeds.
 * @access      Authenticated.
 * @triggeredBy Navbar logout → AuthContext.logout().
 * @request     POST /api/auth/logout
 * @params      none (auth via Bearer token).
 * @dbOps       None.
 * @returns     { success, message: 'Logout successful' }.
 */
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

/**
 * @description Exchanges a valid refresh token for a fresh access/refresh token pair.
 * @access      Public (token supplied in body).
 * @triggeredBy No frontend caller today — reserved for a future token auto-refresh flow.
 * @request     POST /api/auth/refresh
 * @params      Body: refreshToken.
 * @dbOps       verifyRefreshToken (JWT verify); User.findById (SELECT).
 * @returns     { success, data: { accessToken, refreshToken } }.
 */
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

/**
 * @description Returns the currently authenticated user's full profile from the JWT payload.
 * @access      Authenticated.
 * @triggeredBy AuthContext bootstrap → GET /auth/me on app load and page refresh.
 * @request     GET /api/auth/me
 * @params      none (auth via Bearer token).
 * @dbOps       User.findById → SELECT users.
 * @returns     { success, data: user }.
 */
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

/**
 * @description Verifies the user's current password, then hashes and persists a new password.
 *              Requires the new password to match its confirmation and be at least 8 characters.
 * @access      Authenticated (self-service).
 * @triggeredBy ProfilePage change-password form → AuthContext.changePassword().
 * @request     PUT /api/auth/password
 * @params      Body: currentPassword, newPassword, confirmPassword.
 * @dbOps       User.findById (SELECT); User.findByUsername (SELECT for password check); User.updatePassword (UPDATE password_hash).
 * @returns     { success, message: 'Password changed successfully' }.
 */
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

/**
 * @description Admin-only password reset for a target user, bypassing knowledge of the current password.
 * @access      Authenticated + adminOnly (route middleware).
 * @triggeredBy No frontend caller today — reserved for an admin "reset password" UI.
 * @request     POST /api/auth/reset-password/:userId
 * @params      Param: userId; Body: newPassword.
 * @dbOps       User.findById (SELECT); bcrypt.hash; User.updatePassword (UPDATE password_hash).
 * @returns     { success, message: 'Password reset successfully' }.
 */
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

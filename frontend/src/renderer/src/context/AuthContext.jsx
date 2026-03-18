/**
 * Authentication Context
 * 
 * React Context for managing authentication state throughout the application.
 * Provides login, logout, registration, and authorization utilities.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

// Create the authentication context
const AuthContext = createContext(null);

/**
 * Custom hook to access authentication context
 * @throws {Error} If used outside of AuthProvider
 * @returns {Object} Authentication context value
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// ============================================
// ROLE DEFINITIONS
// ============================================

/**
 * Available user roles in the system
 * @constant {Object}
 */
export const ROLES = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    CASHIER: 'cashier'
};

/**
 * Role hierarchy for permission comparisons (higher = more access)
 * @constant {Object}
 */
const ROLE_HIERARCHY = {
    [ROLES.ADMIN]: 3,
    [ROLES.MANAGER]: 2,
    [ROLES.CASHIER]: 1
};

/**
 * Authentication Provider Component
 * Wraps the application to provide authentication state and methods
 */
export const AuthProvider = ({ children }) => {
    // State management
    const [currentUser, setCurrentUser] = useState(null);
    const [authToken, setAuthToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    /**
     * Initializes authentication state from storage on component mount
     */
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                if (window.electron?.store) {
                    // Electron environment - use secure storage
                    const storedToken = await window.electron.store.get('auth_token');
                    const storedUser = await window.electron.store.get('auth_user');

                    if (storedToken && storedUser) {
                        await validateStoredAuth(storedToken, storedUser);
                    }
                } else {
                    // Browser environment - use localStorage
                    const storedToken = localStorage.getItem('auth_token');
                    const storedUser = localStorage.getItem('auth_user');

                    if (storedToken && storedUser) {
                        await validateStoredAuth(storedToken, JSON.parse(storedUser));
                    }
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initializeAuth();
    }, []);

    /**
     * Validates stored authentication by fetching current user from API
     * @param {string} token - Authentication token
     * @param {Object} user - Stored user object
     */
    const validateStoredAuth = async (token, user) => {
        try {
            const response = await api.get('/auth/me');
            const validatedUser = response.data.data.user;
            
            setAuthToken(token);
            setCurrentUser(validatedUser);
            setIsAuthenticated(true);

            // Update stored user data
            if (window.electron?.store) {
                await window.electron.store.set('auth_user', validatedUser);
            } else {
                localStorage.setItem('auth_user', JSON.stringify(validatedUser));
            }
        } catch (error) {
            // Token invalid - clear auth state
            await performLogout();
        }
    };

    /**
     * Performs user login
     * @param {string} username - User's username
     * @param {string} password - User's password
     * @returns {Promise<Object>} Result with success status and optional error
     */
    const login = useCallback(async (username, password) => {
        try {
            const response = await api.post('/auth/login', { username, password });

            const responseData = response.data.data;
            let userData, token;
            
            // Handle different response formats (with or without tokens wrapper)
            if (responseData.tokens) {
                userData = responseData.user;
                token = responseData.tokens.accessToken;
            } else {
                userData = responseData.user;
                token = responseData.token;
            }

            // Store authentication data
            await saveAuthData(token, userData);

            setAuthToken(token);
            setCurrentUser(userData);
            setIsAuthenticated(true);

            return { success: true };
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Login failed';
            return { success: false, error: errorMessage };
        }
    }, []);

    /**
     * Performs user registration
     * @param {Object} userData - New user data
     * @returns {Promise<Object>} Result with success status and optional error
     */
    const register = useCallback(async (userData) => {
        try {
            const response = await api.post('/auth/register', userData);
            console.log('[Auth] Register response:', response.data);

            // Handle different response formats
            let registeredUser, authToken;
            
            if (response.data.data) {
                const responsePayload = response.data.data;
                if (responsePayload.tokens) {
                    registeredUser = responsePayload.user;
                    authToken = responsePayload.tokens.accessToken;
                } else {
                    registeredUser = responsePayload.user;
                    authToken = responsePayload.token;
                }
            } else {
                registeredUser = response.data.user || userData;
                authToken = response.data.accessToken || response.data.token;
            }

            if (!authToken) {
                throw new Error('No authentication token received');
            }

            // Store authentication data
            await saveAuthData(authToken, registeredUser);

            setAuthToken(authToken);
            setCurrentUser(registeredUser);
            setIsAuthenticated(true);

            return { success: true };
        } catch (error) {
            console.error('[Auth] Register error:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
            return { success: false, error: errorMessage };
        }
    }, []);

    /**
     * Saves authentication data to appropriate storage
     * @param {string} token - Authentication token
     * @param {Object} user - User data
     */
    const saveAuthData = async (token, user) => {
        if (window.electron?.store) {
            await window.electron.store.set('auth_token', token);
            await window.electron.store.set('auth_user', user);
        } else {
            localStorage.setItem('auth_token', token);
            localStorage.setItem('auth_user', JSON.stringify(user));
        }
    };

    /**
     * Performs user logout
     */
    const logout = useCallback(async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            // Ignore logout API errors
        } finally {
            await performLogout();
        }
    }, []);

    /**
     * Clears authentication data from state and storage
     */
    const performLogout = async () => {
        if (window.electron?.store) {
            await window.electron.store.delete('auth_token');
            await window.electron.store.delete('auth_user');
        } else {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
        }

        setAuthToken(null);
        setCurrentUser(null);
        setIsAuthenticated(false);
    };

    /**
     * Checks if user has exact role
     * @param {string} requiredRole - Role to check for
     * @returns {boolean} True if user has the exact role
     */
    const hasRole = useCallback((requiredRole) => {
        if (!currentUser) return false;
        return currentUser.role === requiredRole;
    }, [currentUser]);

    /**
     * Checks if user has minimum role level (inclusive)
     * @param {string} requiredRole - Minimum role required
     * @returns {boolean} True if user's role meets minimum requirement
     */
    const hasMinimumRole = useCallback((requiredRole) => {
        if (!currentUser) return false;
        const userLevel = ROLE_HIERARCHY[currentUser.role] || 0;
        const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
        return userLevel >= requiredLevel;
    }, [currentUser]);

    /**
     * Checks if user has specific permission
     * @param {string} permission - Permission to check for
     * @returns {boolean} True if user has the permission
     */
    const hasPermission = useCallback((permission) => {
        if (!currentUser) return false;

        // Admin has all permissions
        if (currentUser.role === ROLES.ADMIN) return true;

        // Define role-specific permissions
        const rolePermissions = {
            [ROLES.MANAGER]: [
                'view_dashboard',
                'view_products', 'create_products', 'edit_products',
                'view_categories', 'create_categories', 'edit_categories',
                'view_sales', 'create_sales',
                'view_inventory', 'adjust_inventory',
                'view_suppliers', 'create_suppliers', 'edit_suppliers',
                'view_purchase_orders', 'create_purchase_orders',
                'view_reports', 'export_reports'
            ],
            [ROLES.CASHIER]: [
                'view_products',
                'view_sales', 'create_sales'
            ]
        };

        const userPermissions = rolePermissions[currentUser.role] || [];
        return userPermissions.includes(permission);
    }, [currentUser]);

    /**
     * Updates user profile
     * @param {Object} updates - Profile fields to update
     * @returns {Promise<Object>} Result with success status and optional error
     */
    const updateProfile = useCallback(async (updates) => {
        try {
            const response = await api.put('/auth/profile', updates);
            const updatedUser = response.data.data.user;

            setCurrentUser(updatedUser);

            // Update stored user data
            if (window.electron?.store) {
                await window.electron.store.set('auth_user', updatedUser);
            } else {
                localStorage.setItem('auth_user', JSON.stringify(updatedUser));
            }

            return { success: true, user: updatedUser };
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Failed to update profile';
            return { success: false, error: errorMessage };
        }
    }, []);

    /**
     * Changes user password
     * @param {string} currentPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise<Object>} Result with success status and optional error
     */
    const changePassword = useCallback(async (currentPassword, newPassword) => {
        try {
            await api.put('/auth/password', { currentPassword, newPassword });
            return { success: true };
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Failed to change password';
            return { success: false, error: errorMessage };
        }
    }, []);

    // Context value object
    const value = {
        user: currentUser,
        token: authToken,
        isLoading,
        isAuthenticated,
        login,
        register,
        logout,
        hasRole,
        hasMinRole: hasMinimumRole,
        hasPermission,
        updateProfile,
        changePassword,
        isAdmin: currentUser?.role === ROLES.ADMIN,
        isManager: currentUser?.role === ROLES.MANAGER,
        isCashier: currentUser?.role === ROLES.CASHIER
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;

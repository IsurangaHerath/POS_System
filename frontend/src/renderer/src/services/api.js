/**
 * API Service Module
 * 
 * Centralized Axios HTTP client for making API requests.
 * Handles authentication tokens, error handling, and response formatting.
 * Optimized for browser/cloud environment.
 */

import axios from 'axios';

// ============================================
// CONFIGURATION
// ============================================

// Default API timeout in milliseconds
const API_TIMEOUT = 30000;

// Default API URL for browser environment
const DEFAULT_API_URL = 'http://localhost:5000/api';

/**
 * Retrieves the API URL based on the runtime environment.
 * Uses environment variables or default.
 * @returns {string} The API base URL
 */
const getApiUrl = () => {
    // Use Vite environment variable or default
    const apiUrl = import.meta.env.VITE_API_URL || DEFAULT_API_URL;
    console.log('[API] Using VITE_API_URL or default:', apiUrl);
    return apiUrl;
};

// ============================================
// AXIOS INSTANCE CREATION
// ============================================

/**
 * Creates a configured Axios instance with default settings
 */
const api = axios.create({
    timeout: API_TIMEOUT,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Store for the current API URL
let currentApiUrl = DEFAULT_API_URL;

// ============================================
// REQUEST INTERCEPTOR
// ============================================

/**
 * Interceptor that runs before each request.
/**
 * Interceptor that runs before each request.
 * Sets the base URL and attaches authentication token.
 */
api.interceptors.request.use(
    (config) => {
        // Update API URL if needed
        if (!currentApiUrl || currentApiUrl === DEFAULT_API_URL) {
            currentApiUrl = getApiUrl();
        }
        config.baseURL = currentApiUrl;
        
        console.log('[API Request]', config.method?.toUpperCase(), config.baseURL + config.url);

        // Retrieve authentication token from localStorage (browser environment)
        const authToken = localStorage.getItem('auth_token');

        // Attach token to request if available
        if (authToken) {
            config.headers.Authorization = `Bearer ${authToken}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// ============================================
// RESPONSE INTERCEPTOR
// ============================================

/**
 * Interceptor that handles API responses and errors.
 * Performs automatic token cleanup on 401 errors and redirects to login.
 */
api.interceptors.response.use(
    (response) => {
        console.log('[API Response]', response.config.url, response.status);
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        
        console.error(
            '[API Error]', 
            originalRequest.url, 
            error.response?.status, 
            error.message,
            error.response?.data
        );

        // Handle 401 Unauthorized - clear auth and redirect to login
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            // Clear authentication data from localStorage (browser environment)
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');

            // Redirect to login page
            window.location.href = '/login';
            return Promise.reject(error);
        }

        // Handle network errors
        if (!error.response) {
            error.response = {
                data: {
                    message: 'Network error. Please check your connection.'
                }
            };
        }

        return Promise.reject(error);
    }
);

// ============================================
// INITIALIZATION
// ============================================

// Initialize API URL on module load
currentApiUrl = getApiUrl();

// ============================================
// HTTP METHODS
// ============================================

/**
 * Performs a GET request
 * @param {string} url - Request endpoint
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Response data
 */
export const get = async (url, params = {}) => {
    const response = await api.get(url, { params });
    return response.data;
};

/**
 * Performs a POST request
 * @param {string} url - Request endpoint
 * @param {Object} data - Request body
 * @returns {Promise<Object>} Response data
 */
export const post = async (url, data = {}) => {
    const response = await api.post(url, data);
    return response.data;
};

/**
 * Performs a PUT request
 * @param {string} url - Request endpoint
 * @param {Object} data - Request body
 * @returns {Promise<Object>} Response data
 */
export const put = async (url, data = {}) => {
    const response = await api.put(url, data);
    return response.data;
};

/**
 * Performs a PATCH request
 * @param {string} url - Request endpoint
 * @param {Object} data - Request body
 * @returns {Promise<Object>} Response data
 */
export const patch = async (url, data = {}) => {
    const response = await api.patch(url, data);
    return response.data;
};

/**
 * Performs a DELETE request
 * @param {string} url - Request endpoint
 * @returns {Promise<Object>} Response data
 */
export const del = async (url) => {
    const response = await api.delete(url);
    return response.data;
};

/**
 * Uploads a file to the specified endpoint
 * @param {string} url - Upload endpoint
 * @param {File} file - File to upload
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} Response data
 */
export const upload = async (url, file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(url, formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
            if (onProgress) {
                const percentCompleted = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                );
                onProgress(percentCompleted);
            }
        }
    });

    return response.data;
};

/**
 * Downloads a file from the specified endpoint
 * @param {string} url - Download endpoint
 * @param {string} filename - Name for the downloaded file
 * @returns {Promise<void>}
 */
export const download = async (url, filename) => {
    const response = await api.get(url, {
        responseType: 'blob'
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
};

// Export the configured axios instance
export default api;

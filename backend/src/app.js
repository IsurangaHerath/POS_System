/**
 * Express Application Configuration
 * 
 * Main application setup including middleware, routes, and error handling.
 * This is the entry point for the Express.js backend server.
 */

// Core framework and third-party middleware imports
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { validationResult } = require('express-validator');

// Custom utilities and middleware
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { validationError } = require('./utils/response');

// Route imports
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const saleRoutes = require('./routes/sale.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const supplierRoutes = require('./routes/supplier.routes');
const purchaseOrderRoutes = require('./routes/purchaseOrder.routes');
const reportRoutes = require('./routes/report.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const settingsRoutes = require('./routes/settings.routes');

// Initialize Express application
const app = express();

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet - HTTP security headers
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// CORS - Cross-Origin Resource Sharing
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting - Prevent abuse and DDoS
const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes default
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 300, // 300 requests per window
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_ERROR',
            message: 'Too many requests, please try again later.'
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (request, response) => {
        logger.warn(`Rate limit exceeded for IP: ${request.ip}`);
        response.status(429).json({
            success: false,
            error: {
                code: 'RATE_LIMIT_ERROR',
                message: 'Too many requests, please try again later.'
            }
        });
    }
});

app.use('/api/', apiLimiter);

// ============================================
// REQUEST PARSING MIDDLEWARE
// ============================================

// Parse JSON bodies with 10MB limit
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies with extended parsing and 10MB limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// LOGGING MIDDLEWARE
// ============================================

// HTTP request logging based on environment
if (process.env.NODE_ENV === 'development') {
    // Development: concise colored output
    app.use(morgan('dev'));
} else {
    // Production: Apache/Nginx combined log format
    app.use(morgan('combined', {
        stream: {
            write: (message) => logger.info(message.trim())
        }
    }));
}

// Request timing - Track response time for performance monitoring
app.use((request, response, next) => {
    const requestStartTime = Date.now();

    response.on('finish', () => {
        const requestDuration = Date.now() - requestStartTime;
        logger.logRequest(request, response.statusCode, requestDuration);
    });

    next();
});

// ============================================
// VALIDATION MIDDLEWARE
// ============================================

/**
 * Validation middleware for express-validator
 * Checks for validation errors in request and returns 422 if any found
 */
const validateRequest = (request, response, next) => {
    const validationErrors = validationResult(request);
    if (!validationErrors.isEmpty()) {
        return validationError(response, validationErrors.array());
    }
    next();
};

// Make validation middleware available to routes
app.set('validate', validateRequest);

// ============================================
// API ENDPOINTS
// ============================================

// Health check endpoint
app.get('/api/health', (request, response) => {
    response.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API documentation endpoint
app.get('/api/docs', (request, response) => {
    response.json({
        success: true,
        message: 'POS System API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            products: '/api/products',
            categories: '/api/categories',
            sales: '/api/sales',
            inventory: '/api/inventory',
            suppliers: '/api/suppliers',
            purchaseOrders: '/api/purchase-orders',
            reports: '/api/reports',
            dashboard: '/api/dashboard',
            settings: '/api/settings'
        }
    });
});

// ============================================
// ROUTE REGISTRATION
// ============================================

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

module.exports = app;

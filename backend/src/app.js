/**
 * Express Application Configuration
 * 
 * Main application setup including middleware, routes, and error handling.
 * This is the entry point for the Express.js backend server.
 * Configured for cloud deployment with proper security middleware.
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

// Environment detection
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet - HTTP security headers with production optimizations
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", "https://api.stripe.com"]
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS - Cross-Origin Resource Sharing for cloud deployment
const getCorsOptions = () => {
    // Parse allowed origins from environment variable
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
    
    // Add default production frontend URL if in production and no origins specified
    if (IS_PRODUCTION && allowedOrigins.length === 0) {
        allowedOrigins.push(process.env.FRONTEND_URL || 'http://localhost:3000');
    }
    
    // Add localhost for development
    if (!IS_PRODUCTION) {
        allowedOrigins.push('http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000');
    }
    
    return {
        origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key'],
        exposedHeaders: ['X-Total-Count', 'X-Page-Number', 'X-Page-Size'],
        maxAge: 86400 // 24 hours
    };
};

app.use(cors(getCorsOptions()));

// Rate limiting - Prevent abuse and DDoS with production adjustments
const getRateLimitConfig = () => {
    const baseConfig = {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes default
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (IS_PRODUCTION ? 500 : 1000),
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            error: {
                code: 'RATE_LIMIT_ERROR',
                message: 'Too many requests, please try again later.'
            }
        },
        skip: (req) => {
            // Don't rate limit essential routes
            if (req.path.startsWith('/api/auth/')) return true;
            if (req.path === '/api/health') return true;
            return false;
        },
        handler: (request, response) => {
            logger.warn(`Rate limit exceeded for IP: ${request.ip}, Path: ${request.path}`);
            response.status(429).json({
                success: false,
                error: {
                    code: 'RATE_LIMIT_ERROR',
                    message: 'Too many requests, please try again later.'
                }
            });
        }
    };
    
    return baseConfig;
};

const apiLimiter = rateLimit(getRateLimitConfig());
app.use('/api/', apiLimiter);

// ============================================
// REQUEST PARSING MIDDLEWARE
// ============================================

// Parse JSON bodies with configurable limit (default 10MB for cloud)
const jsonLimit = process.env.JSON_BODY_LIMIT || '10mb';
app.use(express.json({ limit: jsonLimit }));

// Parse URL-encoded bodies with extended parsing
const urlencodedLimit = process.env.URLENCODED_BODY_LIMIT || '10mb';
app.use(express.urlencoded({ extended: true, limit: urlencodedLimit }));

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

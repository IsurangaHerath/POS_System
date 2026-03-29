/**
 * Backend Server Entry Point
 * 
 * Initializes and starts the Express server with database connection,
 * graceful shutdown handling, and global error handlers.
 * Configured for cloud deployment with proper CORS and port configuration.
 */

// Load environment variables from .env file
require('dotenv').config();

// Import application modules
const app = require('./src/app');
const logger = require('./src/utils/logger');
const database = require('./src/config/database');

// Cloud platform detection and configuration
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

// Cloud platform awareness - detect common cloud environments
const CLOUD_PLATFORM = process.env.CLOUD_PLATFORM || 
    (process.env.AWS_REGION ? 'aws' : 
     process.env.VERCEL ? 'vercel' : 
     process.env.RAILWAY_STATIC_URL ? 'railway' : 
     process.env.FLY_APP_NAME ? 'fly' : 'self-hosted');

// Frontend URL for CORS - supports multiple origins in production
const getAllowedOrigins = () => {
    const origins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    
    // Add default production frontend URL if not specified
    if (IS_PRODUCTION && origins.length === 0) {
        origins.push(process.env.FRONTEND_URL || 'https://your-frontend-domain.com');
    }
    
    // Always add localhost for development
    if (!IS_PRODUCTION) {
        origins.push('http://localhost:3000', 'http://localhost:5173');
    }
    
    return origins.length > 0 ? origins : ['*'];
};

// Log deployment information
logger.info(`
========================================
   POS System Backend - ${NODE_ENV.toUpperCase()}
========================================
   Platform: ${CLOUD_PLATFORM}
   Port: ${PORT}
   CORS Origins: ${getAllowedOrigins().join(', ')}
   Node.js: ${process.version}
========================================
`);

/**
 * Starts the backend server with proper initialization and error handling.
 * Includes database connection, HTTP server startup, and graceful shutdown setup.
 */
async function startServer() {
    try {
        // Test database connection with cloud-optimized settings
        logger.info('Connecting to database...');
        await database.testConnection();
        logger.info('Database connected successfully');

        // Start HTTP server with production optimizations
        const httpServer = app.listen(PORT, () => {
            const serverUrl = IS_PRODUCTION 
                ? `https://${process.env.DOMAIN || 'api.pos-system.com'}:${PORT}`
                : `http://localhost:${PORT}`;
                
            logger.info(`
╔════════════════════════════════════════════════════════════════╗
║                    POS System Backend Server                    ║
╠════════════════════════════════════════════════════════════════╣
║  Environment: ${NODE_ENV.padEnd(47)}║
║  Platform:    ${CLOUD_PLATFORM.padEnd(47)}║
║  Port:        ${PORT.toString().padEnd(47)}║
║  URL:         ${serverUrl.padEnd(47)}║
║  API Docs:    ${serverUrl}/api/docs${''.padEnd(28)}║
╚════════════════════════════════════════════════════════════════╝
      `);
        });

        // Production server optimizations
        if (IS_PRODUCTION) {
            httpServer.keepAliveTimeout = 65000;
            httpServer.headersTimeout = 66000;
            logger.info('Production server optimizations enabled');
        }

        /**
         * Handles graceful server shutdown.
         * Closes HTTP server and database connections properly.
         * @param {string} signal - The signal that triggered the shutdown
         */
        const performGracefulShutdown = async (signal) => {
            logger.info(`\n${signal} received. Shutting down gracefully...`);

            httpServer.close(async () => {
                logger.info('HTTP server closed');

                try {
                    await database.closeConnection();
                    logger.info('Database connection closed');
                    process.exit(0);
                } catch (shutdownError) {
                    logger.error('Error during shutdown:', shutdownError);
                    process.exit(1);
                }
            });

            // Force shutdown if graceful shutdown takes too long
            setTimeout(() => {
                logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };

        // Register signal handlers for graceful shutdown
        process.on('SIGTERM', () => performGracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => performGracefulShutdown('SIGINT'));

        // Global exception handlers
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            if (IS_PRODUCTION) {
                performGracefulShutdown('UNCAUGHT_EXCEPTION');
            }
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });

    } catch (startupError) {
        logger.error('Failed to start server:', startupError);
        process.exit(1);
    }
}

// Initialize and start the server
startServer();

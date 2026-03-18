/**
 * Backend Server Entry Point
 * 
 * Initializes and starts the Express server with database connection,
 * graceful shutdown handling, and global error handlers.
 */

// Load environment variables from .env file
require('dotenv').config();

// Import application modules
const app = require('./src/app');
const logger = require('./src/utils/logger');
const database = require('./src/config/database');

// Server configuration
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Starts the backend server with proper initialization and error handling.
 * Includes database connection, HTTP server startup, and graceful shutdown setup.
 */
async function startServer() {
    try {
        // Test database connection
        await database.testConnection();
        logger.info('Database connected successfully');

        // Start HTTP server
        const httpServer = app.listen(PORT, () => {
            logger.info(`
╔════════════════════════════════════════════════════════════════╗
║                    POS System Backend Server                    ║
╠════════════════════════════════════════════════════════════════╣
║  Environment: ${NODE_ENV.padEnd(47)}║
║  Port:        ${PORT.toString().padEnd(47)}║
║  URL:         http://localhost:${PORT}${''.padEnd(28)}║
║  API Docs:    http://localhost:${PORT}/api/docs${''.padEnd(21)}║
╚════════════════════════════════════════════════════════════════╝
      `);
        });

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
            performGracefulShutdown('UNCAUGHT_EXCEPTION');
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

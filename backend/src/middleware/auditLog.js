/**
 * Audit Logging Middleware
 * 
 * Captures and records system-wide actions for security and compliance.
 */

const database = require('../config/database');
const logger = require('../utils/logger');

/**
 * Middleware to log system actions to the audit_logs table.
 * Specifically targets POST, PUT, DELETE, and PATCH requests.
 */
const auditLog = async (req, res, next) => {
    // Only log data-modifying requests
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        return next();
    }

    // Skip certain paths (like login or health checks)
    if (req.path.includes('/auth/login') || req.path.includes('/health')) {
        return next();
    }

    // Store original send to capture response
    const originalSend = res.send;
    
    res.send = function(data) {
        res.send = originalSend;
        
        // Only log successful operations
        if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
                const responseBody = JSON.parse(data);
                
                // Determine entity type from URL
                const pathParts = req.originalUrl.split('/');
                const entityType = pathParts[2] || 'unknown';
                
                // Extract entity ID if possible
                let entityId = null;
                if (req.params.id) {
                    entityId = req.params.id;
                } else if (responseBody.data && responseBody.data.id) {
                    entityId = responseBody.data.id;
                }

                // Sanitize body (remove sensitive info)
                const sensitiveFields = [
                    'password', 'password_hash', 'oldPassword', 'currentPassword',
                    'newPassword', 'confirmPassword', 'token', 'accessToken',
                    'refreshToken', 'refresh_token', 'access_token', 'authorization'
                ];
                const sanitize = (value) => {
                    if (Array.isArray(value)) {
                        return value.map(sanitize);
                    }
                    if (value && typeof value === 'object') {
                        const clean = {};
                        for (const [key, val] of Object.entries(value)) {
                            if (sensitiveFields.includes(key)) {
                                clean[key] = '[REDACTED]';
                            } else {
                                clean[key] = sanitize(val);
                            }
                        }
                        return clean;
                    }
                    return value;
                };
                const sanitizedBody = sanitize(req.body);

                // Create audit log entry
                const auditEntry = {
                    user_id: req.user ? req.user.id : null,
                    action: req.method,
                    entity_type: entityType,
                    entity_id: entityId,
                    new_values: JSON.stringify(sanitizedBody),
                    ip_address: req.ip || req.connection.remoteAddress,
                    user_agent: req.headers['user-agent']
                };

                // Insert into database (fire and forget, don't wait for it)
                database.insert('audit_logs', auditEntry).catch(err => {
                    logger.error('Failed to save audit log:', err);
                });

            } catch (err) {
                // If parsing fails, just log that error but don't break the response
                logger.warn('Audit log capture failed:', err.message);
            }
        }
        
        return originalSend.apply(res, arguments);
    };

    next();
};

module.exports = auditLog;

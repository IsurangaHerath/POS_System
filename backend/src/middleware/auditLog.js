/**
 * Audit Logging Middleware
 * 
 * Captures and records system-wide actions for security and compliance.
 * - Records login events (entity 'auth') for a database login trail.
 * - Snapshots the existing row BEFORE an UPDATE so old_values is stored.
 * - Awaits the insert for security-critical routes so an audit row is never
 *   lost; other routes remain fire-and-forget with an error-level alert.
 */

const database = require('../config/database');
const logger = require('../utils/logger');

// Fields that must never be persisted in an audit row
const sensitiveFields = [
    'password', 'password_hash', 'oldPassword', 'currentPassword',
    'newPassword', 'confirmPassword', 'token', 'accessToken',
    'refreshToken', 'refresh_token', 'access_token', 'authorization',
    'pin', 'api_key', 'secret', 'jwt_secret', 'session_secret'
];

// Routes where losing an audit row is unacceptable
const SECURITY_CRITICAL = /\/(auth|users|sales|customers|returns|expenses)\//;

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

/**
 * Middleware to log system actions to the audit_logs table.
 * Specifically targets POST, PUT, DELETE, and PATCH requests.
 */
const auditLog = async (req, res, next) => {
    // Only log data-modifying requests
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        return next();
    }

    // Skip health checks (logins ARE audited - trail kept in the database)
    if (req.path.includes('/health')) {
        return next();
    }

    // For UPDATE requests, snapshot the current row BEFORE the handler runs
    // so the audit entry can answer "what did this value used to be?".
    let oldValuesSnapshot = null;
    if (req.method === 'PUT' || req.method === 'PATCH') {
        try {
            const match = req.originalUrl.match(/^\/api\/([a-z-]+)\/(\d+)/i);
            if (match) {
                const table = match[1].replace(/-/g, '_');
                if (/^[a-z_]+$/.test(table)) {
                    const rows = await database.query(
                        `SELECT * FROM \`${table}\` WHERE id = ?`,
                        [parseInt(match[2], 10)]
                    );
                    if (Array.isArray(rows) && rows.length > 0) {
                        oldValuesSnapshot = sanitize(rows[0]);
                    }
                }
            }
        } catch (err) {
            // Snapshot is best-effort - never block the request
            logger.warn('Audit old_values snapshot failed:', err.message);
        }
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

                // Create audit log entry (body sanitized against sensitive fields)
                const auditEntry = {
                    user_id: req.user ? req.user.id : null,
                    action: req.method,
                    entity_type: entityType,
                    entity_id: entityId,
                    old_values: oldValuesSnapshot ? JSON.stringify(oldValuesSnapshot) : null,
                    new_values: JSON.stringify(sanitize(req.body)),
                    ip_address: req.ip || req.connection.remoteAddress,
                    user_agent: req.headers['user-agent']
                };

                const insertPromise = database.insert('audit_logs', auditEntry)
                    .catch(err => {
                        logger.error('Failed to save audit log:', err);
                    });

                // Security-critical routes: wait for the audit row before responding
                if (SECURITY_CRITICAL.test(req.originalUrl)) {
                    insertPromise.then(() => originalSend.apply(res, arguments));
                    return;
                }
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

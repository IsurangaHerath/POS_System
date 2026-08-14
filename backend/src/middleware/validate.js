/**
 * Request Validation Middleware
 *
 * Consumes express-validator validation results and responds 400 when any
 * validator has failed. Use together with express-validator chains in the
 * route files, e.g.:
 *
 *   router.post('/', [body('name').notEmpty()], validateRequest, handler);
 */

const { validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

module.exports = { validateRequest };
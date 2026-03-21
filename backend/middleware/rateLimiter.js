const rateLimit = require('express-rate-limit');

/**
 * Standard Admin Rate Limiter
 * Used for read operations and low-risk updates
 */
const standardAdminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: { error: 'Too many administrative requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * High-Risk Admin Rate Limiter
 * Used for user creation, deletion, and password resets
 */
const highRiskAdminLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // Increased limit for Admins (was 10)
    message: { error: 'Security limit reached for high-risk actions. Please try again after an hour.' },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        const role = req.user?.role?.role_name || req.user?.role || 'unknown';
        console.warn(`[RATE LIMIT] user: ${typeof role === 'string' ? role.toLowerCase() : 'unknown'} | route: ${req.originalUrl}`);
        res.status(options.statusCode).send(options.message);
    }
});

module.exports = {
    standardAdminLimiter,
    highRiskAdminLimiter
};

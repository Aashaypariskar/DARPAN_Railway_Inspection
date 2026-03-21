const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your_super_secret_key_change_in_production';

exports.verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        console.warn(`[AUTH] Unauthorized: No token provided for ${req.method} ${req.url}`);
        return res.status(401).json({ error: 'No token provided. Authorization denied.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { id, role }
        next();
    } catch (err) {
        console.error(`[AUTH] Token rejection for ${req.method} ${req.url}:`, err.message);
        return res.status(401).json({ error: 'Token is invalid or expired' });
    }
};

exports.authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.user?.role;

        // SUPER_ADMIN has universal access to all protected routes
        if (userRole === 'SUPER_ADMIN') {
            return next();
        }

        if (!req.user || !allowedRoles.includes(userRole)) {
            console.warn(`[AUTH] Access denied for ${req.method} ${req.url}. User Role: ${userRole}, Allowed: ${allowedRoles.join(', ')}`);
            return res.status(403).json({
                error: `Access forbidden for your role: ${userRole || 'Unknown'}. Required: ${allowedRoles.join(' or ')}`
            });
        }
        next();
    };
};

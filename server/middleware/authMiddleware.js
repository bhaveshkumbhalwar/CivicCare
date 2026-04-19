const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * protect — verifies JWT and attaches user to request
 */
const protect = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (!user || !user.isActive) {
            return res.status(401).json({ success: false, message: 'Token is invalid or user not found.' });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired. Please login again.' });
        }
        return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
};

/**
 * requireAdmin — ensures authenticated user has admin role
 */
const requireAdmin = (req, res, next) => {
    const role = req.user?.role;
    const isAdmin = role === 'super_admin' || (role && role.startsWith('admin_'));
    
    if (!isAdmin) {
        return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
    }
    next();
};

/**
 * optionalAuth — attaches user if token exists, but doesn't block if missing
 */
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
        }
    } catch (_) { /* silent — no valid token */ }
    next();
};

module.exports = { protect, requireAdmin, optionalAuth };
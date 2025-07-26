// middleware/adminAuth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const adminAuth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader) {
            return res.status(401).json({ message: 'Authorization header missing' });
        }

        const token = authHeader.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: 'Token missing in Authorization header' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.userId) {
            return res.status(401).json({ message: 'Invalid token payload: userId missing' });
        }

        const user = await User.findById(decoded.userId).select('isAdmin username email');
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        if (!user.isAdmin) {
            return res.status(403).json({ message: 'Admin privileges required' });
        }

        req.user = { userId: user._id, isAdmin: user.isAdmin }; // Attach minimal user data
        console.log('Admin auth successful:', { userId: user._id, username: user.username });
        next();
    } catch (err) {
        console.error('Admin auth error:', {
            message: err.message,
            name: err.name,
            stack: err.stack,
        });
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid or malformed token' });
        }
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token has expired' });
        }
        return res.status(401).json({ message: 'Authentication failed', details: err.message });
    }
};

module.exports = adminAuth;
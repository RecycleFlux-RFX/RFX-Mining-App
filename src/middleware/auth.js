const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = {
      userId: user._id,
      email: user.email,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin || 
        (user.email === process.env.SUPER_ADMIN_EMAIL_1 || 
         user.email === process.env.SUPER_ADMIN_EMAIL_2)
    };
    
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: No user data found' });
    }

    const isSuperAdmin = req.user.isSuperAdmin;
    const isAdmin = req.user.isAdmin === true;

    if (!isSuperAdmin && !isAdmin) {
      return res.status(403).json({ message: 'Not an admin account' });
    }

    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ message: 'Server error during admin authentication' });
  }
};

const superAdminAuth = async (req, res, next) => {
  try {
    if (!req.user) {
      console.error('No user in request');
      return res.status(401).json({ message: 'Authentication required' });
    }

    const isSuperAdmin = req.user.isSuperAdmin || 
      (req.user.email === process.env.SUPER_ADMIN_EMAIL_1 || 
       req.user.email === process.env.SUPER_ADMIN_EMAIL_2);

    if (!isSuperAdmin) {
      console.error('Super admin check failed:', req.user);
      return res.status(403).json({ 
        message: 'Super admin access required',
        details: req.user
      });
    }
    
    next();
  } catch (err) {
    console.error('Super admin auth error:', err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = {
  authenticateToken,
  adminAuth,
  superAdminAuth
};
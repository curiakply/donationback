// backend/middleware/superAdminMiddleware.js
const jwt = require('jsonwebtoken');
const Admin = require('../models/admin.model');

// Middleware to check if user is authenticated
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch admin from database
    const admin = await Admin.findById(decoded.id).select('-password');
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Middleware to check if user is super admin
const isSuperAdmin = (req, res, next) => {
  if (req.admin && req.admin.role === 'superadmin') {
    next();
  } else {
    return res.status(403).json({ 
      message: 'Access denied. Super admin privileges required.' 
    });
  }
};

// Middleware to check if user is admin or super admin
const isAdminOrSuperAdmin = (req, res, next) => {
  if (req.admin && (req.admin.role === 'admin' || req.admin.role === 'superadmin')) {
    next();
  } else {
    return res.status(403).json({ 
      message: 'Access denied. Admin privileges required.' 
    });
  }
};

module.exports = {
  authenticateToken,
  isSuperAdmin,
  isAdminOrSuperAdmin
};
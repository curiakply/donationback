// backend/routes/authRoutes.js
const express = require('express');
const { 
  login, 
  register, 
  logout, 
  getProfile, 
  updateProfile, 
  verifyToken 
} = require('../controllers/auth.controller');
const { verifyToken: authMiddleware } = require('../middleware/auth.middleware');
const Admin = require('../models/admin.model');

const router = express.Router();

// Public routes
router.get('/login/:username/:password', login);
router.post('/register', register);
router.post('/verify-token', verifyToken);

// Protected routes (require authentication)
router.post('/logout', authMiddleware, logout);

// Get current user profile
router.get('/profile', authMiddleware, getProfile);
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select('-password');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    res.json({
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        phone: admin.phone,
        isActive: admin.isActive,
        lastLogin: admin.lastLogin,
        createdAt: admin.createdAt
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update current user profile
router.put('/profile', authMiddleware, updateProfile);

module.exports = router;
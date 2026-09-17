// backend/controllers/authController.js
const jwt = require('jsonwebtoken');
const Admin = require('../models/admin.model');
const BlacklistedToken = require('../models/blacklistedToken.model');

const login = async (req, res) => {
  try {
    const { username, password } = req.params;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find admin by email
    const admin = await Admin.findOne({ email: username.toLowerCase() });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if admin is active
    if (admin.isActive === false) {
      return res.status(403).json({ 
        message: 'Account is deactivated. Please contact administrator.' 
      });
    }

    // Verify password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    // admin.lastLogin = new Date();
    // await admin.save();
Admin.updateOne({ _id: admin._id }, { lastLogin: new Date() }).catch(() => {});
    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        name: admin.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '9h' }
    );

    // Send response with both token and admin data
    res.json({
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        phone: admin.phone,
        isActive: admin.isActive,
        lastLogin: admin.lastLogin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // Validate input
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate name length
    if (name.trim().length < 2) {
      return res.status(400).json({ 
        message: 'Name must be at least 2 characters long' 
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Please enter a valid email address' 
      });
    }

    // Validate phone length
    if (phone.length < 10) {
      return res.status(400).json({ 
        message: 'Please enter a valid phone number (at least 10 digits)' 
      });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Validate role (only allow admin or superadmin)
    const allowedRoles = ['admin', 'superadmin'];
    const adminRole = role && allowedRoles.includes(role) ? role : 'admin';

    // If trying to create superadmin, verify the requester is also superadmin
    if (adminRole === 'superadmin' && req.admin) {
      if (req.admin.role !== 'superadmin') {
        return res.status(403).json({ 
          message: 'Only super admins can create super admin accounts' 
        });
      }
    }

    // Create new admin
    const admin = new Admin({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone.trim(),
      role: adminRole,
      isActive: true,
      createdBy: req.admin ? req.admin._id : null
    });

    await admin.save();

    res.status(201).json({
      message: 'Admin registered successfully',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        phone: admin.phone,
        isActive: admin.isActive
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'No token provided'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.log('Token verification failed during logout:', jwtError.message);
    }

    // Check if already blacklisted
    const isAlreadyBlacklisted = await BlacklistedToken.isTokenBlacklisted(token);
    
    if (isAlreadyBlacklisted) {
      return res.status(200).json({
        success: true,
        message: 'Already logged out'
      });
    }

    // Blacklist the token
    const blacklistResult = await BlacklistedToken.blacklistToken(
      token,
      decoded?.id || null,
      'logout'
    );

    if (blacklistResult) {
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to blacklist token'
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select('-password');
    
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
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update current user profile
const updateProfile = async (req, res) => {
  try {
    const { name, phone, currentPassword, newPassword } = req.body;
    
    const admin = await Admin.findById(req.admin._id);
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Update basic info
    if (name) admin.name = name.trim();
    if (phone) admin.phone = phone.trim();

    // Update password if provided
    if (currentPassword && newPassword) {
      const isPasswordValid = await admin.comparePassword(currentPassword);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ 
          message: 'New password must be at least 6 characters long' 
        });
      }
      
      admin.password = newPassword;
    }

    await admin.save();

    res.json({
      message: 'Profile updated successfully',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        phone: admin.phone,
        isActive: admin.isActive
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Verify token (useful for token refresh or validation)
const verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(400).json({ 
        valid: false, 
        message: 'No token provided' 
      });
    }

    // Check if token is blacklisted
    const isBlacklisted = await BlacklistedToken.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({ 
        valid: false, 
        message: 'Token has been revoked' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get fresh admin data
    const admin = await Admin.findById(decoded.id).select('-password');
    
    if (!admin) {
      return res.status(404).json({ 
        valid: false, 
        message: 'Admin not found' 
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({ 
        valid: false, 
        message: 'Account is deactivated' 
      });
    }

    res.json({
      valid: true,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        phone: admin.phone,
        isActive: admin.isActive
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ 
      valid: false, 
      message: 'Invalid or expired token' 
    });
  }
};

module.exports = {
  login,
  register,
  logout,
  getProfile,
  updateProfile,
  verifyToken
};
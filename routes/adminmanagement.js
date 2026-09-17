// Backend Routes - Admin Management
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Admin = require('../models/admin.model'); // Adjust path as needed

/**
 * GET /api/admin-management/list
 * Get all admins with pagination and search
 * Query params: page, limit, search, role
 */
router.get('/list', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '' } = req.query;
    
    // Build query
    const query = {};
    
    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Role filter
    if (role && role !== 'all') {
      query.role = role;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get admins
    const admins = await Admin.find(query)
      .select('-password') // Exclude password from results
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // Get total count
    const total = await Admin.countDocuments(query);
    
    // Get statistics
    const stats = await Admin.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          inactive: {
            $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
          },
          superAdmins: {
            $sum: { $cond: [{ $eq: ['$role', 'superadmin'] }, 1, 0] }
          },
          admins: {
            $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
          }
        }
      }
    ]);
    
    res.json({
      success: true,
      admins,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      stats: stats[0] || {
        total: 0,
        active: 0,
        inactive: 0,
        superAdmins: 0,
        admins: 0
      }
    });
    
  } catch (error) {
    console.error('Error fetching admin list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin list',
      error: error.message
    });
  }
});

/**
 * GET /api/admin-management/:id
 * Get single admin details
 */
router.get('/:id', async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).select('-password');
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    res.json({
      success: true,
      admin
    });
    
  } catch (error) {
    console.error('Error fetching admin details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin details',
      error: error.message
    });
  }
});

/**
 * POST /api/admin-management/create
 * Create new admin
 * Body: { name, email, password, phone, role, isActive }
 */
router.post('/create', async (req, res) => {
  try {
    const { name, email, password, phone, role = 'admin', isActive = true } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }
    
    // Check if email already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create admin
    const admin = new Admin({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      role,
      isActive
    });
    
    await admin.save();
    
    // Return admin without password
    const adminResponse = admin.toObject();
    delete adminResponse.password;
    
    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      admin: adminResponse
    });
    
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin',
      error: error.message
    });
  }
});

/**
 * PUT /api/admin-management/:id
 * Update admin details
 * Body: { name, email, phone, role, isActive, password (optional) }
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, role, isActive, password } = req.body;
    
    // Find admin
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    // Check if email is being changed and if it already exists
    if (email && email.toLowerCase() !== admin.email) {
      const existingAdmin = await Admin.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: req.params.id }
      });
      
      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }
    
    // Update fields
    if (name) admin.name = name;
    if (email) admin.email = email.toLowerCase();
    if (phone !== undefined) admin.phone = phone;
    if (role) admin.role = role;
    if (isActive !== undefined) admin.isActive = isActive;
    
    // Update password if provided
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(password, salt);
    }
    
    await admin.save();
    
    // Return admin without password
    const adminResponse = admin.toObject();
    delete adminResponse.password;
    
    res.json({
      success: true,
      message: 'Admin updated successfully',
      admin: adminResponse
    });
    
  } catch (error) {
    console.error('Error updating admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update admin',
      error: error.message
    });
  }
});

/**
 * PATCH /api/admin-management/:id/toggle-status
 * Toggle admin active/inactive status
 */
router.patch('/:id/toggle-status', async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    admin.isActive = !admin.isActive;
    await admin.save();
    
    res.json({
      success: true,
      message: `Admin ${admin.isActive ? 'activated' : 'deactivated'} successfully`,
      isActive: admin.isActive
    });
    
  } catch (error) {
    console.error('Error toggling admin status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle admin status',
      error: error.message
    });
  }
});

/**
 * PATCH /api/admin-management/:id/change-password
 * Change admin password
 * Body: { newPassword }
 */
router.patch('/:id/change-password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'New password is required'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }
    
    const admin = await Admin.findById(req.params.id);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    // Set new password - pre-save middleware will hash it
    admin.password = newPassword.trim();
    await admin.save();
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
});

/**
 * DELETE /api/admin-management/:id
 * Delete admin (soft delete or hard delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { hardDelete = false } = req.query;
    
    const admin = await Admin.findById(req.params.id);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    // Prevent deleting self (add this check if you have req.user)
    // if (req.user && req.user._id.toString() === req.params.id) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'You cannot delete your own account'
    //   });
    // }
    
    if (hardDelete === 'true') {
      // Hard delete - permanently remove from database
      await Admin.findByIdAndDelete(req.params.id);
      
      res.json({
        success: true,
        message: 'Admin permanently deleted'
      });
    } else {
      // Soft delete - just deactivate
      admin.isActive = false;
      await admin.save();
      
      res.json({
        success: true,
        message: 'Admin deactivated successfully'
      });
    }
    
  } catch (error) {
    console.error('Error deleting admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete admin',
      error: error.message
    });
  }
});

/**
 * GET /api/admin-management/stats
 * Get admin statistics
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await Admin.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          inactive: {
            $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
          },
          superAdmins: {
            $sum: { $cond: [{ $eq: ['$role', 'superadmin'] }, 1, 0] }
          },
          admins: {
            $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
          }
        }
      }
    ]);
    
    // Get recent admins
    const recentAdmins = await Admin.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    
    res.json({
      success: true,
      stats: stats[0] || {
        total: 0,
        active: 0,
        inactive: 0,
        superAdmins: 0,
        admins: 0
      },
      recentAdmins
    });
    
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin statistics',
      error: error.message
    });
  }
});

module.exports = router;

// ============================================
// USAGE IN YOUR MAIN APP:
// ============================================
// const adminManagementRoutes = require('./routes/adminManagement');
// app.use('/api/admin-management', adminManagementRoutes);
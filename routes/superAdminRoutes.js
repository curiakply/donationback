// backend/routes/superAdminRoutes.js
const express = require('express');
const router = express.Router();
const Admin = require('../models/admin.model');
const { authenticateToken, isSuperAdmin } = require('../middleware/superAdminMiddleware');

// Apply authentication and super admin check to all routes
router.use(authenticateToken);
router.use(isSuperAdmin);

// Get all admins
router.get('/list', async (req, res) => {
  try {
    const admins = await Admin.find()
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json(admins);
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get dashboard statistics
router.get('/statistics', async (req, res) => {
  try {
    // Get admin counts
    const totalAdmins = await Admin.countDocuments();
    const activeAdmins = await Admin.countDocuments({ isActive: true });
    
    // TODO: Replace these with your actual models
    // Example: const totalParishes = await Parish.countDocuments();
    // Example: const totalFamilies = await Family.countDocuments();
    // Example: const totalTransactions = await Transaction.countDocuments();
    // Example: const totalRevenue = await Transaction.aggregate([
    //   { $group: { _id: null, total: { $sum: '$amount' } } }
    // ]);
    
    const stats = {
      totalAdmins,
      activeAdmins,
      totalParishes: 0, // Replace with actual query
      totalFamilies: 0, // Replace with actual query
      totalTransactions: 0, // Replace with actual query
      totalRevenue: 0, // Replace with actual query
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single admin by ID
router.get('/:id', async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).select('-password');
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    res.json(admin);
  } catch (error) {
    console.error('Error fetching admin:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update admin
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, role } = req.body;
    
    const admin = await Admin.findById(req.params.id);
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== admin.email) {
      const existingEmail = await Admin.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: req.params.id }
      });
      
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }
    
    // Update fields
    if (name) admin.name = name.trim();
    if (email) admin.email = email.toLowerCase().trim();
    if (phone) admin.phone = phone.trim();
    if (role && ['admin', 'superadmin'].includes(role)) {
      // Prevent changing the last super admin to admin
      if (admin.role === 'superadmin' && role === 'admin') {
        const superAdminCount = await Admin.countDocuments({ role: 'superadmin' });
        if (superAdminCount <= 1) {
          return res.status(400).json({ 
            message: 'Cannot change role of the last super admin' 
          });
        }
      }
      admin.role = role;
    }
    
    await admin.save();
    
    res.json({
      message: 'Admin updated successfully',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        isActive: admin.isActive
      }
    });
  } catch (error) {
    console.error('Error updating admin:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle admin active status
router.patch('/:id/toggle-status', async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    // Prevent super admin from deactivating themselves
    if (admin._id.toString() === req.admin._id.toString()) {
      return res.status(400).json({ 
        message: 'Cannot deactivate your own account' 
      });
    }

    // Prevent deactivating the last active super admin
    if (admin.role === 'superadmin' && admin.isActive) {
      const activeSuperAdminCount = await Admin.countDocuments({ 
        role: 'superadmin',
        isActive: true 
      });
      
      if (activeSuperAdminCount <= 1) {
        return res.status(400).json({ 
          message: 'Cannot deactivate the last active super admin' 
        });
      }
    }
    
    admin.isActive = !admin.isActive;
    await admin.save();
    
    res.json({
      message: `Admin ${admin.isActive ? 'activated' : 'deactivated'} successfully`,
      admin: {
        id: admin._id,
        isActive: admin.isActive
      }
    });
  } catch (error) {
    console.error('Error toggling admin status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete admin
router.delete('/:id', async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    // Prevent super admin from deleting themselves
    if (admin._id.toString() === req.admin._id.toString()) {
      return res.status(400).json({ 
        message: 'Cannot delete your own account' 
      });
    }
    
    // Prevent deleting the last super admin
    if (admin.role === 'superadmin') {
      const superAdminCount = await Admin.countDocuments({ role: 'superadmin' });
      if (superAdminCount <= 1) {
        return res.status(400).json({ 
          message: 'Cannot delete the last super admin' 
        });
      }
    }
    
    await Admin.findByIdAndDelete(req.params.id);
    
    res.json({ 
      message: 'Admin deleted successfully',
      deletedId: req.params.id
    });
  } catch (error) {
    console.error('Error deleting admin:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change admin password (super admin can change any admin's password)
router.patch('/:id/change-password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long' 
      });
    }
    
    const admin = await Admin.findById(req.params.id);
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    admin.password = newPassword;
    await admin.save();
    
    res.json({ 
      message: 'Password changed successfully',
      adminId: admin._id
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get system logs (placeholder for future implementation)
router.get('/logs/system', async (req, res) => {
  try {
    // TODO: Implement system logs retrieval
    // This could track server errors, API calls, performance metrics, etc.
    res.json({ 
      logs: [],
      message: 'System logs feature coming soon'
    });
  } catch (error) {
    console.error('Error fetching system logs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get audit trail (placeholder for future implementation)
router.get('/audit/trail', async (req, res) => {
  try {
    // TODO: Implement audit trail retrieval
    // This could track all admin actions, changes to data, etc.
    res.json({ 
      auditTrail: [],
      message: 'Audit trail feature coming soon'
    });
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get admin activity logs (placeholder for future implementation)
router.get('/activity/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;
    
    // Verify admin exists
    const admin = await Admin.findById(adminId).select('name email');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // TODO: Implement activity log retrieval for specific admin
    res.json({ 
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email
      },
      activities: [],
      message: 'Activity logs feature coming soon'
    });
  } catch (error) {
    console.error('Error fetching admin activity:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
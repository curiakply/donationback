// backend/models/admin.model.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: 'admin',
    enum: ['admin', 'superadmin']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// PERFORMANCE INDEXES
adminSchema.index({ email: 1 }); // Single field index on email for fast lookups
adminSchema.index({ email: 1, role: 1 }); // Compound index for role-based queries
adminSchema.index({ createdAt: -1 }); // Index for sorting by creation date
adminSchema.index({ isActive: 1 }); // Index for active status queries

// Pre-save middleware for password hashing
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to update last login
adminSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  return this.save();
};

// Static method to get active admins count
adminSchema.statics.getActiveCount = async function() {
  return this.countDocuments({ isActive: true });
};

// Static method to get super admins count
adminSchema.statics.getSuperAdminCount = async function() {
  return this.countDocuments({ role: 'superadmin' });
};

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;
const mongoose = require('mongoose');

const transactionAuditSchema = new mongoose.Schema({
  // Transaction reference
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true
  },
  
  // User who performed the action
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  
  userName: {
    type: String,
    required: true
  },
  
  userEmail: {
    type: String,
    required: true
  },
  
  // Action performed
  action: {
    type: String,
    enum: [
      'CREATE',
      'UPDATE', 
      'DELETE',
      'TRANSFER',
      'ROLLBACK',
      'RESTORE'
    ],
    required: true
  },
  
  // Entity details
  entityType: {
    type: String,
    default: 'Transaction'
  },
  
  // Related person/family information
  personId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person'
  },
  
  personName: {
    type: String
  },
  
  familyId: {
    type: String
  },
  
  familyName: {
    type: String
  },
  
  // Parish and other context
  parishId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parish'
  },
  
  parishName: {
    type: String
  },
  
  // Financial details
  amount: {
    type: Number
  },
  
  previousAmount: {
    type: Number
  },
  
  // Change details
  changes: {
    type: mongoose.Schema.Types.Mixed, // Store the actual changes
    default: {}
  },
  
  // Additional context
  description: {
    type: String
  },
  
  // Technical details
  ipAddress: {
    type: String
  },
  
  userAgent: {
    type: String
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for performance
transactionAuditSchema.index({ transactionId: 1 });
transactionAuditSchema.index({ userId: 1, createdAt: -1 });
transactionAuditSchema.index({ action: 1, createdAt: -1 });
transactionAuditSchema.index({ personId: 1 });
transactionAuditSchema.index({ familyId: 1 });
transactionAuditSchema.index({ parishId: 1 });
transactionAuditSchema.index({ createdAt: -1 });

// Compound indexes for common queries
transactionAuditSchema.index({ userId: 1, action: 1, createdAt: -1 });
transactionAuditSchema.index({ transactionId: 1, action: 1, createdAt: -1 });

const TransactionAudit = mongoose.model('TransactionAudit', transactionAuditSchema);
module.exports = TransactionAudit;
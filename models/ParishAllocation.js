// models/ParishAllocation.js
const mongoose = require('mongoose');

const parishAllocationSchema = new mongoose.Schema({
  parishId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parish',
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  collection: {
    type: Number,
    required: true,
    default: 0
  },
  prelim: {
    type: Number,
    required: true,
    default: 0
  },
  proportionalShare: {
    type: Number,
    required: true,
    default: 0
  },
  totalAllocation: {
    type: Number,
    required: true,
    default: 0
  },
  isFullCollection: {
    type: Boolean,
    default: false
  },
  lastCollectionUpdate: {
    type: Date
  },
  collectionHistory: [{
    amount: Number,
    date: Date,
    change: Number // Difference from previous collection
  }]
}, {
  timestamps: true
});

// Index for efficient queries
parishAllocationSchema.index({ parishId: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('ParishAllocation', parishAllocationSchema);
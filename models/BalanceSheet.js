const mongoose = require('mongoose');

const balanceSheetSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true
  },
  entity_type: {
    type: String,
    enum: ['community', 'project', 'parish'],
    required: true
  },
  entity_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  opening_balance: {
    type: Number,
    default: 0
  },
  allocated_amount: {
    type: Number,
    default: 0
  },
  total_transactions: {
    type: Number,
    default: 0
  },
  last_transaction_date: {
    type: Date
  }
}, { 
  timestamps: true 
});

// Compound index
balanceSheetSchema.index({ 
  year: 1, 
  entity_type: 1, 
  entity_id: 1 
}, { 
  unique: true 
});

// Virtual for current balance
balanceSheetSchema.virtual('current_balance').get(function() {
  return this.opening_balance + this.allocated_amount - this.total_transactions;
});

module.exports = mongoose.model('BalanceSheet', balanceSheetSchema);
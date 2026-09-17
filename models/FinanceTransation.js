const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  voucher_no: {
    type: String,
    required: true,
    unique: true
  },
  date: {
    type: Date,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  transaction_type: {
    type: String,
    required: true,
    enum: ['community', 'otherProject', 'family']
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  payment_method: {
    type: String,
    required: true,
    enum: ['cash', 'bank']
  },
  transaction_number: String,
  
  // Entity references
  community_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: function() { return this.transaction_type === 'community' }
  },
  fund_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fund',
    required: function() { return this.transaction_type === 'otherProject' }
  },
  parish_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parish'
  },
  family_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family'
  },

  // Other Project specific fields
  other_project_type: {
    type: String,
    enum: ['parish', 'others'],
    required: function() { return this.transaction_type === 'otherProject' }
  },
  receiver_name: {
    type: String,
    required: function() { 
      return this.transaction_type === 'otherProject' && 
             this.other_project_type === 'others' 
    }
  },

  // Balance tracking
  balance_before: {
    type: Number,
    required: true
  },
  balance_after: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'completed'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to check balance
transactionSchema.pre('save', async function(next) {
  try {
    if (this.isNew) {
      // Get balance sheet based on transaction type
      const BalanceSheet = mongoose.model('BalanceSheet');
      let balanceSheet;

      switch(this.transaction_type) {
        case 'community':
          balanceSheet = await BalanceSheet.findOne({
            year: this.year,
            entity_type: 'community',
            entity_id: this.community_id
          });
          break;
        
        case 'otherProject':
          balanceSheet = await BalanceSheet.findOne({
            year: this.year,
            entity_type: 'project',
            entity_id: this.fund_id
          });
          break;
        
        case 'family':
          balanceSheet = await BalanceSheet.findOne({
            year: this.year,
            entity_type: 'parish',
            entity_id: this.parish_id
          });
          break;
      }

      if (!balanceSheet) {
        throw new Error('No balance sheet found for this entity');
      }

      const currentBalance = balanceSheet.opening_balance + 
                           balanceSheet.allocated_amount - 
                           balanceSheet.total_transactions;

      if (this.amount > currentBalance) {
        throw new Error('Insufficient balance for transaction');
      }

      // Set balance tracking fields
      this.balance_before = currentBalance;
      this.balance_after = currentBalance - this.amount;

      // Set year from date if not provided
      if (!this.year) {
        this.year = new Date(this.date).getFullYear();
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Post-save middleware to update balance sheet
transactionSchema.post('save', async function(doc) {
  try {
    if (doc.status === 'completed') {
      const BalanceSheet = mongoose.model('BalanceSheet');
      let entityType, entityId;

      switch(doc.transaction_type) {
        case 'community':
          entityType = 'community';
          entityId = doc.community_id;
          break;
        case 'otherProject':
          entityType = 'project';
          entityId = doc.fund_id;
          break;
        case 'family':
          entityType = 'parish';
          entityId = doc.parish_id;
          break;
      }

      await BalanceSheet.findOneAndUpdate(
        {
          year: doc.year,
          entity_type: entityType,
          entity_id: entityId
        },
        {
          $inc: { total_transactions: doc.amount },
          $set: { last_transaction_date: doc.date }
        }
      );
    }
  } catch (error) {
    console.error('Error updating balance sheet:', error);
  }
});

// Static method to fetch transactions with balances
transactionSchema.statics.getTransactionsWithBalance = async function(query = {}) {
  const transactions = await this.find(query)
    .sort({ date: -1 })
    .populate('community_id', 'name')
    .populate('fund_id', 'name')
    .populate('parish_id', 'name')
    .populate('family_id', 'name');

  return transactions;
};

// Method to cancel transaction
transactionSchema.methods.cancelTransaction = async function() {
  if (this.status === 'completed') {
    const BalanceSheet = mongoose.model('BalanceSheet');
    let entityType, entityId;

    switch(this.transaction_type) {
      case 'community':
        entityType = 'community';
        entityId = this.community_id;
        break;
      case 'otherProject':
        entityType = 'project';
        entityId = this.fund_id;
        break;
      case 'family':
        entityType = 'parish';
        entityId = this.parish_id;
        break;
    }

    // Reverse the transaction in balance sheet
    await BalanceSheet.findOneAndUpdate(
      {
        year: this.year,
        entity_type: entityType,
        entity_id: entityId
      },
      {
        $inc: { total_transactions: -this.amount }
      }
    );

    this.status = 'cancelled';
    await this.save();
  }
};

module.exports = mongoose.model('FinanceTransaction', transactionSchema);
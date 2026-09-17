const mongoose = require('mongoose');

const totalAmountSchema = new mongoose.Schema({
  total_amount: {
    type: Number,
    required: true
  },
  total_allocated: {
    type: Number,
    default: 0
  },
  parish_percentage: {
    type: Number,
    default: 0
  },
  parish_amount: {
    type: Number,
    default: 0
  },
  other_projects_percentage: {
    type: Number,
    default: 100
  },
  other_projects_amount: {
    type: Number,
    default: 0
  },
  balance_after_community: {
    type: Number,
    default: 0
  },
  // New fields for parish allocation tracking
  total_pre_proportional: {
    type: Number,
    default: 0
  },
  proportional_share_percentage: {
    type: Number,
    default: 0
  },
  total_parish_allocation: {
    type: Number,
    default: 0
  },
  year: {
    type: Number,
    required: true,
    unique: true
  }
}, {
  timestamps: true
});

// Add a pre-save middleware to calculate default values
totalAmountSchema.pre('save', function(next) {
  // Calculate balance after community allocation
  this.balance_after_community = this.total_amount - this.total_allocated;

  // If parish percentage is set but amount isn't
  if (this.parish_percentage && !this.parish_amount) {
    this.parish_amount = (this.balance_after_community * this.parish_percentage) / 100;
  }

  // Calculate other projects values
  this.other_projects_percentage = 100 - (this.parish_percentage || 0);
  this.other_projects_amount = this.balance_after_community - (this.parish_amount || 0);

  // Validate parish allocation doesn't exceed parish amount
  if (this.total_parish_allocation > this.parish_amount) {
    throw new Error('Total parish allocation cannot exceed parish amount');
  }

  next();
});

// Add methods to update parish allocation details
totalAmountSchema.methods.updateParishAllocations = async function(
  totalPreProportional,
  proportionalSharePercentage,
  totalParishAllocation
) {
  this.total_pre_proportional = totalPreProportional;
  this.proportional_share_percentage = proportionalSharePercentage;
  this.total_parish_allocation = totalParishAllocation;
  return this.save();
};

// Add static method to get allocation details
totalAmountSchema.statics.getParishAllocationDetails = async function(year) {
  const details = await this.findOne(
    { year },
    {
      parish_amount: 1,
      total_pre_proportional: 1,
      proportional_share_percentage: 1,
      total_parish_allocation: 1
    }
  );
  return details;
};

const TotalAmount = mongoose.model('TotalAmount', totalAmountSchema);
module.exports = TotalAmount;
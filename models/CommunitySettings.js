const mongoose = require('mongoose');

const communitySettingsSchema = new mongoose.Schema({
  community_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: true
  },
  community_name: {
    type: String,
    required: true
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  allocated_amount: {
    type: Number,
    required: true,
    min: 0
  },
  year: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

// Create a compound index for unique settings per community per year
communitySettingsSchema.index({ community_id: 1, year: 1 }, { unique: true });

const CommunitySettings = mongoose.model('CommunitySettings', communitySettingsSchema);
module.exports = CommunitySettings;
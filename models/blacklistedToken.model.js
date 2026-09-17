const mongoose = require('mongoose');

const blacklistedTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: false
  },
  reason: {
    type: String,
    enum: ['logout', 'expired', 'revoked', 'security'],
    default: 'logout'
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // Automatically delete expired documents
  }
}, {
  timestamps: true
});

// Index for performance
blacklistedTokenSchema.index({ token: 1, expiresAt: 1 });

// Static method to add token to blacklist
blacklistedTokenSchema.statics.blacklistToken = async function(token, userId = null, reason = 'logout') {
  try {
    // Decode token to get expiration time
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString());
    
    const expiresAt = new Date(payload.exp * 1000);
    
    await this.create({
      token,
      userId,
      reason,
      expiresAt
    });
    
    return true;
  } catch (error) {
    console.error('Error blacklisting token:', error);
    return false;
  }
};

// Static method to check if token is blacklisted
blacklistedTokenSchema.statics.isTokenBlacklisted = async function(token) {
  try {
    const blacklistedToken = await this.findOne({ 
      token,
      expiresAt: { $gt: new Date() }
    });
    return !!blacklistedToken;
  } catch (error) {
    console.error('Error checking blacklisted token:', error);
    return false;
  }
};

// Clean up expired tokens periodically (optional, since TTL index handles this)
blacklistedTokenSchema.statics.cleanupExpiredTokens = async function() {
  try {
    const result = await this.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    console.log(`Cleaned up ${result.deletedCount} expired blacklisted tokens`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
    return 0;
  }
};

const BlacklistedToken = mongoose.model('BlacklistedToken', blacklistedTokenSchema);

module.exports = BlacklistedToken;
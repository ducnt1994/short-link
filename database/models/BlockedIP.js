const mongoose = require('mongoose');

const blockedIPSchema = new mongoose.Schema({
  ipAddress: {
    type: String,
    required: true,
    unique: true
  },
  reason: {
    type: String
  },
  expiresAt: {
    type: Date
  },
  isPermanent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Create indexes (ipAddress index is automatically created by unique: true)
blockedIPSchema.index({ expiresAt: 1 });

// Method to check if IP is still blocked
blockedIPSchema.methods.isStillBlocked = function() {
  if (this.isPermanent) return true;
  if (!this.expiresAt) return false;
  return new Date() < this.expiresAt;
};

module.exports = mongoose.model('BlockedIP', blockedIPSchema); 
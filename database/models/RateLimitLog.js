const mongoose = require('mongoose');

const rateLimitLogSchema = new mongoose.Schema({
  ipAddress: {
    type: String,
    required: true
  },
  endpoint: {
    type: String,
    required: true
  },
  requestCount: {
    type: Number,
    default: 1
  },
  windowStart: {
    type: Date,
    default: Date.now
  },
  lastRequest: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create compound index for unique IP + endpoint combination
rateLimitLogSchema.index({ ipAddress: 1, endpoint: 1 }, { unique: true });
rateLimitLogSchema.index({ windowStart: 1 });

module.exports = mongoose.model('RateLimitLog', rateLimitLogSchema); 
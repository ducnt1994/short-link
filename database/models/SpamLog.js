const mongoose = require('mongoose');

const spamLogSchema = new mongoose.Schema({
  ipAddress: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true
  },
  details: {
    type: String
  }
}, {
  timestamps: true
});

// Create indexes
spamLogSchema.index({ ipAddress: 1 });
spamLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SpamLog', spamLogSchema); 
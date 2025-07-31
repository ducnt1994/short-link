const mongoose = require('mongoose');

const shortLinkSchema = new mongoose.Schema({
  originalUrl: {
    type: String,
    required: true,
    trim: true
  },
  shortCode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String
  },
  clicks: {
    type: Number,
    default: 0
  },
  lastClicked: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create indexes (shortCode index is automatically created by unique: true)
shortLinkSchema.index({ ipAddress: 1 });
shortLinkSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ShortLink', shortLinkSchema); 
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
  clicks: {
    type: Number,
    default: 0
  }
}, {
  timestamps: { 
    type: Number, // Store timestamps as seconds
    default: () => Math.floor(Date.now() / 1000)
  }
});

// Create indexes
shortLinkSchema.index({ originalUrl: 1 });
shortLinkSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ShortLink', shortLinkSchema); 
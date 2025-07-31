const mongoose = require('mongoose');

const clickHistorySchema = new mongoose.Schema({
  shortLinkId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShortLink',
    required: true
  },
  shortCode: {
    type: String,
    required: true
  },
  date: {
    type: Number, // Store as seconds timestamp
    required: true
  },
  count: {
    type: Number,
    default: 1
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: { 
    type: Number, // Store timestamps as seconds
    default: () => Math.floor(Date.now() / 1000)
  },
  collection: 'click_histories' // Custom collection name
});

// Create indexes
clickHistorySchema.index({ shortLinkId: 1, date: 1 }, { unique: true });
clickHistorySchema.index({ shortCode: 1 });
clickHistorySchema.index({ date: -1 });

module.exports = mongoose.model('ClickHistory', clickHistorySchema); 
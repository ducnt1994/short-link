const express = require('express');
const router = express.Router();
const {
  createShortLink,
  getShortLinkInfo,
  getDailyStats,
  getAllShortLinks
} = require('../controllers/shortLinkController');

// Create short link
router.post('/create', createShortLink);

// Get all short links (for dashboard)
router.get('/all', getAllShortLinks);

// Get short link info
router.get('/info/:shortCode', getShortLinkInfo);

// Get daily statistics
router.get('/stats/:shortCode', getDailyStats);

module.exports = router; 
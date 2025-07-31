const express = require('express');
const { nanoid } = require('nanoid');
const { ShortLink } = require('../database/init');
const router = express.Router();

// Create short link
router.post('/create', async (req, res) => {
  try {
    const { originalUrl, customCode } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    // Generate short code
    const shortCode = customCode || nanoid(8);

    // Check if custom code already exists
    if (customCode) {
      const existingLink = await ShortLink.findOne({ shortCode });
      if (existingLink) {
        return res.status(409).json({ error: 'Custom code already exists' });
      }
    }

    // Create new short link
    const shortLink = new ShortLink({
      originalUrl,
      shortCode,
      ipAddress: clientIP,
      userAgent
    });

    await shortLink.save();

    const shortUrl = `${req.protocol}://${req.get('host')}/${shortCode}`;
    
    res.status(201).json({
      success: true,
      originalUrl,
      shortUrl,
      shortCode,
      id: shortLink._id
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Short code already exists' });
    }
    console.error('Error creating short link:', error);
    res.status(500).json({ error: 'Failed to create short link' });
  }
});

// Get short link info
router.get('/info/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;

    const shortLink = await ShortLink.findOne({ shortCode });
    
    if (!shortLink) {
      return res.status(404).json({ error: 'Short link not found' });
    }

    res.json({
      id: shortLink._id,
      originalUrl: shortLink.originalUrl,
      shortCode: shortLink.shortCode,
      createdAt: shortLink.createdAt,
      clicks: shortLink.clicks,
      lastClicked: shortLink.lastClicked,
      isActive: shortLink.isActive
    });
  } catch (error) {
    console.error('Error getting short link info:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get links by IP (for monitoring)
router.get('/by-ip/:ip', async (req, res) => {
  try {
    const { ip } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const links = await ShortLink.find({ ipAddress: ip })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .select('originalUrl shortCode createdAt clicks lastClicked isActive');

    res.json({
      links,
      total: links.length,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error getting links by IP:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Deactivate short link
router.patch('/deactivate/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];

    const shortLink = await ShortLink.findOne({ shortCode });
    
    if (!shortLink) {
      return res.status(404).json({ error: 'Short link not found' });
    }

    // Only allow deactivation by the creator
    if (shortLink.ipAddress !== clientIP) {
      return res.status(403).json({ error: 'Not authorized to deactivate this link' });
    }

    shortLink.isActive = false;
    await shortLink.save();

    res.json({
      success: true,
      message: 'Link deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating short link:', error);
    res.status(500).json({ error: 'Failed to deactivate link' });
  }
});

// Get statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const [totalLinks, activeLinks, linksToday, totalClicks, blockedIPs] = await Promise.all([
      ShortLink.countDocuments(),
      ShortLink.countDocuments({ isActive: true }),
      ShortLink.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      }),
      ShortLink.aggregate([
        { $group: { _id: null, total: { $sum: '$clicks' } } }
      ]).then(result => result[0]?.total || 0),
      require('../database/init').BlockedIP.countDocuments({
        $or: [
          { isPermanent: true },
          { expiresAt: { $gt: new Date() } }
        ]
      })
    ]);

    res.json({
      totalLinks,
      activeLinks,
      linksToday,
      totalClicks,
      blockedIPs
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Get detailed click statistics
router.get('/stats/clicks', async (req, res) => {
  try {
    // Get summary statistics
    const [summaryResult, activeLinks, inactiveLinks] = await Promise.all([
      ShortLink.aggregate([
        { $group: { _id: null, totalClicks: { $sum: '$clicks' }, totalLinks: { $sum: 1 } } }
      ]),
      ShortLink.countDocuments({ clicks: { $gt: 0 } }),
      ShortLink.countDocuments({ clicks: 0 })
    ]);

    const summary = {
      totalClicks: summaryResult[0]?.totalClicks || 0,
      totalLinks: summaryResult[0]?.totalLinks || 0,
      activeLinks,
      inactiveLinks,
      avgClicks: summaryResult[0]?.totalLinks > 0 ? 
        (summaryResult[0].totalClicks / summaryResult[0].totalLinks).toFixed(2) : 0
    };

    // Get all links with click data
    const allLinks = await ShortLink.find()
      .sort({ clicks: -1, createdAt: -1 })
      .select('shortCode originalUrl clicks lastClicked createdAt isActive');

    // Get top performers (top 5 by clicks)
    const topPerformers = allLinks.filter(link => link.clicks > 0).slice(0, 5);

    // Get recent activity (top 5 by last_clicked)
    const recentActivity = allLinks
      .filter(link => link.lastClicked)
      .sort((a, b) => new Date(b.lastClicked) - new Date(a.lastClicked))
      .slice(0, 5);

    res.json({
      summary,
      topPerformers,
      recentActivity,
      allLinks
    });
  } catch (error) {
    console.error('Error getting click stats:', error);
    res.status(500).json({ error: 'Failed to get click statistics' });
  }
});

// Reset database (clear all data)
router.post('/reset-db', async (req, res) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    
    console.log(`🔄 Reset database requested by IP: ${clientIP}`);
    
    const { ShortLink, SpamLog, BlockedIP, RateLimitLog } = require('../database/init');
    
    // Clear all collections
    await Promise.all([
      ShortLink.deleteMany({}),
      SpamLog.deleteMany({}),
      BlockedIP.deleteMany({}),
      RateLimitLog.deleteMany({})
    ]);
    
    console.log('🎉 Database reset completed successfully');
    
    res.json({
      success: true,
      message: 'Database reset successfully',
      timestamp: new Date().toISOString(),
      resetBy: clientIP
    });
    
  } catch (error) {
    console.error('❌ Error during database reset:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset database',
      details: error.message
    });
  }
});

module.exports = router; 
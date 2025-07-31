const ShortLink = require('../models/ShortLink');
const ClickHistory = require('../models/ClickHistory');
const { nanoid } = require('nanoid');

// Create short link
const createShortLink = async (req, res) => {
  try {
    const { originalUrl, customCode } = req.body;

    if (!originalUrl) {
      return res.status(400).json({ error: 'Original URL is required' });
    }

    // Check if URL already exists in database
    const existingLink = await ShortLink.findOne({ originalUrl });
    if (existingLink) {
      const shortUrl = `${req.protocol}://${req.get('host')}/${existingLink.shortCode}`;
      return res.status(200).json({
        success: true,
        message: 'URL already exists',
        originalUrl: existingLink.originalUrl,
        shortUrl,
        shortCode: existingLink.shortCode,
        id: existingLink._id,
        existing: true
      });
    }

    // Generate short code
    const shortCode = customCode || nanoid(8);

    // Check if custom code already exists
    if (customCode) {
      const existingCustomLink = await ShortLink.findOne({ shortCode });
      if (existingCustomLink) {
        return res.status(409).json({ error: 'Custom code already exists' });
      }
    }

    // Create new short link
    const shortLink = new ShortLink({
      originalUrl,
      shortCode
    });

    await shortLink.save();

    const shortUrl = `${req.protocol}://${req.get('host')}/${shortCode}`;
    
    res.status(201).json({
      success: true,
      message: 'Short link created successfully',
      originalUrl,
      shortUrl,
      shortCode,
      id: shortLink._id,
      existing: false
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Short code already exists' });
    }
    console.error('Error creating short link:', error);
    res.status(500).json({ error: 'Failed to create short link' });
  }
};

// Redirect to original URL
const redirectToOriginal = async (req, res) => {
  try {
    const { shortCode } = req.params;
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    const shortLink = await ShortLink.findOne({ shortCode });
    
    if (!shortLink) {
      return res.status(404).json({ error: 'Short link not found' });
    }

    // Update click count
    shortLink.clicks += 1;
    await shortLink.save();
    
    // Create new click history record (in seconds)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySeconds = Math.floor(today.getTime() / 1000);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    
    try {
      const clickRecord = new ClickHistory({
        shortLinkId: shortLink._id,
        shortCode: shortCode,
        date: todaySeconds,
        ipAddress: clientIP,
        userAgent: userAgent,
        timestamp: currentTimestamp
      });
      
      await clickRecord.save();
    } catch (historyError) {
      console.error('Error creating click history record:', historyError);
      // Continue with redirect even if history creation fails
    }

    // Redirect to original URL
    res.redirect(shortLink.originalUrl);
  } catch (error) {
    console.error('Error redirecting:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

// Get short link info
const getShortLinkInfo = async (req, res) => {
  try {
    const { shortCode } = req.params;

    const shortLink = await ShortLink.findOne({ shortCode });
    
    if (!shortLink) {
      return res.status(404).json({ error: 'Short link not found' });
    }

    // Get click history - aggregate by date
    const clickHistory = await ClickHistory.aggregate([
      { $match: { shortLinkId: shortLink._id } },
      { 
        $group: { 
          _id: '$date', 
          count: { $sum: 1 },
          clicks: { 
            $push: { 
              timestamp: '$timestamp',
              ipAddress: '$ipAddress',
              userAgent: '$userAgent'
            }
          }
        } 
      },
      { $sort: { _id: -1 } },
      { $limit: 30 } // Last 30 days
    ]);

    res.json({
      id: shortLink._id,
      originalUrl: shortLink.originalUrl,
      shortCode: shortLink.shortCode,
      clicks: shortLink.clicks,
      clickHistory: clickHistory.map(h => ({
        date: new Date(h._id * 1000), // Convert seconds back to Date
        count: h.count,
        clicks: h.clicks.map(c => ({
          timestamp: new Date(c.timestamp * 1000),
          ipAddress: c.ipAddress,
          userAgent: c.userAgent
        }))
      })),
      createdAt: new Date(shortLink.createdAt * 1000) // Convert seconds back to Date
    });
  } catch (error) {
    console.error('Error getting short link info:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

// Get daily statistics
const getDailyStats = async (req, res) => {
  try {
    const { shortCode } = req.params;
    const { date, startDate, endDate } = req.query;

    const shortLink = await ShortLink.findOne({ shortCode });
    
    if (!shortLink) {
      return res.status(404).json({ error: 'Short link not found' });
    }

    let clicks = 0;

    if (startDate && endDate) {
      // Get clicks for date range
      const startSeconds = Math.floor(new Date(startDate).getTime() / 1000);
      const endSeconds = Math.floor(new Date(endDate).getTime() / 1000);
      
      const history = await ClickHistory.find({
        shortLinkId: shortLink._id,
        date: { $gte: startSeconds, $lte: endSeconds }
      });

      clicks = history.length; // Count individual records
    } else {
      // Get clicks for specific date
      let targetDate;
      if (date) {
        targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
      } else {
        targetDate = new Date();
        targetDate.setHours(0, 0, 0, 0);
      }
      
      const targetDateSeconds = Math.floor(targetDate.getTime() / 1000);

      const dayHistory = await ClickHistory.find({
        shortLinkId: shortLink._id,
        date: targetDateSeconds
      });

      clicks = dayHistory.length; // Count individual records
    }

    res.json({
      success: true,
      shortCode,
      clicks,
      totalClicks: shortLink.clicks
    });
  } catch (error) {
    console.error('Error getting daily stats:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

// Get all short links (for dashboard)
const getAllShortLinks = async (req, res) => {
  try {
    const shortLinks = await ShortLink.find()
      .sort({ createdAt: -1 });

    const data = shortLinks.map(link => ({
      id: link._id,
      originalUrl: link.originalUrl,
      shortCode: link.shortCode,
      clicks: link.clicks,
      createdAt: new Date(link.createdAt * 1000) // Convert seconds back to Date
    }));

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error getting all short links:', error);
    res.status(500).json({ error: 'Database error' });
  }
};

module.exports = {
  createShortLink,
  redirectToOriginal,
  getShortLinkInfo,
  getDailyStats,
  getAllShortLinks
}; 
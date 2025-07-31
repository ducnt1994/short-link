const { BlockedIP, SpamLog, ShortLink, RateLimitLog } = require('../database/init');
const { body, validationResult } = require('express-validator');

// Anti-spam middleware
const antiSpamMiddleware = async (req, res, next) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    
    // Check if IP is blocked
    const isBlocked = await checkBlockedIP(clientIP);
    
    // if (isBlocked) {
    //   return res.status(403).json({
    //     error: 'Access denied',
    //     message: 'Your IP address has been blocked due to suspicious activity'
    //   });
    // }
    
    // // Log request for analysis
    // await logRequest(clientIP, req.path, req.headers['user-agent']);
    
    // // Check for suspicious patterns
    // if (req.method === 'POST' && req.path.includes('/shortlink')) {
    //   return validateAndCheckSpam(req, res, next, clientIP);
    // }
    
    next();
  } catch (err) {
    console.error('Anti-spam middleware error:', err);
    next();
  }
};

// Check if IP is blocked
async function checkBlockedIP(ip) {
  try {
    const blockedIP = await BlockedIP.findOne({ ipAddress: ip });
    if (!blockedIP) return false;
    
    return blockedIP.isStillBlocked();
  } catch (error) {
    console.error('Error checking blocked IP:', error);
    return false;
  }
}

// Log request for analysis
async function logRequest(ip, endpoint, userAgent) {
  try {
    await RateLimitLog.findOneAndUpdate(
      { ipAddress: ip, endpoint },
      {
        $inc: { requestCount: 1 },
        lastRequest: new Date()
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Error logging request:', error);
  }
}

// Validate and check for spam patterns
async function validateAndCheckSpam(req, res, next, clientIP) {
  try {
    // Validation rules
    const validationRules = [
      body('originalUrl')
        .isURL({ protocols: ['http', 'https'] })
        .withMessage('Invalid URL format')
        .isLength({ max: 2048 })
        .withMessage('URL too long'),
      body('customCode')
        .optional()
        .isLength({ min: 3, max: 20 })
        .withMessage('Custom code must be between 3-20 characters')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Custom code can only contain letters, numbers, hyphens, and underscores')
    ];

    // Run validation
    await Promise.all(validationRules.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Check for spam patterns
    const isSpam = await checkSpamPatterns(req.body, clientIP);
    if (isSpam) {
      return res.status(429).json({
        error: 'Spam detected',
        message: 'Your request appears to be spam. Please try again later.'
      });
    }
    
    next();
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: 'Validation error' });
  }
}

// Check for spam patterns
async function checkSpamPatterns(body, clientIP) {
  try {
    const { originalUrl } = body;
    
    // Check blocked domains
    const blockedDomains = process.env.BLOCKED_DOMAINS?.split(',') || [];
    const urlDomain = new URL(originalUrl).hostname.toLowerCase();
    
    if (blockedDomains.some(domain => urlDomain.includes(domain.trim()))) {
      await logSpamActivity(clientIP, 'BLOCKED_DOMAIN', `Domain: ${urlDomain}`);
      return true;
    }

    // Check suspicious keywords
    const suspiciousKeywords = process.env.SUSPICIOUS_KEYWORDS?.split(',') || [];
    const urlLower = originalUrl.toLowerCase();
    
    if (suspiciousKeywords.some(keyword => urlLower.includes(keyword.trim()))) {
      await logSpamActivity(clientIP, 'SUSPICIOUS_KEYWORDS', `URL: ${originalUrl}`);
      return true;
    }

    // Check daily link limit per IP
    const limitExceeded = await checkDailyLinkLimit(clientIP);
    if (limitExceeded) {
      await logSpamActivity(clientIP, 'DAILY_LIMIT_EXCEEDED', 'Daily link limit exceeded');
      return true;
    }

    // Check for rapid link creation
    const isRapid = await checkRapidCreation(clientIP);
    if (isRapid) {
      await logSpamActivity(clientIP, 'RAPID_CREATION', 'Too many links created in short time');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking spam patterns:', error);
    return false;
  }
}

// Check daily link limit
async function checkDailyLinkLimit(ip) {
  try {
    const maxLinksPerDay = parseInt(process.env.MAX_LINKS_PER_IP_PER_DAY) || 50;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const count = await ShortLink.countDocuments({
      ipAddress: ip,
      createdAt: { $gte: oneDayAgo }
    });
    
    return count >= maxLinksPerDay;
  } catch (error) {
    console.error('Error checking daily link limit:', error);
    return false;
  }
}

// Check for rapid link creation
async function checkRapidCreation(ip) {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const count = await ShortLink.countDocuments({
      ipAddress: ip,
      createdAt: { $gte: oneHourAgo }
    });
    
    // If more than 10 links in 1 hour, consider it rapid
    return count >= 10;
  } catch (error) {
    console.error('Error checking rapid creation:', error);
    return false;
  }
}

// Log spam activity
async function logSpamActivity(ip, action, details) {
  try {
    await SpamLog.create({
      ipAddress: ip,
      action,
      details
    });

    // Check if IP should be blocked
    await checkSpamThreshold(ip);
  } catch (error) {
    console.error('Error logging spam activity:', error);
  }
}

// Check if IP should be blocked based on spam activity
async function checkSpamThreshold(ip) {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const count = await SpamLog.countDocuments({
      ipAddress: ip,
      createdAt: { $gte: oneDayAgo }
    });

    // Block IP if more than 5 spam activities in 1 day
    if (count >= 5) {
      await blockIP(ip, 'Multiple spam activities detected');
    }
  } catch (error) {
    console.error('Error checking spam threshold:', error);
  }
}

// Block IP address
async function blockIP(ip, reason) {
  try {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    
    await BlockedIP.findOneAndUpdate(
      { ipAddress: ip },
      {
        reason,
        expiresAt,
        isPermanent: false
      },
      { upsert: true, new: true }
    );
    
    console.log(`IP ${ip} blocked for 7 days: ${reason}`);
  } catch (error) {
    console.error('Error blocking IP:', error);
  }
}

module.exports = antiSpamMiddleware; 
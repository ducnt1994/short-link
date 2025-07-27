const db = require('../database/init');
const { body, validationResult } = require('express-validator');

// Anti-spam middleware
const antiSpamMiddleware = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
  
  // Check if IP is blocked
  checkBlockedIP(clientIP)
    .then(isBlocked => {
      // if (isBlocked) {
      //   return res.status(403).json({
      //     error: 'Access denied',
      //     message: 'Your IP address has been blocked due to suspicious activity'
      //   });
      // }
      
      // // Log request for analysis
      // logRequest(clientIP, req.path, req.headers['user-agent']);
      
      // // Check for suspicious patterns
      // if (req.method === 'POST' && req.path.includes('/shortlink')) {
      //   return validateAndCheckSpam(req, res, next, clientIP);
      // }
      
      next();
    })
    .catch(err => {
      console.error('Anti-spam middleware error:', err);
      next();
    });
};

// Check if IP is blocked
function checkBlockedIP(ip) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM blocked_ips 
       WHERE ip_address = ? 
       AND (expires_at IS NULL OR expires_at > datetime('now'))`,
      [ip],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(!!row);
        }
      }
    );
  });
}

// Log request for analysis
function logRequest(ip, endpoint, userAgent) {
  db.run(
    `INSERT OR REPLACE INTO rate_limit_logs (ip_address, endpoint, request_count, last_request)
     VALUES (?, ?, 
       COALESCE((SELECT request_count + 1 FROM rate_limit_logs WHERE ip_address = ? AND endpoint = ?), 1),
       datetime('now'))`,
    [ip, endpoint, ip, endpoint],
    (err) => {
      if (err) console.error('Error logging request:', err);
    }
  );
}

// Validate and check for spam patterns
function validateAndCheckSpam(req, res, next, clientIP) {
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
  Promise.all(validationRules.map(validation => validation.run(req)))
    .then(() => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      // Check for spam patterns
      return checkSpamPatterns(req.body, clientIP)
        .then(isSpam => {
          if (isSpam) {
            return res.status(429).json({
              error: 'Spam detected',
              message: 'Your request appears to be spam. Please try again later.'
            });
          }
          next();
        });
    })
    .catch(err => {
      console.error('Validation error:', err);
      res.status(500).json({ error: 'Validation error' });
    });
}

// Check for spam patterns
function checkSpamPatterns(body, clientIP) {
  return new Promise((resolve, reject) => {
    const { originalUrl } = body;
    
    // Check blocked domains
    const blockedDomains = process.env.BLOCKED_DOMAINS?.split(',') || [];
    const urlDomain = new URL(originalUrl).hostname.toLowerCase();
    
    if (blockedDomains.some(domain => urlDomain.includes(domain.trim()))) {
      logSpamActivity(clientIP, 'BLOCKED_DOMAIN', `Domain: ${urlDomain}`);
      resolve(true);
      return;
    }

    // Check suspicious keywords
    const suspiciousKeywords = process.env.SUSPICIOUS_KEYWORDS?.split(',') || [];
    const urlLower = originalUrl.toLowerCase();
    
    if (suspiciousKeywords.some(keyword => urlLower.includes(keyword.trim()))) {
      logSpamActivity(clientIP, 'SUSPICIOUS_KEYWORDS', `URL: ${originalUrl}`);
      resolve(true);
      return;
    }

    // Check daily link limit per IP
    checkDailyLinkLimit(clientIP)
      .then(limitExceeded => {
        if (limitExceeded) {
          logSpamActivity(clientIP, 'DAILY_LIMIT_EXCEEDED', 'Daily link limit exceeded');
          resolve(true);
          return;
        }

        // Check for rapid link creation
        checkRapidCreation(clientIP)
          .then(isRapid => {
            if (isRapid) {
              logSpamActivity(clientIP, 'RAPID_CREATION', 'Too many links created in short time');
              resolve(true);
              return;
            }

            resolve(false);
          })
          .catch(reject);
      })
      .catch(reject);
  });
}

// Check daily link limit
function checkDailyLinkLimit(ip) {
  return new Promise((resolve, reject) => {
    const maxLinksPerDay = parseInt(process.env.MAX_LINKS_PER_IP_PER_DAY) || 50;
    
    db.get(
      `SELECT COUNT(*) as count FROM shortlinks 
       WHERE ip_address = ? 
       AND created_at >= datetime('now', '-1 day')`,
      [ip],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.count >= maxLinksPerDay);
        }
      }
    );
  });
}

// Check for rapid link creation
function checkRapidCreation(ip) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT COUNT(*) as count FROM shortlinks 
       WHERE ip_address = ? 
       AND created_at >= datetime('now', '-1 hour')`,
      [ip],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          // If more than 10 links in 1 hour, consider it rapid
          resolve(row.count >= 10);
        }
      }
    );
  });
}

// Log spam activity
function logSpamActivity(ip, action, details) {
  db.run(
    `INSERT INTO spam_logs (ip_address, action, details)
     VALUES (?, ?, ?)`,
    [ip, action, details],
    (err) => {
      if (err) console.error('Error logging spam activity:', err);
    }
  );

  // Check if IP should be blocked
  checkSpamThreshold(ip);
}

// Check if IP should be blocked based on spam activity
function checkSpamThreshold(ip) {
  db.get(
    `SELECT COUNT(*) as count FROM spam_logs 
     WHERE ip_address = ? 
     AND created_at >= datetime('now', '-1 day')`,
    [ip],
    (err, row) => {
      if (err) {
        console.error('Error checking spam threshold:', err);
        return;
      }

      // Block IP if more than 5 spam activities in 1 day
      if (row.count >= 5) {
        blockIP(ip, 'Multiple spam activities detected');
      }
    }
  );
}

// Block IP address
function blockIP(ip, reason) {
  db.run(
    `INSERT OR REPLACE INTO blocked_ips (ip_address, reason, blocked_at, expires_at, is_permanent)
     VALUES (?, ?, datetime('now'), datetime('now', '+7 days'), 0)`,
    [ip, reason],
    (err) => {
      if (err) {
        console.error('Error blocking IP:', err);
      } else {
        console.log(`IP ${ip} blocked for 7 days: ${reason}`);
      }
    }
  );
}

module.exports = antiSpamMiddleware; 
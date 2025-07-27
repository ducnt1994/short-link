const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../database/init');
const router = express.Router();

// Create short link
router.post('/create', (req, res) => {
  const { originalUrl, customCode } = req.body;
  const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
  const userAgent = req.headers['user-agent'];

  // Generate short code
  const shortCode = customCode || nanoid(8);

  // Check if custom code already exists
  if (customCode) {
    db.get('SELECT id FROM shortlinks WHERE short_code = ?', [shortCode], (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (row) {
        return res.status(409).json({ error: 'Custom code already exists' });
      }
      
      createShortLink();
    });
  } else {
    createShortLink();
  }

  function createShortLink() {
    const insertQuery = `
      INSERT INTO shortlinks (original_url, short_code, ip_address, user_agent)
      VALUES (?, ?, ?, ?)
    `;

    db.run(insertQuery, [originalUrl, shortCode, clientIP, userAgent], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'Short code already exists' });
        }
        return res.status(500).json({ error: 'Failed to create short link' });
      }

      const shortUrl = `${req.protocol}://${req.get('host')}/${shortCode}`;
      
      res.status(201).json({
        success: true,
        originalUrl,
        shortUrl,
        shortCode,
        id: this.lastID
      });
    });
  }
});



// Get short link info
router.get('/info/:shortCode', (req, res) => {
  const { shortCode } = req.params;

  db.get(
    `SELECT id, original_url, short_code, created_at, clicks, last_clicked, is_active
     FROM shortlinks WHERE short_code = ?`,
    [shortCode],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!row) {
        return res.status(404).json({ error: 'Short link not found' });
      }

      res.json({
        id: row.id,
        originalUrl: row.original_url,
        shortCode: row.short_code,
        createdAt: row.created_at,
        clicks: row.clicks,
        lastClicked: row.last_clicked,
        isActive: row.is_active === 1
      });
    }
  );
});

// Get links by IP (for monitoring)
router.get('/by-ip/:ip', (req, res) => {
  const { ip } = req.params;
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;

  db.all(
    `SELECT id, original_url, short_code, created_at, clicks, last_clicked, is_active
     FROM shortlinks 
     WHERE ip_address = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [ip, limit, offset],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        links: rows,
        total: rows.length,
        limit,
        offset
      });
    }
  );
});

// Deactivate short link
router.patch('/deactivate/:shortCode', (req, res) => {
  const { shortCode } = req.params;
  const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];

  // Check if user owns this link
  db.get(
    `SELECT id, ip_address FROM shortlinks WHERE short_code = ?`,
    [shortCode],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!row) {
        return res.status(404).json({ error: 'Short link not found' });
      }

      // Only allow deactivation by the creator
      if (row.ip_address !== clientIP) {
        return res.status(403).json({ error: 'Not authorized to deactivate this link' });
      }

      db.run(
        `UPDATE shortlinks SET is_active = 0 WHERE id = ?`,
        [row.id],
        (updateErr) => {
          if (updateErr) {
            return res.status(500).json({ error: 'Failed to deactivate link' });
          }

          res.json({
            success: true,
            message: 'Link deactivated successfully'
          });
        }
      );
    }
  );
});

// Get statistics
router.get('/stats/overview', (req, res) => {
  const queries = [
    'SELECT COUNT(*) as total FROM shortlinks',
    'SELECT COUNT(*) as active FROM shortlinks WHERE is_active = 1',
    'SELECT COUNT(*) as today FROM shortlinks WHERE created_at >= datetime("now", "start of day")',
    'SELECT SUM(clicks) as totalClicks FROM shortlinks',
    'SELECT COUNT(*) as blocked FROM blocked_ips WHERE expires_at > datetime("now") OR is_permanent = 1'
  ];

  Promise.all(queries.map(query => {
    return new Promise((resolve, reject) => {
      db.get(query, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }))
  .then(results => {
    res.json({
      totalLinks: results[0].total,
      activeLinks: results[1].active,
      linksToday: results[2].today,
      totalClicks: results[3].totalClicks || 0,
      blockedIPs: results[4].blocked
    });
  })
  .catch(err => {
    console.error('Error getting stats:', err);
    res.status(500).json({ error: 'Failed to get statistics' });
  });
});

// Get detailed click statistics
router.get('/stats/clicks', (req, res) => {
  // Get summary statistics
  const summaryQueries = [
    'SELECT SUM(clicks) as totalClicks, COUNT(*) as totalLinks FROM shortlinks',
    'SELECT COUNT(*) as activeLinks FROM shortlinks WHERE clicks > 0',
    'SELECT COUNT(*) as inactiveLinks FROM shortlinks WHERE clicks = 0'
  ];

  Promise.all(summaryQueries.map(query => {
    return new Promise((resolve, reject) => {
      db.get(query, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }))
  .then(summaryResults => {
    const summary = {
      totalClicks: summaryResults[0].totalClicks || 0,
      totalLinks: summaryResults[0].totalLinks || 0,
      activeLinks: summaryResults[1].activeLinks || 0,
      inactiveLinks: summaryResults[2].inactiveLinks || 0,
      avgClicks: summaryResults[0].totalLinks > 0 ? (summaryResults[0].totalClicks / summaryResults[0].totalLinks).toFixed(2) : 0
    };

    // Get all links with click data
    db.all(`
      SELECT 
        id,
        short_code,
        original_url,
        clicks,
        last_clicked,
        created_at,
        is_active
      FROM shortlinks 
      ORDER BY clicks DESC, created_at DESC
    `, (err, allLinks) => {
      if (err) {
        console.error('Error getting all links:', err);
        return res.status(500).json({ error: 'Failed to get click statistics' });
      }

      // Get top performers (top 5 by clicks)
      const topPerformers = allLinks.filter(link => link.clicks > 0).slice(0, 5);

      // Get recent activity (top 5 by last_clicked)
      const recentActivity = allLinks
        .filter(link => link.last_clicked)
        .sort((a, b) => new Date(b.last_clicked) - new Date(a.last_clicked))
        .slice(0, 5);

      res.json({
        summary,
        topPerformers,
        recentActivity,
        allLinks
      });
    });
  })
  .catch(err => {
    console.error('Error getting click stats:', err);
    res.status(500).json({ error: 'Failed to get click statistics' });
  });
});

// Reset database (clear all data)
router.post('/reset-db', (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
  
  console.log(`🔄 Reset database requested by IP: ${clientIP}`);
  
  // Helper function to run SQL with Promise
  function runSQL(sql) {
    return new Promise((resolve, reject) => {
      db.run(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // Reset all tables
  const resetDatabase = async () => {
    try {
      console.log('🗑️ Starting database reset...');
      
      // Delete all data from tables
      await runSQL('DELETE FROM shortlinks');
      console.log('✅ Shortlinks table cleared');
      
      await runSQL('DELETE FROM spam_logs');
      console.log('✅ Spam logs table cleared');
      
      await runSQL('DELETE FROM blocked_ips');
      console.log('✅ Blocked IPs table cleared');
      
      await runSQL('DELETE FROM rate_limit_logs');
      console.log('✅ Rate limit logs table cleared');
      
      // Reset auto-increment counters
      await runSQL('DELETE FROM sqlite_sequence WHERE name IN ("shortlinks", "spam_logs", "blocked_ips", "rate_limit_logs")');
      console.log('✅ Auto-increment counters reset');
      
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
  };

  // Execute the reset
  resetDatabase();
});

module.exports = router; 
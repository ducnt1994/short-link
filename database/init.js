const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'shortlinks.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

function initDatabase() {
  // Create shortlinks table
  db.run(`CREATE TABLE IF NOT EXISTS shortlinks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_url TEXT NOT NULL,
    short_code TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    clicks INTEGER DEFAULT 0,
    last_clicked DATETIME,
    is_active BOOLEAN DEFAULT 1
  )`, (err) => {
    if (err) {
      console.error('Error creating shortlinks table:', err.message);
    } else {
      console.log('Shortlinks table created or already exists');
    }
  });

  // Create spam_logs table for tracking suspicious activity
  db.run(`CREATE TABLE IF NOT EXISTS spam_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating spam_logs table:', err.message);
    } else {
      console.log('Spam logs table created or already exists');
    }
  });

  // Create blocked_ips table
  db.run(`CREATE TABLE IF NOT EXISTS blocked_ips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT UNIQUE NOT NULL,
    reason TEXT,
    blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    is_permanent BOOLEAN DEFAULT 0
  )`, (err) => {
    if (err) {
      console.error('Error creating blocked_ips table:', err.message);
    } else {
      console.log('Blocked IPs table created or already exists');
    }
  });

  // Create rate_limit_logs table
  db.run(`CREATE TABLE IF NOT EXISTS rate_limit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_request DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ip_address, endpoint)
  )`, (err) => {
    if (err) {
      console.error('Error creating rate_limit_logs table:', err.message);
    } else {
      console.log('Rate limit logs table created or already exists');
    }
  });

  // Create indexes for better performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_shortlinks_short_code ON shortlinks(short_code)`, (err) => {
    if (err) console.error('Error creating index:', err.message);
  });

  db.run(`CREATE INDEX IF NOT EXISTS idx_shortlinks_ip_address ON shortlinks(ip_address)`, (err) => {
    if (err) console.error('Error creating index:', err.message);
  });

  db.run(`CREATE INDEX IF NOT EXISTS idx_spam_logs_ip_address ON spam_logs(ip_address)`, (err) => {
    if (err) console.error('Error creating index:', err.message);
  });

  db.run(`CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip_address ON blocked_ips(ip_address)`, (err) => {
    if (err) console.error('Error creating index:', err.message);
  });
}

module.exports = db; 
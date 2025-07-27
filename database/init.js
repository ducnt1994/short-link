const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'shortlinks.db');

// Ensure database directory exists
const fs = require('fs');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  } else {
    console.log('Connected to SQLite database');
    // Add a small delay to ensure database is fully opened
    setTimeout(() => {
      initDatabase();
    }, 100);
  }
});

function initDatabase() {
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

  // Create all tables first
  const createTables = async () => {
    try {
      // Create shortlinks table
      await runSQL(`CREATE TABLE IF NOT EXISTS shortlinks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_url TEXT NOT NULL,
        short_code TEXT UNIQUE NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        clicks INTEGER DEFAULT 0,
        last_clicked DATETIME,
        is_active BOOLEAN DEFAULT 1
      )`);
      console.log('Shortlinks table created or already exists');

      // Create spam_logs table
      await runSQL(`CREATE TABLE IF NOT EXISTS spam_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      console.log('Spam logs table created or already exists');

      // Create blocked_ips table
      await runSQL(`CREATE TABLE IF NOT EXISTS blocked_ips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT UNIQUE NOT NULL,
        reason TEXT,
        blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        is_permanent BOOLEAN DEFAULT 0
      )`);
      console.log('Blocked IPs table created or already exists');

      // Create rate_limit_logs table
      await runSQL(`CREATE TABLE IF NOT EXISTS rate_limit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        request_count INTEGER DEFAULT 1,
        window_start DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_request DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(ip_address, endpoint)
      )`);
      console.log('Rate limit logs table created or already exists');

      // Now create indexes after all tables are created
      console.log('Creating indexes...');
      
      await runSQL(`CREATE INDEX IF NOT EXISTS idx_shortlinks_short_code ON shortlinks(short_code)`);
      await runSQL(`CREATE INDEX IF NOT EXISTS idx_shortlinks_ip_address ON shortlinks(ip_address)`);
      await runSQL(`CREATE INDEX IF NOT EXISTS idx_spam_logs_ip_address ON spam_logs(ip_address)`);
      await runSQL(`CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip_address ON blocked_ips(ip_address)`);
      
      console.log('All indexes created successfully');
      console.log('✅ Database initialization completed successfully');
      
    } catch (error) {
      console.error('❌ Error during database initialization:', error.message);
      // Don't exit process, just log the error
    }
  };

  // Execute the table creation
  createTables();
}

module.exports = db; 
#!/usr/bin/env node

/**
 * Migration script từ SQLite sang MongoDB
 * Chạy script này nếu bạn muốn chuyển dữ liệu từ SQLite sang MongoDB
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// Import MongoDB models
const ShortLink = require('./database/models/ShortLink');
const SpamLog = require('./database/models/SpamLog');
const BlockedIP = require('./database/models/BlockedIP');
const RateLimitLog = require('./database/models/RateLimitLog');

// SQLite database path
const sqlitePath = process.env.DB_PATH || path.join(__dirname, 'database', 'shortlinks.db');

async function connectMongoDB() {
  try {
    const dbURI = process.env.DB_URI || 'mongodb://localhost:27017/shortlink';
    await mongoose.connect(dbURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
}

function connectSQLite() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(sqlitePath, (err) => {
      if (err) {
        console.error('❌ SQLite connection error:', err.message);
        reject(err);
      } else {
        console.log('✅ Connected to SQLite database');
        resolve(db);
      }
    });
  });
}

function querySQLite(db, sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

async function migrateShortLinks(db) {
  console.log('🔄 Migrating shortlinks...');
  
  try {
    const shortlinks = await querySQLite(db, 'SELECT * FROM shortlinks');
    
    for (const link of shortlinks) {
      const shortLink = new ShortLink({
        originalUrl: link.original_url,
        shortCode: link.short_code,
        ipAddress: link.ip_address,
        userAgent: link.user_agent,
        clicks: link.clicks || 0,
        lastClicked: link.last_clicked ? new Date(link.last_clicked) : null,
        isActive: link.is_active === 1,
        createdAt: link.created_at ? new Date(link.created_at) : new Date(),
        updatedAt: new Date()
      });
      
      await shortLink.save();
    }
    
    console.log(`✅ Migrated ${shortlinks.length} shortlinks`);
  } catch (error) {
    console.error('❌ Error migrating shortlinks:', error);
  }
}

async function migrateSpamLogs(db) {
  console.log('🔄 Migrating spam logs...');
  
  try {
    const spamLogs = await querySQLite(db, 'SELECT * FROM spam_logs');
    
    for (const log of spamLogs) {
      const spamLog = new SpamLog({
        ipAddress: log.ip_address,
        action: log.action,
        details: log.details,
        createdAt: log.created_at ? new Date(log.created_at) : new Date(),
        updatedAt: new Date()
      });
      
      await spamLog.save();
    }
    
    console.log(`✅ Migrated ${spamLogs.length} spam logs`);
  } catch (error) {
    console.error('❌ Error migrating spam logs:', error);
  }
}

async function migrateBlockedIPs(db) {
  console.log('🔄 Migrating blocked IPs...');
  
  try {
    const blockedIPs = await querySQLite(db, 'SELECT * FROM blocked_ips');
    
    for (const ip of blockedIPs) {
      const blockedIP = new BlockedIP({
        ipAddress: ip.ip_address,
        reason: ip.reason,
        expiresAt: ip.expires_at ? new Date(ip.expires_at) : null,
        isPermanent: ip.is_permanent === 1,
        createdAt: ip.blocked_at ? new Date(ip.blocked_at) : new Date(),
        updatedAt: new Date()
      });
      
      await blockedIP.save();
    }
    
    console.log(`✅ Migrated ${blockedIPs.length} blocked IPs`);
  } catch (error) {
    console.error('❌ Error migrating blocked IPs:', error);
  }
}

async function migrateRateLimitLogs(db) {
  console.log('🔄 Migrating rate limit logs...');
  
  try {
    const rateLimitLogs = await querySQLite(db, 'SELECT * FROM rate_limit_logs');
    
    for (const log of rateLimitLogs) {
      const rateLimitLog = new RateLimitLog({
        ipAddress: log.ip_address,
        endpoint: log.endpoint,
        requestCount: log.request_count || 1,
        windowStart: log.window_start ? new Date(log.window_start) : new Date(),
        lastRequest: log.last_request ? new Date(log.last_request) : new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await rateLimitLog.save();
    }
    
    console.log(`✅ Migrated ${rateLimitLogs.length} rate limit logs`);
  } catch (error) {
    console.error('❌ Error migrating rate limit logs:', error);
  }
}

async function main() {
  console.log('🚀 Starting migration from SQLite to MongoDB...');
  
  try {
    // Connect to MongoDB
    await connectMongoDB();
    
    // Connect to SQLite
    const sqliteDb = await connectSQLite();
    
    // Check if SQLite database exists and has data
    const tables = await querySQLite(sqliteDb, "SELECT name FROM sqlite_master WHERE type='table'");
    console.log(`📊 Found ${tables.length} tables in SQLite database`);
    
    // Migrate data
    await migrateShortLinks(sqliteDb);
    await migrateSpamLogs(sqliteDb);
    await migrateBlockedIPs(sqliteDb);
    await migrateRateLimitLogs(sqliteDb);
    
    // Close SQLite connection
    sqliteDb.close((err) => {
      if (err) {
        console.error('❌ Error closing SQLite database:', err);
      } else {
        console.log('✅ SQLite database closed');
      }
    });
    
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    
    console.log('🎉 Migration completed successfully!');
    console.log('💡 You can now delete the SQLite database file if you no longer need it.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { main }; 
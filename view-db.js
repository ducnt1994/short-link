const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'database', 'shortlinks.db');

console.log('🗄️ Database Viewer');
console.log('Database path:', dbPath);
console.log('='.repeat(50));

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Connected to SQLite database\n');
    viewDatabase();
  }
});

function viewDatabase() {
  // Get table counts first
  const tables = [
    'shortlinks',
    'spam_logs', 
    'blocked_ips',
    'rate_limit_logs'
  ];

  let completedCounts = 0;
  const counts = {};

  tables.forEach(table => {
    db.get(`SELECT COUNT(*) as count FROM ${table}`, (err, row) => {
      if (err) {
        console.error(`❌ Error counting ${table}:`, err.message);
      } else {
        counts[table] = row.count;
      }
      
      completedCounts++;
      
      if (completedCounts === tables.length) {
        displaySummary(counts);
        displayTableDetails();
      }
    });
  });
}

function displaySummary(counts) {
  console.log('📊 DATABASE SUMMARY');
  console.log('='.repeat(50));
  console.log(`📋 shortlinks:     ${counts.shortlinks} records`);
  console.log(`🚫 spam_logs:      ${counts.spam_logs} records`);
  console.log(`🚷 blocked_ips:    ${counts.blocked_ips} records`);
  console.log(`⏱️  rate_limit_logs: ${counts.rate_limit_logs} records`);
  console.log('='.repeat(50));
  console.log(`📈 Total records:  ${Object.values(counts).reduce((sum, count) => sum + count, 0)}`);
  console.log('');
}

function displayTableDetails() {
  console.log('📋 DETAILED VIEW');
  console.log('='.repeat(50));
  
  // View shortlinks table
  viewShortlinks();
}

function viewShortlinks() {
  console.log('\n🔗 SHORTLINKS TABLE');
  console.log('-'.repeat(50));
  
  db.all(`SELECT 
    id,
    short_code,
    original_url,
    ip_address,
    created_at,
    clicks,
    last_clicked,
    is_active
  FROM shortlinks 
  ORDER BY created_at DESC 
  LIMIT 10`, (err, rows) => {
    if (err) {
      console.error('❌ Error querying shortlinks:', err.message);
    } else if (rows.length === 0) {
      console.log('📭 No shortlinks found');
    } else {
      rows.forEach((row, index) => {
        console.log(`${index + 1}. ID: ${row.id}`);
        console.log(`   Code: ${row.short_code}`);
        console.log(`   URL: ${row.original_url.substring(0, 50)}${row.original_url.length > 50 ? '...' : ''}`);
        console.log(`   IP: ${row.ip_address}`);
        console.log(`   Created: ${row.created_at}`);
        console.log(`   Clicks: ${row.clicks}`);
        console.log(`   Last Click: ${row.last_clicked || 'Never'}`);
        console.log(`   Active: ${row.is_active ? '✅' : '❌'}`);
        console.log('');
      });
    }
    
    // Continue with spam logs
    viewSpamLogs();
  });
}

function viewSpamLogs() {
  console.log('\n🚫 SPAM LOGS TABLE');
  console.log('-'.repeat(50));
  
  db.all(`SELECT 
    id,
    ip_address,
    action,
    details,
    created_at
  FROM spam_logs 
  ORDER BY created_at DESC 
  LIMIT 10`, (err, rows) => {
    if (err) {
      console.error('❌ Error querying spam_logs:', err.message);
    } else if (rows.length === 0) {
      console.log('📭 No spam logs found');
    } else {
      rows.forEach((row, index) => {
        console.log(`${index + 1}. ID: ${row.id}`);
        console.log(`   IP: ${row.ip_address}`);
        console.log(`   Action: ${row.action}`);
        console.log(`   Details: ${row.details}`);
        console.log(`   Time: ${row.created_at}`);
        console.log('');
      });
    }
    
    // Continue with blocked IPs
    viewBlockedIPs();
  });
}

function viewBlockedIPs() {
  console.log('\n🚷 BLOCKED IPS TABLE');
  console.log('-'.repeat(50));
  
  db.all(`SELECT 
    id,
    ip_address,
    reason,
    blocked_at,
    expires_at,
    is_permanent
  FROM blocked_ips 
  ORDER BY blocked_at DESC 
  LIMIT 10`, (err, rows) => {
    if (err) {
      console.error('❌ Error querying blocked_ips:', err.message);
    } else if (rows.length === 0) {
      console.log('📭 No blocked IPs found');
    } else {
      rows.forEach((row, index) => {
        console.log(`${index + 1}. ID: ${row.id}`);
        console.log(`   IP: ${row.ip_address}`);
        console.log(`   Reason: ${row.reason}`);
        console.log(`   Blocked: ${row.blocked_at}`);
        console.log(`   Expires: ${row.expires_at || 'Never'}`);
        console.log(`   Permanent: ${row.is_permanent ? '✅' : '❌'}`);
        console.log('');
      });
    }
    
    // Continue with rate limit logs
    viewRateLimitLogs();
  });
}

function viewRateLimitLogs() {
  console.log('\n⏱️  RATE LIMIT LOGS TABLE');
  console.log('-'.repeat(50));
  
  db.all(`SELECT 
    id,
    ip_address,
    endpoint,
    request_count,
    window_start,
    last_request
  FROM rate_limit_logs 
  ORDER BY last_request DESC 
  LIMIT 10`, (err, rows) => {
    if (err) {
      console.error('❌ Error querying rate_limit_logs:', err.message);
    } else if (rows.length === 0) {
      console.log('📭 No rate limit logs found');
    } else {
      rows.forEach((row, index) => {
        console.log(`${index + 1}. ID: ${row.id}`);
        console.log(`   IP: ${row.ip_address}`);
        console.log(`   Endpoint: ${row.endpoint}`);
        console.log(`   Requests: ${row.request_count}`);
        console.log(`   Window Start: ${row.window_start}`);
        console.log(`   Last Request: ${row.last_request}`);
        console.log('');
      });
    }
    
    // Finish
    finishView();
  });
}

function finishView() {
  console.log('='.repeat(50));
  console.log('✅ Database view completed!');
  console.log('');
  console.log('💡 Tips:');
  console.log('• Use "node reset-db.js" to clear all data');
  console.log('• Use "node test-anti-spam.js" to test features');
  console.log('• Visit http://localhost:3000/dashboard for live stats');
  
  db.close((err) => {
    if (err) {
      console.error('❌ Error closing database:', err.message);
    } else {
      console.log('\n🔒 Database connection closed.');
    }
    process.exit(0);
  });
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️  Process interrupted. Closing database...');
  db.close();
  process.exit(0);
}); 
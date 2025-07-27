const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'database', 'shortlinks.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  } else {
    quickView();
  }
});

function quickView() {
  console.log('🗄️ Quick Database View');
  console.log('='.repeat(40));
  
  // Get all counts
  const queries = [
    'SELECT COUNT(*) as count FROM shortlinks',
    'SELECT COUNT(*) as count FROM spam_logs',
    'SELECT COUNT(*) as count FROM blocked_ips',
    'SELECT COUNT(*) as count FROM rate_limit_logs'
  ];

  Promise.all(queries.map(query => {
    return new Promise((resolve, reject) => {
      db.get(query, (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
  }))
  .then(counts => {
    console.log(`📋 Shortlinks: ${counts[0]}`);
    console.log(`🚫 Spam logs: ${counts[1]}`);
    console.log(`🚷 Blocked IPs: ${counts[2]}`);
    console.log(`⏱️  Rate logs: ${counts[3]}`);
    console.log('='.repeat(40));
    console.log(`📈 Total: ${counts.reduce((sum, count) => sum + count, 0)} records`);
    
    // Show recent shortlinks if any
    if (counts[0] > 0) {
      console.log('\n🔗 Recent Shortlinks:');
      db.all('SELECT short_code, original_url, clicks, created_at FROM shortlinks ORDER BY created_at DESC LIMIT 5', (err, rows) => {
        if (!err && rows.length > 0) {
          rows.forEach((row, i) => {
            console.log(`${i+1}. ${row.short_code} → ${row.original_url.substring(0, 40)}... (${row.clicks} clicks)`);
          });
        }
        db.close();
      });
    } else {
      db.close();
    }
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    db.close();
  });
} 
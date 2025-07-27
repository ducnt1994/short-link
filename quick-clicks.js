const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'database', 'shortlinks.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  } else {
    quickClickView();
  }
});

function quickClickView() {
  console.log('👆 Quick Click Stats');
  console.log('='.repeat(40));
  
  // Get summary
  db.get('SELECT SUM(clicks) as totalClicks, COUNT(*) as totalLinks FROM shortlinks', (err, summary) => {
    if (err) {
      console.error('❌ Error:', err.message);
      return;
    }
    
    console.log(`📋 Total Links: ${summary.totalLinks || 0}`);
    console.log(`👆 Total Clicks: ${summary.totalClicks || 0}`);
    console.log(`📈 Avg Clicks: ${summary.totalLinks > 0 ? (summary.totalClicks / summary.totalLinks).toFixed(1) : 0}`);
    console.log('');
    
    // Get top 5 by clicks
    db.all('SELECT short_code, original_url, clicks, last_clicked FROM shortlinks ORDER BY clicks DESC, created_at DESC LIMIT 5', (err, rows) => {
      if (err) {
        console.error('❌ Error:', err.message);
        return;
      }
      
      if (rows.length > 0) {
        console.log('🏆 TOP 5 BY CLICKS:');
        rows.forEach((row, i) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '📊';
          const lastClick = row.last_clicked ? row.last_clicked.split(' ')[1] : 'Never';
          console.log(`${medal} ${row.short_code} - ${row.clicks} clicks (${lastClick})`);
        });
      } else {
        console.log('📭 No links found');
      }
      
      db.close();
    });
  });
} 
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'database', 'shortlinks.db');

console.log('🔗 Link Click Statistics');
console.log('='.repeat(60));

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  } else {
    viewClickStats();
  }
});

function viewClickStats() {
  // Get total clicks summary
  db.get('SELECT SUM(clicks) as totalClicks, COUNT(*) as totalLinks FROM shortlinks', (err, summary) => {
    if (err) {
      console.error('❌ Error getting summary:', err.message);
      return;
    }
    
    console.log('📊 SUMMARY');
    console.log('-'.repeat(40));
    console.log(`📋 Total Links: ${summary.totalLinks || 0}`);
    console.log(`👆 Total Clicks: ${summary.totalClicks || 0}`);
    console.log(`📈 Average Clicks: ${summary.totalLinks > 0 ? (summary.totalClicks / summary.totalLinks).toFixed(2) : 0}`);
    console.log('');
    
    // Get detailed click statistics
    viewDetailedClicks();
  });
}

function viewDetailedClicks() {
  console.log('🔗 DETAILED CLICK STATISTICS');
  console.log('='.repeat(60));
  
  // Get all links with click data, ordered by clicks descending
  db.all(`SELECT 
    id,
    short_code,
    original_url,
    clicks,
    last_clicked,
    created_at,
    is_active
  FROM shortlinks 
  ORDER BY clicks DESC, created_at DESC`, (err, rows) => {
    if (err) {
      console.error('❌ Error querying shortlinks:', err.message);
      return;
    }
    
    if (rows.length === 0) {
      console.log('📭 No links found in database');
      return;
    }
    
    // Display each link with click info
    rows.forEach((row, index) => {
      const status = row.is_active ? '✅' : '❌';
      const clickStatus = row.clicks > 0 ? '👆' : '🔄';
      const lastClick = row.last_clicked ? row.last_clicked : 'Never clicked';
      
      console.log(`${index + 1}. ${status} ${clickStatus} ${row.short_code}`);
      console.log(`   📍 URL: ${row.original_url.substring(0, 60)}${row.original_url.length > 60 ? '...' : ''}`);
      console.log(`   👆 Clicks: ${row.clicks}`);
      console.log(`   🕐 Last Click: ${lastClick}`);
      console.log(`   📅 Created: ${row.created_at}`);
      console.log(`   🆔 ID: ${row.id}`);
      console.log('');
    });
    
    // Show top performers
    showTopPerformers(rows);
  });
}

function showTopPerformers(rows) {
  console.log('🏆 TOP PERFORMERS');
  console.log('='.repeat(40));
  
  const topClicks = rows.filter(row => row.clicks > 0).slice(0, 3);
  
  if (topClicks.length === 0) {
    console.log('📭 No links have been clicked yet');
  } else {
    topClicks.forEach((row, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
      console.log(`${medal} ${row.short_code} - ${row.clicks} clicks`);
      console.log(`   ${row.original_url.substring(0, 50)}...`);
    });
  }
  
  console.log('');
  
  // Show recent activity
  showRecentActivity(rows);
}

function showRecentActivity(rows) {
  console.log('🕐 RECENT ACTIVITY');
  console.log('='.repeat(40));
  
  const recentClicks = rows.filter(row => row.last_clicked).sort((a, b) => 
    new Date(b.last_clicked) - new Date(a.last_clicked)
  ).slice(0, 5);
  
  if (recentClicks.length === 0) {
    console.log('📭 No recent click activity');
  } else {
    recentClicks.forEach((row, index) => {
      console.log(`${index + 1}. ${row.short_code} - ${row.clicks} clicks`);
      console.log(`   Last clicked: ${row.last_clicked}`);
    });
  }
  
  console.log('');
  
  // Show inactive links
  showInactiveLinks(rows);
}

function showInactiveLinks(rows) {
  console.log('😴 INACTIVE LINKS (0 clicks)');
  console.log('='.repeat(40));
  
  const inactiveLinks = rows.filter(row => row.clicks === 0);
  
  if (inactiveLinks.length === 0) {
    console.log('🎉 All links have been clicked at least once!');
  } else {
    console.log(`📭 ${inactiveLinks.length} links with 0 clicks:`);
    inactiveLinks.forEach((row, index) => {
      console.log(`${index + 1}. ${row.short_code} - Created: ${row.created_at}`);
    });
  }
  
  finishView();
}

function finishView() {
  console.log('='.repeat(60));
  console.log('✅ Click statistics completed!');
  console.log('');
  console.log('💡 Tips:');
  console.log('• Visit http://localhost:3000/dashboard for live stats');
  console.log('• Use "node quick-view-db.js" for quick overview');
  console.log('• Use "node reset-db.js" to clear all data');
  
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
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'database', 'shortlinks.db');

console.log('🗄️ Resetting database...');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Connected to SQLite database');
    resetDatabase();
  }
});

function resetDatabase() {
  console.log('\n🧹 Starting database reset...');

  // Delete all data from tables
  const tables = [
    'shortlinks',
    'spam_logs', 
    'blocked_ips',
    'rate_limit_logs'
  ];

  let completedTables = 0;

  tables.forEach(table => {
    db.run(`DELETE FROM ${table}`, (err) => {
      if (err) {
        console.error(`❌ Error clearing ${table}:`, err.message);
      } else {
        console.log(`✅ Cleared table: ${table}`);
      }
      
      completedTables++;
      
      if (completedTables === tables.length) {
        // Reset auto-increment counters
        resetAutoIncrement();
      }
    });
  });
}

function resetAutoIncrement() {
  console.log('\n🔄 Resetting auto-increment counters...');
  
  const tables = [
    'shortlinks',
    'spam_logs',
    'blocked_ips', 
    'rate_limit_logs'
  ];

  let completedResets = 0;

  tables.forEach(table => {
    db.run(`DELETE FROM sqlite_sequence WHERE name = '${table}'`, (err) => {
      if (err) {
        console.error(`❌ Error resetting sequence for ${table}:`, err.message);
      } else {
        console.log(`✅ Reset auto-increment for: ${table}`);
      }
      
      completedResets++;
      
      if (completedResets === tables.length) {
        verifyReset();
      }
    });
  });
}

function verifyReset() {
  console.log('\n🔍 Verifying reset...');
  
  const queries = [
    'SELECT COUNT(*) as count FROM shortlinks',
    'SELECT COUNT(*) as count FROM spam_logs',
    'SELECT COUNT(*) as count FROM blocked_ips',
    'SELECT COUNT(*) as count FROM rate_limit_logs'
  ];

  let completedQueries = 0;
  const results = {};

  queries.forEach((query, index) => {
    const tableName = ['shortlinks', 'spam_logs', 'blocked_ips', 'rate_limit_logs'][index];
    
    db.get(query, (err, row) => {
      if (err) {
        console.error(`❌ Error checking ${tableName}:`, err.message);
      } else {
        results[tableName] = row.count;
        console.log(`📊 ${tableName}: ${row.count} records`);
      }
      
      completedQueries++;
      
      if (completedQueries === queries.length) {
        finishReset(results);
      }
    });
  });
}

function finishReset(results) {
  console.log('\n🎉 Database reset completed!');
  console.log('\n📊 Final record counts:');
  console.log('├── shortlinks:', results.shortlinks);
  console.log('├── spam_logs:', results.spam_logs);
  console.log('├── blocked_ips:', results.blocked_ips);
  console.log('└── rate_limit_logs:', results.rate_limit_logs);
  
  const totalRecords = Object.values(results).reduce((sum, count) => sum + count, 0);
  
  if (totalRecords === 0) {
    console.log('\n✅ All tables are now empty!');
    console.log('🚀 Database has been successfully reset to initial state.');
  } else {
    console.log('\n⚠️  Some records may still exist. Manual cleanup may be required.');
  }
  
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
const connectDB = require('./config');
const ShortLink = require('./models/ShortLink');
const SpamLog = require('./models/SpamLog');
const BlockedIP = require('./models/BlockedIP');
const RateLimitLog = require('./models/RateLimitLog');

// Initialize database connection
const initDatabase = async () => {
  try {
    await connectDB();
    console.log('✅ Database initialization completed successfully');
  } catch (error) {
    console.error('❌ Error during database initialization:', error.message);
    process.exit(1);
  }
};

// Export models and initialization function
module.exports = {
  initDatabase,
  ShortLink,
  SpamLog,
  BlockedIP,
  RateLimitLog
}; 
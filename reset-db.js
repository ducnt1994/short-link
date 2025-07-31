const mongoose = require('mongoose');
require('dotenv').config();

// Import MongoDB models
const ShortLink = require('./database/models/ShortLink');
const SpamLog = require('./database/models/SpamLog');
const BlockedIP = require('./database/models/BlockedIP');
const RateLimitLog = require('./database/models/RateLimitLog');

console.log('🗑️ MongoDB Database Reset Tool');
console.log('='.repeat(50));

async function connectMongoDB() {
  try {
    const dbURI = process.env.DB_URI || 'mongodb://localhost:27017/shortlink';
    await mongoose.connect(dbURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB database\n');
    await resetDatabase();
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
}

async function resetDatabase() {
  try {
    console.log('🔄 Starting database reset...');
    
    // Get current counts
    const [shortlinksCount, spamLogsCount, blockedIPsCount, rateLimitLogsCount] = await Promise.all([
      ShortLink.countDocuments(),
      SpamLog.countDocuments(),
      BlockedIP.countDocuments(),
      RateLimitLog.countDocuments()
    ]);

    console.log('📊 Current database state:');
    console.log(`   📋 shortlinks:     ${shortlinksCount} records`);
    console.log(`   🚫 spamLogs:       ${spamLogsCount} records`);
    console.log(`   🚷 blockedIPs:     ${blockedIPsCount} records`);
    console.log(`   ⏱️  rateLimitLogs:  ${rateLimitLogsCount} records`);
    console.log('');

    // Confirm reset
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      rl.question('⚠️  Are you sure you want to delete ALL data? (yes/no): ', resolve);
    });

    rl.close();

    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ Reset cancelled');
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log('🗑️ Proceeding with database reset...');

    // Delete all documents from all collections
    const [shortlinksResult, spamLogsResult, blockedIPsResult, rateLimitLogsResult] = await Promise.all([
      ShortLink.deleteMany({}),
      SpamLog.deleteMany({}),
      BlockedIP.deleteMany({}),
      RateLimitLog.deleteMany({})
    ]);

    console.log('✅ Reset completed successfully!');
    console.log('📊 Deleted records:');
    console.log(`   📋 shortlinks:     ${shortlinksResult.deletedCount} records`);
    console.log(`   🚫 spamLogs:       ${spamLogsResult.deletedCount} records`);
    console.log(`   🚷 blockedIPs:     ${blockedIPsResult.deletedCount} records`);
    console.log(`   ⏱️  rateLimitLogs:  ${rateLimitLogsResult.deletedCount} records`);
    console.log('');

    // Verify reset
    const [newShortlinksCount, newSpamLogsCount, newBlockedIPsCount, newRateLimitLogsCount] = await Promise.all([
      ShortLink.countDocuments(),
      SpamLog.countDocuments(),
      BlockedIP.countDocuments(),
      RateLimitLog.countDocuments()
    ]);

    console.log('📊 New database state:');
    console.log(`   📋 shortlinks:     ${newShortlinksCount} records`);
    console.log(`   🚫 spamLogs:       ${newSpamLogsCount} records`);
    console.log(`   🚷 blockedIPs:     ${newBlockedIPsCount} records`);
    console.log(`   ⏱️  rateLimitLogs:  ${newRateLimitLogsCount} records`);
    console.log('');

    console.log('🎉 Database reset completed successfully!');
    console.log('💡 You can now start fresh with your URL shortener application.');

    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');

  } catch (error) {
    console.error('❌ Error during database reset:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n⚠️  Process interrupted. Closing MongoDB connection...');
  try {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error);
  }
  process.exit(0);
});

// Start the reset process
connectMongoDB(); 
const mongoose = require('mongoose');
require('dotenv').config();

// Import MongoDB models
const ShortLink = require('./database/models/ShortLink');
const SpamLog = require('./database/models/SpamLog');
const BlockedIP = require('./database/models/BlockedIP');
const RateLimitLog = require('./database/models/RateLimitLog');

console.log('🗄️ MongoDB Database Viewer');
console.log('='.repeat(50));

async function connectMongoDB() {
  try {
    const dbURI = process.env.DB_URI || 'mongodb://localhost:27017/shortlink';
    await mongoose.connect(dbURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB database\n');
    await viewDatabase();
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
}

async function viewDatabase() {
  try {
    // Get collection counts
    const [shortlinksCount, spamLogsCount, blockedIPsCount, rateLimitLogsCount] = await Promise.all([
      ShortLink.countDocuments(),
      SpamLog.countDocuments(),
      BlockedIP.countDocuments(),
      RateLimitLog.countDocuments()
    ]);

    const counts = {
      shortlinks: shortlinksCount,
      spamLogs: spamLogsCount,
      blockedIPs: blockedIPsCount,
      rateLimitLogs: rateLimitLogsCount
    };

    displaySummary(counts);
    await displayTableDetails();
  } catch (error) {
    console.error('❌ Error viewing database:', error);
  }
}

function displaySummary(counts) {
  console.log('📊 DATABASE SUMMARY');
  console.log('='.repeat(50));
  console.log(`📋 shortlinks:     ${counts.shortlinks} records`);
  console.log(`🚫 spamLogs:       ${counts.spamLogs} records`);
  console.log(`🚷 blockedIPs:     ${counts.blockedIPs} records`);
  console.log(`⏱️  rateLimitLogs:  ${counts.rateLimitLogs} records`);
  console.log('='.repeat(50));
  console.log(`📈 Total records:  ${Object.values(counts).reduce((sum, count) => sum + count, 0)}`);
  console.log('');
}

async function displayTableDetails() {
  console.log('📋 DETAILED VIEW');
  console.log('='.repeat(50));
  
  // View shortlinks collection
  await viewShortlinks();
}

async function viewShortlinks() {
  console.log('\n🔗 SHORTLINKS COLLECTION');
  console.log('-'.repeat(50));
  
  try {
    const shortlinks = await ShortLink.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('shortCode originalUrl ipAddress createdAt clicks lastClicked isActive');

    if (shortlinks.length === 0) {
      console.log('📭 No shortlinks found');
    } else {
      shortlinks.forEach((link, index) => {
        console.log(`${index + 1}. ID: ${link._id}`);
        console.log(`   Code: ${link.shortCode}`);
        console.log(`   URL: ${link.originalUrl.substring(0, 50)}${link.originalUrl.length > 50 ? '...' : ''}`);
        console.log(`   IP: ${link.ipAddress}`);
        console.log(`   Created: ${link.createdAt}`);
        console.log(`   Clicks: ${link.clicks}`);
        console.log(`   Last Click: ${link.lastClicked || 'Never'}`);
        console.log(`   Active: ${link.isActive ? '✅' : '❌'}`);
        console.log('');
      });
    }

    await viewSpamLogs();
  } catch (error) {
    console.error('❌ Error querying shortlinks:', error);
  }
}

async function viewSpamLogs() {
  console.log('\n🚫 SPAM LOGS COLLECTION');
  console.log('-'.repeat(50));
  
  try {
    const spamLogs = await SpamLog.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('ipAddress action details createdAt');

    if (spamLogs.length === 0) {
      console.log('📭 No spam logs found');
    } else {
      spamLogs.forEach((log, index) => {
        console.log(`${index + 1}. IP: ${log.ipAddress}`);
        console.log(`   Action: ${log.action}`);
        console.log(`   Details: ${log.details}`);
        console.log(`   Created: ${log.createdAt}`);
        console.log('');
      });
    }

    await viewBlockedIPs();
  } catch (error) {
    console.error('❌ Error querying spam logs:', error);
  }
}

async function viewBlockedIPs() {
  console.log('\n🚷 BLOCKED IPS COLLECTION');
  console.log('-'.repeat(50));
  
  try {
    const blockedIPs = await BlockedIP.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('ipAddress reason expiresAt isPermanent createdAt');

    if (blockedIPs.length === 0) {
      console.log('📭 No blocked IPs found');
    } else {
      blockedIPs.forEach((ip, index) => {
        console.log(`${index + 1}. IP: ${ip.ipAddress}`);
        console.log(`   Reason: ${ip.reason}`);
        console.log(`   Expires: ${ip.expiresAt || 'Never'}`);
        console.log(`   Permanent: ${ip.isPermanent ? '✅' : '❌'}`);
        console.log(`   Blocked: ${ip.createdAt}`);
        console.log('');
      });
    }

    await viewRateLimitLogs();
  } catch (error) {
    console.error('❌ Error querying blocked IPs:', error);
  }
}

async function viewRateLimitLogs() {
  console.log('\n⏱️ RATE LIMIT LOGS COLLECTION');
  console.log('-'.repeat(50));
  
  try {
    const rateLimitLogs = await RateLimitLog.find()
      .sort({ lastRequest: -1 })
      .limit(10)
      .select('ipAddress endpoint requestCount lastRequest');

    if (rateLimitLogs.length === 0) {
      console.log('📭 No rate limit logs found');
    } else {
      rateLimitLogs.forEach((log, index) => {
        console.log(`${index + 1}. IP: ${log.ipAddress}`);
        console.log(`   Endpoint: ${log.endpoint}`);
        console.log(`   Requests: ${log.requestCount}`);
        console.log(`   Last Request: ${log.lastRequest}`);
        console.log('');
      });
    }

    await finishView();
  } catch (error) {
    console.error('❌ Error querying rate limit logs:', error);
  }
}

async function finishView() {
  console.log('='.repeat(50));
  console.log('✅ Database view completed');
  
  try {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error);
  }
  
  process.exit(0);
}

// Start the viewer
connectMongoDB(); 
const express = require('express');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const { initDatabase, ShortLink } = require('./database/init');

// Import routes and middleware
const shortLinkRoutes = require('./routes/shortLink');
const antiSpamMiddleware = require('./middleware/antiSpam');

// Security middleware with custom CSP for dashboard
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  }
}));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Speed limiting
const speedLimiter = slowDown({
  windowMs: parseInt(process.env.SLOW_DOWN_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  delayAfter: parseInt(process.env.SLOW_DOWN_DELAY_AFTER) || 50, // allow 50 requests per 15 minutes, then...
  delayMs: parseInt(process.env.SLOW_DOWN_DELAY_MS) || 500 // begin adding 500ms of delay per request above 50
});

// Apply rate limiting to all routes
// app.use(limiter);
app.use(speedLimiter);

// Anti-spam middleware
app.use(antiSpamMiddleware);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Static info page
app.get('/info', (req, res) => {
  res.sendFile(path.join(__dirname, 'static-info.html'));
});

// Stats dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'stats-dashboard.html'));
});

// Alternative route for stats dashboard
app.get('/stats-dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'stats-dashboard.html'));
});

// Routes
app.use('/api/shortlink', shortLinkRoutes);

// Redirect route (must be after API routes)
app.get('/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];

    // Get short link details
    const shortLink = await ShortLink.findOne({ 
      shortCode, 
      isActive: true 
    });

    if (!shortLink) {
      return res.status(404).json({ error: 'Short link not found' });
    }

    // Update click count
    shortLink.clicks += 1;
    shortLink.lastClicked = new Date();
    await shortLink.save();

    // Log the redirect
    console.log(`Redirect: Link ID ${shortLink._id}, IP: ${clientIP}, User-Agent: ${req.headers['user-agent']}`);

    // Redirect to original URL
    res.redirect(shortLink.originalUrl);
  } catch (error) {
    console.error('Error in redirect route:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const startServer = async () => {
  try {
    // Initialize database
    await initDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔒 Anti-spam protection: Enabled`);
      console.log(`🗄️ Database: MongoDB`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app; 
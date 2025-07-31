const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const connectDB = require('./config/database');
const shortLinkRoutes = require('./routes/shortLinkRoutes');
const { redirectToOriginal } = require('./controllers/shortLinkController');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to database
connectDB();

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  console.log('📁 Creating public directory...');
  fs.mkdirSync(publicDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Dashboard route
app.get('/dashboard', (req, res) => {
  const dashboardPath = path.join(__dirname, 'public', 'dashboard.html');
  
  // Check if file exists
  if (!fs.existsSync(dashboardPath)) {
    console.error(`Dashboard file not found at: ${dashboardPath}`);
    console.error(`Current directory: ${__dirname}`);
    
    try {
      // List contents of public directory if it exists
      if (fs.existsSync(path.join(__dirname, 'public'))) {
        console.error(`Public directory contents:`, fs.readdirSync(path.join(__dirname, 'public')));
      } else {
        console.error('Public directory does not exist');
      }
    } catch (error) {
      console.error('Error reading public directory:', error.message);
    }
    
    return res.status(404).json({ 
      error: 'Dashboard not found',
      message: `File not found at: ${dashboardPath}`
    });
  }
  
  res.sendFile(dashboardPath, (err) => {
    if (err) {
      console.error('Error sending dashboard file:', err);
      res.status(500).json({ 
        error: 'Failed to serve dashboard',
        message: err.message 
      });
    }
  });
});

// API routes
app.use('/api/shortlink', shortLinkRoutes);

// Redirect route at root level (must be after API routes)
app.get('/:shortCode', redirectToOriginal);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error details:', err);
  console.error('Error stack:', err.stack);
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
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📈 Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`📁 Current directory: ${__dirname}`);
  console.log(`📁 Public directory: ${path.join(__dirname, 'public')}`);
  console.log(`📁 Public directory exists: ${fs.existsSync(path.join(__dirname, 'public'))}`);
});

module.exports = app; 
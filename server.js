require('dotenv').config();
const express = require('express');
const { scrapeWebsite } = require('./src/controllers/scrapeController');
const { logMemoryUsage, scheduleMemoryCleanup } = require('./src/utils/memoryUtils');

const app = express();
const PORT = process.env.PORT || 3000;
// Set server timeout from environment variable or default to 2 minutes
const SERVER_TIMEOUT = parseInt(process.env.SERVER_TIMEOUT || 120000);

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Set timeout for all requests
app.use((req, res, next) => {
  res.setTimeout(SERVER_TIMEOUT, () => {
    console.error('Request timeout occurred');
    res.status(503).json({ 
      error: 'Service Unavailable', 
      details: 'Request timed out. Please try again later or check the URL.' 
    });
  });
  next();
});

// Log memory usage on each request in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    logMemoryUsage();
    next();
  });
}

// Root endpoint for health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Style Finder API is running',
    memory: process.memoryUsage()
  });
});

// Asynchronous error handling wrapper
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Scrape endpoint
app.get('/scrape', asyncHandler(scrapeWebsite));

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Handle specific errors
  if (err.message && err.message.includes('Timed out')) {
    return res.status(504).json({ 
      error: 'Gateway Timeout', 
      details: 'The operation timed out. The website might be too complex or slow to respond.'
    });
  }
  
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Set server-level timeout
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} with timeout set to ${SERVER_TIMEOUT}ms`);
  logMemoryUsage();
});

// Configure server timeouts
server.timeout = SERVER_TIMEOUT;

// Schedule memory cleanup every 30 minutes
const cleanupInterval = scheduleMemoryCleanup();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  clearInterval(cleanupInterval);
  server.close(() => {
    console.log('HTTP server closed');
  });
});
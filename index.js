const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const downloadController = require('./src/controllers/downloadController');
const { validateDownloadRequest } = require('./src/middleware/validation');
const downloadRoutes = require('./src/routes/downloadRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Convert string to number for rate limit
const rateLimitWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000;
const rateLimitMaxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

// Rate limiting
const limiter = rateLimit({
  windowMs: rateLimitWindowMs, // 15 minutes
  max: rateLimitMaxRequests,
  message: {
    status: 429,
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting to all routes
app.use(limiter);

// Routes 
app.use('/api/v1/download', downloadRoutes);
   
   // Rute untuk Root (Harus ditambahkan/diperbaiki)
app.post('/', validateDownloadRequest, downloadController.createDownload); // Pastikan baris ini ada
app.get('/', downloadController.getDownloadInfo); // Opsional, untuk GET request

// Health check - pindah ke /health-check agar tidak tabrakan
app.get('/health-check', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler - FIXED: Jangan gunakan '*' sebagai path
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    status: 'error',
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const walletRoutes = require('./routes/wallet');
const gameRoutes = require('./routes/games');
const campaignRoutes = require('./routes/campaigns');
const adminCampaignRoutes = require('./routes/adminCampaigns');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { limiter, speedLimiter } = require('./config/middleware');

// Initialize Express app
const app = express();

// Database connection
require('./config/db');

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', {
  skip: (req, res) => res.statusCode < 400
}));

// Rate limiting
app.use(limiter);
app.use(speedLimiter);

// Routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/user', userRoutes);
app.use('/wallet', walletRoutes);
app.use('/games', gameRoutes);
app.use('/campaigns', campaignRoutes);
app.use('/admin/campaigns', adminCampaignRoutes);

// Health check endpoint
app.get('/', (req, res) => res.status(200).json({ 
  status: 'ok',
  message: 'RFX Mining API',
  timestamp: new Date().toISOString()
}));

// Error handling middleware
app.use(errorHandler);

module.exports = app;
// server.js or app.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const userRoutes = require('./routes/user');
const authRoutes = require('./routes/auth');
const campaignRoutes = require('./routes/campaigns');
const walletRoutes = require('./routes/wallet');
const gameRoutes = require('./routes/games'); // Add this line
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/user', userRoutes);
app.use('/auth', authRoutes);
app.use('/campaigns', campaignRoutes);
app.use('/wallet', walletRoutes);
app.use('/games', gameRoutes); // Add this line

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
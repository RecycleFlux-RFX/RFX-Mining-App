const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const userRoutes = require('./routes/user');
const authRoutes = require('./routes/auth');
const campaignRoutes = require('./routes/campaigns');
const walletRoutes = require('./routes/wallet');
const gameRoutes = require('./routes/games');
const path = require('path');
const User = require('./models/User');
const Referral = require('./models/Referral'); // Add this
const adminCampaignRoutes = require('./routes/admin/campaign');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

async function initializeAdmin() {
    try {
        await User.initializeAdmin();
        console.log('Admin user check completed');
    } catch (error) {
        console.error('Admin initialization failed:', error);
        throw error;
    }
}

async function startServer() {
    try {
        // Connect to MongoDB
        await connectDB();

        // Ensure models are loaded
        console.log('Referral model loaded:', Referral);

        // Initialize admin after connection
        await initializeAdmin();

        // Middleware
        app.use(cors());
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        // Serve uploaded files
        app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));

        // Routes
        app.use('/admin/campaigns', require('./routes/admin/campaign'));
        app.use('/admin', adminCampaignRoutes);
        app.use('/user', userRoutes);
        app.use('/auth', authRoutes);
        app.use('/campaigns', campaignRoutes);
        app.use('/wallet', walletRoutes);
        app.use('/games', gameRoutes);

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
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
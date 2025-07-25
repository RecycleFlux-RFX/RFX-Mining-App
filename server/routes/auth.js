// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Wallet = require('../models/Wallet');

// Generate a random passkey
function generatePasskey() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// Signup Route
router.post('/signup', async (req, res) => {
    const { walletAddress, fullName, password } = req.body;
    try {
        // Validate input
        if (!walletAddress || !fullName || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check if user already exists
        let user = await User.findOne({ walletAddress });
        if (user) {
            return res.status(400).json({ message: 'Wallet address already registered' });
        }

        // Generate username from fullName (simple approach: lowercase, no spaces)
        const username = fullName.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 1000);
        const email = `${username}@rfxverse.com`; // Placeholder email, adjust as needed

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        user = new User({
            username,
            email,
            password: hashedPassword,
            fullName,
            walletAddress,
            passkey: generatePasskey(),
        });
        await user.save();

        // Create wallet
        const wallet = new Wallet({ userId: user._id });
        await wallet.save();

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Respond with token, user, and passkey
        res.status(201).json({
            token,
            user: {
                username: user.username,
                fullName: user.fullName,
                walletAddress: user.walletAddress,
            },
            passkey: user.passkey,
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login Route
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Validate input
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        // Find user
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Update last login
        await User.updateOne({ _id: user._id }, { lastLogin: new Date() });

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Respond with token and user
        res.json({
            token,
            user: {
                username: user.username,
                fullName: user.fullName,
                walletAddress: user.walletAddress,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Google Sign-In Route (Placeholder)
router.get('/google', async (req, res) => {
    try {
        // TODO: Implement Google OAuth flow
        // This would typically redirect to Google's OAuth consent screen
        res.status(501).json({ message: 'Google Sign-In not implemented yet' });
        // Example redirect: res.redirect('https://accounts.google.com/o/oauth2/v2/auth?...');
    } catch (error) {
        console.error('Google Sign-In error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
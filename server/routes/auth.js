const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const dotenv = require('dotenv');
const uuidv4 = require('uuid').v4;
dotenv.config();
// Generate a random passkey
function generatePasskey() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// Signup Route
router.post('/signup', async (req, res) => {
    const { walletAddress, fullName, password } = req.body;
    try {
        if (!walletAddress || !fullName || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        let user = await User.findOne({ walletAddress });
        if (user) {
            return res.status(400).json({ message: 'Wallet address already registered' });
        }

        const username = fullName.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 1000);
        const email = `${username}@rfxverse.com`;

        const hashedPassword = await bcrypt.hash(password, 10);
        const referralCode = uuidv4().substring(0, 8).toUpperCase(); // Generate referral code

        user = new User({
            username,
            email,
            password: hashedPassword,
            fullName,
            walletAddress,
            passkey: generatePasskey(),
            referralCode, // Add referral code
        });
        await user.save();

        const wallet = new Wallet({ userId: user._id });
        await wallet.save();

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

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

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ $or: [{ username }, { email: username }] });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user._id, isAdmin: user.isAdmin },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/referral-signup', async (req, res) => {
    const { walletAddress, fullName, password, referralCode } = req.body;
    try {
        if (!walletAddress || !fullName || !password || !referralCode) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        let referrer = await User.findOne({ referralCode });
        if (!referrer) {
            return res.status(400).json({ message: 'Invalid referral code' });
        }

        let user = await User.findOne({ walletAddress });
        if (user) {
            return res.status(400).json({ message: 'Wallet address already registered' });
        }

        const username = fullName.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 1000);
        const email = `${username}@rfxverse.com`;

        const hashedPassword = await bcrypt.hash(password, 10);
        const newReferralCode = uuidv4().substring(0, 8).toUpperCase();

        user = new User({
            username,
            email,
            password: hashedPassword,
            fullName,
            walletAddress,
            passkey: generatePasskey(),
            referralCode: newReferralCode,
        });
        await user.save();

        const wallet = new Wallet({ userId: user._id });
        await wallet.save();

        const referral = new Referral({
            referrerId: referrer._id,
            refereeId: user._id,
            referralCode,
            earnedCommission: 0,
        });
        await referral.save();

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

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
        console.error('Referral signup error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin Login Route
router.post('/admin-login', async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        if (email !== process.env.ADMIN_EMAIL) {
            return res.status(403).json({ message: 'Admin access restricted' });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign({ userId: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.json({
            token,
            user: { id: user._id, email: user.email, isAdmin: true },
            message: 'Admin login successful'
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin Check Route
// Admin check route
router.post('/admin/check', async (req, res) => {
    const { email } = req.body;

    try {
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.isAdmin) {
            return res.status(403).json({ message: 'Not an admin user' });
        }

        res.json({ message: 'Admin user found', email });
    } catch (error) {
        console.error('Admin check error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin Verify Route
// Admin verify route
router.post('/admin/verify', async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        if (!user.isAdmin) {
            return res.status(403).json({ message: 'Not an admin user' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user._id, isAdmin: user.isAdmin },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                isAdmin: user.isAdmin,
            },
        });
    } catch (error) {
        console.error('Admin verify error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Google Sign-In Route (Placeholder)
router.get('/google', async (req, res) => {
    try {
        res.status(501).json({ message: 'Google Sign-In not implemented yet' });
    } catch (error) {
        console.error('Google Sign-In error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
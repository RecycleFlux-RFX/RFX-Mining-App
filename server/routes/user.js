// routes/user.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const NetworkStats = require('../models/NetworkStats');
const Referral = require('../models/Referral');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');

// Get User Data
router.get('/user', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const wallet = await Wallet.findOne({ userId: req.user.userId });
        res.json({
            earnings: wallet ? wallet.balance : 0,
            co2Saved: user.co2Saved || '0.00',
            walletAddress: user.walletAddress,
            fullName: user.fullName,
        });
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
});

// Get Network Stats
router.get('/network-stats', auth, async (req, res) => {
    try {
        const stats = await NetworkStats.findOne().sort({ lastUpdated: -1 });
        res.json({
            totalRecycled: stats ? stats.totalRecycled.toFixed(2) : '0.00',
            activeUsers: stats ? stats.activeUsers : 0,
        });
    } catch (error) {
        console.error('Error fetching network stats:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
});

// Get Referral Link
router.get('/referral-link', auth, async (req, res) => {
    try {
        if (!req.user.userId) {
            return res.status(401).json({ message: 'Invalid user ID' });
        }

        const referral = await Referral.findOne({ referrerId: req.user.userId });
        let referralCode = referral ? referral.referralCode : generateReferralCode();

        if (!referral) {
            const newReferral = new Referral({
                referrerId: req.user.userId,
                referralCode,
                refereeId: req.user.userId, // Placeholder, update when referee joins
            });
            await newReferral.save();
        }

        res.json({ referralLink: `https://yourapp.com/referral/${referralCode}` });
    } catch (error) {
        console.error('Error fetching referral link:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
});

// Get Wallet Rank
router.get('/wallet/rank', auth, async (req, res) => {
    try {
        const users = await User.find().sort({ xp: -1 }).select('xp');
        const currentUser = await User.findById(req.user.userId).select('xp');
        if (!currentUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const rank = users.findIndex(u => u.xp === currentUser.xp) + 1;
        res.json({ rank: rank || 'N/A' });
    } catch (error) {
        console.error('Error fetching user rank:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
});

router.post('/claim-reward', auth, async (req, res) => {
    try {
        // 1. Find user's wallet
        const wallet = await Wallet.findOne({ userId: req.user.userId });
        if (!wallet) {
            return res.status(404).json({ message: 'Wallet not found' });
        }

        // 2. Check if reward was already claimed today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const existingClaim = await Transaction.findOne({
            userId: req.user.userId,
            type: 'earn',
            category: 'Daily Reward',
            timestamp: { $gte: todayStart, $lte: todayEnd }
        });

        if (existingClaim) {
            return res.status(400).json({
                message: 'Daily reward already claimed today',
                nextClaim: new Date(todayEnd.getTime() + 1) // Next available claim time
            });
        }

        // 3. Calculate reward amount (could be dynamic based on user level, etc.)
        const rewardAmount = calculateDailyReward(req.user.userId); // Implement this function

        // 4. Update wallet balance
        wallet.balance += rewardAmount;
        await wallet.save();

        // 5. Create transaction record
        const transaction = await Transaction.create({
            userId: req.user.userId,
            walletId: wallet._id,
            type: 'earn', // Valid enum value
            category: 'Daily Reward', // Specific category
            amount: rewardAmount,
            activity: 'Daily Reward Claim',
            description: 'Claimed daily reward',
            status: 'completed' // Valid enum value
        });

        // 6. Return success response
        res.json({
            success: true,
            amount: rewardAmount,
            newBalance: wallet.balance,
            transactionId: transaction._id
        });

    } catch (error) {
        console.error('Daily reward claim error:', error);
        res.status(500).json({
            message: 'Failed to claim daily reward',
            error: error.message
        });
    }
});

// Helper function to calculate dynamic rewards
function calculateDailyReward(userId) {
    // Implement your reward logic here
    // Example: base reward + streak bonus
    return 0.0001; // Default base reward
}

// Helper function to generate referral code
function generateReferralCode() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

module.exports = router;
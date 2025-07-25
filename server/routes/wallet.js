// routes/wallet.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

// GET /wallet/user - Get user wallet data
router.get('/user', auth, async (req, res) => {
    try {
        const userId = req.user.userId;

        const user = await User.findById(userId).select('-password -kycDocuments -passkey -rememberToken');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get or create wallet
        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({ userId });
            await wallet.save();
        }

        res.json({
            earnings: wallet.balance,
            walletAddress: user.walletAddress,
            ...user.toObject()
        });
    } catch (error) {
        console.error('Error fetching user wallet data:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
});

// GET /wallet/transactions - Get transactions with filters
router.get('/transactions', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { period, search } = req.query;

        // Date filters based on period
        let dateFilter = {};
        const now = new Date();

        switch (period) {
            case 'today':
                dateFilter.timestamp = { $gte: new Date(now.setHours(0, 0, 0, 0)) };
                break;
            case 'week':
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                dateFilter.timestamp = { $gte: weekAgo };
                break;
            case 'month':
                const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                dateFilter.timestamp = { $gte: monthAgo };
                break;
            // 'all' case - no date filter
        }

        // Search filter
        let searchFilter = {};
        if (search) {
            searchFilter = {
                $or: [
                    { activity: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { category: { $regex: search, $options: 'i' } }
                ]
            };
        }

        const transactions = await Transaction.find({
            userId,
            ...dateFilter,
            ...searchFilter
        }).sort({ timestamp: -1 });

        res.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
});

// GET /wallet/rank - Get user rank based on wallet balance
router.get('/rank', auth, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Get all wallets sorted by balance descending
        const wallets = await Wallet.find().sort({ balance: -1 });

        // Find the user's rank
        const userIndex = wallets.findIndex(w => w.userId.toString() === userId.toString());
        const rank = userIndex >= 0 ? userIndex + 1 : null;

        res.json({ rank });
    } catch (error) {
        console.error('Error calculating rank:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
});

// POST /wallet/send-tokens - Send tokens to another user
router.post('/send-tokens', auth, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { recipientAddress, amount } = req.body;
        const senderId = req.user.userId;

        // Validate input
        if (!recipientAddress || !amount || amount <= 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Invalid recipient address or amount' });
        }

        // Get sender wallet
        const senderWallet = await Wallet.findOne({ userId: senderId }).session(session);
        if (!senderWallet) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Sender wallet not found' });
        }

        // Check balance
        if (senderWallet.balance < amount) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // Get recipient user
        const recipient = await User.findOne({ walletAddress: recipientAddress }).session(session);
        if (!recipient) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Recipient not found' });
        }

        // Prevent sending to self
        if (recipient._id.toString() === senderId.toString()) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Cannot send tokens to yourself' });
        }

        // Get or create recipient wallet
        let recipientWallet = await Wallet.findOne({ userId: recipient._id }).session(session);
        if (!recipientWallet) {
            recipientWallet = new Wallet({ userId: recipient._id });
            await recipientWallet.save({ session });
        }

        // Update balances
        senderWallet.balance -= amount;
        recipientWallet.balance += amount;

        await senderWallet.save({ session });
        await recipientWallet.save({ session });

        // Create transactions
        const senderTx = new Transaction({
            userId: senderId,
            walletId: senderWallet._id,
            type: 'send',
            category: 'Transfer',
            amount,
            activity: 'Token Transfer',
            description: `Sent to ${recipient.username}`,
            status: 'completed'
        });

        const recipientTx = new Transaction({
            userId: recipient._id,
            walletId: recipientWallet._id,
            type: 'receive',
            category: 'Transfer',
            amount,
            activity: 'Token Transfer',
            description: `Received from ${req.user.username}`,
            status: 'completed'
        });

        await senderTx.save({ session });
        await recipientTx.save({ session });

        // Commit transaction
        await session.commitTransaction();
        session.endSession();

        res.json({
            balance: senderWallet.balance,
            message: 'Tokens sent successfully'
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error sending tokens:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
});

module.exports = router;
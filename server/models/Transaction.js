const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    walletId: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },
    type: {
        type: String,
        enum: ['earn', 'spend', 'receive', 'send'],
        required: true
    },
    category: {
        type: String,
        enum: ['Game', 'Campaign', 'Real World', 'Daily Reward', 'Referral', 'Competition', 'Transfer'],
        required: true
    },
    amount: { type: Number, required: true },
    activity: { type: String, required: true },
    description: { type: String },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'completed'
    },
    metadata: { type: Object },
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', TransactionSchema);
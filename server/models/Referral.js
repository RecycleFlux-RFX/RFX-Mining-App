const mongoose = require('mongoose');

const ReferralSchema = new mongoose.Schema({
    referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    refereeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    referralCode: { type: String, required: true },
    earnedCommission: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'pending'
    },
    completedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Referral', ReferralSchema);
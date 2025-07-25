const mongoose = require('mongoose');

const UserChallengeProgressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    challengeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DailyChallenge',
        required: true
    },
    progress: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    rewardClaimed: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('UserChallengeProgress', UserChallengeProgressSchema);
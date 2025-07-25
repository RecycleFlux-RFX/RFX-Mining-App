const mongoose = require('mongoose');

const UserGameProgressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
    lastPlayed: { type: Date },
    plays: { type: Number, default: 0 },
    highScore: { type: Number, default: 0 },
    achievements: [{
        name: { type: String },
        earnedAt: { type: Date }
    }],
    earnedTokens: { type: Number, default: 0 },
    earnedXp: { type: Number, default: 0 },
    lastRewardClaimed: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('UserGameProgress', UserGameProgressSchema);
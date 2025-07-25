const mongoose = require('mongoose');

const DailyChallengeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    reward: { type: Number, required: true },
    xpReward: { type: Number, required: true },
    tasks: [{
        type: { type: String, required: true },
        target: { type: Number, required: true },
        unit: { type: String }
    }],
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true },
    participants: { type: Number, default: 0 },
    completions: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('DailyChallenge', DailyChallengeSchema);
const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
    title: { type: String, required: true },
    subtitle: { type: String, required: true },
    description: { type: String, required: true },
    category: {
        type: String,
        enum: ['Puzzle', 'Action', 'Simulation', 'Strategy'],
        required: true
    },
    reward: { type: Number, required: true },
    xpReward: { type: Number, required: true },
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard'],
        required: true
    },
    avgTime: { type: String, required: true },
    players: { type: Number, default: 0 },
    plays: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    achievements: { type: Number, default: 0 },
    gameMode: [{ type: String }],
    powerUps: [{ type: String }],
    featured: { type: Boolean, default: false },
    new: { type: Boolean, default: false },
    trending: { type: Boolean, default: false },
    locked: { type: Boolean, default: false },
    screenshots: { type: Number, default: 0 },
    gameUrl: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    wasteItems: [{
        name: { type: String, required: true },
        correct: { type: String, required: true },
        emoji: { type: String }
    }],
}, { timestamps: true });

module.exports = mongoose.model('Game', GameSchema);
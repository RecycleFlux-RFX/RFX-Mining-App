const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
    title: { type: String, required: true, unique: true, trim: true },
    subtitle: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    description_long: { type: String, required: true },
    category: { type: String, required: true, enum: ['Puzzle', 'Action', 'Simulation', 'Strategy'] },
    difficulty: { type: String, required: true, enum: ['Easy', 'Medium', 'Hard'] },
    players: { type: Number, default: 0 },
    avgTime: { type: String, required: true },
    reward: { type: String, required: true },
    xpReward: { type: Number, required: true },
    featured: { type: Boolean, default: false },
    new: { type: Boolean, default: false },
    trending: { type: Boolean, default: false },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    plays: { type: Number, default: 0 },
    achievements: { type: Number, default: 0 },
    powerUps: [{ type: String }],
    gameMode: [{ type: String }],
    screenshots: { type: Number, default: 0 },
    path: { type: String, required: true },
    locked: { type: Boolean, default: false },
    bgColor: { type: String, required: true }, // Added
    cardColor: { type: String, required: true }, // Added
    canPlay: { type: Boolean, default: true }, // Added
    wasteItems: [{
        name: { type: String, required: true },
        correct: { type: String, required: true, enum: ['Plastic', 'Paper', 'Metal', 'Organic', 'Glass'] },
        emoji: { type: String, required: true }
    }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Game', gameSchema);
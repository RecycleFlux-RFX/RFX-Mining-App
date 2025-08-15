const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
    title: { type: String, required: true, unique: true, trim: true },
    subtitle: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    description_long: { type: String, required: true },
    category: { type: String, required: true, enum: ['Puzzle', 'Action', 'Simulation', 'Strategy', 'Trivia'] },
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
    bgColor: { type: String, required: true },
    cardColor: { type: String, required: true },
    canPlay: { type: Boolean, default: true },
    dailyLimit: { type: Number, default: 3 },
    wasteItems: [{
        name: { type: String, required: true },
        correct: { type: String, required: true, enum: ['Plastic', 'Paper', 'Metal', 'Organic', 'Glass'] },
        emoji: { type: String, required: true }
    }],
    triviaQuestions: [{
        question: { type: String, required: true },
        options: [{ type: String, required: true }],
        correctAnswer: { type: Number, required: true },
        explanation: { type: String, required: true }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Add index for better query performance
gameSchema.index({ title: 1, category: 1, featured: 1, new: 1, trending: 1 });

module.exports = mongoose.model('Game', gameSchema);
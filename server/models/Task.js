const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    day: { type: Number, required: true, min: 1 },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 500 },
    type: {
        type: String,
        required: true,
        enum: [
            'social-follow', 
            'social-post', 
            'video-watch', 
            'article-read', 
            'discord-join', 
            'proof-upload'
        ]
    },
    platform: {
        type: String,
        enum: [
            'Twitter', 'Facebook', 'Instagram', 'YouTube',
            'Discord', 'Telegram', 'Reddit', 'TikTok',
            'LinkedIn', null
        ],
        default: null
    },
    reward: { type: Number, required: true, min: 0, default: 0.001 },
    requirements: [{ type: String, trim: true }],
    co2Impact: { type: Number, default: 2.0, min: 0 },
    contentUrl: {
        type: String,
        trim: true,
        match: [/^https?:\/\/[^\s$.?#].[^\s]*$/, 'Please enter a valid URL'],
        default: null
    },
    status: {
        type: String,
        enum: ['open', 'pending', 'completed', 'rejected'],
        default: 'open'
    },
    completedBy: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        proofUrl: { type: String, default: null },
        status: { type: String, enum: ['pending', 'completed', 'rejected'], default: 'pending' },
        submittedAt: { type: Date, default: null }
    }],
    startedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
});

module.exports = taskSchema; // Export the schema, NOT a model

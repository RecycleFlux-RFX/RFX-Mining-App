const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    passkey: {
        type: String,
        required: true,
        unique: true
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    earnings: {
        type: Number,
        default: 0,
        min: 0
    },
    co2Saved: {
        type: String,
        default: '0.00'
    },
    walletAddress: {
        type: String,
        default: '',
        trim: true
    },
    fullName: {
        type: String,
        default: '',
        trim: true
    },
    referrals: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    lastClaim: {
        type: Date,
        default: null
    },
    campaigns: [{
        campaignId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Campaign'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        completed: {
            type: Number,
            default: 0
        },
        lastActivity: {
            type: Date,
            default: Date.now
        }
    }],
    tasks: [{
        campaignId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Campaign'
        },
        taskId: {
            type: mongoose.Schema.Types.ObjectId
        },
        status: {
            type: String,
            enum: ['open', 'pending', 'completed', 'rejected'],
            default: 'open'
        },
        proof: {
            type: String,
            default: null
        },
        submittedAt: {
            type: Date,
            default: null
        },
        completedAt: {
            type: Date,
            default: null
        }
    }],
    games: [{
        gameId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Game'
        },
        lastPlayed: {
            type: Date,
            default: null
        },
        plays: {
            type: Number,
            default: 0
        },
        totalScore: {
            type: Number,
            default: 0
        },
        highScore: {
            type: Number,
            default: 0
        },
        totalXp: {
            type: Number,
            default: 0
        },
        achievements: [{
            achievementId: {
                type: String
            },
            earnedAt: {
                type: Date,
                default: Date.now
            }
        }]
    }],
    level: {
        type: Number,
        default: 1
    },
    xp: {
        type: Number,
        default: 0
    },
    totalXp: {
        type: Number,
        default: 1000
    },
    gamesPlayed: {
        type: Number,
        default: 0
    },
    transactions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

userSchema.index({ 'campaigns.campaignId': 1 });
userSchema.index({ 'tasks.campaignId': 1, 'tasks.taskId': 1 });

module.exports = mongoose.model('User', userSchema);
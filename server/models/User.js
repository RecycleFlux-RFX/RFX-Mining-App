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
    isSuperAdmin: {
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
    referralEarnings: {
    type: Number,
    default: 0,
    min: 0
    },
    referralStats: {
    totalReferrals: { type: Number, default: 0 },
    activeReferrals: { type: Number, default: 0 },
    lastReferral: { type: Date }
},
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
        co2Impact: {
        type: Number,
        default: 0.01, // Default to 0.01 kg CO2 saved per task
        min: 0
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
        isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
        playerStats: {
        level: { type: Number, default: 1 },
        xp: { type: Number, default: 0 },
        totalXp: { type: Number, default: 1000 },
        gamesPlayed: { type: Number, default: 0 },
        tokensEarned: { type: Number, default: 0 }
    },
        
    gamePlays: [{
        gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
        title: String,
        score: Number,
        playedAt: { type: Date, default: Date.now }
    }],
});

userSchema.index({ 'campaigns.campaignId': 1 });
userSchema.index({ 'tasks.campaignId': 1, 'tasks.taskId': 1 });
// Add this to your user schema (before the model is created)
userSchema.post('save', async function(user) {
    // If user has earnings and was referred
    if (user.earnings > 0 && user.referredBy) {
        const referrer = await User.findById(user.referredBy);
        if (referrer) {
            const commission = user.earnings * 0.2; // 20% commission
            
            referrer.referralEarnings += commission;
            referrer.earnings += commission;
            
            // Create transaction for referrer
            const transaction = new Transaction({
                userId: referrer._id,
                amount: commission,
                type: 'earn',
                category: 'Referral',
                activity: 'Referral Commission',
                description: `Commission from ${user.username}'s earnings`,
                color: 'purple',
                timestamp: new Date()
            });
            
            await Promise.all([referrer.save(), transaction.save()]);
        }
    }
});

module.exports = mongoose.model('User', userSchema);
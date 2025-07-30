const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    day: {
        type: Number,
        required: true,
        min: 1
    },
    title: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 100
    },
    description: {
        type: String,
        required: true,
        trim: true,
        minlength: 10,
        maxlength: 500
    },
    type: {
        type: String,
        required: true,
        enum: ['social-follow', 'social-post', 'video-watch', 'article-read', 'discord-join', 'proof-upload']
    },
    platform: {
        type: String,
        enum: ['Twitter', 'Facebook', 'Instagram', 'YouTube', 'Discord', 'Telegram', 'Reddit', 'TikTok', 'LinkedIn', null],
        default: null
    },
    reward: {
        type: Number,
        required: true,
        min: 0,
        default: 0.001
    },
    requirements: [{
        type: String,
        trim: true
    }],
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
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        proofUrl: {
            type: String,
            default: null
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'rejected'],
            default: 'pending'
        },
        submittedAt: {
            type: Date,
            default: null
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const campaignSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 100
    },
    description: {
        type: String,
        required: true,
        trim: true,
        minlength: 10,
        maxlength: 1000
    },
    category: {
        type: String,
        required: true,
        enum: ['Ocean', 'Forest', 'Air', 'Community']
    },
    reward: {
        type: Number,
        required: true,
        min: 0,
        default: 0.005
    },
    difficulty: {
        type: String,
        required: true,
        enum: ['Easy', 'Medium', 'Hard']
    },
    duration: {
        type: Number,
        required: true,
        min: 2,
        max: 14
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['active', 'upcoming', 'completed'],
        default: 'upcoming'
    },
    featured: {
        type: Boolean,
        default: false
    },
    new: {
        type: Boolean,
        default: false
    },
    trending: {
        type: Boolean,
        default: false
    },
    ending: {
        type: Boolean,
        default: false
    },
    image: {
        type: String,
        default: null
    },
    tasksList: [taskSchema], // Renamed from tasks to tasksList to match backend usage
    participants: {
        type: Number,
        default: 0
    },
    completedTasks: {
        type: Number,
        default: 0
    },
    participantsList: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        username: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
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
        },
        tasks: [{
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
        }]
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Validate tasks per day
campaignSchema.pre('save', function (next) {
    const tasksPerDay = {};
    this.tasksList.forEach(task => {
        tasksPerDay[task.day] = (tasksPerDay[task.day] || 0) + 1;
        if (tasksPerDay[task.day] > 5) {
            next(new Error('Maximum 5 tasks per day allowed'));
        }
    });

    if (this.tasksList.length > this.duration * 5) {
        next(new Error('Total tasks exceed maximum allowed for campaign duration'));
    }

    next();
});

module.exports = mongoose.model('Campaign', campaignSchema);
const mongoose = require('mongoose');
const taskSchema = require('./Task');

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
        }],
        requirements: {
            proofRequired: {
                type: Boolean,
                default: true
            },
            proofType: {
                type: String,
                enum: ['image', 'video', 'screenshot', 'link'],
                default: 'image'
            },
            description: {
                type: String,
                default: 'Please provide proof of completion'
            }
        }
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

campaignSchema.index({ title: 'text', description: 'text' });
campaignSchema.index({ status: 1 });
campaignSchema.index({ category: 1 });
campaignSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('Campaign', campaignSchema);
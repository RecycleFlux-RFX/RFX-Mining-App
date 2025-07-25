// models/Campaign.js
const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
        type: String,
        enum: ['Ocean', 'Forest', 'Air', 'Community'],
        required: true
    },
    reward: { type: Number, required: true, default: 0 }, // Added default
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard'],
        required: true
    },
    duration: { type: String, required: true }, // e.g., "7 days"
    participants: { type: Number, default: 0 },
    progress: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    new: { type: Boolean, default: false },
    trending: { type: Boolean, default: false },
    ending: { type: Boolean, default: false },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    status: {
        type: String,
        enum: ['active', 'upcoming', 'completed'],
        default: 'active'
    },
    tasksList: [{
        title: { type: String, required: true },
        description: { type: String, required: true },
        reward: { type: Number, required: true, default: 0 },
        requirements: [{ type: String }],
        status: {
            type: String,
            enum: ['pending', 'in-progress', 'completed'],
            default: 'pending'
        },
        proof: { type: String },
        completedBy: [{
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            completedAt: { type: Date }
        }]
    }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Virtual for task count (removed the tasks field from schema)
CampaignSchema.virtual('taskCount').get(function () {
    return this.tasksList.length;
});

module.exports = mongoose.model('Campaign', CampaignSchema);
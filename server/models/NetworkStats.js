// models/NetworkStats.js
const mongoose = require('mongoose');

const NetworkStatsSchema = new mongoose.Schema({
    totalUsers: { type: Number, default: 0 },
    activeUsers: { type: Number, default: 0 },
    totalRecycled: { type: Number, default: 0 }, // in kg
    totalCO2Saved: { type: Number, default: 0 }, // in kg
    totalRewardsDistributed: { type: Number, default: 0 }, // Fixed: Added default value
    lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('NetworkStats', NetworkStatsSchema);
// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true },
    walletAddress: { type: String, required: true, unique: true },
    avatar: { type: String },
    joinDate: { type: Date, default: Date.now },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    totalXp: { type: Number, default: 1000 },
    co2Saved: { type: String, default: '0.00' },
    kycStatus: {
        type: String,
        enum: ['unverified', 'pending', 'verified'],
        default: 'unverified',
    },
    kycDocuments: {
        identity: { type: String },
        address: { type: String },
        selfie: { type: String },
    },
    settings: {
        darkMode: { type: Boolean, default: true },
        notifications: { type: Boolean, default: true },
        soundEnabled: { type: Boolean, default: true },
        biometricEnabled: { type: Boolean, default: false },
        showBalance: { type: Boolean, default: true },
        language: { type: String, default: 'English' },
    },
    passkey: { type: String },
    rememberToken: { type: String },
    lastLogin: { type: Date },
    isActive: { type: Boolean, default: true },
    campaigns: [{
        campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
        tasks: { type: Number, default: 0 },
        completed: { type: Number, default: 0 },
    }],
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
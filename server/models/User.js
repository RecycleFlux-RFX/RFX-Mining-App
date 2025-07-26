const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

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
    isAdmin: {
        type: Boolean,
        default: function () {
            return this.email === 'abubakar.nabil.210@gmail.com';
        }
    },
    referralCode: { // Add referralCode field
        type: String,
        unique: true, // Ensure uniqueness at schema level
        sparse: true // Allows multiple null/undefined values
    }
}, { timestamps: true });

// Define static method for admin initialization
UserSchema.statics.initializeAdmin = async function () {
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'abubakar.nabil.210@gmail.com';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'isonines201/.';
    const ADMIN_REFERRAL_CODE = 'ADMIN_REFERRAL'; // Unique referral code for admin

    try {
        const existingAdmin = await this.findOne({ email: ADMIN_EMAIL });
        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

            await this.create({
                username: 'admin',
                email: ADMIN_EMAIL,
                password: hashedPassword,
                fullName: 'System Admin',
                walletAddress: '0xAdminAddress', // Replace with a real address
                isAdmin: true,
                referralCode: ADMIN_REFERRAL_CODE // Assign a unique referral code
            });
            console.log('Admin user created successfully');
        } else {
            console.log('Admin user already exists');
        }
    } catch (error) {
        console.error('Admin initialization error:', error);
        throw error;
    }
};

const User = mongoose.model('User', UserSchema);
module.exports = User;
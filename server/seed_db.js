const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const dotnev = require('dotenv').config();// Adjust path to your User model

// MongoDB connection URL from environment variable or default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/your_database_name';

// Function to connect to MongoDB
async function connectToDatabase() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}

// Function to seed admin user
async function seedAdmin() {
    try {
        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'abubakar.nabil.210@gmail.com' });
        if (existingAdmin) {
            console.log('Admin user already exists:', existingAdmin.email);
            return;
        }

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash('isonines201/.', saltRounds);

        // Create new admin user
        const adminUser = new User({
            username: 'nabil_admin', // You can modify this as needed
            email: 'abubakar.nabil.210@gmail.com',
            password: hashedPassword,
            passkey: generatePasskey(), // Implement your own passkey generation logic if needed
            isAdmin: true,
            earnings: 0,
            co2Saved: '0.00',
            walletAddress: '',
            fullName: 'Nabil Abubakar',
            referrals: [],
            lastClaim: null,
            campaigns: [],
            tasks: [],
            games: [],
            level: 1,
            xp: 0,
            totalXp: 1000,
            gamesPlayed: 0,
            transactions: [],
            createdAt: new Date(),
        });

        // Save admin user to database
        await adminUser.save();
        console.log('Admin user created successfully:', adminUser.email);
    } catch (error) {
        console.error('Error seeding admin user:', error);
    } finally {
        // Close MongoDB connection
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
        process.exit(0);
    }
}

// Simple passkey generation function (replace with your actual logic if needed)
function generatePasskey() {
    return Math.random().toString(36).slice(2, 10); // Generates a random 8-character string
}

// Main function to run the seed process
async function main() {
    await connectToDatabase();
    await seedAdmin();
}

// Run the seed process
main();
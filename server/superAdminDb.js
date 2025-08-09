require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { ethers } = require('ethers'); // For generating fake wallet address
const User = require('./models/User'); // Adjust path as needed

const seedSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

/*     // Delete any existing super admin users
    const deleteResult = await User.deleteMany({ isSuperAdmin: true });
    console.log(`Deleted ${deleteResult.deletedCount} existing super admin(s)`); */

    // Generate a secure password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(/* process.env.SUPER_ADMIN_PASSWORD_1  || */ process.env.SUPER_ADMIN_PASSWORD_2, salt);
    const passkey = uuidv4();
    
    // Generate a fake Ethereum wallet address
    const fakeWallet = ethers.Wallet.createRandom().address;

    // Create super admin user
    const superAdmin = new User({
      username: 'YUSUF',
      email: process.env.SUPER_ADMIN_EMAIL_2,
      password: hashedPassword,
      passkey,
      fullName: 'YUSUF',
      isAdmin: true,  // Changed from false to true since super admin should also be admin
      isSuperAdmin: true,
      walletAddress: fakeWallet, // Using generated fake wallet address
      earnings: 0,
      co2Saved: '0.00',
      isActive: true,
      playerStats: {
        level: 1,
        xp: 0,
        totalXp: 1000,
        gamesPlayed: 0,
        tokensEarned: 0
      }
    });

    // Save to database
    await superAdmin.save();
    console.log('Super admin created successfully:', superAdmin.email);
    console.log('Temporary passkey (save this securely):', passkey);
    console.log('Generated wallet address:', fakeWallet);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding super admin:', error);
    process.exit(1);
  }
};

// Execute the seeding function
seedSuperAdmin();
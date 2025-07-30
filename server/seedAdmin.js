const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv').config(); // Adjust path as needed

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const adminExists = await User.findOne({ email: "abubakar.nabil.210@gmail.com" });
        if (adminExists) {
            console.log("Admin user already exists");
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash("isonines201/.", salt);

        const admin = new User({
            username: "admin",
            email: "abubakar.nabil.210@gmail.com",
            password: hashedPassword,
            passkey: uuidv4(),
            isAdmin: true,
            fullName: "Admin User"
        });

        await admin.save();
        console.log("Admin user created successfully");
    } catch (err) {
        console.error("Error seeding admin:", err);
    } finally {
        mongoose.disconnect();
    }
};

seedAdmin();
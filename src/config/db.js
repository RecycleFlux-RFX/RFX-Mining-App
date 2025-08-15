const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
    
    // Start keep-alive
    keepDatabaseAlive();
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

const keepDatabaseAlive = () => {
  setInterval(async () => {
    try {
      await mongoose.connection.db.admin().ping();
      console.log('Database ping successful - connection kept alive');
    } catch (error) {
      console.error('Database ping failed:', error);
    }
  }, 30 * 60 * 1000); // 30 minutes
};

module.exports = connectDB;
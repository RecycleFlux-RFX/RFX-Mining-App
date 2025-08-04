const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
  gameId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Game',
    required: true 
  },
  scores: [{
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true 
    },
    username: { type: String, required: true },
    score: { type: Number, required: true },
    playedAt: { type: Date, default: Date.now }
  }],
  updatedAt: { type: Date, default: Date.now }
});

leaderboardSchema.index({ gameId: 1 });
module.exports = mongoose.model('Leaderboard', leaderboardSchema);
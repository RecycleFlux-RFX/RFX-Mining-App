const Game = require('../../models/Game');
const User = require('../../models/User');
const Leaderboard = require('../../models/leaderboard');
const Transaction = require('../../models/Transaction');

const getAllGames = async (req, res) => {
  try {
    const games = await Game.find().lean();
    res.json(games.map(game => ({
      ...game,
      id: game._id
    })));
  } catch (err) {
    console.error('Get games error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getGameProgress = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('games level xp totalXp gamesPlayed earnings');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      playerStats: {
        level: user.level,
        xp: user.xp,
        totalXp: user.totalXp,
        gamesPlayed: user.gamesPlayed,
        tokensEarned: user.earnings
      },
      games: user.games.map(g => ({
        id: g.gameId,
        lastPlayed: g.lastPlayed,
        plays: g.plays,
        totalScore: g.totalScore,
        highScore: g.highScore,
        totalXp: g.totalXp,
        achievements: g.achievements
      }))
    });
  } catch (err) {
    console.error('Get game progress error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const startGame = async (req, res) => {
  try {
    const { gameId, title } = req.body;

    // Validate input
    if (!gameId || !title) {
      return res.status(400).json({
        success: false,
        message: 'Game ID and title are required'
      });
    }

    // Check if game exists
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Check if game is locked
    if (game.locked) {
      return res.status(403).json({
        success: false,
        message: 'This game is currently locked'
      });
    }

    // Get user and check cooldown
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has played this game recently
    const lastPlay = user.gamePlays
      .filter(g => g.gameId.toString() === gameId)
      .sort((a, b) => b.playedAt - a.playedAt)[0];

    // 5 hours cooldown (in milliseconds)
    const cooldownPeriod = 5 * 60 * 60 * 1000; 
    const now = new Date();

    if (lastPlay && (now - new Date(lastPlay.playedAt) < cooldownPeriod)) {
      const timeLeft = cooldownPeriod - (now - new Date(lastPlay.playedAt));
      const hoursLeft = Math.ceil(timeLeft / (60 * 60 * 1000));
      
      return res.status(403).json({
        success: false,
        message: `You can play this game again in ${hoursLeft} hours`,
        canPlayAgainAt: new Date(new Date(lastPlay.playedAt).getTime() + cooldownPeriod)
      });
    }

    // Check daily limit
    const userGameStats = user.games.find(g => g.gameId.toString() === gameId);
    if (userGameStats && userGameStats.plays >= game.dailyLimit) {
      return res.status(403).json({
        success: false,
        message: 'Daily play limit reached for this game'
      });
    }

    // Update game plays count
    game.plays += 1;
    await game.save();

    // Update user game stats
    let gameStats = user.games.find(g => g.gameId.toString() === gameId);

    if (!gameStats) {
      gameStats = {
        gameId,
        lastPlayed: new Date(),
        plays: 1,
        totalScore: 0,
        highScore: 0,
        totalXp: 0,
        achievements: []
      };
      user.games.push(gameStats);
    } else {
      gameStats.plays += 1;
      gameStats.lastPlayed = new Date();
    }

    // Add to gamePlays history
    user.gamePlays.push({
      gameId,
      title,
      score: 0,
      playedAt: new Date()
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Game session started',
      path: game.path
    });
  } catch (err) {
    console.error('Error starting game:', err);
    res.status(500).json({
      success: false,
      message: 'Error starting game session'
    });
  }
};

const submitScore = async (req, res) => {
  try {
    const { score } = req.body;
    const gameId = req.params.id;
    const userId = req.user.userId;

    // Validate score
    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({ message: 'Invalid score value' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Update user's game stats
    let userGame = user.games.find(g => g.gameId.toString() === gameId);
    if (!userGame) {
      userGame = {
        gameId: game._id,
        lastPlayed: new Date(),
        plays: 1,
        totalScore: score,
        highScore: score,
        totalXp: game.xpReward
      };
      user.games.push(userGame);
    } else {
      userGame.lastPlayed = new Date();
      userGame.plays += 1;
      userGame.totalScore += score;
      if (score > userGame.highScore) {
        userGame.highScore = score;
      }
      userGame.totalXp += game.xpReward;
    }

    // Update leaderboard
    let leaderboard = await Leaderboard.findOne({ gameId });
    if (!leaderboard) {
      leaderboard = new Leaderboard({ 
        gameId, 
        scores: [] 
      });
    }

    // Check if user already has a score
    const existingScoreIndex = leaderboard.scores.findIndex(
      s => s.userId.toString() === userId
    );

    if (existingScoreIndex >= 0) {
      // Update if new score is higher
      if (score > leaderboard.scores[existingScoreIndex].score) {
        leaderboard.scores[existingScoreIndex].score = score;
        leaderboard.scores[existingScoreIndex].playedAt = new Date();
      }
    } else {
      // Add new score
      leaderboard.scores.push({
        userId,
        username: user.username,
        score,
        playedAt: new Date()
      });
    }

    // Sort scores in descending order
    leaderboard.scores.sort((a, b) => b.score - a.score);
    leaderboard.updatedAt = new Date();

    await Promise.all([user.save(), leaderboard.save()]);

    res.json({
      message: 'Score submitted successfully',
      newHighScore: userGame.highScore,
      xpEarned: game.xpReward,
      tokensEarned: game.reward,
      currentRank: leaderboard.scores.findIndex(s => s.userId.toString() === userId) + 1
    });
  } catch (err) {
    console.error('Submit score error:', err);
    res.status(500).json({ message: 'Failed to submit score' });
  }
};

const getLeaderboard = async (req, res) => {
  try {
    const gameId = req.params.id;
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    // Get leaderboard with populated user data
    const leaderboard = await Leaderboard.findOne({ gameId })
      .populate({
        path: 'scores.userId',
        select: 'username avatar fullName',
        model: 'User'
      })
      .lean();

    if (!leaderboard) {
      return res.json({
        gameId,
        scores: [],
        userRank: null,
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0
        }
      });
    }

    // Get paginated scores
    const totalScores = leaderboard.scores.length;
    const paginatedScores = leaderboard.scores
      .sort((a, b) => b.score - a.score)
      .slice(skip, skip + limit);

    // If authenticated, find user's rank
    let userRank = null;
    if (req.user) {
      const userId = req.user.userId;
      const userScoreIndex = leaderboard.scores.findIndex(
        s => s.userId._id.toString() === userId
      );
      
      if (userScoreIndex >= 0) {
        userRank = {
          rank: userScoreIndex + 1,
          score: leaderboard.scores[userScoreIndex].score,
          playedAt: leaderboard.scores[userScoreIndex].playedAt,
          user: leaderboard.scores[userScoreIndex].userId
        };
      }
    }

    res.json({
      gameId,
      scores: paginatedScores.map(score => ({
        ...score,
        rank: leaderboard.scores.indexOf(score) + 1
      })),
      userRank,
      pagination: {
        total: totalScores,
        page,
        limit,
        totalPages: Math.ceil(totalScores / limit)
      }
    });
  } catch (err) {
    console.error('Get leaderboard error:', err);
    res.status(500).json({ message: 'Failed to get leaderboard' });
  }
};

const completeGame = async (req, res) => {
  try {
    const { gameId, score, xpEarned, tokensEarned } = req.body;
    
    // Validate input
    if (!gameId || !score || !xpEarned || !tokensEarned) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    // Check if game exists
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ 
        success: false, 
        message: 'Game not found' 
      });
    }

    // Update user stats
    const user = req.user;
    
    // Update game-specific stats
    let gameStats = user.games.find(g => g.gameId.toString() === gameId);
    if (!gameStats) {
      gameStats = {
        gameId,
        lastPlayed: new Date(),
        plays: 1,
        totalScore: score,
        highScore: score,
        totalXp: xpEarned,
        achievements: []
      };
      user.games.push(gameStats);
    } else {
      gameStats.plays += 1;
      gameStats.lastPlayed = new Date();
      gameStats.totalScore += score;
      if (score > gameStats.highScore) {
        gameStats.highScore = score;
      }
      gameStats.totalXp += xpEarned;
    }

    // Update general stats
    user.playerStats = user.playerStats || {};
    user.playerStats.xp += xpEarned;
    user.playerStats.gamesPlayed += 1;
    user.playerStats.tokensEarned += tokensEarned;
    
    // Check for level up
    if (user.playerStats.xp >= user.playerStats.totalXp) {
      user.playerStats.level += 1;
      user.playerStats.xp = user.playerStats.xp - user.playerStats.totalXp;
      user.playerStats.totalXp = Math.floor(user.playerStats.totalXp * 1.2); // Increase XP needed for next level
    }

    // Update last game play record
    const lastGamePlay = user.gamePlays.find(g => 
      g.gameId.toString() === gameId && 
      g.score === 0 && 
      g.playedAt > new Date(Date.now() - 3600000) // Within the last hour
    );
    
    if (lastGamePlay) {
      lastGamePlay.score = score;
    }

    await user.save();

    res.status(200).json({ 
      success: true, 
      message: 'Game completed successfully',
      playerStats: user.playerStats
    });
  } catch (err) {
    console.error('Error completing game:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error completing game' 
    });
  }
};

module.exports = {
  getAllGames,
  getGameProgress,
  startGame,
  submitScore,
  getLeaderboard,
  completeGame
};
// routes/games.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Game = require('../models/Game');
const User = require('../models/User');
const UserGameProgress = require('../models/UserGameProgress');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

// GET /games - Get all games with user progress
router.get('/', auth, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Get all games
        const games = await Game.find();

        // Get user's game progress
        const userProgress = await UserGameProgress.find({ userId });

        // Combine game data with user progress
        const gamesWithProgress = games.map(game => {
            const progress = userProgress.find(p => p.gameId.toString() === game._id.toString()) || {};
            return {
                id: game._id,
                title: game.title,
                subtitle: game.subtitle,
                description: game.description,
                category: game.category,
                reward: game.reward.toFixed(5),
                xpReward: game.xpReward,
                difficulty: game.difficulty,
                players: game.players,
                avgTime: game.avgTime,
                rating: game.rating,
                achievements: game.achievements,
                gameMode: game.gameMode,
                powerUps: game.powerUps,
                featured: game.featured,
                new: game.new,
                trending: game.trending,
                locked: game.locked,
                plays: progress.plays || 0,
                highScore: progress.highScore || 0,
                lastPlayed: progress.lastPlayed,
                canPlay: !progress.lastPlayed ||
                    new Date(progress.lastPlayed).toDateString() !== new Date().toDateString()
            };
        });

        res.json(gamesWithProgress);
    } catch (error) {
        console.error('Error fetching games:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
});

// GET /games/progress - Get user's game progress and stats
router.get('/progress', auth, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Get user data
        const user = await User.findById(userId).select('level xp totalXp');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get game progress
        const gameProgress = await UserGameProgress.find({ userId })
            .populate('gameId', 'title category reward xpReward');

        // Calculate total tokens earned
        const totalTokens = gameProgress.reduce((sum, gp) => sum + (gp.earnedTokens || 0), 0);

        // Calculate total games played
        const totalGames = gameProgress.reduce((sum, gp) => sum + (gp.plays || 0), 0);

        res.json({
            playerStats: {
                level: user.level,
                xp: user.xp,
                totalXp: user.totalXp,
                gamesPlayed: totalGames,
                tokensEarned: totalTokens.toFixed(5)
            },
            games: gameProgress.map(gp => ({
                id: gp.gameId._id,
                title: gp.gameId.title,
                category: gp.gameId.category,
                plays: gp.plays,
                highScore: gp.highScore,
                lastPlayed: gp.lastPlayed,
                earnedTokens: gp.earnedTokens,
                earnedXp: gp.earnedXp
            }))
        });
    } catch (error) {
        console.error('Error fetching game progress:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
});

// POST /games/start - Start a game session
router.post('/start', auth, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { gameId, title } = req.body;
        const userId = req.user.userId;

        // Validate input
        if (!gameId || !title) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Game ID and title are required' });
        }

        // Get the game
        const game = await Game.findById(gameId).session(session);
        if (!game) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Game not found' });
        }

        // Get user's wallet
        const wallet = await Wallet.findOne({ userId }).session(session);
        if (!wallet) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Wallet not found' });
        }

        // Get or create user's game progress
        let userProgress = await UserGameProgress.findOne({
            userId,
            gameId
        }).session(session);

        if (!userProgress) {
            userProgress = new UserGameProgress({
                userId,
                gameId,
                plays: 0,
                highScore: 0,
                earnedTokens: 0,
                earnedXp: 0
            });
        }

        // Check if user has already played today
        if (userProgress.lastPlayed &&
            new Date(userProgress.lastPlayed).toDateString() === new Date().toDateString()) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Daily play limit reached for this game' });
        }

        // Update game stats
        game.plays += 1;
        await game.save({ session });

        // Update user progress
        userProgress.lastPlayed = new Date();
        userProgress.plays += 1;
        await userProgress.save({ session });

        // Commit transaction
        await session.commitTransaction();
        session.endSession();

        res.json({
            message: 'Game session started',
            gameId: game._id,
            title: game.title
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error starting game:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
});

// POST /games/complete - Complete a game session and award rewards
router.post('/complete', auth, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { gameId, score, achievements } = req.body;
        const userId = req.user.userId;

        // Validate input
        if (!gameId || score === undefined) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Game ID and score are required' });
        }

        // Get the game
        const game = await Game.findById(gameId).session(session);
        if (!game) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Game not found' });
        }

        // Get user's wallet
        const wallet = await Wallet.findOne({ userId }).session(session);
        if (!wallet) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Wallet not found' });
        }

        // Get user's game progress
        const userProgress = await UserGameProgress.findOne({
            userId,
            gameId
        }).session(session);

        if (!userProgress) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Game progress not found' });
        }

        // Check if rewards were already claimed for today
        if (userProgress.lastRewardClaimed &&
            new Date(userProgress.lastRewardClaimed).toDateString() === new Date().toDateString()) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Rewards already claimed for today' });
        }

        // Calculate rewards
        const baseReward = game.reward;
        const xpReward = game.xpReward;

        // Update high score if current score is higher
        if (score > userProgress.highScore) {
            userProgress.highScore = score;
        }

        // Update achievements
        if (achievements && achievements.length > 0) {
            achievements.forEach(achievement => {
                if (!userProgress.achievements.some(a => a.name === achievement)) {
                    userProgress.achievements.push({
                        name: achievement,
                        earnedAt: new Date()
                    });
                }
            });
        }

        // Update wallet balance
        wallet.balance += baseReward;
        await wallet.save({ session });

        // Create transaction
        const transaction = new Transaction({
            userId,
            walletId: wallet._id,
            type: 'earn',
            category: 'Game',
            amount: baseReward,
            activity: 'Game Completion',
            description: `Completed game: ${game.title}`,
            status: 'completed',
            metadata: {
                gameId: game._id,
                gameTitle: game.title,
                score,
                xpEarned: xpReward
            }
        });
        await transaction.save({ session });

        // Update user progress
        userProgress.earnedTokens += baseReward;
        userProgress.earnedXp += xpReward;
        userProgress.lastRewardClaimed = new Date();
        await userProgress.save({ session });

        // Update user XP and level
        const user = await User.findById(userId).session(session);
        user.xp += xpReward;

        // Check for level up
        if (user.xp >= user.totalXp) {
            user.level += 1;
            user.xp = user.xp - user.totalXp;
            user.totalXp = Math.floor(user.totalXp * 1.2); // Increase XP needed for next level
        }
        await user.save({ session });

        // Commit transaction
        await session.commitTransaction();
        session.endSession();

        res.json({
            message: 'Game completed successfully',
            reward: baseReward.toFixed(5),
            xpReward,
            newBalance: wallet.balance,
            level: user.level,
            xp: user.xp,
            totalXp: user.totalXp
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error completing game:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
});

// GET /games/leaderboard - Get game leaderboard
router.get('/leaderboard', auth, async (req, res) => {
    try {
        const { gameId } = req.query;

        if (!gameId) {
            return res.status(400).json({ message: 'Game ID is required' });
        }

        // Get top players for this game
        const leaderboard = await UserGameProgress.find({ gameId })
            .sort({ highScore: -1 })
            .limit(50)
            .populate('userId', 'username avatar')
            .populate('gameId', 'title');

        res.json(leaderboard.map(item => ({
            rank: item.highScore, // This will be sorted client-side
            username: item.userId.username,
            avatar: item.userId.avatar,
            score: item.highScore,
            plays: item.plays,
            gameTitle: item.gameId.title
        })));
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
});

module.exports = router;
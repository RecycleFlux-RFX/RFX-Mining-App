const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const gameController = require('../controllers/games/gameController');

// Public routes
router.get('/', gameController.getAllGames);
router.get('/:id/leaderboard', gameController.getLeaderboard);

// Authenticated routes
router.get('/progress', authenticateToken, gameController.getGameProgress);
router.post('/start', authenticateToken, gameController.startGame);
router.post('/:id/score', authenticateToken, gameController.submitScore);
router.post('/complete', authenticateToken, gameController.completeGame);

module.exports = router;
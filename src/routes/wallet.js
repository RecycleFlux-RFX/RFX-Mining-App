const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const walletController = require('../controllers/wallet/walletController');

// Transactions
router.get('/transactions', authenticateToken, walletController.getTransactions);
router.post('/send-tokens', authenticateToken, walletController.sendTokens);

// Ranking
router.get('/rank', authenticateToken, walletController.getRank);

module.exports = router;
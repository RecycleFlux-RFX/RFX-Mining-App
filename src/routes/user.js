const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const userController = require('../controllers/user/userController');

// User profile
router.get('/validate-token', authenticateToken, userController.validateToken);
router.get('/user', authenticateToken, userController.getUserProfile);
router.get('/network-stats', authenticateToken, userController.getNetworkStats);
router.get('/referral-link', authenticateToken, userController.getReferralLink);
router.get('/referral-info', authenticateToken, userController.getReferralInfo);
router.patch('/update-wallet', authenticateToken, userController.updateWallet);

// Rewards
router.post('/claim-reward', authenticateToken, userController.claimReward);

// Campaigns
router.get('/campaigns', authenticateToken, userController.getUserCampaigns);

//Timer
router.get('/countdown', authenticateToken, userController.getLaunchCountdown);

router.get('/leaderboard', authenticateToken, userController.getLeaderboard);
router.get('/rank', authenticateToken, userController.getUserRank);

router.get('/join/:code', (req, res) => {
  // This will be handled by your frontend routing
  res.redirect(`/signup?ref=${req.params.code}`);
});

module.exports = router;
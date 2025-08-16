const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { uploadToCloudinary } = require('../middleware/upload');
const campaignController = require('../controllers/campaigns/campaignController');

// Public routes
router.get('/', campaignController.getAllCampaigns);
router.get('/:id', campaignController.getCampaignDetails);

// Authenticated routes
router.get('/:id/user', authenticateToken, campaignController.getUserCampaignDetails);
router.post('/:id/join', authenticateToken, campaignController.joinCampaign);
router.post('/:campaignId/tasks/:taskId/proof', 
  [authenticateToken, uploadToCloudinary.single('proof')], 
  campaignController.uploadProof);
router.post('/:campaignId/tasks/:taskId/complete', authenticateToken, campaignController.completeTask);

router.post('/:id/repair-participation', authenticateToken, async (req, res) => {
  try {
    const { id: campaignId } = req.params;
    const userId = req.user.userId;

    const [user, campaign] = await Promise.all([
      User.findById(userId),
      Campaign.findById(campaignId)
    ]);

    if (!user || !campaign) {
      return res.status(404).json({ message: 'User or campaign not found' });
    }

    // Check if repair is needed
    const userHasJoined = user.campaigns.some(c => c.campaignId.toString() === campaignId);
    const isInParticipants = campaign.participantsList.some(p => p.userId.toString() === userId);

    if (userHasJoined && !isInParticipants) {
      // Add to participants list
      campaign.participantsList.push({
        userId: user._id,
        username: user.username,
        email: user.email,
        joinedAt: new Date(),
        lastActivity: new Date(),
        tasks: campaign.tasksList.map(task => ({
          taskId: task._id,
          status: 'open'
        }))
      });
      campaign.participants += 1;
      await campaign.save();
      return res.json({ success: true, repaired: true });
    }

    return res.json({ success: true, repaired: false });
  } catch (error) {
    console.error('Repair error:', error);
    res.status(500).json({ message: 'Repair failed', error: error.message });
  }
});

module.exports = router;
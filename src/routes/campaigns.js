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

module.exports = router;
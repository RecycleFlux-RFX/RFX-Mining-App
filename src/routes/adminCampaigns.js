const express = require('express');
const router = express.Router();
const { authenticateToken, adminAuth, superAdminAuth } = require('../middleware/auth');
const { uploadToCloudinary, uploadToLocal } = require('../middleware/upload');
const campaignController = require('../controllers/admin/campaignController');
const campaignTaskController = require('../controllers/admin/campaignTaskController');

// Campaign management
router.get('/', [authenticateToken, adminAuth], campaignController.getAdminCampaigns);
router.get('/:id', [authenticateToken, adminAuth], campaignController.getAdminCampaignDetails);
router.get('/:id/proofs', [authenticateToken, adminAuth], campaignController.getCampaignProofs);
router.get('/admin/campaigns', [authenticateToken, adminAuth], campaignController.getAdminCampaigns);
router.post('/:campaignId/approve-proof', [authenticateToken, adminAuth], campaignController.approveProof);

// Task management
router.get('/:id/tasks/:taskId', [authenticateToken, adminAuth], campaignTaskController.getTask);
router.post('/:id/tasks', [authenticateToken, adminAuth, uploadToLocal.single('contentFile')], campaignTaskController.createTask);
router.put('/:id/tasks/:taskId', [authenticateToken, adminAuth, uploadToLocal.single('contentFile')], campaignTaskController.updateTask);


router.delete('/:id/tasks/:taskId', [authenticateToken, adminAuth], campaignTaskController.deleteTask);

router.put(
  '/:id/tasks/:taskId', 
  [authenticateToken, adminAuth, uploadToLocal.single('contentFile')], 
  campaignTaskController.updateTask
);

module.exports = router;
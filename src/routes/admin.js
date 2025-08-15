const express = require('express');
const router = express.Router();
const { authenticateToken, adminAuth, superAdminAuth } = require('../middleware/auth');
const { uploadToCloudinary } = require('../middleware/upload');
const adminController = require('../controllers/admin/adminController');
const campaignController = require('../controllers/campaigns/campaignController');

// User management
router.get('/users', [authenticateToken, superAdminAuth], adminController.getUsers);
router.put('/users/:id/suspend', [authenticateToken, superAdminAuth], adminController.suspendUser);

// Admin management
router.get('/admins', [authenticateToken, superAdminAuth], adminController.getAdmins);
router.post('/admins', [authenticateToken, superAdminAuth], adminController.createAdmin);
router.put('/admins/:id', [authenticateToken, superAdminAuth], adminController.updateAdmin);
router.delete('/admins/:id', [authenticateToken, superAdminAuth], adminController.deleteAdmin);
router.post('/admins/:id/reset-password', [authenticateToken, superAdminAuth], adminController.resetAdminPassword);

// Statistics
router.get('/stats', [authenticateToken, superAdminAuth], adminController.getStats);

// Campaign management
router.post('/campaigns', [authenticateToken, adminAuth, uploadToCloudinary.single('image')], campaignController.createCampaign);
router.put('/campaigns/:id', [authenticateToken, adminAuth, uploadToCloudinary.single('image')], campaignController.updateCampaign);
router.delete('/campaigns/:id', [authenticateToken, adminAuth], campaignController.deleteCampaign);


module.exports = router;
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const authController = require('../controllers/auth/authController');
const validation = require('../utils/validation');

// Public routes
router.post('/signup', validation.validateSignup, authController.signup);
router.post('/login', validation.validateLogin, authController.login);
router.post('/admin/check', authController.checkAdmin);

// Protected routes
router.post('/admin/verify', authenticateToken, authController.verifyAdmin);
router.post('/superadmin/verify', authenticateToken, authController.verifySuperAdmin);


module.exports = router;
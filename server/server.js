const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const ethers = require('ethers');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Added for file system operations
const Game = require('./models/Game');
const Campaign = require('./models/Campaign');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Leaderboard = require('./models/leaderboard')
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const morgan = require('morgan');
const { body, validationResult } = require('express-validator');
const cron = require('node-cron');
const axios = require('axios');
const helmet = require('helmet')
// Load environment variables
dotenv.config();

const app = express();


app.use(cors({
  origin: 'https://rfx-mining1-app.vercel.app',
  credentials: true, // if you're sending cookies or using sessions
}));

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", 'trusted-cdn.com'],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'rfx-mining1-app.vercel.app'],
            upgradeInsecureRequests: [],
        }
    },
    frameguard: { action: 'deny' },
    xssFilter: true,
    noSniff: true,
    hidePoweredBy: true
}));


app.use(xss());
app.use(morgan('combined', {
    skip: function(req, res) { return res.statusCode < 400 }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 40 * 60 * 10000, // 40 minutes
  max: 500, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 40 minutes',
  skip: (req) => {
    // Skip rate limiting for certain routes or conditions if needed
    return req.path === '/health-check' || req.ip === '44.226.145.213';
  }
});
app.use(limiter);


// Request slow-down
const speedLimiter = slowDown({
  windowMs: 40 * 60 * 10000, // 40 minutes
  delayAfter: 500, // Allow 50 requests without slowing down
  delayMs: () => 500, // Add 500ms delay per request above limit
  skip: (req) => {
    // Skip slowing down for certain routes or conditions
    return req.path === '/health-check';
  }
});
app.use(speedLimiter);


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads', 'campaigns');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads with improved filename handling
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'campaign-proofs',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ width: 800, height: 600, crop: 'limit' }]
  }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files (JPEG, JPG, PNG, GIF) are allowed!'));
    }
});


// Serve static files from uploads directory
app.use('/uploads', express.static(uploadDir));

app.get('/', (req, res) => res.status(200).json({ 
  status: 'ok',
  message: 'RFX Mining API',
  timestamp: new Date().toISOString()
}));

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Authentication token required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        console.error('Token verification error:', err);
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// Admin Authentication Middleware
const adminAuth = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: No user data found' });
    }

const isSuperAdmin =
  req.user.email === process.env.SUPER_ADMIN_EMAIL_1 ||
  req.user.email === process.env.SUPER_ADMIN_EMAIL_2;

    const isAdmin = req.user.isAdmin === true;

    if (!isSuperAdmin && !isAdmin) {
      return res.status(403).json({ message: 'Not an admin account' });
    }

    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ message: 'Server error during admin authentication' });
  }
};


// server.js
const superAdminAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        console.error('No token provided');
        return res.status(401).json({ message: 'Authentication token required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        
const isSuperAdmin =
  decoded.isSuperAdmin ||
  (
    decoded.email &&
    (decoded.email === process.env.SUPER_ADMIN_EMAIL_1 ||
     decoded.email === process.env.SUPER_ADMIN_EMAIL_2)
  );

        
        if (!isSuperAdmin) {
            console.error('Super admin check failed:', {
                isSuperAdmin: decoded.isSuperAdmin,
emailMatch:
  decoded.email === process.env.SUPER_ADMIN_EMAIL_1 ||
  decoded.email === process.env.SUPER_ADMIN_EMAIL_2

            });
            return res.status(403).json({ 
                message: 'Super admin access required',
                details: {
                    isSuperAdmin: decoded.isSuperAdmin,
emailMatch:
  decoded.email === process.env.SUPER_ADMIN_EMAIL_1 ||
  decoded.email === process.env.SUPER_ADMIN_EMAIL_2

                }
            });
        }
        
        next();
    } catch (err) {
        console.error('Token verification error:', err);
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// Update the super admin verification endpoint
app.post('/auth/superadmin/verify', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        
        if (!user || (user.email !== process.env.SUPER_ADMIN_EMAIL_1 &&user.email !== process.env.SUPER_ADMIN_EMAIL_2)) {
            return res.status(403).json({ 
                message: 'Super admin access required',
                details: {
                    expectedEmail: process.env.SUPER_ADMIN_EMAIL_1 || process.env.SUPER_ADMIN_EMAIL_2,
                    userEmail: user?.email
                }
            });
        }

        const { passcode } = req.body;
        if (passcode !== process.env.SUPER_ADMIN_PASSCODE_1) {
            return res.status(400).json({ message: 'Invalid passcode' });
        }

        user.isSuperAdmin = true;
        await user.save();

        const newToken = jwt.sign(
            { 
                userId: user._id,
                email: user.email,
                isAdmin: true,
                isSuperAdmin: true 
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.status(200).json({
            token: newToken,
            isSuperAdmin: true
        });
    } catch (err) {
        console.error('Super admin verification error:', err);
        return res.status(500).json({ message: 'Server error' });
    }
});

app.post('/auth/admin/verify', authenticateToken, async (req, res) => {
    try {
        const { password } = req.body;
        const userId = req.user.userId;

        if (!password) {
            return res.status(400).json({ message: 'Password is required' });
        }

        // Get user from database
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if user is either admin or super admin
        const isAdmin = user.isAdmin || user.email === process.env.ADMIN_EMAIL;
        if (!isAdmin) {
            return res.status(403).json({ message: 'Not an admin account' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check if this is super admin
        const isSuperAdmin = user.email === process.env.SUPER_ADMIN_EMAIL_1 || user.email === process.env.SUPER_ADMIN_EMAIL_2


        res.status(200).json({
            message: 'Admin verified successfully',
            isSuperAdmin,
            user: {
                id: user._id,
                email: user.email,
                isAdmin: user.isAdmin,
                isSuperAdmin
            }
        });
    } catch (err) {
        console.error('Admin verify error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Routes
app.post('/auth/signup', async (req, res) => {
    try {
        const { username, email, password, fullName, referralCode } = req.body;

        // Validation
        if (!username || !email || !password || !fullName) {
            return res.status(400).json({ 
                message: 'Validation failed',
                details: 'All fields are required'
            });
        }

        // Email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ 
                message: 'Validation failed',
                details: 'Invalid email format'
            });
        }

        // Password validation
        if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
            return res.status(400).json({ 
                message: 'Validation failed',
                details: 'Password must be at least 8 characters with letters and numbers'
            });
        }

        // Check for existing user
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(409).json({ 
                message: 'Account exists',
                details: existingUser.email === email 
                    ? 'Email already in use' 
                    : 'Username taken'
            });
        }

        // Handle referral if provided
        let referrer = null;
        if (referralCode) {
            referrer = await User.findById(referralCode);
            if (!referrer) {
                return res.status(400).json({ 
                    message: 'Invalid referral',
                    details: 'Referral code not found' 
                });
            }
            
            // Additional referral validation
            if (!referrer.isActive) {
                return res.status(400).json({ 
                    message: 'Invalid referral',
                    details: 'Referrer account is inactive' 
                });
            }
        }

        // Create user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const userData = {
            username,
            email,
            password: hashedPassword,
            passkey: uuidv4(),
            fullName,
            walletAddress: null,
            isAdmin: email === process.env.ADMIN_EMAIL,
            referredBy: referrer?._id,
            referralStats: {
                totalReferrals: 0,
                activeReferrals: 0
            }
        };

        const user = new User(userData);
        await user.save();

        // Handle referral bonuses if applicable
        if (referrer) {
            try {
                const newUserBonus = parseFloat(process.env.REFERRAL_BONUS_NEW_USER || '0.0001');
                const referrerBonus = parseFloat(process.env.REFERRAL_BONUS_REFERRER || '0.0005');
                
                // Update referrer's data
                referrer.referrals.push(user._id);
                referrer.earnings += referrerBonus;
                referrer.referralStats.totalReferrals += 1;
                referrer.referralStats.activeReferrals += 1;
                
                // Update new user's data
                user.earnings += newUserBonus;
                
                // Create transactions
                const referrerTransaction = new Transaction({
                    userId: referrer._id,
                    amount: referrerBonus,
                    type: 'referral',
                    category: 'Bonus',
                    activity: 'Referral Bonus',
                    description: `Earned for referring ${user.username}`,
                    timestamp: new Date()
                });
                
                const newUserTransaction = new Transaction({
                    userId: user._id,
                    amount: newUserBonus,
                    type: 'referral',
                    category: 'Bonus',
                    activity: 'Referral Welcome Bonus',
                    description: `Received for signing up with referral`,
                    timestamp: new Date()
                });
                
                await Promise.all([
                    referrer.save(),
                    user.save(),
                    referrerTransaction.save(),
                    newUserTransaction.save()
                ]);
            } catch (referralError) {
                console.error('Referral bonus error:', referralError);
                // Don't fail signup if referral bonuses fail
            }
        }

        // Generate token
        const token = jwt.sign(
            { 
                userId: user._id, 
                email: user.email,
                isAdmin: user.isAdmin,
isSuperAdmin:
  user.email === process.env.SUPER_ADMIN_EMAIL_1 ||
  user.email === process.env.SUPER_ADMIN_EMAIL_2

            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                isAdmin: user.isAdmin,
                referralLink: `${process.env.FRONTEND_URL}/signup?ref=${user._id}`
            },
            referralApplied: !!referrer
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Account creation failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Helper Functions

function validateSignupInput(username, email, password, fullName) {
    const errors = [];
    
    if (!username) errors.push('Username is required');
    if (!email) errors.push('Email is required');
    if (!password) errors.push('Password is required');
    if (!fullName) errors.push('Full name is required');
    
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Invalid email format');
    }
    
    if (password) {
        if (password.length < 8) errors.push('Password must be at least 8 characters');
        if (!/[a-zA-Z]/.test(password)) errors.push('Password must contain letters');
        if (!/[0-9]/.test(password)) errors.push('Password must contain numbers');
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            errors.push('Password must contain special characters');
        }
    }
    
    return errors;
}

async function processReferral(referralCode) {
    if (!referralCode) return { valid: false, message: 'No referral code provided' };
    
    try {
        const referrer = await User.findById(referralCode);
        if (!referrer) {
            return { 
                valid: false, 
                message: 'Referral code not found' 
            };
        }
        
        if (!referrer.isActive) {
            return { 
                valid: false, 
                message: 'Referrer account is inactive' 
            };
        }
        
        return { 
            valid: true, 
            referrer,
            message: 'Valid referral code' 
        };
    } catch (error) {
        console.error('Referral processing error:', error);
        return { 
            valid: false, 
            message: 'Error processing referral' 
        };
    }
}

async function createNewUser(username, email, password, fullName, referrer = null) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const userData = {
        username,
        email,
        password: hashedPassword,
        passkey: uuidv4(),
        fullName,
        walletAddress: null,
        isAdmin: email === process.env.ADMIN_EMAIL,
        referredBy: referrer?._id,
        referralStats: {
            totalReferrals: 0,
            activeReferrals: 0
        }
    };
    
    const user = new User(userData);
    await user.save();
    return user;
}

async function applyReferralBonuses(newUser, referrer) {
    try {
        const newUserBonus = parseFloat(process.env.REFERRAL_BONUS_NEW_USER || '0.0001');
        const referrerBonus = parseFloat(process.env.REFERRAL_BONUS_REFERRER || '0.0005');
        
        // Update referrer's data
        referrer.referrals.push(newUser._id);
        referrer.earnings += referrerBonus;
        referrer.referralStats.totalReferrals += 1;
        referrer.referralStats.activeReferrals += 1;
        
        // Update new user's data
        newUser.earnings += newUserBonus;
        
        // Create transactions for both users
        const referrerTransaction = new Transaction({
            userId: referrer._id,
            amount: referrerBonus,
            type: 'referral',
            category: 'Bonus',
            activity: 'Referral Bonus',
            description: `Earned ${referrerBonus} for referring ${newUser.username}`,
            timestamp: new Date()
        });
        
        const newUserTransaction = new Transaction({
            userId: newUser._id,
            amount: newUserBonus,
            type: 'referral',
            category: 'Bonus',
            activity: 'Referral Welcome Bonus',
            description: `Received ${newUserBonus} for signing up with referral`,
            timestamp: new Date()
        });
        
        await Promise.all([
            referrer.save(),
            newUser.save(),
            referrerTransaction.save(),
            newUserTransaction.save()
        ]);
        
    } catch (error) {
        console.error('Failed to apply referral bonuses:', error);
        // Don't fail the signup if bonuses fail
    }
}

function generateAuthToken(user) {
    return jwt.sign(
        { 
            userId: user._id, 
            email: user.email,
            isAdmin: user.isAdmin,
isSuperAdmin:
  user.email === process.env.SUPER_ADMIN_EMAIL_1 ||
  user.email === process.env.SUPER_ADMIN_EMAIL_2

        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

function formatUserResponse(user) {
    return {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        walletAddress: user.walletAddress,
        isAdmin: user.isAdmin,
isSuperAdmin:
  user.email === process.env.SUPER_ADMIN_EMAIL_1 ||
  user.email === process.env.SUPER_ADMIN_EMAIL_2,

        earnings: user.earnings,
        referralLink: `${process.env.FRONTEND_URL}/signup?ref=${user._id}`
    };
}


app.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        const user = await User.findOne({
            $or: [{ username }, { email: username }]
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

const isSuperAdmin =
  user.email === process.env.SUPER_ADMIN_EMAIL_1 ||
  user.email === process.env.SUPER_ADMIN_EMAIL_2;


        const token = jwt.sign(
            { 
                userId: user._id, 
                email: user.email,
                isAdmin: user.isAdmin,
                isSuperAdmin: isSuperAdmin
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                walletAddress: user.walletAddress,
                isAdmin: user.isAdmin,
                isSuperAdmin: isSuperAdmin
            },
            requiresPasscode: isSuperAdmin && !user.isSuperAdmin
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


app.post('/auth/admin/check', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email });
        if (!user || !user.isAdmin) {
            return res.status(403).json({ message: 'Not an admin account' });
        }

        res.status(200).json({ message: 'Admin account verified', email });
    } catch (err) {
        console.error('Admin check error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/auth/google', (req, res) => {
    res.status(501).json({ message: 'Google Sign-In not implemented' });
});

app.post('', authenticateToken, async (req, res) => {
    try {
        const { password } = req.body;
        const userId = req.user.userId;

        if (!password) {
            return res.status(400).json({ message: 'Password is required' });
        }

        // Get user from database using the ID from the token
        const user = await User.findById(userId);
        
        if (!user || !user.isAdmin) {
            return res.status(403).json({ message: 'Not an admin account' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check if this is super admin
const isSuperAdmin =
  user.email === process.env.SUPER_ADMIN_EMAIL_1 ||
  user.email === process.env.SUPER_ADMIN_EMAIL_2;


        res.status(200).json({
            message: 'Admin verified successfully',
            isSuperAdmin,
            user: {
                id: user._id,
                email: user.email,
                isAdmin: user.isAdmin
            }
        });
    } catch (err) {
        console.error('Admin verify error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all users (for admin)
app.get('/admin/users', [authenticateToken, superAdminAuth], async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password -passkey -transactions')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .lean();

    const total = await User.countDocuments(query);

    res.json({
      data: users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Suspend/activate user
app.put('/admin/users/:id/suspend', [authenticateToken, superAdminAuth], async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive must be a boolean' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

// Prevent modifying super admin
if (
  user.email === process.env.SUPER_ADMIN_EMAIL_1 ||
  user.email === process.env.SUPER_ADMIN_EMAIL_2
) {
  return res.status(403).json({ message: 'Cannot modify super admin status' });
}


    user.isActive = isActive;
    await user.save();

    res.json({
      message: `User ${isActive ? 'activated' : 'suspended'} successfully`,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isActive: user.isActive
      }
    });
  } catch (err) {
    console.error('Suspend user error:', err);
    res.status(500).json({ message: 'Failed to update user status' });
  }
});


// Get system statistics
app.get('/admin/stats', [authenticateToken, superAdminAuth], async (req, res) => {
  try {
    const [totalUsers, activeUsers, totalCampaigns, activeCampaigns, totalAdmins] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Campaign.countDocuments(),
      Campaign.countDocuments({ status: 'active' }),
      User.countDocuments({ isAdmin: true })
    ]);

    // Get daily signups for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailySignups = await User.aggregate([
      { 
        $match: { 
          createdAt: { $gte: sevenDaysAgo } 
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get user activity (last 7 days)
    const userActivity = await User.aggregate([
      {
        $project: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$lastActivity" } },
          isActive: 1
        }
      },
      {
        $match: {
          date: { $exists: true, $ne: null },
          isActive: true
        }
      },
      {
        $group: {
          _id: "$date",
          activeUsers: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 7 }
    ]);

    res.json({
      totalUsers,
      activeUsers,
      totalCampaigns,
      activeCampaigns,
      totalAdmins,
      dailySignups: dailySignups.map(item => ({ date: item._id, count: item.count })),
      userActivity: userActivity.map(item => ({ date: item._id, active: item.activeUsers }))
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

// Add this near your other auth routes
app.post('/admin/campaigns', [authenticateToken, adminAuth, upload.single('image')], async (req, res) => {
    try {
        // Parse form data
        const formData = req.body;

        // Validate required fields
        if (!formData.title || !formData.description || !formData.category ||
            !formData.reward || !formData.difficulty || !formData.duration ||
            !formData.startDate || !formData.status) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Validate description length
        if (formData.description.length < 10) {
            return res.status(400).json({
                message: 'Description must be at least 10 characters long'
            });
        }

        // Parse tasks if they exist
        let tasksList = [];
        if (formData.tasks) {
            try {
                tasksList = JSON.parse(formData.tasks);

                // Validate each task
                for (const task of tasksList) {
                    if (!task.title || task.title.length < 3) {
                        return res.status(400).json({
                            message: 'Task title must be at least 3 characters long'
                        });
                    }
                    if (!task.description || task.description.length < 10) {
                        return res.status(400).json({
                            message: 'Task description must be at least 10 characters long'
                        });
                    }
                    if (!task.day || task.day < 1) {
                        return res.status(400).json({
                            message: 'Task day must be at least 1'
                        });
                    }
                    if (!task.reward || task.reward < 0) {
                        return res.status(400).json({
                            message: 'Task reward must be a positive number'
                        });
                    }
                    // Ensure completedBy is initialized
                    task.completedBy = [];
                }
            } catch (e) {
                console.error('Error parsing tasks:', e);
                return res.status(400).json({ message: 'Invalid tasks format' });
            }
        }

        // Calculate end date
        const endDate = new Date(new Date(formData.startDate).getTime() +
            (parseInt(formData.duration) * 24 * 60 * 60 * 1000));

        // Handle file path
let imageUrl = null;
        if (req.file) {
            imageUrl = req.file.path; // Cloudinary URL
        }

        const campaign = new Campaign({
            title: formData.title,
            description: formData.description,
            category: formData.category,
            reward: parseFloat(formData.reward),
            difficulty: formData.difficulty,
            duration: parseInt(formData.duration),
            featured: formData.featured === 'true',
            new: formData.new === 'true',
            trending: formData.trending === 'true',
            ending: formData.ending === 'true',
            startDate: formData.startDate,
            endDate: endDate,
            status: formData.status,
            tasksList: tasksList,
            image: imageUrl, // Store Cloudinary URL
            participants: 0,
            completedTasks: 0,
            participantsList: [],
            createdBy: mongoose.Types.ObjectId(req.user.userId)
        });

        await campaign.save();

        res.status(201).json({
            ...campaign.toObject(),
            image: imageUrl // Return Cloudinary URL directly
        });
    } catch (err) {
        if (req.file) {
            fs.unlink(req.file.path, () => { });
        }
        console.error('Error creating campaign:', err);
        res.status(500).json({
            message: err.message || 'Failed to create campaign',
            error: err
        });
    }
});

// User Dashboard Routes (existing routes remain the same)
app.get('/user/validate-token', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('username email isAdmin');
        if (!user) {
            return res.status(404).json({ message: 'User not found', valid: false });
        }
        res.status(200).json({ valid: true, user });
    } catch (err) {
        console.error('Validate token error:', err);
        res.status(500).json({ message: 'Server error', valid: false });
    }
});

app.get('/user/user', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .select('username email fullName walletAddress earnings co2Saved campaigns tasks')
            .populate('tasks.taskId', 'co2Impact');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        let totalCO2Saved = 0;
        user.tasks.forEach(task => {
            if (task.status === 'completed' && task.taskId?.co2Impact) {
                totalCO2Saved += parseFloat(task.taskId.co2Impact) || 0.01; // Default to 0.01 if co2Impact is missing
            }
        });

        totalCO2Saved = parseFloat(totalCO2Saved.toFixed(2));
        if (parseFloat(user.co2Saved || '0') !== totalCO2Saved) {
            user.co2Saved = totalCO2Saved.toFixed(2);
            await user.save();
        }

        res.status(200).json({
            username: user.username,
            email: user.email,
            fullName: user.fullName || '',
            walletAddress: user.walletAddress || '',
            earnings: user.earnings || 0,
            co2Saved: user.co2Saved || '0.00',
            campaigns: user.campaigns || []
        });
    } catch (err) {
        console.error('Get user data error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// In server.js
app.get('/user/network-stats', authenticateToken, async (req, res) => {
    try {
        const totalRecycled = await User.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: { $toDouble: { $ifNull: ["$co2Saved", "0"] } } }
                }
            }
        ]);

        const activeUsers = await User.countDocuments({
            'tasks': { $elemMatch: { status: 'completed' } }
        });

        res.status(200).json({
            totalRecycled: (totalRecycled[0]?.total || 0).toFixed(2),
            activeUsers
        });
    } catch (err) {
        console.error('Get network stats error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/user/referral-link', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('username');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const referralLink = `rfx-mining1-app.vercel.app?ref=${user._id}`;
        res.status(200).json({ referralLink });
    } catch (err) {
        console.error('Get referral link error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/user/referral-info', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .select('username referrals referralEarnings')
            .populate({
                path: 'referrals',
                select: 'username createdAt earnings',
                options: { sort: { createdAt: -1 } }
            });
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const referralLink = `${process.env.FRONTEND_URL || 'rfx-mining1-app.vercel.app'}/signup?ref=${user._id}`;
        
        res.status(200).json({ 
            referralLink,
            referralCount: user.referrals.length,
            referralEarnings: user.referralEarnings || 0,
            referrals: user.referrals
        });
    } catch (err) {
        console.error('Get referral info error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/user/claim-reward', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const now = new Date();
        const oneDay = 24 * 60 * 60 * 1000;
        if (user.lastClaim && (now - user.lastClaim) < oneDay) {
            const nextClaim = new Date(user.lastClaim.getTime() + oneDay);
            return res.status(400).json({
                message: 'Daily reward already claimed',
                nextClaim: nextClaim.toISOString()
            });
        }

        const rewardAmount = 0.0001;
        user.earnings += rewardAmount;
        user.lastClaim = now;

        const transaction = new Transaction({
            userId: user._id,
            amount: rewardAmount,
            type: 'earn',
            category: 'Bonus',
            activity: 'Daily Reward Claim',
            description: 'Claimed daily reward',
            color: 'purple',
            timestamp: now
        });

        await Promise.all([user.save(), transaction.save()]);
        res.status(200).json({
            amount: rewardAmount,
            newBalance: user.earnings
        });
    } catch (err) {
        console.error('Claim reward error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.patch('/user/update-wallet', authenticateToken, async (req, res) => {
    try {
        const { walletAddress } = req.body;
        if (!walletAddress || !ethers.isAddress(walletAddress)) {
            return res.status(400).json({ message: 'Valid wallet address required' });
        }

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.walletAddress = walletAddress;
        await user.save();

        res.status(200).json({
            message: 'Wallet address updated successfully',
            walletAddress
        });
    } catch (err) {
        console.error('Update wallet error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});






// Get all admins
app.get('/admin/admins', [authenticateToken, superAdminAuth], async (req, res) => {
    try {
        const admins = await User.find({ isAdmin: true })
            .select('-password -passkey -transactions')
            .lean();
            
        res.json(admins);
    } catch (err) {
        console.error('Get admins error:', err);
        res.status(500).json({ message: 'Failed to fetch admins' });
    }
});


/* app.post('/admin/campaigns', [authenticateToken, superAdminAuth, upload.single('image')], async (req, res) => {
    try {
        // Parse form data
        const formData = req.body;

        // Validate required fields
        if (!formData.title || !formData.description || !formData.category ||
            !formData.reward || !formData.difficulty || !formData.duration ||
            !formData.startDate || !formData.status) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Validate description length
        if (formData.description.length < 10) {
            return res.status(400).json({
                message: 'Description must be at least 10 characters long'
            });
        }

        // Parse tasks if they exist
        let tasksList = [];
        if (formData.tasks) {
            try {
                tasksList = JSON.parse(formData.tasks);

                // Validate each task
                for (const task of tasksList) {
                    if (!task.title || task.title.length < 3) {
                        return res.status(400).json({
                            message: 'Task title must be at least 3 characters long'
                        });
                    }
                    if (!task.description || task.description.length < 10) {
                        return res.status(400).json({
                            message: 'Task description must be at least 10 characters long'
                        });
                    }
                    if (!task.day || task.day < 1) {
                        return res.status(400).json({
                            message: 'Task day must be at least 1'
                        });
                    }
                    if (!task.reward || task.reward < 0) {
                        return res.status(400).json({
                            message: 'Task reward must be a positive number'
                        });
                    }
                    // Ensure completedBy is initialized
                    task.completedBy = [];
                }
            } catch (e) {
                console.error('Error parsing tasks:', e);
                return res.status(400).json({ message: 'Invalid tasks format' });
            }
        }

        // Calculate end date
        const endDate = new Date(new Date(formData.startDate).getTime() +
            (parseInt(formData.duration) * 24 * 60 * 60 * 1000));

        // Handle file path
let imageUrl = null;
        if (req.file) {
            imageUrl = req.file.path; // Cloudinary URL
        }

        const campaign = new Campaign({
            title: formData.title,
            description: formData.description,
            category: formData.category,
            reward: parseFloat(formData.reward),
            difficulty: formData.difficulty,
            duration: parseInt(formData.duration),
            featured: formData.featured === 'true',
            new: formData.new === 'true',
            trending: formData.trending === 'true',
            ending: formData.ending === 'true',
            startDate: formData.startDate,
            endDate: endDate,
            status: formData.status,
            tasksList: tasksList,
            image: imageUrl, // Store Cloudinary URL
            participants: 0,
            completedTasks: 0,
            participantsList: [],
            createdBy: mongoose.Types.ObjectId(req.user.userId)
        });

        await campaign.save();

        res.status(201).json({
            ...campaign.toObject(),
            image: imageUrl // Return Cloudinary URL directly
        });
    } catch (err) {
        if (req.file) {
            fs.unlink(req.file.path, () => { });
        }
        console.error('Error creating campaign:', err);
        res.status(500).json({
            message: err.message || 'Failed to create campaign',
            error: err
        });
    }
}); */

// Create new admin
app.post('/admin/admins', [authenticateToken, superAdminAuth], async (req, res) => {
    try {
        const { username, email, fullName } = req.body;

        if (!username || !email || !fullName) {
            return res.status(400).json({ message: 'Username, email, and full name are required' });
        }

        // Check if user exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            if (existingUser.isAdmin) {
                return res.status(400).json({ message: 'User is already an admin' });
            }
            
            // Convert existing user to admin
            existingUser.isAdmin = true;
            await existingUser.save();
            
            return res.status(200).json({
                message: 'Existing user promoted to admin',
                admin: {
                    id: existingUser._id,
                    username: existingUser.username,
                    email: existingUser.email,
                    fullName: existingUser.fullName,
                    isAdmin: true
                }
            });
        }

        // Create new admin user with temporary password
        const tempPassword = uuidv4().slice(0, 8);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);
        const passkey = uuidv4();

        const admin = new User({
            username,
            email,
            password: hashedPassword,
            passkey,
            fullName,
            walletAddress: ethers.Wallet.createRandom().address,
            isAdmin: true
        });

        await admin.save();

        // Send email with temp password (implementation depends on your email service)
        // sendAdminInviteEmail(email, tempPassword);

        res.status(201).json({
            message: 'Admin created successfully',
            admin: {
                id: admin._id,
                username: admin.username,
                email: admin.email,
                fullName: admin.fullName,
                isAdmin: true
            },
            tempPassword
        });
    } catch (err) {
        console.error('Create admin error:', err);
        res.status(500).json({ message: 'Failed to create admin' });
    }
});

// Update admin
app.put('/admin/admins/:id', [authenticateToken, superAdminAuth], async (req, res) => {
    try {
        const { username, email, fullName, isActive } = req.body;

        const admin = await User.findOne({
            _id: req.params.id,
            isAdmin: true
        });

        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Prevent modifying super admin
        if (admin.email === process.env.ADMIN_EMAIL) {
            return res.status(403).json({ message: 'Cannot modify super admin' });
        }

        if (username) admin.username = username;
        if (email) admin.email = email;
        if (fullName) admin.fullName = fullName;
        if (typeof isActive !== 'undefined') admin.isActive = isActive;

        await admin.save();

        res.json({
            message: 'Admin updated successfully',
            admin: {
                id: admin._id,
                username: admin.username,
                email: admin.email,
                fullName: admin.fullName,
                isAdmin: admin.isAdmin,
                isActive: admin.isActive
            }
        });
    } catch (err) {
        console.error('Update admin error:', err);
        res.status(500).json({ message: 'Failed to update admin' });
    }
});

// Delete admin (soft delete)
app.delete('/admin/admins/:id', [authenticateToken, superAdminAuth], async (req, res) => {
    try {
        const admin = await User.findOne({
            _id: req.params.id,
            isAdmin: true
        });

        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Prevent deleting super admin
        if (admin.email === process.env.ADMIN_EMAIL) {
            return res.status(403).json({ message: 'Cannot delete super admin' });
        }

        // Soft delete by marking as inactive
        admin.isActive = false;
        await admin.save();

        res.json({ message: 'Admin deactivated successfully' });
    } catch (err) {
        console.error('Delete admin error:', err);
        res.status(500).json({ message: 'Failed to deactivate admin' });
    }
});

// Reset admin password
app.post('/admin/admins/:id/reset-password', [authenticateToken, superAdminAuth], async (req, res) => {
    try {
        const admin = await User.findOne({
            _id: req.params.id,
            isAdmin: true
        });

        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Generate new temp password
        const tempPassword = uuidv4().slice(0, 8);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        admin.password = hashedPassword;
        await admin.save();

        // Send email with new temp password
        // sendPasswordResetEmail(admin.email, tempPassword);

        res.json({
            message: 'Admin password reset successfully',
            tempPassword
        });
    } catch (err) {
        console.error('Reset admin password error:', err);
        res.status(500).json({ message: 'Failed to reset admin password' });
    }
});





// Wallet Routes (existing routes remain the same)
// Update the wallet/transactions route
app.get('/wallet/transactions', authenticateToken, async (req, res) => {
    try {
        const { period, search } = req.query;
        const userId = req.user.userId;

        // Build date filter based on period
        let dateFilter = {};
        const now = new Date();

        if (period === 'today') {
            dateFilter.timestamp = {
                $gte: new Date(now.setHours(0, 0, 0, 0))
            };
        } else if (period === 'week') {
            dateFilter.timestamp = {
                $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            };
        } else if (period === 'month') {
            dateFilter.timestamp = {
                $gte: new Date(now.getFullYear(), now.getMonth(), 1)
            };
        }

        // Build search filter
        const searchFilter = search ? {
            $or: [
                { activity: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } }
            ]
        } : {};

        // Query transactions with pagination
        const transactions = await Transaction.find({
            userId,
            ...dateFilter,
            ...searchFilter
        })
            .sort({ timestamp: -1 })
            .lean();

        res.status(200).json(transactions);
    } catch (err) {
        console.error('Get transactions error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/wallet/send-tokens', authenticateToken, async (req, res) => {
    try {
        const { recipientAddress, amount } = req.body;
        const userId = req.user.userId;

        if (!ethers.isAddress(recipientAddress)) {
            return res.status(400).json({ message: 'Invalid recipient address' });
        }
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        const sender = await User.findById(userId);
        if (!sender) {
            return res.status(404).json({ message: 'Sender not found' });
        }
        if (sender.earnings < amount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        const recipient = await User.findOne({ walletAddress: recipientAddress });
        if (!recipient) {
            return res.status(404).json({ message: 'Recipient not found' });
        }

        sender.earnings -= amount;
        recipient.earnings += amount;

        const now = new Date();
        const senderTransaction = new Transaction({
            userId: sender._id,
            amount,
            type: 'send',
            category: 'Transfer',
            activity: 'Sent Tokens',
            description: `Sent ${amount} RFX to ${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}`,
            color: 'blue',
            timestamp: now
        });

        const recipientTransaction = new Transaction({
            userId: recipient._id,
            amount,
            type: 'receive',
            category: 'Transfer',
            activity: 'Received Tokens',
            description: `Received ${amount} RFX from ${sender.walletAddress.slice(0, 6)}...${sender.walletAddress.slice(-4)}`,
            color: 'blue',
            timestamp: now
        });

        await Promise.all([
            sender.save(),
            recipient.save(),
            senderTransaction.save(),
            recipientTransaction.save()
        ]);

        res.status(200).json({
            message: 'Tokens sent successfully',
            balance: sender.earnings
        });
    } catch (err) {
        console.error('Send tokens error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/wallet/rank', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('earnings');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const userCount = await User.countDocuments({ earnings: { $gt: user.earnings } });
        res.status(200).json({ rank: userCount + 1 });
    } catch (err) {
        console.error('Get rank error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});




// Game Routes
// Get all games
app.get('/games', async (req, res) => {
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
});

// Get game progress for authenticated user
app.get('/games/progress', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('games level xp totalXp gamesPlayed earnings');
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
});

// Start a game session
// Start a game session
app.post('/games/start', authenticateToken, async (req, res) => {
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

        // Get user and check daily limit
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

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
});

// Submit game score
app.post('/games/:id/score', authenticateToken, async (req, res) => {
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
});

// Get game leaderboard
app.get('/games/:id/leaderboard', async (req, res) => {
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
});

/* // Complete a game session and award rewards
app.post('/games/complete', authenticateToken, async (req, res) => {
    try {
        const { gameId, score, xpEarned } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const game = await Game.findById(gameId);
        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }

        const userGame = user.games.find(g => g.gameId.toString() === gameId);
        if (!userGame) {
            return res.status(400).json({ message: 'Game session not started' });
        }

        userGame.totalScore += score || 0;
        userGame.highScore = Math.max(userGame.highScore, score || 0);
        userGame.totalXp += xpEarned || game.xpReward;
        user.xp += xpEarned || game.xpReward;
        user.earnings += parseFloat(game.reward.replace('₿ ', ''));

        // Level up logic
        while (user.xp >= user.totalXp) {
            user.xp -= user.totalXp;
            user.level += 1;
            user.totalXp *= 1.5; // Increase XP needed for next level
        }

        const transaction = new Transaction({
            userId: user._id,
            amount: parseFloat(game.reward.replace('RFX ', '')),
            type: 'earn',
            category: 'Game',
            activity: `Completed ${game.title}`,
            description: `Earned ${game.reward} for playing ${game.title}`,
            color: 'green',
            timestamp: new Date()
        });

        await Promise.all([user.save(), transaction.save()]);
        res.json({
            message: 'Game completed successfully',
            reward: game.reward,
            xp: xpEarned || game.xpReward,
            newLevel: user.level,
            newBalance: user.earnings
        });
    } catch (err) {
        console.error('Complete game error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}); */

app.post('/games/complete', authenticateToken, async (req, res) => {
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
});

// User Progress Route
/* app.get('/games/progress', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('playerStats games gamePlays')
            .populate('games.gameId', 'title category');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Calculate recent activity
        const recentGames = user.gamePlays
            .sort((a, b) => b.playedAt - a.playedAt)
            .slice(0, 5);

        res.status(200).json({
            success: true,
            playerStats: user.playerStats || {
                level: 1,
                xp: 0,
                totalXp: 1000,
                gamesPlayed: 0,
                tokensEarned: 0
            },
            recentGames,
            gameStats: user.games
        });
    } catch (err) {
        console.error('Error fetching user progress:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching user progress'
        });
    }
});
 */
// Admin Routes for Games
app.post('/admin/games', [authenticateToken, adminAuth], async (req, res) => {
    try {
        const gameData = req.body;
        const game = new Game({
            ...gameData,
            reward: `₿ ${parseFloat(gameData.reward).toFixed(5)}`
        });
        await game.save();
        res.status(201).json(game);
    } catch (err) {
        console.error('Create game error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.put('/admin/games/:id', [authenticateToken, adminAuth], async (req, res) => {
    try {
        const game = await Game.findById(req.params.id);
        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }
        Object.assign(game, req.body);
        game.reward = `₿ ${parseFloat(req.body.reward).toFixed(5)}`;
        await game.save();
        res.json(game);
    } catch (err) {
        console.error('Update game error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.delete('/admin/games/:id', [authenticateToken, adminAuth], async (req, res) => {
    try {
        const game = await Game.findByIdAndDelete(req.params.id);
        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }
        await User.updateMany(
            { 'games.gameId': req.params.id },
            { $pull: { games: { gameId: req.params.id } } }
        );
        res.json({ message: 'Game deleted successfully' });
    } catch (err) {
        console.error('Delete game error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});









// Campaign Routes

// Get all campaigns (public)
app.get('/campaigns', async (req, res) => {
    try {
        const { status, category, featured } = req.query;
        let query = {};

        if (status) query.status = status;
        if (category) query.category = category;
        if (featured) query.featured = featured === 'true';

        const campaigns = await Campaign.find(query)
            .select('-tasksList -participantsList')
            .sort({ createdAt: -1 })
            .lean();

        // Calculate progress for each campaign
        const campaignsWithProgress = campaigns.map(campaign => {
            const progress = campaign.tasksList && campaign.participants > 0
                ? (campaign.completedTasks / (campaign.tasksList.length * campaign.participants)) * 100
                : 0;
            return {
                ...campaign,
                progress: Math.min(progress, 100),
                id: campaign._id
            };
        });

        res.json({ data: campaignsWithProgress });
    } catch (err) {
        console.error('Get campaigns error:', err);
        res.status(500).json({ message: 'Failed to fetch campaigns' });
    }
});

// Get campaign details (public)
app.get('/campaigns/:id', async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id)
            .select('-participantsList')
            .lean();

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        res.json(campaign);
    } catch (err) {
        console.error('Get campaign details error:', err);
        res.status(500).json({ message: 'Failed to fetch campaign details' });
    }
});

// Get campaign details for authenticated user
app.get('/campaigns/:id/user', authenticateToken, async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id)
            .lean();

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const user = await User.findById(req.user.userId);
        const hasJoined = user.campaigns.some(c => c.campaignId.toString() === req.params.id);

        // Calculate current day
        const currentDate = new Date();
        const startDate = new Date(campaign.startDate);
        const dayDiff = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        const currentDay = Math.min(dayDiff, campaign.duration);

        // Calculate time left for current day
        const nextDay = new Date(startDate);
        nextDay.setDate(startDate.getDate() + currentDay);
        const timeUntilNextDay = nextDay - currentDate;
        const hours = Math.floor((timeUntilNextDay % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeUntilNextDay % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeUntilNextDay % (1000 * 60)) / 1000);

        // Get user's tasks
        const userTasks = campaign.tasksList.map(task => {
            const userTask = user.tasks.find(t =>
                t.taskId.toString() === task._id.toString() &&
                t.campaignId.toString() === req.params.id
            );
            return {
                ...task,
                status: userTask ? userTask.status : 'open',
                proof: userTask ? userTask.proof : null,
                completed: userTask ? userTask.status === 'completed' : false
            };
        });

        // Filter tasks for current day
        const dailyTasks = userTasks.filter(task => task.day === currentDay);

        res.json({
            ...campaign,
            hasJoined,
            currentDay,
            dayTimeLeft: {
                hours: Math.max(0, hours),
                minutes: Math.max(0, minutes),
                seconds: Math.max(0, seconds)
            },
            dailyTasks,
            allTasks: userTasks
        });
    } catch (err) {
        console.error('Get user campaign error:', err);
        res.status(500).json({ message: 'Failed to fetch campaign details' });
    }
});

// Join campaign
app.post('/campaigns/:id/join', authenticateToken, async (req, res) => {
    try {
        const campaignId = req.params.id;
        const userId = req.user.userId;

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if already joined
        if (user.campaigns.some(c => c.campaignId.toString() === campaignId)) {
            return res.status(400).json({ message: 'Already joined this campaign' });
        }

        // Add to user's campaigns
        user.campaigns.push({
            campaignId: campaign._id,
            joinedAt: new Date()
        });

        // Add to campaign participants
        campaign.participants += 1;
        campaign.participantsList.push({
            userId: user._id,
            username: user.username,
            email: user.email,
            joinedAt: new Date()
        });

        await Promise.all([user.save(), campaign.save()]);

        res.json({
            message: 'Successfully joined campaign',
            campaignId: campaign._id
        });
    } catch (err) {
        console.error('Join campaign error:', err);
        res.status(500).json({ message: 'Failed to join campaign' });
    }
});

// Upload proof
// Upload proof - modified for Cloudinary
// In your server.js, update the proof upload endpoint
app.post('/campaigns/:campaignId/tasks/:taskId/proof', [authenticateToken, upload.single('proof')], async (req, res) => {
    try {
        const { campaignId, taskId } = req.params;
        const userId = req.user.userId;

        if (!req.file) {
            return res.status(400).json({ message: 'Proof file is required' });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const task = campaign.tasksList.id(taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Cloudinary provides the URL in req.file.path
        const proofUrl = req.file.path;

        // Update user's task status to pending
        let userTask = user.tasks.find(t =>
            t.taskId.toString() === taskId &&
            t.campaignId.toString() === campaignId
        );

        if (!userTask) {
            user.tasks.push({
                campaignId,
                taskId,
                status: 'pending',
                proof: proofUrl,
                submittedAt: new Date()
            });
        } else {
            userTask.status = 'pending';
            userTask.proof = proofUrl;
            userTask.submittedAt = new Date();
        }

        // Update campaign participant's task status to pending
        const participant = campaign.participantsList.find(p =>
            p.userId.toString() === userId
        );

        if (!participant) {
            return res.status(400).json({ message: 'User has not joined this campaign' });
        }

        let participantTask = participant.tasks.find(t => t.taskId.toString() === taskId);
        if (!participantTask) {
            participant.tasks.push({
                taskId,
                status: 'pending',
                proof: proofUrl,
                submittedAt: new Date()
            });
        } else {
            participantTask.status = 'pending';
            participantTask.proof = proofUrl;
            participantTask.submittedAt = new Date();
        }

        // Update task's completedBy with pending status
        let completedByEntry = task.completedBy.find(entry =>
            entry.userId.toString() === userId
        );

        if (!completedByEntry) {
            task.completedBy.push({
                userId: userId,
                proofUrl: proofUrl,
                status: 'pending',
                submittedAt: new Date()
            });
        } else {
            completedByEntry.proofUrl = proofUrl;
            completedByEntry.status = 'pending';
            completedByEntry.submittedAt = new Date();
        }

        // Update last activity
        participant.lastActivity = new Date();

        await Promise.all([user.save(), campaign.save()]);

        res.json({
            message: 'Proof uploaded successfully, pending verification',
            proofUrl: proofUrl
        });
    } catch (err) {
        console.error('Upload proof error:', err);
        res.status(500).json({ message: 'Failed to upload proof' });
    }
});


// Upload task proof
app.post('/campaigns/:id/tasks/:taskId/proof', [authenticateToken, upload.single('proof')], async (req, res) => {
    try {
        const { id: campaignId, taskId } = req.params;
        const proofFile = req.file;

        if (!proofFile) {
            return res.status(400).json({ message: 'Proof file is required' });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const task = campaign.tasksList.id(taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update user's task status
        let userTask = user.tasks.find(t =>
            t.taskId.toString() === taskId &&
            t.campaignId.toString() === campaignId
        );

        if (!userTask) {
            userTask = {
                campaignId,
                taskId,
                status: 'pending',
                proof: proofFile.path,
                submittedAt: new Date()
            };
            user.tasks.push(userTask);
        } else {
            userTask.status = 'pending';
            userTask.proof = proofFile.path;
            userTask.submittedAt = new Date();
        }

        // Update campaign participant's task status
        const participant = campaign.participantsList.find(p =>
            p.userId.toString() === req.user.userId
        );

        if (!participant) {
            return res.status(400).json({ message: 'User has not joined this campaign' });
        }

        let participantTask = participant.tasks.find(t => t.taskId.toString() === taskId);
        if (!participantTask) {
            participantTask = {
                taskId,
                status: 'pending',
                proof: proofFile.path,
                submittedAt: new Date()
            };
            participant.tasks.push(participantTask);
        } else {
            participantTask.status = 'pending';
            participantTask.proof = proofFile.path;
            participantTask.submittedAt = new Date();
        }

        // Update task's completedBy
        let completedByEntry = task.completedBy.find(entry =>
            entry.userId.toString() === req.user.userId
        );

        if (!completedByEntry) {
            completedByEntry = {
                userId: req.user.userId,
                proofUrl: proofFile.path,
                status: 'pending',
                submittedAt: new Date()
            };
            task.completedBy.push(completedByEntry);
        } else {
            completedByEntry.proofUrl = proofFile.path;
            completedByEntry.status = 'pending';
            completedByEntry.submittedAt = new Date();
        }

        // Update last activity
        participant.lastActivity = new Date();

        await Promise.all([user.save(), campaign.save()]);

        res.json({
            message: 'Proof uploaded successfully, pending verification',
            proofUrl: `/uploads/campaigns/${path.basename(proofFile.path)}`
        });
    } catch (err) {
        console.error('Upload proof error:', err);
        res.status(500).json({ message: 'Failed to upload proof' });
    }
});

// Complete a task (for tasks that don't require proof)
// In server.js
app.post('/campaigns/:id/tasks/:taskId/complete', authenticateToken, async (req, res) => {
    try {
        const { id: campaignId, taskId } = req.params;

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const task = campaign.tasksList.id(taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userCampaign = user.campaigns.find(c => c.campaignId.toString() === campaignId);
        if (!userCampaign) {
            return res.status(400).json({ message: 'Join the campaign first' });
        }

        const userTask = user.tasks.find(t =>
            t.taskId.toString() === taskId && t.campaignId.toString() === campaignId
        );
        if (userTask && userTask.status === 'completed') {
            return res.status(400).json({ message: 'Task already completed' });
        }

        const currentDate = new Date();
        const startDate = new Date(campaign.startDate);
        const dayDiff = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        const daysLate = dayDiff - task.day;

        let penaltyFactor = 1;
        if (daysLate > 0) {
            penaltyFactor = Math.max(0.5, 1 - (daysLate * 0.1));
        }

        const baseReward = task.reward || 0;
        const finalReward = baseReward * penaltyFactor;
        let co2Impact = parseFloat(task.co2Impact);
        if (isNaN(co2Impact) || co2Impact <= 0.01) {
            console.warn(`Invalid co2Impact (${task.co2Impact}) for task ${task.title}, updating to 2.0`);
            task.co2Impact = 2.0;
            await campaign.save(); // Save updated task
        }
        co2Impact = parseFloat(task.co2Impact) || 2.0;

        if (!userTask) {
            user.tasks.push({
                campaignId,
                taskId,
                status: 'completed',
                completedAt: new Date()
            });
        } else {
            userTask.status = 'completed';
            userTask.completedAt = new Date();
        }

        userCampaign.completed += 1;
        userCampaign.lastActivity = new Date();

        campaign.completedTasks += 1;

        const participant = campaign.participantsList.find(p => p.userId.toString() === req.user.userId);
        if (participant) {
            participant.completed += 1;
            participant.lastActivity = new Date();

            const participantTask = participant.tasks.find(t => t.taskId.toString() === taskId);
            if (!participantTask) {
                participant.tasks.push({
                    taskId,
                    status: 'completed',
                    completedAt: new Date()
                });
            } else {
                participantTask.status = 'completed';
                participantTask.completedAt = new Date();
            }
        }

        const completedByEntry = task.completedBy.find(entry => entry.userId.toString() === req.user.userId);
        if (!completedByEntry) {
            task.completedBy.push({
                userId: req.user.userId,
                status: 'completed',
                completedAt: new Date()
            });
        } else {
            completedByEntry.status = 'completed';
            completedByEntry.completedAt = new Date();
        }

        user.earnings += finalReward;
        const newCo2Saved = (parseFloat(user.co2Saved || '0') + co2Impact).toFixed(2);
        user.co2Saved = newCo2Saved;

        const transaction = new Transaction({
            userId: user._id,
            amount: finalReward,
            type: 'earn',
            category: 'Campaign',
            activity: `Completed task: ${task.title}`,
            description: `Earned ${finalReward} RFX for completing task in ${campaign.title}`,
            color: 'green',
            timestamp: new Date()
        });

        await Promise.all([user.save(), campaign.save(), transaction.save()]);

        res.json({
            message: 'Task completed successfully',
            reward: finalReward,
            penalty: daysLate > 0 ? `${(1 - penaltyFactor) * 100}% penalty applied` : 'No penalty',
            balance: user.earnings,
            co2Saved: user.co2Saved
        });
    } catch (err) {
        console.error('Complete task error:', err);
        res.status(500).json({ message: 'Failed to complete task' });
    }
});

// Get user's campaigns
// Get user's campaigns
app.get('/user/campaigns', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .populate({
                path: 'campaigns.campaignId',
                select: 'title description category reward duration startDate endDate status image participants completedTasks tasksList',
                model: 'Campaign'
            })
            .select('campaigns tasks')
            .lean();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Format the response
        const userCampaigns = user.campaigns.map(uc => {
            const campaign = uc.campaignId;
            if (!campaign) return null; // Skip if campaign not found
            
            // Safely get total tasks
            const totalTasks = campaign.tasksList?.length || 0;
            
            // Safely get user's completed tasks count
            const userTasks = user.tasks || [];
            const userCompleted = userTasks
                .filter(t => t.campaignId && 
                            t.campaignId.toString() === campaign._id.toString() && 
                            t.status === 'completed')
                .length;
            
            // Calculate progress (0 if no tasks)
            const progress = totalTasks > 0 ? (userCompleted / totalTasks) * 100 : 0;

            return {
                ...campaign,
                _id: campaign._id,
                id: campaign._id.toString(),
                userJoined: true,
                userCompleted,
                lastActivity: uc.lastActivity,
                progress,
                tasks: totalTasks,
                completed: campaign.completedTasks || 0,
                participants: campaign.participants || 0,
                reward: campaign.reward ? `${campaign.reward} RFX` : '0 RFX',
                duration: campaign.duration ? `${campaign.duration} days` : 'N/A',
                startDate: campaign.startDate ? new Date(campaign.startDate).toISOString() : new Date().toISOString()
            };
        }).filter(c => c !== null); // Remove any null entries

        res.json(userCampaigns);
    } catch (err) {
        console.error('Get user campaigns error:', err);
        res.status(500).json({ 
            message: 'Failed to fetch user campaigns',
            error: err.message 
        });
    }
});



// Admin Campaign Routes

// Get all campaigns for admin dashboard
app.get('/admin/campaigns', [authenticateToken, adminAuth], async (req, res) => {
    try {
        const campaigns = await Campaign.find()
            .sort({ createdAt: -1 })
            .lean();

        res.json(campaigns);
    } catch (err) {
        console.error('Get admin campaigns error:', err);
        res.status(500).json({ message: 'Failed to fetch campaigns' });
    }
});

// Get single campaign details for admin
app.get('/admin/campaigns/:id', [authenticateToken, adminAuth], async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id)
            .populate('participantsList.userId', 'username email avatar')
            .lean();

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        res.json(campaign);
    } catch (err) {
        console.error('Get admin campaign details error:', err);
        res.status(500).json({ message: 'Failed to fetch campaign details' });
    }
});

// Get proofs for a campaign
app.get('/admin/campaigns/:id/proofs', [authenticateToken, adminAuth], async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id)
            .select('tasksList participantsList')
            .populate('participantsList.userId', 'username email avatar')
            .lean();

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Format proofs grouped by task
        const proofs = campaign.tasksList.map(task => {
            const taskProofs = task.completedBy.map(proof => {
                const participant = campaign.participantsList.find(p =>
                    p.userId && p.userId._id.toString() === proof.userId.toString()
                );
                return {
                    taskId: task._id,
                    taskTitle: task.title,
                    day: task.day,
                    userId: proof.userId,
                    username: participant?.userId?.username || 'Unknown',
                    email: participant?.userId?.email || '',
                    avatar: participant?.userId?.avatar || '',
                    proofUrl: proof.proofUrl,
                    status: proof.status,
                    submittedAt: proof.submittedAt
                };
            });

            return {
                taskId: task._id,
                taskTitle: task.title,
                day: task.day,
                proofs: taskProofs
            };
        });

        res.json(proofs);
    } catch (err) {
        console.error('Get campaign proofs error:', err);
        res.status(500).json({ message: 'Failed to fetch proofs' });
    }
});

// Approve/reject proof
app.post('/admin/campaigns/:id/approve-proof', [authenticateToken, adminAuth], async (req, res) => {
    try {
        const { taskId, userId, approve } = req.body;
        const campaignId = req.params.id;

        const campaign = await Campaign.findById(campaignId); 
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const task = campaign.tasksList.id(taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const proof = task.completedBy.find(p => p.userId.toString() === userId);
        if (!proof) {
            return res.status(404).json({ message: 'Proof not found' });
        }

        proof.status = approve ? 'completed' : 'rejected';

        const participant = campaign.participantsList.find(p => p.userId.toString() === userId);
        if (participant) {
            const participantTask = participant.tasks.find(t => t.taskId.toString() === taskId);
            if (participantTask) {
                participantTask.status = approve ? 'completed' : 'rejected';
                if (approve) {
                    participantTask.completedAt = new Date();
                }
            }
        }

        let user;
        if (approve) {
            user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const userCampaign = user.campaigns.find(c => c.campaignId.toString() === campaignId);
            if (userCampaign) {
                userCampaign.completed += 1;
                userCampaign.lastActivity = new Date();
            }

            const userTask = user.tasks.find(t =>
                t.taskId.toString() === taskId && t.campaignId.toString() === campaignId
            );
            if (userTask) {
                userTask.status = 'completed';
                userTask.completedAt = new Date();
            }

            let co2Impact = parseFloat(task.co2Impact);
            if (isNaN(co2Impact) || co2Impact <= 0.01) {
                console.warn(`Invalid co2Impact (${task.co2Impact}) for task ${task.title}, updating to 2.0`);
                task.co2Impact = 2.0;
                await campaign.save();
            }
            co2Impact = parseFloat(task.co2Impact) || 2.0;
            user.earnings += task.reward || 0;
            const newCo2Saved = (parseFloat(user.co2Saved || '0') + co2Impact).toFixed(2);
            user.co2Saved = newCo2Saved;

            const transaction = new Transaction({
                userId: user._id,
                amount: task.reward || 0,
                type: 'earn',
                category: 'Campaign',
                activity: `Completed task: ${task.title}`,
                description: `Earned ${task.reward || 0} RFX for completing task in ${campaign.title}`,
                color: 'green',
                timestamp: new Date()
            });

            await transaction.save();
            await user.save();
        }

        campaign.completedTasks += 1;
        await campaign.save();

        res.json({
            message: `Proof ${approve ? 'approved' : 'rejected'} successfully`,
            status: approve ? 'completed' : 'rejected',
            co2Saved: approve ? user.co2Saved : undefined
        });
    } catch (err) {
        console.error('Approve proof error:', err);
        res.status(500).json({ message: 'Failed to update proof status' });
    }
});

// Update campaign
app.put('/admin/campaigns/:id', [authenticateToken, adminAuth, upload.single('image')], async (req, res) => {
    try {
        const formData = req.body;
        const campaign = await Campaign.findById(req.params.id);

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Validate required fields
        if (!formData.title || !formData.description || !formData.category ||
            !formData.reward || !formData.difficulty || !formData.duration ||
            !formData.startDate || !formData.status) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Parse tasks if they exist
        let tasksList = [];
        if (formData.tasks) {
            try {
                tasksList = JSON.parse(formData.tasks);

                // Validate each task
                for (const task of tasksList) {
                    if (!task.title || task.title.length < 3) {
                        return res.status(400).json({
                            message: 'Task title must be at least 3 characters long'
                        });
                    }
                    if (!task.description || task.description.length < 10) {
                        return res.status(400).json({
                            message: 'Task description must be at least 10 characters long'
                        });
                    }
                    if (!task.day || task.day < 1) {
                        return res.status(400).json({
                            message: 'Task day must be at least 1'
                        });
                    }
                    if (!task.reward || task.reward < 0) {
                        return res.status(400).json({
                            message: 'Task reward must be a positive number'
                        });
                    }
                }
            } catch (e) {
                console.error('Error parsing tasks:', e);
                return res.status(400).json({ message: 'Invalid tasks format' });
            }
        }

        // Calculate end date
        const endDate = new Date(new Date(formData.startDate).getTime() +
            (parseInt(formData.duration) * 24 * 60 * 60 * 1000));

        // Handle file path
        let imagePath = campaign.image;
        if (req.file) {
            imagePath = path.join('uploads', 'campaigns', req.file.filename);

            // Delete old image if it exists and a new one is uploaded
            if (campaign.image) {
                const oldImagePath = path.join(__dirname, campaign.image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
        }

        // Update campaign fields
        campaign.title = formData.title;
        campaign.description = formData.description;
        campaign.category = formData.category;
        campaign.reward = parseFloat(formData.reward);
        campaign.difficulty = formData.difficulty;
        campaign.duration = parseInt(formData.duration);
        campaign.featured = formData.featured === 'true';
        campaign.new = formData.new === 'true';
        campaign.trending = formData.trending === 'true';
        campaign.ending = formData.ending === 'true';
        campaign.startDate = formData.startDate;
        campaign.endDate = endDate;
        campaign.status = formData.status;
        campaign.tasksList = tasksList;
        if (imagePath) campaign.image = imagePath;

        await campaign.save();

        res.json({
            ...campaign.toObject(),
            image: imagePath ? `/uploads/campaigns/${path.basename(imagePath)}` : null
        });
    } catch (err) {
        if (req.file) {
            fs.unlink(req.file.path, () => { });
        }
        console.error('Update campaign error:', err);
        res.status(500).json({
            message: err.message || 'Failed to update campaign',
            error: err
        });
    }
});

// Delete campaign
app.delete('/admin/campaigns/:id', [authenticateToken, adminAuth], async (req, res) => {
    try {
        const campaign = await Campaign.findByIdAndDelete(req.params.id);

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Delete associated image if it exists
        if (campaign.image) {
            const imagePath = path.join(__dirname, campaign.image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        // Remove campaign from users
        await User.updateMany(
            { 'campaigns.campaignId': req.params.id },
            { $pull: { campaigns: { campaignId: req.params.id } } }
        );

        res.json({ message: 'Campaign deleted successfully' });
    } catch (err) {
        console.error('Delete campaign error:', err);
        res.status(500).json({ message: 'Failed to delete campaign' });
    }
});


app.get('/admin/campaigns/:id/tasks/:taskId', [authenticateToken, adminAuth], async (req, res) => {
    try {
        const { id: campaignId, taskId } = req.params;

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const task = campaign.tasksList.id(taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.json(task);
    } catch (err) {
        console.error('Get task error:', err);
        res.status(500).json({ message: 'Failed to get task' });
    }
});

// Create a new task in a campaign
// Create task endpoint
app.post('/admin/campaigns/:id/tasks', [authenticateToken, adminAuth, upload.single('contentFile')], async (req, res) => {
    try {
        const { id: campaignId } = req.params;
        const { 
            day, 
            title, 
            description, 
            type, 
            platform = '', 
            reward, 
            requirements = '', 
            contentUrl = '' 
        } = req.body;

        // Validate required fields
        if (!day || !title || !description || !type || !reward) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Handle file upload
        let finalContentUrl = contentUrl;
        if (req.file) {
            finalContentUrl = `/uploads/${req.file.filename}`; // Ensure proper path
        }

        const newTask = {
            day: parseInt(day),
            title,
            description,
            type,
            platform: platform || null,
            reward: parseFloat(reward),
            requirements: requirements ? requirements.split(',').map(r => r.trim()) : [],
            contentUrl: finalContentUrl,
            completedBy: []
        };

        campaign.tasksList.push(newTask);
        await campaign.save();

        res.status(201).json({
            message: 'Task created successfully',
            task: campaign.tasksList[campaign.tasksList.length - 1]
        });
    } catch (err) {
        console.error('Create task error:', err);
        res.status(500).json({ message: 'Failed to create task: ' + err.message });
    }
});

// Update task endpoint
app.put('/admin/campaigns/:id/tasks/:taskId', [authenticateToken, adminAuth, upload.single('contentFile')], async (req, res) => {
    try {
        const { id: campaignId, taskId } = req.params;
        const { 
            day, 
            title, 
            description, 
            type, 
            platform = '', 
            reward, 
            requirements = '', 
            contentUrl = '' 
        } = req.body;

        // Validate required fields
        if (!day || !title || !description || !type || !reward) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const task = campaign.tasksList.id(taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Handle file upload
        let finalContentUrl = contentUrl || task.contentUrl;
        if (req.file) {
            finalContentUrl = `/uploads/${req.file.filename}`;
            // Optionally delete old file if it exists
        }

        // Update task fields
        task.day = parseInt(day);
        task.title = title;
        task.description = description;
        task.type = type;
        task.platform = platform || null;
        task.reward = parseFloat(reward);
        task.requirements = requirements ? requirements.split(',').map(r => r.trim()) : task.requirements;
        task.contentUrl = finalContentUrl;

        await campaign.save();

        res.json({
            message: 'Task updated successfully',
            task
        });
    } catch (err) {
        console.error('Update task error:', err);
        res.status(500).json({ message: 'Failed to update task: ' + err.message });
    }
});

// Delete a specific task in a campaign
app.delete('/admin/campaigns/:id/tasks/:taskId', [authenticateToken, adminAuth], async (req, res) => {
    try {
        const { id: campaignId, taskId } = req.params;

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const task = campaign.tasksList.id(taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Check if task has any proofs submitted
        if (task.completedBy.length > 0) {
            return res.status(400).json({ message: 'Cannot delete task with submitted proofs' });
        }

        // Remove task from campaign
        campaign.tasksList.pull(taskId);

        // Remove task from participants
        campaign.participantsList.forEach(participant => {
            participant.tasks = participant.tasks.filter(t => t.taskId.toString() !== taskId);
        });

        await campaign.save();

        // Remove task from users
        await User.updateMany(
            { 'tasks.taskId': taskId },
            { $pull: { tasks: { taskId: taskId } } }
        );

        res.json({ message: 'Task deleted successfully' });
    } catch (err) {
        console.error('Delete task error:', err);
        res.status(500).json({ message: 'Failed to delete task' });
    }
});

// Get campaigns created by a specific user
app.get('/admin/campaigns/created-by/:userId', [authenticateToken, adminAuth], async (req, res) => {
    try {
        const campaigns = await Campaign.find({ createdBy: req.params.userId })
            .sort({ createdAt: -1 })
            .lean();

        res.json(campaigns);
    } catch (err) {
        console.error('Get user-created campaigns error:', err);
        res.status(500).json({ message: 'Failed to fetch campaigns' });
    }
});



// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error'
    });
});

// MongoDB connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected successfully');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};


const keepDatabaseAlive = () => {
    // Run every 30 minutes (adjust as needed)
    setInterval(async () => {
        try {
            // Perform a simple query to keep the connection alive
            await mongoose.connection.db.admin().ping();
            console.log('Database ping successful - connection kept alive');
        } catch (error) {
            console.error('Database ping failed:', error);
        }
    }, 30 * 60 * 1000); // 30 minutes in milliseconds
};


keepDatabaseAlive()

// Start server
const PORT = process.env.PORT || 3000;
const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

startServer();

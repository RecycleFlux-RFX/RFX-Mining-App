// server.js (rewritten part 1)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const csrf = require('csurf');
const morgan = require('morgan');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const ethers = require('ethers');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const Game = require('./models/Game');
const Campaign = require('./models/campaign');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Leaderboard = require('./models/leaderboard');

dotenv.config();
const app = express();

/**
 * Basic security + logging
 */
app.use(helmet());
app.use(morgan('combined'));

/**
 * Rate limiter for API routes
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api/', apiLimiter);

/**
 * CORS - use FRONTEND_URL in env and allow credentials
 */
const FRONTEND_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-CSRF-Token','X-Requested-With','Accept']
}));

// Preflight quick response
app.options('*', cors());

/**
 * Important: cookieParser must come BEFORE csrf({ cookie: true })
 * and before any code that reads cookies (like auth from cookie).
 */
app.use(cookieParser());

/**
 * Session (optional) — kept but not strictly required for JWT/cookie approach.
 * If you prefer stateless JWT-only, you can remove session usage.
 */
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

/**
 * Body parsing
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * CSRF protection — using cookie-based tokens.
 * csurf will ignore safe methods (GET, HEAD, OPTIONS) by default.
 * We'll also provide a /csrf-token endpoint so SPA can fetch token.
 */
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,             // secret cookie not accessible to JS
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});
app.use(csrfProtection);

// Expose a route to get a readable CSRF token for SPA clients.
// This sets a readable cookie 'XSRF-TOKEN' (non-httpOnly) for frameworks to consume,
// and returns the token in JSON for immediate use.
app.get('/csrf-token', (req, res) => {
  try {
    const token = req.csrfToken();
    // set a cookie readable by JS so frontend frameworks (axios/fetch) can read
    res.cookie('XSRF-TOKEN', token, {
      httpOnly: false, // frontend can read this value
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 10 * 60 * 1000 // short lived
    });
    res.json({ csrfToken: token });
  } catch (err) {
    console.error('Error generating CSRF token:', err);
    res.status(500).json({ message: 'Could not generate CSRF token' });
  }
});

/**
 * Cloudinary configuration and multer storage
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Ensure local upload dir exists (if you store local fallback)
const uploadDir = path.join(__dirname, 'uploads', 'campaigns');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'campaign-proofs',
    allowed_formats: ['jpg','jpeg','png','gif'],
    transformation: [{ width: 800, height: 600, crop: 'limit' }]
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif/;
    const mimetypeOk = allowed.test(file.mimetype);
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    if (mimetypeOk && extOk) return cb(null, true);
    cb(new Error('Only image files (JPEG/JPG/PNG/GIF) are allowed'));
  }
});

// If you still want to serve any local uploads:
app.use('/uploads', express.static(uploadDir));

/**
 * JWT authentication middleware — now supports cookie-based JWT (authToken)
 * and falls back to Authorization header if needed.
 */
const authenticateToken = (req, res, next) => {
  try {
    // Prefer cookie
    const cookieToken = req.cookies && req.cookies.authToken;
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.split(' ')[1];
    const token = cookieToken || bearerToken;

    if (!token) return res.status(401).json({ message: 'Authentication token required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    console.error('Token verification error:', err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Admin & SuperAdmin middleware (use req.user from authenticateToken)
 */
const adminAuth = (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized: No user data found' });
    const isSuperAdmin = req.user.email === process.env.SUPER_ADMIN_EMAIL;
    const isAdmin = req.user.isAdmin === true;
    if (!isSuperAdmin && !isAdmin) return res.status(403).json({ message: 'Not an admin account' });
    next();
  } catch (err) {
    console.error('Admin auth error:', err);
    res.status(500).json({ message: 'Server error during admin authentication' });
  }
};

const superAdminAuth = (req, res, next) => {
  try {
    // reuse authenticateToken above to ensure req.user is present
    if (!req.user) return res.status(401).json({ message: 'Authentication token required' });
    const isSuperAdmin = req.user.isSuperAdmin || (req.user.email && req.user.email === process.env.SUPER_ADMIN_EMAIL);
    if (!isSuperAdmin) return res.status(403).json({ message: 'Super admin access required' });
    next();
  } catch (err) {
    console.error('Super admin auth error:', err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Routes that require CSRF + auth (example: superadmin verify).
 * Because csurf is mounted globally above (and ignores GET/HEAD/OPTIONS),
 * POST/PUT/DELETE requests will require a valid token.
 *
 * NOTE: frontend should fetch /csrf-token first, include token in
 * header 'X-CSRF-Token' or 'X-XSRF-TOKEN' when making state-changing requests.
 */

// Super admin verification
app.post('/auth/superadmin/verify', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return res.status(403).json({ message: 'Super admin access required' });
    }

    const { passcode } = req.body;
    if (passcode !== process.env.SUPER_ADMIN_PASSCODE) {
      return res.status(400).json({ message: 'Invalid passcode' });
    }

    user.isSuperAdmin = true;
    await user.save();

    const newToken = jwt.sign({
      userId: user._id,
      email: user.email,
      isAdmin: true,
      isSuperAdmin: true
    }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Set cookie (HttpOnly) for auth and return token for backwards compatibility
    res.cookie('authToken', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000 // 7 days
    });

    res.status(200).json({ token: newToken, isSuperAdmin: true });
  } catch (err) {
    console.error('Super admin verification error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Admin verify (password check)
app.post('/auth/admin/verify', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user.userId;

    if (!password) return res.status(400).json({ message: 'Password is required' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isAdmin = user.isAdmin || user.email === process.env.SUPER_ADMIN_EMAIL;
    if (!isAdmin) return res.status(403).json({ message: 'Not an admin account' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const isSuperAdmin = user.email === process.env.SUPER_ADMIN_EMAIL;
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

/**
 * Signup route
 * - validations
 * - set auth cookie (HttpOnly) on success and also return token in JSON for older clients
 */
app.post('/auth/signup',
  [
    body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Invalid email format'),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/\d/).withMessage('Password must contain a number')
      .matches(/[a-zA-Z]/).withMessage('Password must contain a letter'),
    body('fullName').trim().notEmpty().withMessage('Full name is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        details: errors.array().map(err => err.msg)
      });
    }

    try {
      const { username, email, password, fullName, referralCode } = req.body;

      // Check existing
      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      if (existingUser) {
        return res.status(409).json({
          message: 'Account exists',
          details: existingUser.email === email ? 'Email already in use' : 'Username taken'
        });
      }

      // Handle referral
      let referrer = null;
      if (referralCode) {
        referrer = await User.findById(referralCode);
        if (!referrer) return res.status(400).json({ message: 'Invalid referral', details: 'Referral code not found' });
        if (!referrer.isActive) return res.status(400).json({ message: 'Invalid referral', details: 'Referrer account is inactive' });
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
        referralStats: { totalReferrals: 0, activeReferrals: 0 }
      };

      const user = new User(userData);
      await user.save();

      // Referral bonus handling (best-effort; log errors but don't break signup)
      if (referrer) {
        try {
          const newUserBonus = parseFloat(process.env.REFERRAL_BONUS_NEW_USER || '0.0001');
          const referrerBonus = parseFloat(process.env.REFERRAL_BONUS_REFERRER || '0.0005');

          referrer.referrals.push(user._id);
          referrer.earnings += referrerBonus;
          referrer.referralStats.totalReferrals += 1;
          referrer.referralStats.activeReferrals += 1;
          user.earnings += newUserBonus;

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

          await Promise.all([referrer.save(), user.save(), referrerTransaction.save(), newUserTransaction.save()]);
        } catch (referralError) {
          console.error('Referral bonus error:', referralError);
        }
      }

      // Generate token and set cookie
      const token = jwt.sign({
        userId: user._id,
        email: user.email,
        isAdmin: user.isAdmin,
        isSuperAdmin: user.email === process.env.SUPER_ADMIN_EMAIL
      }, process.env.JWT_SECRET, { expiresIn: '7d' });

      res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 3600 * 1000
      });

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        token, // returned for compatibility if you still use Authorization header/localStorage
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
  }
);













// Helper Functions with Security Validation
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

const token = generateAuthToken(user);

// Instead of res.json({ token }) or putting in localStorage:
res.cookie('authToken', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});

res.json({ user: formatUserResponse(user) });


function formatUserResponse(user) {
    return {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        walletAddress: user.walletAddress,
        isAdmin: user.isAdmin,
        isSuperAdmin: user.email === process.env.SUPER_ADMIN_EMAIL,
        earnings: user.earnings,
        referralLink: `${process.env.FRONTEND_URL}/signup?ref=${user._id}`
    };
}






// --- Secure Auth & Admin Routes ---

// LOGIN
app.post(
    '/auth/login',
    csrfProtection,
    [
        body('username').trim().notEmpty().withMessage('Username is required'),
        body('password').notEmpty().withMessage('Password is required')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        try {
            const { username, password } = req.body;

            const user = await User.findOne({
                $or: [{ username }, { email: username }]
            });

            if (!user || !(await bcrypt.compare(password, user.password))) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            const isSuperAdmin = user.email === process.env.SUPER_ADMIN_EMAIL;
            const token = generateAuthToken(user);

            // Store JWT securely in HttpOnly cookie
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.status(200).json({
                message: 'Login successful',
                user: formatUserResponse(user),
                requiresPasscode: isSuperAdmin && !user.isSuperAdmin
            });
        } catch (err) {
            console.error('Login error:', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

// CHECK ADMIN EMAIL
app.post(
    '/auth/admin/check',
    csrfProtection,
    [body('email').isEmail().normalizeEmail().withMessage('Valid email is required')],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { email } = req.body;
            const user = await User.findOne({ email });

            if (!user || !user.isAdmin) {
                return res.status(403).json({ message: 'Not an admin account' });
            }

            res.status(200).json({
                message: 'Admin account verified',
                email
            });
        } catch (err) {
            console.error('Admin check error:', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

// GOOGLE SIGN-IN PLACEHOLDER
app.get('/auth/google', (req, res) => {
    res.status(501).json({ message: 'Google Sign-In not implemented' });
});

// VERIFY ADMIN PASSWORD
app.post(
    '/auth/verify-admin',
    authenticateToken,
    csrfProtection,
    [body('password').notEmpty().withMessage('Password is required')],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { password } = req.body;
            const userId = req.user.userId;
            const user = await User.findById(userId);

            if (!user || !user.isAdmin) {
                return res.status(403).json({ message: 'Not an admin account' });
            }

            if (!(await bcrypt.compare(password, user.password))) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            res.status(200).json({
                message: 'Admin verified successfully',
                isSuperAdmin: user.email === process.env.SUPER_ADMIN_EMAIL,
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
    }
);

// GET ALL USERS (Super Admin Only)
app.get(
    '/admin/users',
    authenticateToken,
    superAdminAuth,
    csrfProtection,
    async (req, res) => {
        try {
            const { page = 1, limit = 10, search = '' } = req.query;
            const query = search
                ? {
                      $or: [
                          { username: { $regex: search, $options: 'i' } },
                          { email: { $regex: search, $options: 'i' } },
                          { fullName: { $regex: search, $options: 'i' } }
                      ]
                  }
                : {};

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
    }
);

// SUSPEND / ACTIVATE USER
app.put(
    '/admin/users/:id/suspend',
    authenticateToken,
    superAdminAuth,
    csrfProtection,
    [body('isActive').isBoolean().withMessage('isActive must be a boolean')],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { id } = req.params;
            const { isActive } = req.body;

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            if (user.email === process.env.SUPER_ADMIN_EMAIL) {
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
    }
);













// -----------------------------
// ADMIN STATS
// -----------------------------
app.get(
  '/admin/stats',
  authenticateToken,
  superAdminAuth,
  csrfProtection,
  async (req, res) => {
    try {
      const [
        totalUsers,
        activeUsers,
        totalCampaigns,
        activeCampaigns,
        totalAdmins
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isActive: true }),
        Campaign.countDocuments(),
        Campaign.countDocuments({ status: 'active' }),
        User.countDocuments({ isAdmin: true })
      ]);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const dailySignups = await User.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const userActivity = await User.aggregate([
        {
          $project: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$lastActivity' } },
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
            _id: '$date',
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
        dailySignups: dailySignups.map(item => ({
          date: item._id,
          count: item.count
        })),
        userActivity: userActivity.map(item => ({
          date: item._id,
          active: item.activeUsers
        }))
      });
    } catch (err) {
      console.error('Get stats error:', err);
      res.status(500).json({ message: 'Failed to fetch statistics' });
    }
  }
);

// -----------------------------
// CREATE CAMPAIGN
// -----------------------------
app.post(
  '/admin/campaigns',
  authenticateToken,
  adminAuth,
  csrfProtection,
  upload.single('image'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description')
      .trim()
      .isLength({ min: 10 })
      .withMessage('Description must be at least 10 characters'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('reward').isFloat({ gt: 0 }).withMessage('Reward must be a positive number'),
    body('difficulty')
      .isIn(['easy', 'medium', 'hard'])
      .withMessage('Invalid difficulty level'),
    body('duration').isInt({ gt: 0 }).withMessage('Duration must be a positive integer'),
    body('startDate').isISO8601().withMessage('Invalid start date format'),
    body('status')
      .isIn(['draft', 'active', 'completed'])
      .withMessage('Invalid status')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const formData = req.body;

      let tasksList = [];
      if (formData.tasks) {
        try {
          tasksList = JSON.parse(formData.tasks);

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
            task.completedBy = [];
          }
        } catch (e) {
          console.error('Error parsing tasks:', e);
          return res.status(400).json({ message: 'Invalid tasks format' });
        }
      }

      const endDate = new Date(
        new Date(formData.startDate).getTime() +
          parseInt(formData.duration) * 24 * 60 * 60 * 1000
      );

      let imageUrl = null;
      if (req.file) {
        imageUrl = req.file.path;
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
        tasksList,
        image: imageUrl,
        participants: 0,
        completedTasks: 0,
        participantsList: [],
        createdBy: req.user.userId
      });

      await campaign.save();

      res.status(201).json({
        ...campaign.toObject(),
        image: imageUrl
      });
    } catch (err) {
      if (req.file) {
        try {
          await cloudinary.uploader.destroy(req.file.filename);
        } catch (cleanupErr) {
          console.error('Error cleaning up image:', cleanupErr);
        }
      }
      console.error('Error creating campaign:', err);
      res.status(500).json({
        message: err.message || 'Failed to create campaign'
      });
    }
  }
);

// -----------------------------
// USER DASHBOARD ROUTES
// -----------------------------
app.get(
  '/user/validate-token',
  authenticateToken,
  csrfProtection,
  async (req, res) => {
    try {
      const user = await User.findById(req.user.userId)
        .select('username email isAdmin')
        .lean();

      if (!user) {
        return res.status(404).json({ message: 'User not found', valid: false });
      }

      res.status(200).json({
        valid: true,
        user,
        csrfToken: req.csrfToken()
      });
    } catch (err) {
      console.error('Validate token error:', err);
      res.status(500).json({ message: 'Server error', valid: false });
    }
  }
);

app.get(
  '/user/user',
  authenticateToken,
  csrfProtection,
  async (req, res) => {
    try {
      const user = await User.findById(req.user.userId)
        .select(
          'username email fullName walletAddress earnings co2Saved campaigns tasks'
        )
        .populate('tasks.taskId', 'co2Impact')
        .lean();

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      let totalCO2Saved = 0;
      user.tasks.forEach(task => {
        if (task.status === 'completed' && task.taskId?.co2Impact) {
          totalCO2Saved += parseFloat(task.taskId.co2Impact) || 0.01;
        }
      });

      totalCO2Saved = parseFloat(totalCO2Saved.toFixed(2));

      if (parseFloat(user.co2Saved || '0') !== totalCO2Saved) {
        await User.updateOne(
          { _id: req.user.userId },
          { $set: { co2Saved: totalCO2Saved.toFixed(2) } }
        );
      }

      res.status(200).json({
        username: user.username,
        email: user.email,
        fullName: user.fullName || '',
        walletAddress: user.walletAddress || '',
        earnings: user.earnings || 0,
        co2Saved: totalCO2Saved.toFixed(2),
        campaigns: user.campaigns || [],
        csrfToken: req.csrfToken()
      });
    } catch (err) {
      console.error('Get user data error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

app.get(
  '/user/network-stats',
  authenticateToken,
  csrfProtection,
  async (req, res) => {
    try {
      const totalRecycled = await User.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: { $toDouble: { $ifNull: ['$co2Saved', '0'] } } }
          }
        }
      ]);

      const activeUsers = await User.countDocuments({
        tasks: { $elemMatch: { status: 'completed' } }
      });

      res.status(200).json({
        totalRecycled: (totalRecycled[0]?.total || 0).toFixed(2),
        activeUsers,
        csrfToken: req.csrfToken()
      });
    } catch (err) {
      console.error('Get network stats error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

app.get(
  '/user/referral-link',
  authenticateToken,
  csrfProtection,
  async (req, res) => {
    try {
      const user = await User.findById(req.user.userId)
        .select('username')
        .lean();

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const referralLink = `${
        process.env.FRONTEND_URL || 'http://localhost:5173'
      }/signup?ref=${user._id}`;

      res.status(200).json({
        referralLink,
        csrfToken: req.csrfToken()
      });
    } catch (err) {
      console.error('Get referral link error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);








// Utility: Send JSON with fresh CSRF token
const sendWithCsrf = (res, data = {}) => {
    data.csrfToken = res.req.csrfToken();
    res.status(200).json(data);
};

// GET Referral Info
app.get('/user/referral-info',
    authenticateToken,
    csrfProtection,
    async (req, res) => {
        try {
            const user = await User.findById(req.user.userId)
                .select('username referrals referralEarnings')
                .populate({
                    path: 'referrals',
                    select: 'username createdAt earnings',
                    options: { sort: { createdAt: -1 } }
                })
                .lean();

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const referralLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/signup?ref=${user._id}`;

            sendWithCsrf(res, {
                referralLink,
                referralCount: user.referrals.length,
                referralEarnings: user.referralEarnings || 0,
                referrals: user.referrals
            });
        } catch (err) {
            console.error('Get referral info error:', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

// POST Claim Reward
app.post('/user/claim-reward',
    authenticateToken,
    csrfProtection,
    async (req, res) => {
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

            sendWithCsrf(res, {
                amount: rewardAmount,
                newBalance: user.earnings
            });
        } catch (err) {
            console.error('Claim reward error:', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);

// PATCH Update Wallet
app.patch('/user/update-wallet',
    authenticateToken,
    csrfProtection,
    [
        body('walletAddress')
            .notEmpty().withMessage('Wallet address is required')
            .custom(value => ethers.isAddress(value)).withMessage('Invalid wallet address')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { walletAddress } = req.body;
            const user = await User.findById(req.user.userId);

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            user.walletAddress = walletAddress;
            await user.save();

            sendWithCsrf(res, {
                message: 'Wallet address updated successfully',
                walletAddress
            });
        } catch (err) {
            console.error('Update wallet error:', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);







// Get all admins with security middleware
app.get('/admin/admins', 
    authenticateToken,
    superAdminAuth,
    csrfProtection,
    async (req, res) => {
        try {
            const admins = await User.find({ isAdmin: true })
                .select('-password -passkey -transactions')
                .lean();
                
            res.json({
                admins,
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Get admins error:', err);
            res.status(500).json({ message: 'Failed to fetch admins' });
        }
});

// Create new admin with security middleware
app.post('/admin/admins', 
    authenticateToken,
    superAdminAuth,
    csrfProtection,
    [
        body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
        body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('fullName').trim().notEmpty().withMessage('Full name is required')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { username, email, fullName } = req.body;

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
                    },
                    csrfToken: req.csrfToken()
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

            // In production, you would send an email with the temp password
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
                tempPassword: process.env.NODE_ENV === 'development' ? tempPassword : undefined,
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Create admin error:', err);
            res.status(500).json({ message: 'Failed to create admin' });
        }
});

// Update admin with security middleware
app.put('/admin/admins/:id', 
    authenticateToken,
    superAdminAuth,
    csrfProtection,
    [
        body('username').optional().trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
        body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
        body('fullName').optional().trim().notEmpty().withMessage('Full name is required'),
        body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

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
            if (admin.email === process.env.SUPER_ADMIN_EMAIL) {
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
                },
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Update admin error:', err);
            res.status(500).json({ message: 'Failed to update admin' });
        }
});



// Delete admin (soft delete) with security middleware
app.delete('/admin/admins/:id', 
    authenticateToken,
    superAdminAuth,
    csrfProtection,
    async (req, res) => {
        try {
            const admin = await User.findOne({
                _id: req.params.id,
                isAdmin: true
            });

            if (!admin) {
                return res.status(404).json({ message: 'Admin not found' });
            }

            // Prevent deleting super admin
            if (admin.email === process.env.SUPER_ADMIN_EMAIL) {
                return res.status(403).json({ message: 'Cannot delete super admin' });
            }

            // Soft delete by marking as inactive
            admin.isActive = false;
            await admin.save();

            res.json({ 
                message: 'Admin deactivated successfully',
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Delete admin error:', err);
            res.status(500).json({ message: 'Failed to deactivate admin' });
        }
});

// Reset admin password with security middleware
app.post('/admin/admins/:id/reset-password', 
    authenticateToken,
    superAdminAuth,
    csrfProtection,
    async (req, res) => {
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

            // In production, you would send an email with the new password
            // sendPasswordResetEmail(admin.email, tempPassword);

            res.json({
                message: 'Admin password reset successfully',
                tempPassword: process.env.NODE_ENV === 'development' ? tempPassword : undefined,
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Reset admin password error:', err);
            res.status(500).json({ message: 'Failed to reset admin password' });
        }
});












// Wallet Routes with Security Middleware

// Get wallet transactions with security
app.get('/wallet/transactions', 
    authenticateToken,
    csrfProtection,
    [
        query('period').optional().isIn(['today', 'week', 'month']).withMessage('Invalid period'),
        query('search').optional().trim().escape()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

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

            // Build search filter with sanitized input
            const searchFilter = search ? {
                $or: [
                    { activity: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
                    { description: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
                    { category: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }
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

            res.status(200).json({
                transactions,
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Get transactions error:', err);
            res.status(500).json({ message: 'Server error' });
        }
});

// Send tokens with security
app.post('/wallet/send-tokens', 
    authenticateToken,
    csrfProtection,
    [
        body('recipientAddress')
            .notEmpty().withMessage('Recipient address is required')
            .custom(value => ethers.isAddress(value)).withMessage('Invalid recipient address'),
        body('amount')
            .isFloat({ gt: 0 }).withMessage('Amount must be greater than 0')
            .toFloat()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { recipientAddress, amount } = req.body;
            const userId = req.user.userId;

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

            // Prevent sending to self
            if (sender.walletAddress === recipientAddress) {
                return res.status(400).json({ message: 'Cannot send tokens to yourself' });
            }

            // Apply transaction fee (example: 1%)
            const fee = amount * 0.01;
            const amountAfterFee = amount - fee;

            sender.earnings -= amount;
            recipient.earnings += amountAfterFee;

            const now = new Date();
            const senderTransaction = new Transaction({
                userId: sender._id,
                amount: amount,
                type: 'send',
                category: 'Transfer',
                activity: 'Sent Tokens',
                description: `Sent ${amount} RFX to ${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}`,
                color: 'blue',
                timestamp: now
            });

            const recipientTransaction = new Transaction({
                userId: recipient._id,
                amount: amountAfterFee,
                type: 'receive',
                category: 'Transfer',
                activity: 'Received Tokens',
                description: `Received ${amountAfterFee} RFX from ${sender.walletAddress.slice(0, 6)}...${sender.walletAddress.slice(-4)}`,
                color: 'blue',
                timestamp: now
            });

            // Fee transaction
            const feeTransaction = new Transaction({
                userId: sender._id,
                amount: fee,
                type: 'fee',
                category: 'Transfer',
                activity: 'Transaction Fee',
                description: `Fee for sending ${amount} RFX`,
                color: 'red',
                timestamp: now
            });

            await Promise.all([
                sender.save(),
                recipient.save(),
                senderTransaction.save(),
                recipientTransaction.save(),
                feeTransaction.save()
            ]);

            res.status(200).json({
                message: 'Tokens sent successfully',
                balance: sender.earnings,
                fee: fee,
                amountReceived: amountAfterFee,
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Send tokens error:', err);
            res.status(500).json({ message: 'Server error' });
        }
});

// Get wallet rank with security
app.get('/wallet/rank', 
    authenticateToken,
    csrfProtection,
    async (req, res) => {
        try {
            const user = await User.findById(req.user.userId).select('earnings');
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Get top 100 users for leaderboard context
            const leaderboard = await User.find({})
                .select('username earnings')
                .sort({ earnings: -1 })
                .limit(100)
                .lean();

            const userCount = await User.countDocuments({ earnings: { $gt: user.earnings } });
            
            res.status(200).json({ 
                rank: userCount + 1,
                totalUsers: await User.countDocuments(),
                leaderboard,
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Get rank error:', err);
            res.status(500).json({ message: 'Server error' });
        }
});






// Game Routes
// Get all games
// Game Routes with Security Middleware

// Get all games with rate limiting
app.get('/games', 
    rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
    }),
    async (req, res) => {
        try {
            const games = await Game.find({ isActive: true })
                .select('-internalData -adminNotes')
                .lean();
                
            res.json({
                games: games.map(game => ({
                    ...game,
                    id: game._id
                })),
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Get games error:', err);
            res.status(500).json({ message: 'Server error' });
        }
});

// Get game progress for authenticated user
app.get('/games/progress', 
    authenticateToken,
    csrfProtection,
    async (req, res) => {
        try {
            const user = await User.findById(req.user.userId)
                .select('games level xp totalXp gamesPlayed earnings')
                .lean();
                
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
                })),
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Get game progress error:', err);
            res.status(500).json({ message: 'Server error' });
        }
});

// Start a game session with security
app.post('/games/start', 
    authenticateToken,
    csrfProtection,
    [
        body('gameId').isMongoId().withMessage('Invalid game ID'),
        body('title').trim().notEmpty().withMessage('Game title is required')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { gameId, title } = req.body;

            // Check if game exists and is active
            const game = await Game.findOne({ 
                _id: gameId, 
                isActive: true 
            });
            
            if (!game) {
                return res.status(404).json({
                    success: false,
                    message: 'Game not found or unavailable'
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
                return res.status(429).json({
                    success: false,
                    message: 'Daily play limit reached for this game',
                    resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // Next day
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
                path: game.path,
                sessionId: uuidv4(), // Generate unique session ID
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Error starting game:', err);
            res.status(500).json({
                success: false,
                message: 'Error starting game session'
            });
        }
});

// Submit game score with security
app.post('/games/:id/score', 
    authenticateToken,
    csrfProtection,
    [
        param('id').isMongoId().withMessage('Invalid game ID'),
        body('score').isFloat({ min: 0 }).withMessage('Score must be a positive number')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { score } = req.body;
            const gameId = req.params.id;
            const userId = req.user.userId;

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const game = await Game.findById(gameId);
            if (!game) {
                return res.status(404).json({ message: 'Game not found' });
            }

            // Validate score against game maximum
            if (score > game.maxScore) {
                return res.status(400).json({ 
                    message: `Score exceeds maximum allowed (${game.maxScore})` 
                });
            }

            // Update user's game stats
            let userGame = user.games.find(g => g.gameId.toString() === gameId);
            if (!userGame) {
                return res.status(400).json({ 
                    message: 'Game session not started' 
                });
            }

            userGame.lastPlayed = new Date();
            userGame.plays += 1;
            userGame.totalScore += score;
            if (score > userGame.highScore) {
                userGame.highScore = score;
            }
            userGame.totalXp += game.xpReward;

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
                currentRank: leaderboard.scores.findIndex(s => s.userId.toString() === userId) + 1,
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Submit score error:', err);
            res.status(500).json({ message: 'Failed to submit score' });
        }
});

// Get game leaderboard with security
app.get('/games/:id/leaderboard', 
    rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 60 // limit each IP to 60 requests per windowMs
    }),
    [
        param('id').isMongoId().withMessage('Invalid game ID'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100'),
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const gameId = req.params.id;
            const limit = parseInt(req.query.limit) || 10;
            const page = parseInt(req.query.page) || 1;
            const skip = (page - 1) * limit;

            // Get leaderboard with populated user data
            const leaderboard = await Leaderboard.findOne({ gameId })
                .populate({
                    path: 'scores.userId',
                    select: 'username avatar fullName -_id',
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
                    },
                    csrfToken: req.csrfToken()
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
                    s => s.userId && s.userId._id.toString() === userId
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
                scores: paginatedScores.map((score, index) => ({
                    ...score,
                    rank: skip + index + 1
                })),
                userRank,
                pagination: {
                    total: totalScores,
                    page,
                    limit,
                    totalPages: Math.ceil(totalScores / limit)
                },
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Get leaderboard error:', err);
            res.status(500).json({ message: 'Failed to get leaderboard' });
        }
});

// Complete a game session with security
app.post('/games/complete', 
    authenticateToken,
    csrfProtection,
    [
        body('gameId').isMongoId().withMessage('Invalid game ID'),
        body('score').isFloat({ min: 0 }).withMessage('Score must be a positive number'),
        body('xpEarned').isFloat({ min: 0 }).withMessage('XP must be a positive number')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

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

            // Validate earned amounts against game maximums
            const validatedXp = Math.min(xpEarned, game.maxXpPerPlay);
            const validatedReward = Math.min(game.reward, game.maxRewardPerPlay);

            userGame.totalScore += score;
            userGame.highScore = Math.max(userGame.highScore, score);
            userGame.totalXp += validatedXp;
            user.xp += validatedXp;
            user.earnings += validatedReward;

            // Level up logic
            while (user.xp >= user.totalXp) {
                user.xp -= user.totalXp;
                user.level += 1;
                user.totalXp *= 1.5; // Increase XP needed for next level
            }

            const transaction = new Transaction({
                userId: user._id,
                amount: validatedReward,
                type: 'earn',
                category: 'Game',
                activity: `Completed ${game.title}`,
                description: `Earned ${validatedReward} for playing ${game.title}`,
                color: 'green',
                timestamp: new Date()
            });

            await Promise.all([user.save(), transaction.save()]);
            
            res.json({
                message: 'Game completed successfully',
                reward: validatedReward,
                xp: validatedXp,
                newLevel: user.level,
                newBalance: user.earnings,
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Complete game error:', err);
            res.status(500).json({ message: 'Server error' });
        }
});

// Complete game API endpoint with security
app.post('/api/games/complete', 
    authenticateToken,
    csrfProtection,
    [
        body('gameId').isMongoId().withMessage('Invalid game ID'),
        body('score').isFloat({ min: 0 }).withMessage('Score must be a positive number'),
        body('xpEarned').isFloat({ min: 0 }).withMessage('XP must be a positive number'),
        body('tokensEarned').isFloat({ min: 0 }).withMessage('Tokens must be a positive number')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { gameId, score, xpEarned, tokensEarned } = req.body;

            // Check if game exists and is active
            const game = await Game.findOne({ 
                _id: gameId, 
                isActive: true 
            });
            
            if (!game) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Game not found or unavailable' 
                });
            }

            // Validate earned amounts against game maximums
            const validatedXp = Math.min(xpEarned, game.maxXpPerPlay);
            const validatedTokens = Math.min(tokensEarned, game.maxRewardPerPlay);

            // Update user stats
            const user = await User.findById(req.user.userId);
            
            // Update game-specific stats
            let gameStats = user.games.find(g => g.gameId.toString() === gameId);
            if (!gameStats) {
                return res.status(400).json({
                    success: false,
                    message: 'Game session not started'
                });
            }

            gameStats.plays += 1;
            gameStats.lastPlayed = new Date();
            gameStats.totalScore += score;
            if (score > gameStats.highScore) {
                gameStats.highScore = score;
            }
            gameStats.totalXp += validatedXp;

            // Update general stats
            user.playerStats = user.playerStats || {};
            user.playerStats.xp += validatedXp;
            user.playerStats.gamesPlayed += 1;
            user.playerStats.tokensEarned += validatedTokens;
            
            // Check for level up
            if (user.playerStats.xp >= user.playerStats.totalXp) {
                user.playerStats.level += 1;
                user.playerStats.xp = user.playerStats.xp - user.playerStats.totalXp;
                user.playerStats.totalXp = Math.floor(user.playerStats.totalXp * 1.2);
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

            // Create transaction record
            const transaction = new Transaction({
                userId: user._id,
                amount: validatedTokens,
                type: 'earn',
                category: 'Game',
                activity: `Completed ${game.title}`,
                description: `Earned ${validatedTokens} tokens playing ${game.title}`,
                timestamp: new Date()
            });

            await Promise.all([user.save(), transaction.save()]);

            res.status(200).json({ 
                success: true, 
                message: 'Game completed successfully',
                playerStats: user.playerStats,
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Error completing game:', err);
            res.status(500).json({ 
                success: false, 
                message: 'Error completing game' 
            });
        }
});


















// User Progress Route with Security
app.get('/api/games/progress', 
    authenticateToken,
    csrfProtection,
    rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
    }),
    async (req, res) => {
        try {
            const user = await User.findById(req.user.userId)
                .select('playerStats games gamePlays username email')
                .populate('games.gameId', 'title category thumbnail')
                .lean();

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Calculate recent activity (last 5 games)
            const recentGames = user.gamePlays
                .sort((a, b) => b.playedAt - a.playedAt)
                .slice(0, 5)
                .map(game => ({
                    gameId: game.gameId,
                    title: game.title,
                    score: game.score,
                    playedAt: game.playedAt
                }));

            // Calculate game statistics
            const gameStats = user.games.map(game => ({
                gameId: game.gameId._id,
                title: game.gameId.title,
                category: game.gameId.category,
                thumbnail: game.gameId.thumbnail,
                lastPlayed: game.lastPlayed,
                plays: game.plays,
                highScore: game.highScore,
                totalXp: game.totalXp
            }));

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
                gameStats,
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Error fetching user progress:', err);
            res.status(500).json({
                success: false,
                message: 'Error fetching user progress'
            });
        }
});

// Admin Game Routes with Security

// Create game
app.post('/admin/games', 
    authenticateToken,
    adminAuth,
    csrfProtection,
    [
        body('title').trim().notEmpty().withMessage('Title is required'),
        body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
        body('category').trim().notEmpty().withMessage('Category is required'),
        body('path').trim().notEmpty().withMessage('Game path is required'),
        body('thumbnail').trim().notEmpty().withMessage('Thumbnail URL is required'),
        body('reward').isFloat({ min: 0 }).withMessage('Reward must be a positive number'),
        body('xpReward').isInt({ min: 0 }).withMessage('XP reward must be a positive integer'),
        body('dailyLimit').isInt({ min: 1 }).withMessage('Daily limit must be at least 1'),
        body('maxScore').isInt({ min: 1 }).withMessage('Max score must be at least 1'),
        body('maxXpPerPlay').isInt({ min: 1 }).withMessage('Max XP per play must be at least 1'),
        body('maxRewardPerPlay').isFloat({ min: 0 }).withMessage('Max reward per play must be positive')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const gameData = req.body;
            
            // Check if game with same path already exists
            const existingGame = await Game.findOne({ path: gameData.path });
            if (existingGame) {
                return res.status(409).json({ 
                    message: 'Game with this path already exists' 
                });
            }

            const game = new Game({
                ...gameData,
                reward: `₿ ${parseFloat(gameData.reward).toFixed(5)}`,
                createdBy: req.user.userId,
                updatedBy: req.user.userId,
                isActive: true
            });

            await game.save();

            // Audit log
            await new AuditLog({
                action: 'CREATE_GAME',
                targetId: game._id,
                performedBy: req.user.userId,
                metadata: {
                    title: game.title,
                    category: game.category
                }
            }).save();

            res.status(201).json({
                ...game.toObject(),
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Create game error:', err);
            res.status(500).json({ message: 'Server error' });
        }
});

// Update game
app.put('/admin/games/:id', 
    authenticateToken,
    adminAuth,
    csrfProtection,
    [
        param('id').isMongoId().withMessage('Invalid game ID'),
        body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
        body('description').optional().trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
        body('reward').optional().isFloat({ min: 0 }).withMessage('Reward must be a positive number'),
        body('xpReward').optional().isInt({ min: 0 }).withMessage('XP reward must be a positive integer'),
        body('dailyLimit').optional().isInt({ min: 1 }).withMessage('Daily limit must be at least 1')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const game = await Game.findById(req.params.id);
            if (!game) {
                return res.status(404).json({ message: 'Game not found' });
            }

            const oldData = { ...game.toObject() };
            Object.assign(game, req.body);
            
            if (req.body.reward) {
                game.reward = `₿ ${parseFloat(req.body.reward).toFixed(5)}`;
            }

            game.updatedBy = req.user.userId;
            game.updatedAt = new Date();

            await game.save();

            // Audit log
            await new AuditLog({
                action: 'UPDATE_GAME',
                targetId: game._id,
                performedBy: req.user.userId,
                metadata: {
                    changes: getObjectDifferences(oldData, game.toObject())
                }
            }).save();

            res.json({
                ...game.toObject(),
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Update game error:', err);
            res.status(500).json({ message: 'Server error' });
        }
});

// Delete game (soft delete)
app.delete('/admin/games/:id', 
    authenticateToken,
    superAdminAuth, // Only super admin can delete games
    csrfProtection,
    [
        param('id').isMongoId().withMessage('Invalid game ID')
    ],
    async (req, res) => {
        try {
            const game = await Game.findById(req.params.id);
            if (!game) {
                return res.status(404).json({ message: 'Game not found' });
            }

            // Soft delete by marking as inactive
            game.isActive = false;
            game.updatedBy = req.user.userId;
            game.updatedAt = new Date();
            await game.save();

            // Audit log
            await new AuditLog({
                action: 'DELETE_GAME',
                targetId: game._id,
                performedBy: req.user.userId,
                metadata: {
                    title: game.title
                }
            }).save();

            res.json({ 
                message: 'Game deactivated successfully',
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Delete game error:', err);
            res.status(500).json({ message: 'Server error' });
        }
});

// Helper function for audit logs
function getObjectDifferences(oldObj, newObj) {
    const changes = {};
    for (const key in newObj) {
        if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
            changes[key] = {
                old: oldObj[key],
                new: newObj[key]
            };
        }
    }
    return changes;
}









// Campaign Routes with Security Middleware

// Get all campaigns (public) with rate limiting
app.get('/campaigns', 
    rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
    }),
    [
        query('status').optional().isIn(['active', 'upcoming', 'completed']).withMessage('Invalid status'),
        query('category').optional().trim().escape(),
        query('featured').optional().isBoolean().withMessage('Featured must be true or false')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { status, category, featured } = req.query;
            let query = { isActive: true }; // Only show active campaigns

            if (status) query.status = status;
            if (category) query.category = category;
            if (featured) query.featured = featured === 'true';

            const campaigns = await Campaign.find(query)
                .select('-tasksList -participantsList -internalNotes')
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

            res.json({ 
                data: campaignsWithProgress,
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Get campaigns error:', err);
            res.status(500).json({ message: 'Failed to fetch campaigns' });
        }
});

// Get campaign details (public) with rate limiting
app.get('/campaigns/:id', 
    rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 60 // limit each IP to 60 requests per windowMs
    }),
    [
        param('id').isMongoId().withMessage('Invalid campaign ID')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const campaign = await Campaign.findOne({
                _id: req.params.id,
                isActive: true
            })
                .select('-participantsList -internalNotes')
                .lean();

            if (!campaign) {
                return res.status(404).json({ message: 'Campaign not found' });
            }

            res.json({
                ...campaign,
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Get campaign details error:', err);
            res.status(500).json({ message: 'Failed to fetch campaign details' });
        }
});

// Get campaign details for authenticated user
app.get('/campaigns/:id/user', 
    authenticateToken,
    csrfProtection,
    [
        param('id').isMongoId().withMessage('Invalid campaign ID')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const campaign = await Campaign.findOne({
                _id: req.params.id,
                isActive: true
            }).lean();

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
                allTasks: userTasks,
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Get user campaign error:', err);
            res.status(500).json({ message: 'Failed to fetch campaign details' });
        }
});

// Join campaign with security
app.post('/campaigns/:id/join', 
    authenticateToken,
    csrfProtection,
    [
        param('id').isMongoId().withMessage('Invalid campaign ID')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const campaignId = req.params.id;
            const userId = req.user.userId;

            const campaign = await Campaign.findOne({
                _id: campaignId,
                isActive: true,
                status: 'active'
            });
            if (!campaign) {
                return res.status(404).json({ message: 'Campaign not found or not active' });
            }

            // Check campaign capacity
            if (campaign.participants >= campaign.capacity) {
                return res.status(400).json({ message: 'Campaign has reached maximum capacity' });
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

            // Create audit log
            const auditLog = new AuditLog({
                action: 'JOIN_CAMPAIGN',
                userId: user._id,
                targetId: campaign._id,
                metadata: {
                    campaignTitle: campaign.title,
                    username: user.username
                }
            });

            await Promise.all([user.save(), campaign.save(), auditLog.save()]);

            res.json({
                message: 'Successfully joined campaign',
                campaignId: campaign._id,
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Join campaign error:', err);
            res.status(500).json({ message: 'Failed to join campaign' });
        }
});






// Campaign Proof Routes with Security Middleware

// Upload proof with Cloudinary integration
app.post('/campaigns/:campaignId/tasks/:taskId/proof', 
    authenticateToken,
    csrfProtection,
    upload.single('proof'),
    [
        param('campaignId').isMongoId().withMessage('Invalid campaign ID'),
        param('taskId').isMongoId().withMessage('Invalid task ID'),
        body('proof').custom((value, { req }) => req.file).withMessage('Proof file is required')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Clean up uploaded file if validation fails
            if (req.file) {
                await cloudinary.uploader.destroy(req.file.filename);
            }
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { campaignId, taskId } = req.params;
            const userId = req.user.userId;
            const proofUrl = req.file.path; // Cloudinary URL

            const campaign = await Campaign.findOne({
                _id: campaignId,
                isActive: true,
                status: 'active'
            });
            if (!campaign) {
                await cloudinary.uploader.destroy(req.file.filename);
                return res.status(404).json({ message: 'Campaign not found or not active' });
            }

            const task = campaign.tasksList.id(taskId);
            if (!task) {
                await cloudinary.uploader.destroy(req.file.filename);
                return res.status(404).json({ message: 'Task not found' });
            }

            const user = await User.findById(userId);
            if (!user) {
                await cloudinary.uploader.destroy(req.file.filename);
                return res.status(404).json({ message: 'User not found' });
            }

            // Verify user has joined the campaign
            const hasJoined = user.campaigns.some(c => c.campaignId.toString() === campaignId);
            if (!hasJoined) {
                await cloudinary.uploader.destroy(req.file.filename);
                return res.status(403).json({ message: 'Join the campaign first' });
            }

            // Update user's task status
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
                // Clean up previous proof if exists
                if (userTask.proof) {
                    try {
                        const publicId = userTask.proof.split('/').pop().split('.')[0];
                        await cloudinary.uploader.destroy(`campaign-proofs/${publicId}`);
                    } catch (cleanupError) {
                        console.error('Error cleaning up previous proof:', cleanupError);
                    }
                }
                userTask.status = 'pending';
                userTask.proof = proofUrl;
                userTask.submittedAt = new Date();
            }

            // Update campaign participant's task status
            const participant = campaign.participantsList.find(p =>
                p.userId.toString() === userId
            );

            if (!participant) {
                await cloudinary.uploader.destroy(req.file.filename);
                return res.status(403).json({ message: 'User has not joined this campaign' });
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

            // Update task's completedBy
            let completedByEntry = task.completedBy.find(entry =>
                entry.userId.toString() === userId
            );

            if (!completedByEntry) {
                task.completedBy.push({
                    userId,
                    proofUrl,
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

            // Create audit log
            const auditLog = new AuditLog({
                action: 'SUBMIT_PROOF',
                userId,
                targetId: campaign._id,
                metadata: {
                    campaignTitle: campaign.title,
                    taskTitle: task.title,
                    proofUrl
                }
            });

            await Promise.all([user.save(), campaign.save(), auditLog.save()]);

            res.json({
                message: 'Proof uploaded successfully, pending verification',
                proofUrl,
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            // Clean up uploaded file on error
            if (req.file) {
                await cloudinary.uploader.destroy(req.file.filename);
            }
            console.error('Upload proof error:', err);
            res.status(500).json({ message: 'Failed to upload proof' });
        }
});

// Complete a task (for tasks that don't require proof)
app.post('/campaigns/:id/tasks/:taskId/complete', 
    authenticateToken,
    csrfProtection,
    [
        param('id').isMongoId().withMessage('Invalid campaign ID'),
        param('taskId').isMongoId().withMessage('Invalid task ID')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { id: campaignId, taskId } = req.params;
            const userId = req.user.userId;

            const campaign = await Campaign.findOne({
                _id: campaignId,
                isActive: true,
                status: 'active'
            });
            if (!campaign) {
                return res.status(404).json({ message: 'Campaign not found or not active' });
            }

            const task = campaign.tasksList.id(taskId);
            if (!task) {
                return res.status(404).json({ message: 'Task not found' });
            }

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Verify user has joined the campaign
            const userCampaign = user.campaigns.find(c => c.campaignId.toString() === campaignId);
            if (!userCampaign) {
                return res.status(403).json({ message: 'Join the campaign first' });
            }

            // Check if task already completed
            const userTask = user.tasks.find(t =>
                t.taskId.toString() === taskId && 
                t.campaignId.toString() === campaignId
            );
            if (userTask && userTask.status === 'completed') {
                return res.status(400).json({ message: 'Task already completed' });
            }

            // Calculate penalty for late submission
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
            let co2Impact = parseFloat(task.co2Impact) || 2.0;

            // Update user task status
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

            // Update campaign stats
            campaign.completedTasks += 1;

            // Update participant stats
            const participant = campaign.participantsList.find(p => p.userId.toString() === userId);
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

            // Update task completion
            const completedByEntry = task.completedBy.find(entry => entry.userId.toString() === userId);
            if (!completedByEntry) {
                task.completedBy.push({
                    userId,
                    status: 'completed',
                    completedAt: new Date()
                });
            } else {
                completedByEntry.status = 'completed';
                completedByEntry.completedAt = new Date();
            }

            // Update user rewards
            user.earnings += finalReward;
            user.co2Saved = (parseFloat(user.co2Saved || '0') + co2Impact).toFixed(2);

            // Create transaction
            const transaction = new Transaction({
                userId,
                amount: finalReward,
                type: 'earn',
                category: 'Campaign',
                activity: `Completed task: ${task.title}`,
                description: `Earned ${finalReward} RFX for completing task in ${campaign.title}`,
                timestamp: new Date()
            });

            // Create audit log
            const auditLog = new AuditLog({
                action: 'COMPLETE_TASK',
                userId,
                targetId: campaign._id,
                metadata: {
                    campaignTitle: campaign.title,
                    taskTitle: task.title,
                    reward: finalReward,
                    co2Impact
                }
            });

            await Promise.all([
                user.save(),
                campaign.save(),
                transaction.save(),
                auditLog.save()
            ]);

            res.json({
                message: 'Task completed successfully',
                reward: finalReward,
                penalty: daysLate > 0 ? `${(1 - penaltyFactor) * 100}% penalty applied` : 'No penalty',
                balance: user.earnings,
                co2Saved: user.co2Saved,
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Complete task error:', err);
            res.status(500).json({ message: 'Failed to complete task' });
        }
});

// Get user's campaigns with security
app.get('/user/campaigns', 
    authenticateToken,
    csrfProtection,
    async (req, res) => {
        try {
            const user = await User.findById(req.user.userId)
                .populate({
                    path: 'campaigns.campaignId',
                    select: 'title description category reward duration startDate endDate status image participants completedTasks tasksList',
                    match: { isActive: true }
                })
                .select('campaigns tasks')
                .lean();

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Format the response
            const userCampaigns = user.campaigns
                .filter(uc => uc.campaignId) // Filter out null campaigns
                .map(uc => {
                    const campaign = uc.campaignId;
                    const totalTasks = campaign.tasksList?.length || 0;
                    const userCompleted = user.tasks
                        .filter(t => t.campaignId && 
                                    t.campaignId.toString() === campaign._id.toString() && 
                                    t.status === 'completed')
                        .length;
                    const progress = totalTasks > 0 ? (userCompleted / totalTasks) * 100 : 0;

                    return {
                        ...campaign,
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
                });

            res.json({
                campaigns: userCampaigns,
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Get user campaigns error:', err);
            res.status(500).json({ 
                message: 'Failed to fetch user campaigns',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
});

// Admin Campaign Routes with Security

// Get all campaigns for admin dashboard
app.get('/admin/campaigns', 
    authenticateToken,
    adminAuth,
    csrfProtection,
    async (req, res) => {
        try {
            const campaigns = await Campaign.find()
                .sort({ createdAt: -1 })
                .lean();

            res.json({
                campaigns,
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Get admin campaigns error:', err);
            res.status(500).json({ message: 'Failed to fetch campaigns' });
        }
});

// Get single campaign details for admin
app.get('/admin/campaigns/:id', 
    authenticateToken,
    adminAuth,
    csrfProtection,
    [
        param('id').isMongoId().withMessage('Invalid campaign ID')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const campaign = await Campaign.findById(req.params.id)
                .populate('participantsList.userId', 'username email avatar')
                .lean();

            if (!campaign) {
                return res.status(404).json({ message: 'Campaign not found' });
            }

            res.json({
                ...campaign,
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Get admin campaign details error:', err);
            res.status(500).json({ message: 'Failed to fetch campaign details' });
        }
});

// Get proofs for a campaign
app.get('/admin/campaigns/:id/proofs', 
    authenticateToken,
    adminAuth,
    csrfProtection,
    [
        param('id').isMongoId().withMessage('Invalid campaign ID')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

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

            res.json({
                proofs,
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Get campaign proofs error:', err);
            res.status(500).json({ message: 'Failed to fetch proofs' });
        }
});










// Approve/reject proof with security
app.post('/admin/campaigns/:id/approve-proof', 
    authenticateToken,
    adminAuth,
    csrfProtection,
    [
        param('id').isMongoId().withMessage('Invalid campaign ID'),
        body('taskId').isMongoId().withMessage('Invalid task ID'),
        body('userId').isMongoId().withMessage('Invalid user ID'),
        body('approve').isBoolean().withMessage('Approve must be a boolean')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { taskId, userId, approve } = req.body;
            const campaignId = req.params.id;

            const campaign = await Campaign.findOne({
                _id: campaignId,
                isActive: true
            }); 
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

            // Create audit log before changes
            const auditLog = new AuditLog({
                action: approve ? 'APPROVE_PROOF' : 'REJECT_PROOF',
                adminId: req.user.userId,
                userId: userId,
                targetId: campaign._id,
                metadata: {
                    campaignTitle: campaign.title,
                    taskTitle: task.title,
                    previousStatus: proof.status
                }
            });

            proof.status = approve ? 'completed' : 'rejected';
            proof.reviewedBy = req.user.userId;
            proof.reviewedAt = new Date();

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
            let transaction;
            if (approve) {
                user = await User.findById(userId);
                if (!user) {
                    await auditLog.save();
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

                let co2Impact = parseFloat(task.co2Impact) || 2.0;
                user.earnings += task.reward || 0;
                user.co2Saved = (parseFloat(user.co2Saved || '0') + co2Impact).toFixed(2);

                transaction = new Transaction({
                    userId: user._id,
                    amount: task.reward || 0,
                    type: 'earn',
                    category: 'Campaign',
                    activity: `Completed task: ${task.title}`,
                    description: `Earned ${task.reward || 0} RFX for completing task in ${campaign.title}`,
                    timestamp: new Date(),
                    adminApproved: true,
                    approvedBy: req.user.userId
                });

                await transaction.save();
                await user.save();
            }

            if (approve) {
                campaign.completedTasks += 1;
            }
            await Promise.all([campaign.save(), auditLog.save()]);

            res.json({
                message: `Proof ${approve ? 'approved' : 'rejected'} successfully`,
                status: proof.status,
                co2Saved: approve ? user.co2Saved : undefined,
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Approve proof error:', err);
            res.status(500).json({ message: 'Failed to update proof status' });
        }
});

// Update campaign with security
app.put('/admin/campaigns/:id', 
    authenticateToken,
    adminAuth,
    csrfProtection,
    upload.single('image'),
    [
        param('id').isMongoId().withMessage('Invalid campaign ID'),
        body('title').trim().notEmpty().withMessage('Title is required'),
        body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
        body('category').trim().notEmpty().withMessage('Category is required'),
        body('reward').isFloat({ min: 0 }).withMessage('Reward must be a positive number'),
        body('difficulty').isIn(['easy', 'medium', 'hard']).withMessage('Invalid difficulty level'),
        body('duration').isInt({ min: 1 }).withMessage('Duration must be at least 1 day'),
        body('startDate').isISO8601().withMessage('Invalid start date format'),
        body('status').isIn(['draft', 'active', 'completed']).withMessage('Invalid status')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            if (req.file) {
                await cloudinary.uploader.destroy(req.file.filename);
            }
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const formData = req.body;
            const campaign = await Campaign.findById(req.params.id);

            if (!campaign) {
                if (req.file) {
                    await cloudinary.uploader.destroy(req.file.filename);
                }
                return res.status(404).json({ message: 'Campaign not found' });
            }

            // Parse tasks if they exist
            let tasksList = [];
            if (formData.tasks) {
                try {
                    tasksList = JSON.parse(formData.tasks);

                    for (const task of tasksList) {
                        if (!task.title || task.title.length < 3) {
                            if (req.file) {
                                await cloudinary.uploader.destroy(req.file.filename);
                            }
                            return res.status(400).json({
                                message: 'Task title must be at least 3 characters long'
                            });
                        }
                        if (!task.description || task.description.length < 10) {
                            if (req.file) {
                                await cloudinary.uploader.destroy(req.file.filename);
                            }
                            return res.status(400).json({
                                message: 'Task description must be at least 10 characters long'
                            });
                        }
                        if (!task.day || task.day < 1) {
                            if (req.file) {
                                await cloudinary.uploader.destroy(req.file.filename);
                            }
                            return res.status(400).json({
                                message: 'Task day must be at least 1'
                            });
                        }
                        if (!task.reward || task.reward < 0) {
                            if (req.file) {
                                await cloudinary.uploader.destroy(req.file.filename);
                            }
                            return res.status(400).json({
                                message: 'Task reward must be a positive number'
                            });
                        }
                    }
                } catch (e) {
                    if (req.file) {
                        await cloudinary.uploader.destroy(req.file.filename);
                    }
                    console.error('Error parsing tasks:', e);
                    return res.status(400).json({ message: 'Invalid tasks format' });
                }
            }

            // Calculate end date
            const endDate = new Date(new Date(formData.startDate).getTime() +
                (parseInt(formData.duration) * 24 * 60 * 60 * 1000));

            // Handle file upload
            let imageUrl = campaign.image;
            if (req.file) {
                imageUrl = req.file.path; // Cloudinary URL
                // Delete old image if it exists
                if (campaign.image) {
                    try {
                        const publicId = campaign.image.split('/').pop().split('.')[0];
                        await cloudinary.uploader.destroy(`campaign-images/${publicId}`);
                    } catch (cleanupError) {
                        console.error('Error cleaning up old image:', cleanupError);
                    }
                }
            }

            // Save old data for audit log
            const oldCampaignData = { ...campaign.toObject() };

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
            campaign.image = imageUrl;
            campaign.updatedBy = req.user.userId;

            // Create audit log
            const auditLog = new AuditLog({
                action: 'UPDATE_CAMPAIGN',
                adminId: req.user.userId,
                targetId: campaign._id,
                metadata: {
                    changes: getObjectDifferences(oldCampaignData, campaign.toObject())
                }
            });

            await Promise.all([campaign.save(), auditLog.save()]);

            res.json({
                ...campaign.toObject(),
                image: imageUrl,
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            if (req.file) {
                await cloudinary.uploader.destroy(req.file.filename);
            }
            console.error('Update campaign error:', err);
            res.status(500).json({
                message: 'Failed to update campaign',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
});

// Delete campaign (soft delete) with security
app.delete('/admin/campaigns/:id', 
    authenticateToken,
    superAdminAuth, // Only super admin can delete campaigns
    csrfProtection,
    [
        param('id').isMongoId().withMessage('Invalid campaign ID')
    ],
    async (req, res) => {
        try {
            const campaign = await Campaign.findById(req.params.id);
            if (!campaign) {
                return res.status(404).json({ message: 'Campaign not found' });
            }

            // Create audit log before changes
            const auditLog = new AuditLog({
                action: 'DELETE_CAMPAIGN',
                adminId: req.user.userId,
                targetId: campaign._id,
                metadata: {
                    campaignTitle: campaign.title,
                    participants: campaign.participants
                }
            });

            // Soft delete by marking as inactive
            campaign.isActive = false;
            campaign.updatedBy = req.user.userId;

            await Promise.all([campaign.save(), auditLog.save()]);

            res.json({ 
                message: 'Campaign deactivated successfully',
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Delete campaign error:', err);
            res.status(500).json({ message: 'Failed to delete campaign' });
        }
});

// Get task details with security
app.get('/admin/campaigns/:id/tasks/:taskId', 
    authenticateToken,
    adminAuth,
    csrfProtection,
    [
        param('id').isMongoId().withMessage('Invalid campaign ID'),
        param('taskId').isMongoId().withMessage('Invalid task ID')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { id: campaignId, taskId } = req.params;

            const campaign = await Campaign.findOne({
                _id: campaignId,
                isActive: true
            });
            if (!campaign) {
                return res.status(404).json({ message: 'Campaign not found' });
            }

            const task = campaign.tasksList.id(taskId);
            if (!task) {
                return res.status(404).json({ message: 'Task not found' });
            }

            res.json({
                ...task.toObject(),
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Get task error:', err);
            res.status(500).json({ message: 'Failed to get task' });
        }
});

// Create task with security
app.post('/admin/campaigns/:id/tasks', 
    authenticateToken,
    adminAuth,
    csrfProtection,
    upload.single('contentFile'),
    [
        param('id').isMongoId().withMessage('Invalid campaign ID'),
        body('day').isInt({ min: 1 }).withMessage('Day must be at least 1'),
        body('title').trim().notEmpty().withMessage('Title is required'),
        body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
        body('type').isIn(['social', 'content', 'action', 'other']).withMessage('Invalid task type'),
        body('reward').isFloat({ min: 0 }).withMessage('Reward must be a positive number'),
        body('co2Impact').isFloat({ min: 0 }).withMessage('CO2 impact must be a positive number')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            if (req.file) {
                await cloudinary.uploader.destroy(req.file.filename);
            }
            return res.status(400).json({ errors: errors.array() });
        }

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
                contentUrl = '',
                co2Impact 
            } = req.body;

            const campaign = await Campaign.findOne({
                _id: campaignId,
                isActive: true
            });
            if (!campaign) {
                if (req.file) {
                    await cloudinary.uploader.destroy(req.file.filename);
                }
                return res.status(404).json({ message: 'Campaign not found' });
            }

            // Handle file upload
            let finalContentUrl = contentUrl;
            if (req.file) {
                finalContentUrl = req.file.path; // Cloudinary URL
            }

            const newTask = {
                day: parseInt(day),
                title,
                description,
                type,
                platform: platform || null,
                reward: parseFloat(reward),
                co2Impact: parseFloat(co2Impact),
                requirements: requirements ? requirements.split(',').map(r => r.trim()) : [],
                contentUrl: finalContentUrl,
                completedBy: [],
                createdBy: req.user.userId
            };

            campaign.tasksList.push(newTask);
            await campaign.save();

            // Create audit log
            const auditLog = new AuditLog({
                action: 'CREATE_TASK',
                adminId: req.user.userId,
                targetId: campaign._id,
                metadata: {
                    taskTitle: title,
                    campaignTitle: campaign.title
                }
            });
            await auditLog.save();

            res.status(201).json({
                message: 'Task created successfully',
                task: campaign.tasksList[campaign.tasksList.length - 1],
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            if (req.file) {
                await cloudinary.uploader.destroy(req.file.filename);
            }
            console.error('Create task error:', err);
            res.status(500).json({ 
                message: 'Failed to create task',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
});

// Update task with security
app.put('/admin/campaigns/:id/tasks/:taskId', 
    authenticateToken,
    adminAuth,
    csrfProtection,
    upload.single('contentFile'),
    [
        param('id').isMongoId().withMessage('Invalid campaign ID'),
        param('taskId').isMongoId().withMessage('Invalid task ID'),
        body('day').isInt({ min: 1 }).withMessage('Day must be at least 1'),
        body('title').trim().notEmpty().withMessage('Title is required'),
        body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
        body('type').isIn(['social', 'content', 'action', 'other']).withMessage('Invalid task type'),
        body('reward').isFloat({ min: 0 }).withMessage('Reward must be a positive number'),
        body('co2Impact').isFloat({ min: 0 }).withMessage('CO2 impact must be a positive number')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            if (req.file) {
                await cloudinary.uploader.destroy(req.file.filename);
            }
            return res.status(400).json({ errors: errors.array() });
        }

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
                contentUrl = '',
                co2Impact 
            } = req.body;

            const campaign = await Campaign.findOne({
                _id: campaignId,
                isActive: true
            });
            if (!campaign) {
                if (req.file) {
                    await cloudinary.uploader.destroy(req.file.filename);
                }
                return res.status(404).json({ message: 'Campaign not found' });
            }

            const task = campaign.tasksList.id(taskId);
            if (!task) {
                if (req.file) {
                    await cloudinary.uploader.destroy(req.file.filename);
                }
                return res.status(404).json({ message: 'Task not found' });
            }

            // Save old data for audit log
            const oldTaskData = { ...task.toObject() };

            // Handle file upload
            let finalContentUrl = contentUrl || task.contentUrl;
            if (req.file) {
                finalContentUrl = req.file.path; // Cloudinary URL
                // Delete old file if it exists
                if (task.contentUrl) {
                    try {
                        const publicId = task.contentUrl.split('/').pop().split('.')[0];
                        await cloudinary.uploader.destroy(`task-content/${publicId}`);
                    } catch (cleanupError) {
                        console.error('Error cleaning up old content:', cleanupError);
                    }
                }
            }

            // Update task fields
            task.day = parseInt(day);
            task.title = title;
            task.description = description;
            task.type = type;
            task.platform = platform || null;
            task.reward = parseFloat(reward);
            task.co2Impact = parseFloat(co2Impact);
            task.requirements = requirements ? requirements.split(',').map(r => r.trim()) : task.requirements;
            task.contentUrl = finalContentUrl;
            task.updatedBy = req.user.userId;

            // Create audit log
            const auditLog = new AuditLog({
                action: 'UPDATE_TASK',
                adminId: req.user.userId,
                targetId: campaign._id,
                metadata: {
                    taskId: taskId,
                    changes: getObjectDifferences(oldTaskData, task.toObject())
                }
            });

            await Promise.all([campaign.save(), auditLog.save()]);

            res.json({
                message: 'Task updated successfully',
                task,
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            if (req.file) {
                await cloudinary.uploader.destroy(req.file.filename);
            }
            console.error('Update task error:', err);
            res.status(500).json({ 
                message: 'Failed to update task',
                error: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
});

// Delete task with security
app.delete('/admin/campaigns/:id/tasks/:taskId', 
    authenticateToken,
    adminAuth,
    csrfProtection,
    [
        param('id').isMongoId().withMessage('Invalid campaign ID'),
        param('taskId').isMongoId().withMessage('Invalid task ID')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { id: campaignId, taskId } = req.params;

            const campaign = await Campaign.findOne({
                _id: campaignId,
                isActive: true
            });
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

            // Create audit log before deletion
            const auditLog = new AuditLog({
                action: 'DELETE_TASK',
                adminId: req.user.userId,
                targetId: campaign._id,
                metadata: {
                    taskTitle: task.title,
                    campaignTitle: campaign.title
                }
            });

            // Remove task from campaign
            campaign.tasksList.pull(taskId);

            // Remove task from participants
            campaign.participantsList.forEach(participant => {
                participant.tasks = participant.tasks.filter(t => t.taskId.toString() !== taskId);
            });

            // Remove task from users
            await User.updateMany(
                { 'tasks.taskId': taskId },
                { $pull: { tasks: { taskId: taskId } } }
            );

            await Promise.all([campaign.save(), auditLog.save()]);

            res.json({ 
                message: 'Task deleted successfully',
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Delete task error:', err);
            res.status(500).json({ message: 'Failed to delete task' });
        }
});

// Get campaigns created by a specific user with security
app.get('/admin/campaigns/created-by/:userId', 
    authenticateToken,
    adminAuth,
    csrfProtection,
    [
        param('userId').isMongoId().withMessage('Invalid user ID')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const campaigns = await Campaign.find({ 
                createdBy: req.params.userId,
                isActive: true
            })
                .sort({ createdAt: -1 })
                .lean();

            res.json({
                campaigns,
                csrfToken: req.csrfToken()
            });
        } catch (err) {
            console.error('Get user-created campaigns error:', err);
            res.status(500).json({ message: 'Failed to fetch campaigns' });
        }
});

// Helper function for audit logs
function getObjectDifferences(oldObj, newObj) {
    const changes = {};
    for (const key in newObj) {
        if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
            changes[key] = {
                old: oldObj[key],
                new: newObj[key]
            };
        }
    }
    return changes;
}




// Enhanced Error Handling Middleware
app.use((err, req, res, next) => {
    // Log the error with additional context
    console.error('Server error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        method: req.method,
        path: req.path,
        ip: req.ip,
        timestamp: new Date().toISOString()
    });

    // Determine the appropriate status code
    const statusCode = err.status || 500;

    // Prepare error response
    const errorResponse = {
        message: statusCode === 500 ? 'Internal Server Error' : err.message,
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack,
            details: err.details
        })
    };

    // Set security headers even for error responses
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Send the error response
    res.status(statusCode).json(errorResponse);
});

// Secure MongoDB Connection
const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MongoDB connection URI is not defined');
        }

const mongoOptions = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  retryReads: true
};

if (process.env.NODE_ENV === 'production') {
  mongoOptions.ssl = true;
  mongoOptions.sslValidate = true;
  mongoOptions.authSource = 'admin';
  mongoOptions.sslCA = fs.readFileSync(path.join(__dirname, 'ssl', 'mongo-ca.pem'));
}

await mongoose.connect(process.env.MONGO_URI, mongoOptions);


        
        // Connection event listeners
        mongoose.connection.on('connected', () => {
            console.log('MongoDB connected successfully');
        });

        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected');
        });

        // Graceful shutdown handler
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('MongoDB connection closed due to application termination');
            process.exit(0);
        });

    } catch (err) {
        console.error('MongoDB initial connection error:', {
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
            timestamp: new Date().toISOString()
        });
        
        // Implement retry logic for production
        if (process.env.NODE_ENV === 'production') {
            console.log('Retrying MongoDB connection in 5 seconds...');
            setTimeout(connectDB, 5000);
        } else {
            process.exit(1);
        }
    }
};

// Secure Server Startup
const PORT = process.env.PORT || 3000;
const startServer = async () => {
    try {
        // Verify required environment variables
        const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'CLOUDINARY_CLOUD_NAME'];
        const missingVars = requiredEnvVars.filter(v => !process.env[v]);
        
        if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }

        // Establish database connection
        await connectDB();

        // Create HTTPS server in production
        let server;
        if (process.env.NODE_ENV === 'production') {
            const httpsOptions = {
                key: fs.readFileSync(path.join(__dirname, 'ssl', 'private.key')),
                cert: fs.readFileSync(path.join(__dirname, 'ssl', 'certificate.crt')),
                ca: fs.readFileSync(path.join(__dirname, 'ssl', 'ca_bundle.crt')),
                minVersion: 'TLSv1.2',
                ciphers: [
                    'TLS_AES_256_GCM_SHA384',
                    'TLS_CHACHA20_POLY1305_SHA256',
                    'TLS_AES_128_GCM_SHA256'
                ].join(':'),
                honorCipherOrder: true
            };
            server = https.createServer(httpsOptions, app);
        } else {
            server = http.createServer(app);
        }

        // Start the server
        server.listen(PORT, () => {
            console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
            
            // Security check warnings
            if (process.env.NODE_ENV === 'production') {
                if (!process.env.HELMET_CONFIGURED) {
                    console.warn('Security Warning: Helmet configuration should be reviewed for production');
                }
                if (process.env.DISABLE_RATE_LIMITING === 'true') {
                    console.warn('Security Warning: Rate limiting is disabled in production');
                }
            }
        });

        // Graceful shutdown handlers
        process.on('SIGTERM', () => {
            console.log('SIGTERM received. Shutting down gracefully...');
            server.close(() => {
                console.log('Server closed');
                process.exit(0);
            });
        });

        process.on('unhandledRejection', (err) => {
            console.error('Unhandled Rejection:', err);
            server.close(() => process.exit(1));
        });

        process.on('uncaughtException', (err) => {
            console.error('Uncaught Exception:', err);
            server.close(() => process.exit(1));
        });

    } catch (err) {
        console.error('Server startup failed:', {
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
            timestamp: new Date().toISOString()
        });
        process.exit(1);
    }
};

// Start the server
startServer();
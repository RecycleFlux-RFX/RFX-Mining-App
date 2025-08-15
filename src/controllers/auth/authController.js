const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../../models/User');
const Transaction = require('../../models/Transaction');
const { generateAuthToken, formatUserResponse } = require('../../utils/authHelpers');

const signup = async (req, res) => {
  try {
    const { username, email, password, fullName, referralCode } = req.body;

    // Check for existing user
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(409).json({ 
        message: 'Account exists',
        details: existingUser.email === email ? 'Email already in use' : 'Username taken'
      });
    }

    // Handle referral if provided
    let referrer = null;
    if (referralCode) {
      referrer = await User.findById(referralCode);
      if (!referrer || !referrer.isActive) {
        return res.status(400).json({ 
          message: 'Invalid referral',
          details: referrer ? 'Referrer account is inactive' : 'Referral code not found'
        });
      }
    }

    // Create user
    const user = await createNewUser(username, email, password, fullName, referrer);

    // Handle referral bonuses if applicable
    if (referrer) {
      await applyReferralBonuses(user, referrer);
    }

    // Generate token
    const token = generateAuthToken(user);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: formatUserResponse(user),
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
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isSuperAdmin = user.email === process.env.SUPER_ADMIN_EMAIL_1 || 
                         user.email === process.env.SUPER_ADMIN_EMAIL_2;

    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        isAdmin: user.isAdmin,
        isSuperAdmin
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
        isSuperAdmin
      },
      requiresPasscode: isSuperAdmin && !user.isSuperAdmin
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const checkAdmin = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Not an admin account' });
    }

    res.status(200).json({ message: 'Admin account verified', email });
  } catch (err) {
    console.error('Admin check error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const verifyAdmin = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user.userId;

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    const user = await User.findById(userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Not an admin account' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isSuperAdmin = user.email === process.env.SUPER_ADMIN_EMAIL_1 || 
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
};

const verifySuperAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user || (user.email !== process.env.SUPER_ADMIN_EMAIL_1 && 
                  user.email !== process.env.SUPER_ADMIN_EMAIL_2)) {
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
};

module.exports = {
  signup,
  login,
  checkAdmin,
  verifyAdmin,
  verifySuperAdmin
};
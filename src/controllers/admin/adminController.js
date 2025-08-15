const User = require('../../models/User');
const Campaign = require('../../models/Campaign');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const getUsers = async (req, res) => {
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
};

const suspendUser = async (req, res) => {
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
    if (user.email === process.env.SUPER_ADMIN_EMAIL_1 || 
        user.email === process.env.SUPER_ADMIN_EMAIL_2) {
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
};

const getAdmins = async (req, res) => {
  try {
    const admins = await User.find({ isAdmin: true })
      .select('-password -passkey -transactions')
      .lean();
      
    res.json(admins);
  } catch (err) {
    console.error('Get admins error:', err);
    res.status(500).json({ message: 'Failed to fetch admins' });
  }
};

const createAdmin = async (req, res) => {
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
};

const updateAdmin = async (req, res) => {
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
};

const deleteAdmin = async (req, res) => {
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
};

const resetAdminPassword = async (req, res) => {
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

    res.json({
      message: 'Admin password reset successfully',
      tempPassword
    });
  } catch (err) {
    console.error('Reset admin password error:', err);
    res.status(500).json({ message: 'Failed to reset admin password' });
  }
};

const getStats = async (req, res) => {
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
};

module.exports = {
  getUsers,
  suspendUser,
  getAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  resetAdminPassword,
  getStats
};
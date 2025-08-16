const User = require('../../models/User');
const Transaction = require('../../models/Transaction');
const Campaign = require('../../models/Campaign');
const shortid = require('shortid');


const validateToken = async (req, res) => {
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
};

const getUserProfile = async (req, res) => {
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
        totalCO2Saved += parseFloat(task.taskId.co2Impact) || 0.01;
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
};

const getNetworkStats = async (req, res) => {
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
};

const getReferralLink = async (req, res) => {
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
};

const getReferralInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate short URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const referralLink = `${baseUrl}/join/${user.referralCode}`;

    res.status(200).json({
      referralLink,
      referralCode: user.referralCode,
      referralCount: user.referrals?.length || 0,
      referralEarnings: user.referralEarnings || 0
    });
  } catch (err) {
    console.error('Get referral info error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateWallet = async (req, res) => {
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
};

const claimReward = async (req, res) => {
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
};

const getUserCampaigns = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate({
        path: 'campaigns.campaignId',
        select: 'title description category reward duration startDate endDate status image participants completedTasks tasksList featured new trending ending difficulty',
        model: 'Campaign'
      })
      .select('campaigns tasks')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userCampaigns = user.campaigns.map(uc => {
      const campaign = uc.campaignId;
      if (!campaign) return null;
      
      // Calculate progress
      const totalTasks = campaign.tasksList?.length || 0;
      const userCompleted = user.tasks
        .filter(t => t.campaignId && 
                    t.campaignId.toString() === campaign._id.toString() && 
                    t.status === 'completed')
        .length;
      
      const progress = totalTasks > 0 ? (userCompleted / totalTasks) * 100 : 0;

      // Calculate campaign status
      const now = new Date();
      const startDate = new Date(campaign.startDate);
      const endDate = new Date(campaign.endDate);
      let status = campaign.status;
      
      if (now < startDate) status = 'upcoming';
      else if (now > endDate) status = 'completed';
      else status = 'active';

      return {
        ...campaign,
        id: campaign._id.toString(),
        userJoined: true,
        userCompleted,
        progress,
        status,
        tasks: totalTasks,
        completed: campaign.completedTasks || 0,
        participants: campaign.participants || 0,
        reward: `${campaign.reward} RFX`,
        duration: `${campaign.duration} days`,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        lastActivity: uc.lastActivity,
        joinedAt: uc.joinedAt
      };
    }).filter(c => c !== null);

    res.json(userCampaigns);
  } catch (err) {
    console.error('Get user campaigns error:', err);
    res.status(500).json({ 
      message: 'Failed to fetch user campaigns',
      error: err.message 
    });
  }
};


const getLaunchCountdown = async (req, res) => {
  try {
    const launchDate = new Date('2025-12-31T00:00:00'); // Set your launch date
    const now = new Date();
    const difference = launchDate - now;
    
    const timeLeft = {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60)
    };

    res.status(200).json(timeLeft);
  } catch (err) {
    console.error('Countdown error:', err);
    res.status(500).json({ message: 'Error getting countdown' });
  }
};


const getLeaderboard = async (req, res) => {
  try {
    // First get all users sorted by earnings
    const allUsers = await User.find({ isActive: true })
      .sort({ earnings: -1 })
      .select('username earnings co2Saved level')
      .lean();

    // Then map to add rank
    const leaderboard = allUsers.map((user, index) => ({
      username: user.username,
      earnings: user.earnings,
      co2Saved: user.co2Saved,
      level: user.level,
      rank: index + 1
    }));

    res.status(200).json(leaderboard);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ message: 'Error getting leaderboard' });
  }
};

const getUserRank = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Count how many users have higher earnings
    const rank = await User.countDocuments({ 
      earnings: { $gt: user.earnings },
      isActive: true 
    }) + 1;

    const totalUsers = await User.countDocuments({ isActive: true });

    res.status(200).json({ 
      rank,
      totalUsers
    });
  } catch (err) {
    console.error('Rank error:', err);
    res.status(500).json({ message: 'Error getting user rank' });
  }
};

module.exports = {
  getLaunchCountdown, 
  getUserRank,
  getLeaderboard,
  validateToken,
  getUserProfile,
  getNetworkStats,
  getReferralLink,
  getReferralInfo,
  updateWallet,
  claimReward,
  getUserCampaigns
};
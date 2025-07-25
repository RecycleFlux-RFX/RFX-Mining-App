// routes/campaigns.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});
const upload = multer({ storage });

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// GET /campaigns - Fetch all campaigns
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('campaigns');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const campaigns = await Campaign.find();
        const userCampaigns = campaigns.map(campaign => {
            const userCampaign = user.campaigns.find(uc => uc.campaignId.toString() === campaign._id.toString());

            // Ensure reward is properly formatted
            const reward = typeof campaign.reward === 'number' ? campaign.reward.toFixed(5) : '0.00000';

            return {
                id: campaign._id,
                title: campaign.title,
                description: campaign.description,
                category: campaign.category,
                reward: reward,
                participants: campaign.participants || 0,
                tasks: campaign.tasksList?.length || 0,
                completed: userCampaign?.completed || 0,
                duration: campaign.duration || '7 days',
                difficulty: campaign.difficulty || 'Medium',
                progress: campaign.progress || 0,
                featured: campaign.featured || false,
                new: campaign.new || false,
                trending: campaign.trending || false,
                ending: campaign.ending || false,
            };
        });

        res.json(userCampaigns);
    } catch (error) {
        console.error('Error fetching campaigns:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }

/*     // Example of creating a new campaign
    const newCampaign = new Campaign({
        title: "Social Media Engagement",
        description: "Follow our social media and engage with our posts",
        category: "Community",
        reward: 0.005, // Required field
        difficulty: "Easy",
        duration: "7 days",
        tasksList: [{
            title: "Follow our Twitter",
            description: "Follow our official Twitter account",
            reward: 0.001,
            requirements: ["Twitter account"],
        }, {
            title: "Like and retweet",
            description: "Like and retweet our latest post",
            reward: 0.002,
            requirements: ["Twitter account"],
        }, {
            title: "Post about us",
            description: "Create a post mentioning our project",
            reward: 0.002,
            requirements: ["Social media account"],
        }]
    });
    await newCampaign.save(); */
});

// GET /campaigns/:campaignId - Fetch campaign details
router.get('/:campaignId', auth, async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const tasks = campaign.tasksList?.map(task => ({
            id: task._id,
            title: task.title,
            description: task.description,
            reward: typeof task.reward === 'number' ? task.reward.toFixed(5) : '0.00000',
            requirements: task.requirements || [],
            status: task.completedBy?.find(cb => cb.userId.toString() === req.user.userId)?.status || task.status || 'pending',
            proof: task.proof || '',
            completed: !!task.completedBy?.find(cb => cb.userId.toString() === req.user.userId && task.status === 'completed'),
        })) || [];

        res.json({
            id: campaign._id,
            title: campaign.title,
            description: campaign.description,
            category: campaign.category,
            reward: typeof campaign.reward === 'number' ? campaign.reward.toFixed(5) : '0.00000',
            participants: campaign.participants || 0,
            tasks,
            duration: campaign.duration || '7 days',
            difficulty: campaign.difficulty || 'Medium',
            progress: campaign.progress || 0,
        });
    } catch (error) {
        console.error('Error fetching campaign details:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
});

// POST /campaigns/join - Join a campaign
// routes/campaigns.js
router.post('/join', auth, async (req, res) => {
    const { campaignId } = req.body;
    try {
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if user already joined
        const userCampaign = user.campaigns.find(uc => uc.campaignId.toString() === campaignId);
        if (!userCampaign) {
            user.campaigns.push({
                campaignId,
                tasks: campaign.tasksList.length, // Use tasksList length
                completed: 0,
            });
            campaign.participants += 1;
            await campaign.save();
            await user.save();
        }

        res.json({ message: 'Successfully joined campaign' });
    } catch (error) {
        console.error('Error joining campaign:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
});

// POST /campaigns/upload-proof - Upload proof for a task
router.post('/upload-proof', auth, upload.single('proof'), async (req, res) => {
    const { campaignId, taskId } = req.body;
    try {
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const task = campaign.tasksList?.find(t => t._id.toString() === taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if user already completed this task
        if (task.completedBy?.find(cb => cb.userId.toString() === req.user.userId)) {
            return res.status(400).json({ message: 'Task already completed or proof submitted' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        task.proof = `/uploads/${req.file.filename}`;
        task.status = 'in-progress';
        task.completedBy = task.completedBy || [];
        task.completedBy.push({ userId: req.user.userId, completedAt: new Date() });
        await campaign.save();

        res.json({ proofUrl: task.proof });
    } catch (error) {
        console.error('Error uploading proof:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
});

// POST /campaigns/complete-task - Complete a task
router.post('/complete-task', auth, async (req, res) => {
    const { campaignId, taskId } = req.body;
    try {
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const task = campaign.tasksList?.find(t => t._id.toString() === taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const wallet = await Wallet.findOne({ userId: req.user.userId });
        if (!wallet) {
            return res.status(404).json({ message: 'Wallet not found' });
        }

        // Check if task is in-progress
        const userCompletion = task.completedBy?.find(cb => cb.userId.toString() === req.user.userId);
        if (!userCompletion || task.status !== 'in-progress') {
            return res.status(400).json({ message: 'Task not in progress or proof not submitted' });
        }

        // Update task status
        task.status = 'completed';
        userCompletion.completedAt = new Date();

        // Update user campaign progress
        const userCampaign = user.campaigns.find(uc => uc.campaignId.toString() === campaignId);
        if (userCampaign) {
            userCampaign.completed = (userCampaign.completed || 0) + 1;
        }

        // Update wallet balance
        const rewardAmount = task.reward || 0;
        wallet.balance = (wallet.balance || 0) + rewardAmount;
        await wallet.save();

        // Create transaction
        await Transaction.create({
            userId: req.user.userId,
            walletId: wallet._id,
            type: 'earn',
            category: 'Campaign',
            amount: rewardAmount,
            activity: 'Task Completion',
            description: `Completed task: ${task.title}`,
            status: 'completed',
        });

        // Update campaign progress
        const completedTasks = campaign.tasksList?.filter(t => t.status === 'completed').length || 0;
        const totalTasks = campaign.tasksList?.length || 1;
        campaign.progress = Math.min((completedTasks / totalTasks) * 100, 100);
        await campaign.save();

        await user.save();

        res.json({
            balance: wallet.balance,
            reward: typeof rewardAmount === 'number' ? rewardAmount.toFixed(5) : '0.00000',
        });
    } catch (error) {
        console.error('Error completing task:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
});

module.exports = router;
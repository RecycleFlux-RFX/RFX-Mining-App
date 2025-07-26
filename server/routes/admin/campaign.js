// routes/admin/campaign.js
const express = require('express');
const router = express.Router();
const adminAuth = require('../../middleware/adminAuth');
const validateObjectId = require('../../middleware/validateObjectId');
const Campaign = require('../../models/Campaign');
const User = require('../../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});
const upload = multer({ storage });

// GET /admin/campaigns - Fetch all campaigns
router.get('/', adminAuth, async (req, res) => {
    try {
        const campaigns = await Campaign.find()
            .select('-tasksList.completedBy')
            .lean();

        const formattedCampaigns = campaigns.map(campaign => ({
            ...campaign,
            reward: campaign.reward.toFixed(5),
            participants: campaign.participants || 0,
            progress: campaign.progress || 0,
            tasksList: campaign.tasksList.map(task => ({
                ...task,
                reward: task.reward.toFixed(5),
            })),
        }));

        res.json(formattedCampaigns);
    } catch (error) {
        console.error('Error fetching campaigns:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
});

// GET /admin/campaigns/:id - Fetch campaign details
router.get('/:id', [adminAuth, validateObjectId], async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id)
            .populate('createdBy', 'username email')
            .lean();

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        res.json({
            ...campaign,
            reward: campaign.reward.toFixed(5),
            tasksList: campaign.tasksList.map(task => ({
                ...task,
                reward: task.reward.toFixed(5),
            })),
        });
    } catch (error) {
        console.error('Error fetching campaign:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
});

// POST /admin/campaigns - Create new campaign
router.post('/', [adminAuth, upload.single('image')], async (req, res) => {
    try {
        const {
            title, description, category, reward, difficulty, duration,
            featured, new: isNew, trending, ending, startDate, endDate, status,
            tasks
        } = req.body;

        let tasksList = [];
        if (tasks) {
            tasksList = JSON.parse(tasks).map(task => ({
                ...task,
                reward: parseFloat(task.reward),
                requirements: task.requirements ? task.requirements.split(',').map(r => r.trim()) : [],
            }));
        }

        const campaignData = {
            title,
            description,
            category,
            reward: parseFloat(reward),
            difficulty,
            duration: parseInt(duration),
            featured: featured === 'true',
            new: isNew === 'true',
            trending: trending === 'true',
            ending: ending === 'true',
            startDate: startDate || new Date(),
            endDate: endDate || null,
            status,
            tasksList,
            createdBy: req.user.userId,
        };

        if (req.file) {
            campaignData.image = `/uploads/${req.file.filename}`;
        }

        const campaign = new Campaign(campaignData);
        await campaign.save();

        res.status(201).json(campaign);
    } catch (error) {
        console.error('Error creating campaign:', error);
        res.status(400).json({ message: 'Failed to create campaign', details: error.message });
    }
});

// PUT /admin/campaigns/:id - Update campaign
router.put('/:id', [adminAuth, validateObjectId, upload.single('image')], async (req, res) => {
    try {
        const {
            title, description, category, reward, difficulty, duration,
            featured, new: isNew, trending, ending, startDate, endDate, status,
            tasks
        } = req.body;

        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        let tasksList = campaign.tasksList;
        if (tasks) {
            tasksList = JSON.parse(tasks).map(task => ({
                ...task,
                reward: parseFloat(task.reward),
                requirements: task.requirements ? task.requirements.split(',').map(r => r.trim()) : [],
            }));
        }

        const updatedData = {
            title: title || campaign.title,
            description: description || campaign.description,
            category: category || campaign.category,
            reward: parseFloat(reward) || campaign.reward,
            difficulty: difficulty || campaign.difficulty,
            duration: parseInt(duration) || campaign.duration,
            featured: featured === 'true' ? true : featured === 'false' ? false : campaign.featured,
            new: isNew === 'true' ? true : isNew === 'false' ? false : campaign.new,
            trending: trending === 'true' ? true : trending === 'false' ? false : campaign.trending,
            ending: ending === 'true' ? true : ending === 'false' ? false : campaign.ending,
            startDate: startDate || campaign.startDate,
            endDate: endDate || campaign.endDate,
            status: status || campaign.status,
            tasksList,
        };

        if (req.file) {
            // Delete old image if exists
            if (campaign.image) {
                const oldImagePath = path.join(__dirname, '../../', campaign.image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            updatedData.image = `/uploads/${req.file.filename}`;
        }

        Object.assign(campaign, updatedData);
        await campaign.save();

        res.json(campaign);
    } catch (error) {
        console.error('Error updating campaign:', error);
        res.status(400).json({ message: 'Failed to update campaign', details: error.message });
    }
});

// DELETE /admin/campaigns/:id - Delete campaign
router.delete('/:id', [adminAuth, validateObjectId], async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Delete campaign image if exists
        if (campaign.image) {
            const imagePath = path.join(__dirname, '../../', campaign.image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        // Remove campaign from users' campaigns array
        await User.updateMany(
            { 'campaigns.campaignId': req.params.id },
            { $pull: { campaigns: { campaignId: req.params.id } } }
        );

        await campaign.remove();
        res.json({ message: 'Campaign deleted successfully' });
    } catch (error) {
        console.error('Error deleting campaign:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
});

// GET /admin/campaigns/:id/proofs - Fetch proofs for campaign
router.get('/:id/proofs', [adminAuth, validateObjectId], async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id)
            .populate({
                path: 'tasksList.completedBy.userId',
                select: 'username email avatar',
            })
            .lean();

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const proofs = campaign.tasksList
            .filter(task => task.completedBy && task.completedBy.length > 0)
            .map(task => ({
                taskId: task._id,
                taskTitle: task.title,
                day: task.day,
                proofs: task.completedBy.map(cb => ({
                    userId: cb.userId._id,
                    username: cb.userId.username,
                    email: cb.userId.email,
                    avatar: cb.userId.avatar,
                    proofUrl: task.proof,
                    status: cb.status || 'pending',
                    completedAt: cb.completedAt,
                })),
            }));

        res.json(proofs);
    } catch (error) {
        console.error('Error fetching proofs:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
});

// POST /admin/campaigns/:id/approve-proof - Approve or reject proof
router.post('/:id/approve-proof', [adminAuth, validateObjectId], async (req, res) => {
    const { taskId, userId, approve } = req.body;

    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const task = campaign.tasksList.find(t => t._id.toString() === taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const completion = task.completedBy.find(cb => cb.userId.toString() === userId);
        if (!completion) {
            return res.status(404).json({ message: 'Proof not found' });
        }

        completion.status = approve ? 'completed' : 'rejected';
        completion.completedAt = new Date();

        if (approve) {
            // Update user campaign progress
            const userCampaign = user.campaigns.find(uc => uc.campaignId.toString() === req.params.id);
            if (userCampaign) {
                userCampaign.completed = (userCampaign.completed || 0) + 1;
            }

            // Update wallet balance
            const wallet = await Wallet.findOne({ userId });
            if (wallet) {
                wallet.balance = (wallet.balance || 0) + task.reward;
                await wallet.save();

                // Create transaction
                await Transaction.create({
                    userId,
                    walletId: wallet._id,
                    type: 'earn',
                    category: 'Campaign',
                    amount: task.reward,
                    activity: 'Task Completion',
                    description: `Completed task: ${task.title}`,
                    status: 'completed',
                });
            }

            // Update campaign progress
            const completedTasks = campaign.tasksList.filter(t => t.status === 'completed').length;
            const totalTasks = campaign.tasksList.length || 1;
            campaign.progress = Math.min((completedTasks / totalTasks) * 100, 100);
        } else {
            // Remove proof if rejected
            task.completedBy = task.completedBy.filter(cb => cb.userId.toString() !== userId);
            task.proof = null;
            task.status = 'pending';
        }

        await campaign.save();
        await user.save();

        res.json({ message: `Proof ${approve ? 'approved' : 'rejected'} successfully` });
    } catch (error) {
        console.error('Error processing proof:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
});

// POST /admin/upload - Upload content file for tasks
router.post('/upload', [adminAuth, upload.single('content')], async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        res.json({ url: `/uploads/${req.file.filename}` });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
});

module.exports = router;
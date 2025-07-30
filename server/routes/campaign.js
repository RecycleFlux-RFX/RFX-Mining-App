// Campaign Routes
const express = require('express');
const router = express.Router();
const Campaign = require('../models/campaign');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/campaigns/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
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
        cb(new Error('Only image files are allowed!'));
    }
});

// Get all campaigns (public)
router.get('/campaigns', async (req, res) => {
    try {
        const campaigns = await Campaign.find({ status: 'active' })
            .select('-tasksList -participantsList')
            .lean();

        // Calculate progress for each campaign
        const campaignsWithProgress = campaigns.map(campaign => {
            const progress = campaign.tasksList && campaign.participants > 0
                ? (campaign.completedTasks / (campaign.tasksList.length * campaign.participants)) * 100
                : 0;
            return { ...campaign, progress: Math.min(progress, 100) };
        });

        res.json(campaignsWithProgress);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get campaign details (user auth required)
router.get('/campaigns/:id', auth, async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id)
            .select('-participantsList')
            .lean();

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Check if user has joined this campaign
        const user = await User.findById(req.user.id);
        const hasJoined = user.campaigns.some(c => c.campaignId.toString() === req.params.id);

        // Filter tasks based on current day
        const currentDate = new Date();
        const startDate = new Date(campaign.startDate);
        const dayDiff = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        const currentDay = Math.min(dayDiff, campaign.duration);

        const dailyTasks = campaign.tasksList
            .filter(task => task.day === currentDay)
            .map(task => {
                const userTask = user.tasks.find(t =>
                    t.taskId.toString() === task._id.toString() &&
                    t.campaignId.toString() === req.params.id
                );
                return {
                    ...task,
                    status: userTask ? userTask.status : 'open',
                    completed: userTask ? userTask.status === 'completed' : false,
                    proof: userTask ? userTask.proof : null
                };
            });

        res.json({
            ...campaign,
            dailyTasks,
            currentDay,
            hasJoined
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Join a campaign
router.post('/campaigns/join', auth, async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.body.campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const user = await User.findById(req.user.id);

        // Check if user already joined
        if (user.campaigns.some(c => c.campaignId.toString() === req.body.campaignId)) {
            return res.status(400).json({ message: 'Already joined this campaign' });
        }

        // Add campaign to user
        user.campaigns.push({
            campaignId: req.body.campaignId,
            joinedAt: new Date(),
            completed: 0
        });

        // Update campaign participants
        campaign.participants += 1;
        campaign.participantsList.push({
            userId: req.user.id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            joinedAt: new Date(),
            completed: 0,
            lastActivity: new Date()
        });

        await Promise.all([user.save(), campaign.save()]);

        res.json({
            message: 'Successfully joined campaign',
            participants: campaign.participants
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Upload task proof
router.post('/campaigns/upload-proof', [auth, upload.single('proof')], async (req, res) => {
    try {
        const { campaignId, taskId } = req.body;

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const task = campaign.tasksList.id(taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const user = await User.findById(req.user.id);

        // Update user task status
        const userTaskIndex = user.tasks.findIndex(t =>
            t.taskId.toString() === taskId &&
            t.campaignId.toString() === campaignId
        );

        if (userTaskIndex === -1) {
            user.tasks.push({
                campaignId,
                taskId,
                status: 'pending',
                proof: req.file.path,
                submittedAt: new Date()
            });
        } else {
            user.tasks[userTaskIndex].status = 'pending';
            user.tasks[userTaskIndex].proof = req.file.path;
            user.tasks[userTaskIndex].submittedAt = new Date();
        }

        // Update campaign task completions
        const participantIndex = campaign.participantsList.findIndex(p =>
            p.userId.toString() === req.user.id
        );

        if (participantIndex !== -1) {
            campaign.participantsList[participantIndex].lastActivity = new Date();
        }

        await Promise.all([user.save(), campaign.save()]);

        res.json({
            message: 'Proof uploaded successfully, pending verification',
            proofUrl: req.file.path
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Complete task (admin verification)
router.post('/campaigns/complete-task', auth, async (req, res) => {
    try {
        const { campaignId, taskId } = req.body;

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const task = campaign.tasksList.id(taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const user = await User.findById(req.user.id);

        // Find and update user task
        const userTask = user.tasks.find(t =>
            t.taskId.toString() === taskId &&
            t.campaignId.toString() === campaignId
        );

        if (!userTask) {
            return res.status(400).json({ message: 'Task not started' });
        }

        if (userTask.status === 'completed') {
            return res.status(400).json({ message: 'Task already completed' });
        }

        userTask.status = 'completed';
        userTask.completedAt = new Date();

        // Update user campaign progress
        const userCampaign = user.campaigns.find(c =>
            c.campaignId.toString() === campaignId
        );

        if (userCampaign) {
            userCampaign.completed += 1;
        }

        // Update campaign stats
        campaign.completedTasks += 1;

        const participant = campaign.participantsList.find(p =>
            p.userId.toString() === req.user.id
        );

        if (participant) {
            participant.completed += 1;
            participant.lastActivity = new Date();
        }

        // Add reward to user
        const reward = task.reward || 0;
        user.earnings += reward;

        await Promise.all([user.save(), campaign.save()]);

        res.json({
            message: 'Task completed successfully',
            reward,
            balance: user.earnings
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Admin routes
router.get('/admin/campaigns', adminAuth, async (req, res) => {
    try {
        const campaigns = await Campaign.find()
            .sort({ createdAt: -1 })
            .lean();
        res.json(campaigns);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/admin/campaigns/:id', adminAuth, async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id)
            .populate('participantsList.userId', 'username email avatar')
            .lean();

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        res.json(campaign);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/admin/campaigns', [adminAuth, upload.single('image')], async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            reward,
            difficulty,
            duration,
            featured,
            new: isNew,
            trending,
            ending,
            startDate,
            status,
            tasks
        } = req.body;

        const parsedTasks = JSON.parse(tasks || '[]');

        const campaign = new Campaign({
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
            startDate,
            endDate: new Date(new Date(startDate).getTime() + (parseInt(duration) * 24 * 60 * 60 * 1000)),
            status,
            tasksList: parsedTasks,
            image: req.file ? req.file.path : null,
            participants: 0,
            completedTasks: 0
        });

        await campaign.save();
        res.status(201).json(campaign);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.put('/admin/campaigns/:id', [adminAuth, upload.single('image')], async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const {
            title,
            description,
            category,
            reward,
            difficulty,
            duration,
            featured,
            new: isNew,
            trending,
            ending,
            startDate,
            status,
            tasks
        } = req.body;

        campaign.title = title;
        campaign.description = description;
        campaign.category = category;
        campaign.reward = parseFloat(reward);
        campaign.difficulty = difficulty;
        campaign.duration = parseInt(duration);
        campaign.featured = featured === 'true';
        campaign.new = isNew === 'true';
        campaign.trending = trending === 'true';
        campaign.ending = ending === 'true';
        campaign.startDate = startDate;
        campaign.endDate = new Date(new Date(startDate).getTime() + (parseInt(duration) * 24 * 60 * 60 * 1000));
        campaign.status = status;

        if (tasks) {
            campaign.tasksList = JSON.parse(tasks);
        }

        if (req.file) {
            campaign.image = req.file.path;
        }

        await campaign.save();
        res.json(campaign);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.delete('/admin/campaigns/:id', adminAuth, async (req, res) => {
    try {
        const campaign = await Campaign.findByIdAndDelete(req.params.id);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Remove campaign from all users who joined it
        await User.updateMany(
            { 'campaigns.campaignId': req.params.id },
            { $pull: { campaigns: { campaignId: req.params.id } } }
        );

        res.json({ message: 'Campaign deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/admin/campaigns/:id/proofs', adminAuth, async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id)
            .select('tasksList participantsList')
            .lean();

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Get all proofs grouped by task
        const proofsByTask = campaign.tasksList.map(task => {
            const proofs = [];

            campaign.participantsList.forEach(participant => {
                const userTask = participant.tasks.find(t => t.taskId.toString() === task._id.toString());
                if (userTask && userTask.proof) {
                    proofs.push({
                        userId: participant.userId,
                        username: participant.username,
                        email: participant.email,
                        avatar: participant.avatar,
                        proofUrl: userTask.proof,
                        status: userTask.status || 'pending',
                        submittedAt: userTask.submittedAt
                    });
                }
            });

            return {
                taskId: task._id,
                taskTitle: task.title,
                day: task.day,
                proofs
            };
        }).filter(task => task.proofs.length > 0);

        res.json(proofsByTask);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/admin/campaigns/:id/approve-proof', adminAuth, async (req, res) => {
    try {
        const { taskId, userId, approve } = req.body;

        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const task = campaign.tasksList.id(taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const participant = campaign.participantsList.find(p =>
            p.userId.toString() === userId
        );

        if (!participant) {
            return res.status(404).json({ message: 'Participant not found' });
        }

        // Find the user task
        const userTaskIndex = participant.tasks.findIndex(t =>
            t.taskId.toString() === taskId
        );

        if (userTaskIndex === -1) {
            return res.status(404).json({ message: 'Task proof not found' });
        }

        // Update status
        participant.tasks[userTaskIndex].status = approve ? 'completed' : 'rejected';

        if (approve) {
            // Only count as completed if not already completed
            if (participant.tasks[userTaskIndex].status !== 'completed') {
                campaign.completedTasks += 1;
                participant.completed += 1;

                // Add reward to user
                const user = await User.findById(userId);
                if (user) {
                    user.earnings += task.reward || 0;

                    // Update user's task status
                    const userTask = user.tasks.find(t =>
                        t.taskId.toString() === taskId &&
                        t.campaignId.toString() === req.params.id
                    );

                    if (userTask) {
                        userTask.status = 'completed';
                        userTask.completedAt = new Date();
                    }

                    await user.save();
                }
            }
        } else {
            // If rejecting and was previously completed, decrement counts
            if (participant.tasks[userTaskIndex].status === 'completed') {
                campaign.completedTasks = Math.max(0, campaign.completedTasks - 1);
                participant.completed = Math.max(0, participant.completed - 1);
            }
        }

        await campaign.save();
        res.json({ message: `Proof ${approve ? 'approved' : 'rejected'} successfully` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
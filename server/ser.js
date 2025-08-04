
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

// Campaign Routes
// Get all campaigns (public)
// In server.js, update the /campaigns endpoint
app.get('/campaigns', async (req, res) => {
    try {
        const campaigns = await Campaign.find({ status: 'active' })
            .select('-tasksList -participantsList')
            .lean();

        const campaignsWithProgress = campaigns.map(campaign => {
            const progress = campaign.tasksList && campaign.participants > 0
                ? (campaign.completedTasks / (campaign.tasksList.length * campaign.participants)) * 100
                : 0;
            return {
                ...campaign,
                progress: Math.min(progress, 100),
                id: campaign._id // Ensure id field exists
            };
        });

        // Return as { data: campaigns } to match frontend expectation
        res.json({ data: campaignsWithProgress });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get campaign details (user auth required)
app.get('/campaigns/:id', authenticateToken, async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id)
            .select('-participantsList')
            .lean();

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Check if user has joined this campaign
        const user = await User.findById(req.user.userId);
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
// In your backend route for joining campaigns
app.post('/campaigns/join', authenticateToken, async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.body.campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const user = await User.findById(req.user.userId);
        if (!user.campaigns) {
            user.campaigns = []; // Initialize campaigns array if undefined
        }

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
            userId: req.user.userId,
            username: user.username,
            email: user.email,
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
        console.error('Join campaign error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Upload task proof
app.post('/campaigns/upload-proof', [authenticateToken, upload.single('proof')], async (req, res) => {
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

        const user = await User.findById(req.user.userId);

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
            p.userId.toString() === req.user.userId
        );

        if (participantIndex === -1) {
            campaign.participantsList.push({
                userId: req.user.userId,
                username: user.username,
                email: user.email,
                joinedAt: new Date(),
                completed: 0,
                lastActivity: new Date(),
                tasks: [{
                    taskId,
                    status: 'pending',
                    proof: req.file.path,
                    submittedAt: new Date()
                }]
            });
            campaign.participants += 1;
        } else {
            const participant = campaign.participantsList[participantIndex];
            if (!participant.tasks) {
                participant.tasks = [];
            }
            const taskIndex = participant.tasks.findIndex(t => t.taskId.toString() === taskId);
            if (taskIndex === -1) {
                participant.tasks.push({
                    taskId,
                    status: 'pending',
                    proof: req.file.path,
                    submittedAt: new Date()
                });
            } else {
                participant.tasks[taskIndex].status = 'pending';
                participant.tasks[taskIndex].proof = req.file.path;
                participant.tasks[taskIndex].submittedAt = new Date();
            }
            participant.lastActivity = new Date();
        }

        // Update task's completedBy
        const completedByEntry = task.completedBy.find(entry => entry.userId.toString() === req.user.userId);
        if (!completedByEntry) {
            task.completedBy.push({
                userId: req.user.userId,
                proofUrl: req.file.path,
                status: 'pending',
                submittedAt: new Date()
            });
        } else {
            completedByEntry.proofUrl = req.file.path;
            completedByEntry.status = 'pending';
            completedByEntry.submittedAt = new Date();
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

/* // Complete task (admin verification)
app.post('/campaigns/complete-task', authenticateToken, async (req, res) => {
    try {
        const { campaignId, taskId } = req.body;
        const userId = req.user.userId;

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

        // Find and update user task
        const userTask = user.tasks.find(t =>
            t.taskId.toString() === taskId &&
            t.campaignId.toString() === campaignId
        );

        if (!userTask) {
            return res.status(400).json({ message: 'Task not started' });
        }

        if (!task.startedAt) {
  return res.status(400).json({ message: "Task not started" });
}

        
        if (userTask.status === 'completed') {
            return res.status(400).json({ message: 'Task already completed' });
        }

        // Calculate penalty for late completion
        const currentDate = new Date();
        const startDate = new Date(campaign.startDate);
        const dayDiff = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        const daysLate = dayDiff - task.day;

        let penaltyFactor = 1;
        if (daysLate > 0) {
            penaltyFactor = Math.max(0.5, 1 - (daysLate * 0.1)); // 10% penalty per day late
        }

        // Apply penalty to rewards
        const baseReward = task.reward || 0;
        const finalReward = baseReward * penaltyFactor;

        // Update user task
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
            p.userId.toString() === userId
        );

        if (participant) {
            participant.completed += 1;
            participant.lastActivity = new Date();
            const participantTask = participant.tasks.find(t => t.taskId.toString() === taskId);
            if (participantTask) {
                participantTask.status = 'completed';
                participantTask.completedAt = new Date();
            }
        }

        // Update task's completedBy
        const completedByEntry = task.completedBy.find(entry => entry.userId.toString() === userId);
        if (completedByEntry) {
            completedByEntry.status = 'completed';
            completedByEntry.completedAt = new Date();
        }

        // Add final reward to user
        user.earnings += finalReward;

        await Promise.all([user.save(), campaign.save()]);

        res.json({
            message: 'Task completed successfully',
            reward: finalReward,
            penalty: daysLate > 0 ? `${(1 - penaltyFactor) * 100}% penalty applied` : 'No penalty',
            balance: user.earnings
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}); */


// Add this route to start tasks
app.post('/campaigns/start-task', authenticateToken, async (req, res) => {
  try {
    const { campaignId, taskId } = req.body;
    
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    const task = campaign.tasksList.id(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Initialize startedAt if not set
    if (!task.startedAt) {
      task.startedAt = new Date();
      await campaign.save();
    }

    res.json({ message: 'Task started successfully', startedAt: task.startedAt });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin routes
app.get('/admin/campaigns', [authenticateToken, adminAuth], async (req, res) => {
    try {
        const { createdByMe } = req.query;
        let query = {};

        // If createdByMe is true, filter campaigns by the authenticated user's ID
        if (createdByMe === 'true') {
            query.createdBy = req.user.userId;
        }

        const campaigns = await Campaign.find(query)
            .sort({ createdAt: -1 })
            .lean();

        res.json(campaigns);
    } catch (err) {
        console.error('Get admin campaigns error:', err);
        res.status(500).json({ message: 'Failed to fetch campaigns' });
    }
});

app.get('/admin/campaigns/:id', authenticateToken, adminAuth, async (req, res) => {
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

// Updated Admin Campaign Creation Endpoint
app.post('/admin/campaigns', [authenticateToken, adminAuth, upload.single('image')], async (req, res) => {
    try {
        // Parse form data
        const formData = req.body;

        // Validate required fields first
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
        let imagePath = null;
        if (req.file) {
            imagePath = path.join('uploads', 'campaigns', req.file.filename);
        }

        // Ensure createdBy is a valid ObjectId or null
        let createdById = null;
        if (req.user.userId && mongoose.Types.ObjectId.isValid(req.user.userId)) {
            createdById = req.user.userId;
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
            image: imagePath,
            participants: 0,
            completedTasks: 0,
            participantsList: [],
            createdBy: createdById // Set to valid ObjectId or null
        });

        await campaign.save();

        // Return the path in a way the frontend can use
        res.status(201).json({
            ...campaign.toObject(),
            image: imagePath ? `/uploads/campaigns/${path.basename(imagePath)}` : null
        });
    } catch (err) {
        // If there was an error, clean up any uploaded file
        if (req.file) {
            fs.unlink(req.file.path, () => { });
        }
        console.error('Error creating campaign:', err);
        res.status(500).json({
            message: err.message || 'Failed to create campaign',
            error: err // Include error details for debugging
        });
    }
});

app.put('/admin/campaigns/:id', [authenticateToken, adminAuth, upload.single('image')], async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Parse form data
        const formData = req.body;

        // Parse tasks if they exist
        if (formData.tasks) {
            try {
                campaign.tasksList = JSON.parse(formData.tasks);
            } catch (e) {
                console.error('Error parsing tasks:', e);
                return res.status(400).json({ message: 'Invalid tasks format' });
            }
        }

        // Update basic fields
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
        campaign.endDate = new Date(new Date(formData.startDate).getTime() + (parseInt(formData.duration) * 24 * 60 * 60 * 1000));
        campaign.status = formData.status;

        // Handle image update
        if (req.file) {
            // Delete old image if it exists
            if (campaign.image && fs.existsSync(path.join(__dirname, campaign.image))) {
                fs.unlinkSync(path.join(__dirname, campaign.image));
            }
            campaign.image = path.join('uploads', 'campaigns', req.file.filename);
        }

        await campaign.save();

        // Return the updated campaign with proper image URL
        res.json({
            ...campaign.toObject(),
            image: campaign.image ? `/uploads/campaigns/${path.basename(campaign.image)}` : null
        });
    } catch (err) {
        console.error('Error updating campaign:', err);
        res.status(500).json({
            message: err.message || 'Failed to update campaign',
            error: err
        });
    }
});

// Updated Campaign Delete Endpoint
app.delete('/admin/campaigns/:id', authenticateToken, adminAuth, async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Delete associated image file if it exists
        if (campaign.image && fs.existsSync(path.join(__dirname, campaign.image))) {
            fs.unlinkSync(path.join(__dirname, campaign.image));
        }

        // Remove campaign from database
        await Campaign.deleteOne({ _id: req.params.id });

        // Remove campaign from all users who joined it
        await User.updateMany(
            { 'campaigns.campaignId': req.params.id },
            { $pull: { campaigns: { campaignId: req.params.id } } }
        );

        res.json({ message: 'Campaign deleted successfully' });
    } catch (err) {
        console.error('Error deleting campaign:', err);
        res.status(500).json({
            message: err.message || 'Failed to delete campaign',
            error: err
        });
    }
});

app.get('/admin/campaigns/:id/proofs', authenticateToken, adminAuth, async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id)
            .select('tasksList participantsList')
            .lean();

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const proofsByTask = campaign.tasksList.map(task => {
            const proofs = task.completedBy.map(entry => ({
                userId: entry.userId,
                proofUrl: entry.proofUrl,
                status: entry.status,
                submittedAt: entry.submittedAt
            }));

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

app.post('/admin/campaigns/:id/approve-proof', authenticateToken, adminAuth, async (req, res) => {
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

        const userTask = participant.tasks.find(t => t.taskId.toString() === taskId);
        if (!userTask) {
            return res.status(404).json({ message: 'Task proof not found' });
        }

        const completedByEntry = task.completedBy.find(entry => entry.userId.toString() === userId);
        if (!completedByEntry) {
            return res.status(404).json({ message: 'Proof not found in task' });
        }

        userTask.status = approve ? 'completed' : 'rejected';
        completedByEntry.status = approve ? 'completed' : 'rejected';
        if (approve) {
            userTask.completedAt = new Date();
            completedByEntry.completedAt = new Date();
        }

        if (approve) {
            if (userTask.status !== 'completed') {
                campaign.completedTasks += 1;
                participant.completed += 1;

                const user = await User.findById(userId);
                if (user) {
                    user.earnings += task.reward || 0;
                    const userTask = user.tasks.find(t =>
                        t.taskId.toString() === taskId &&
                        t.campaignId.toString() === req.params.id
                    );
                    if (userTask) {
                        userTask.status = 'completed';
                        userTask.completedAt = new Date();
                    }
                    const userCampaign = user.campaigns.find(c =>
                        c.campaignId.toString() === req.params.id
                    );
                    if (userCampaign) {
                        userCampaign.completed += 1;
                    }
                    await user.save();
                }
            }
        } else {
            if (userTask.status === 'completed') {
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
app.post('/games/start', authenticateToken, async (req, res) => {
    try {
        const { gameId, title } = req.body;

        // Validate gameId
        if (!mongoose.Types.ObjectId.isValid(gameId)) {
            return res.status(400).json({ message: 'Invalid game ID' });
        }

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const game = await Game.findById(gameId);
        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }

        const userGame = user.games.find(g => g.gameId.toString() === gameId);
        const today = new Date().toDateString();
        if (userGame && userGame.lastPlayed && new Date(userGame.lastPlayed).toDateString() === today) {
            return res.status(400).json({ message: 'Daily play limit reached' });
        }

        if (!userGame) {
            user.games.push({
                gameId,
                lastPlayed: new Date(),
                plays: 1
            });
        } else {
            userGame.lastPlayed = new Date();
            userGame.plays += 1;
        }

        user.gamesPlayed += 1;
        game.plays += 1;

        await Promise.all([user.save(), game.save()]);
        res.json({ message: 'Game session started' });
    } catch (err) {
        console.error('Start game error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Complete a game session and award rewards
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
      amount: parseFloat(game.reward.replace('₿ ', '')),
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
});

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
// In server.js, update the /campaigns endpoint
app.get('/campaigns', async (req, res) => {
    try {
        const campaigns = await Campaign.find({ status: 'active' })
            .select('-tasksList -participantsList')
            .lean();

        const campaignsWithProgress = campaigns.map(campaign => {
            const progress = campaign.tasksList && campaign.participants > 0
                ? (campaign.completedTasks / (campaign.tasksList.length * campaign.participants)) * 100
                : 0;
            return {
                ...campaign,
                progress: Math.min(progress, 100),
                id: campaign._id // Ensure id field exists
            };
        });

        // Return as { data: campaigns } to match frontend expectation
        res.json({ data: campaignsWithProgress });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get campaign details (user auth required)
app.get('/campaigns/:id', authenticateToken, async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id)
            .select('-participantsList')
            .lean();

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Check if user has joined this campaign
        const user = await User.findById(req.user.userId);
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
// In your backend route for joining campaigns
app.post('/campaigns/join', authenticateToken, async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.body.campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const user = await User.findById(req.user.userId);
        if (!user.campaigns) {
            user.campaigns = []; // Initialize campaigns array if undefined
        }

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
            userId: req.user.userId,
            username: user.username,
            email: user.email,
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
        console.error('Join campaign error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Upload task proof
app.post('/campaigns/upload-proof', [authenticateToken, upload.single('proof')], async (req, res) => {
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

        const user = await User.findById(req.user.userId);

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
            p.userId.toString() === req.user.userId
        );

        if (participantIndex === -1) {
            campaign.participantsList.push({
                userId: req.user.userId,
                username: user.username,
                email: user.email,
                joinedAt: new Date(),
                completed: 0,
                lastActivity: new Date(),
                tasks: [{
                    taskId,
                    status: 'pending',
                    proof: req.file.path,
                    submittedAt: new Date()
                }]
            });
            campaign.participants += 1;
        } else {
            const participant = campaign.participantsList[participantIndex];
            if (!participant.tasks) {
                participant.tasks = [];
            }
            const taskIndex = participant.tasks.findIndex(t => t.taskId.toString() === taskId);
            if (taskIndex === -1) {
                participant.tasks.push({
                    taskId,
                    status: 'pending',
                    proof: req.file.path,
                    submittedAt: new Date()
                });
            } else {
                participant.tasks[taskIndex].status = 'pending';
                participant.tasks[taskIndex].proof = req.file.path;
                participant.tasks[taskIndex].submittedAt = new Date();
            }
            participant.lastActivity = new Date();
        }

        // Update task's completedBy
        const completedByEntry = task.completedBy.find(entry => entry.userId.toString() === req.user.userId);
        if (!completedByEntry) {
            task.completedBy.push({
                userId: req.user.userId,
                proofUrl: req.file.path,
                status: 'pending',
                submittedAt: new Date()
            });
        } else {
            completedByEntry.proofUrl = req.file.path;
            completedByEntry.status = 'pending';
            completedByEntry.submittedAt = new Date();
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
app.post('/campaigns/complete-task', authenticateToken, async (req, res) => {
    try {
        const { campaignId, taskId } = req.body;
        const userId = req.user.userId;

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const task = campaign.tasksList.id(taskId);
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Check if task requires proof
        if (task.type === 'proof-upload') {
            return res.status(400).json({ 
                message: 'This task requires proof upload' 
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if task is already completed
        const userTask = user.tasks.find(t =>
            t.taskId.toString() === taskId &&
            t.campaignId.toString() === campaignId
        );

        if (userTask && userTask.status === 'completed') {
            return res.status(400).json({ message: 'Task already completed' });
        }

        // Calculate reward (with potential penalty for late completion)
        const currentDate = new Date();
        const startDate = new Date(campaign.startDate);
        const dayDiff = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        const daysLate = dayDiff - task.day;

        let penaltyFactor = 1;
        if (daysLate > 0) {
            penaltyFactor = Math.max(0.5, 1 - (daysLate * 0.1)); // 10% penalty per day late
        }

        const baseReward = task.reward || 0;
        const finalReward = baseReward * penaltyFactor;

        // Update user's task status
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

        // Update user campaign progress
        const userCampaign = user.campaigns.find(c =>
            c.campaignId.toString() === campaignId
        );
        if (userCampaign) {
            userCampaign.completed += 1;
            userCampaign.lastActivity = new Date();
        }

        // Update campaign stats
        campaign.completedTasks += 1;

        // Update campaign participant
        const participant = campaign.participantsList.find(p =>
            p.userId.toString() === userId
        );
        if (participant) {
            participant.completed += 1;
            participant.lastActivity = new Date();

            const participantTask = participant.tasks.find(t =>
                t.taskId.toString() === taskId
            );
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

        // Update task's completedBy
        const completedByEntry = task.completedBy.find(entry =>
            entry.userId.toString() === userId
        );
        if (!completedByEntry) {
            task.completedBy.push({
                userId: userId,
                status: 'completed',
                completedAt: new Date()
            });
        } else {
            completedByEntry.status = 'completed';
            completedByEntry.completedAt = new Date();
        }

        // Add reward to user and update CO2 saved
        user.earnings += finalReward;
        const co2Saved = parseFloat(user.co2Saved || '0') + (task.co2Impact || 0.01); // Default 0.01 kg if not specified
        user.co2Saved = co2Saved.toFixed(2);

        // Create transaction
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
            co2Saved: user.co2Saved,
            penalty: daysLate > 0 ? `${(1 - penaltyFactor) * 100}% penalty applied` : 'No penalty',
            balance: user.earnings
        });
    } catch (err) {
        console.error('Complete task error:', err);
        res.status(500).json({ message: 'Failed to complete task' });
    }
});


// Add this route to start tasks
app.post('/campaigns/start-task', authenticateToken, async (req, res) => {
  try {
    const { campaignId, taskId } = req.body;
    
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    const task = campaign.tasksList.id(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Initialize startedAt if not set
    if (!task.startedAt) {
      task.startedAt = new Date();
      await campaign.save();
    }

    res.json({ message: 'Task started successfully', startedAt: task.startedAt });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin routes
app.get('/admin/campaigns', authenticateToken, adminAuth, async (req, res) => {
    try {
        let query = {};
        // If not admin, only show campaigns created by this admin
        if (req.user.email !== process.env.ADMIN_EMAIL) {
            query.createdBy = req.user.userId;
        }
        
        const campaigns = await Campaign.find(query)
            .sort({ createdAt: -1 })
            .lean();
            
        // Get total counts
        const totalCampaigns = await Campaign.countDocuments();
        const myCampaigns = await Campaign.countDocuments({ createdBy: req.user.userId });
        
        res.json({
            campaigns,
            stats: {
                totalCampaigns,
                myCampaigns
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/admin/campaigns/:id', authenticateToken, adminAuth, async (req, res) => {
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

// Updated Admin Campaign Creation Endpoint
app.post('/admin/campaigns', [authenticateToken, adminAuth, upload.single('image')], async (req, res) => {
    try {
        // Parse form data
        const formData = req.body;

        // Validate required fields first
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
        let imagePath = null;
        if (req.file) {
            imagePath = path.join('uploads', 'campaigns', req.file.filename);
        }

        // Ensure createdBy is a valid ObjectId or null
        let createdById = null;
        if (req.user.userId && mongoose.Types.ObjectId.isValid(req.user.userId)) {
            createdById = req.user.userId;
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
            image: imagePath,
            participants: 0,
            completedTasks: 0,
            participantsList: [],
            createdBy: createdById // Set to valid ObjectId or null
        });

        await campaign.save();

        // Return the path in a way the frontend can use
        res.status(201).json({
            ...campaign.toObject(),
            image: imagePath ? `/uploads/campaigns/${path.basename(imagePath)}` : null
        });
    } catch (err) {
        // If there was an error, clean up any uploaded file
        if (req.file) {
            fs.unlink(req.file.path, () => { });
        }
        console.error('Error creating campaign:', err);
        res.status(500).json({
            message: err.message || 'Failed to create campaign',
            error: err // Include error details for debugging
        });
    }
});

app.put('/admin/campaigns/:id', [authenticateToken, adminAuth, upload.single('image')], async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Parse form data
        const formData = req.body;

        // Parse tasks if they exist
        if (formData.tasks) {
            try {
                campaign.tasksList = JSON.parse(formData.tasks);
            } catch (e) {
                console.error('Error parsing tasks:', e);
                return res.status(400).json({ message: 'Invalid tasks format' });
            }
        }

        // Update basic fields
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
        campaign.endDate = new Date(new Date(formData.startDate).getTime() + (parseInt(formData.duration) * 24 * 60 * 60 * 1000));
        campaign.status = formData.status;

        // Handle image update
        if (req.file) {
            // Delete old image if it exists
            if (campaign.image && fs.existsSync(path.join(__dirname, campaign.image))) {
                fs.unlinkSync(path.join(__dirname, campaign.image));
            }
            campaign.image = path.join('uploads', 'campaigns', req.file.filename);
        }

        await campaign.save();

        // Return the updated campaign with proper image URL
        res.json({
            ...campaign.toObject(),
            image: campaign.image ? `/uploads/campaigns/${path.basename(campaign.image)}` : null
        });
    } catch (err) {
        console.error('Error updating campaign:', err);
        res.status(500).json({
            message: err.message || 'Failed to update campaign',
            error: err
        });
    }
});

// Updated Campaign Delete Endpoint
app.delete('/admin/campaigns/:id', authenticateToken, adminAuth, async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Delete associated image file if it exists
        if (campaign.image && fs.existsSync(path.join(__dirname, campaign.image))) {
            fs.unlinkSync(path.join(__dirname, campaign.image));
        }

        // Remove campaign from database
        await Campaign.deleteOne({ _id: req.params.id });

        // Remove campaign from all users who joined it
        await User.updateMany(
            { 'campaigns.campaignId': req.params.id },
            { $pull: { campaigns: { campaignId: req.params.id } } }
        );

        res.json({ message: 'Campaign deleted successfully' });
    } catch (err) {
        console.error('Error deleting campaign:', err);
        res.status(500).json({
            message: err.message || 'Failed to delete campaign',
            error: err
        });
    }
});

app.get('/admin/campaigns/:id/proofs', authenticateToken, adminAuth, async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id)
            .select('tasksList participantsList')
            .lean();

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        const proofsByTask = campaign.tasksList.map(task => {
            const proofs = task.completedBy.map(entry => ({
                userId: entry.userId,
                proofUrl: entry.proofUrl,
                status: entry.status,
                submittedAt: entry.submittedAt
            }));

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

app.post('/admin/campaigns/:id/approve-proof', authenticateToken, adminAuth, async (req, res) => {
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

        const userTask = participant.tasks.find(t => t.taskId.toString() === taskId);
        if (!userTask) {
            return res.status(404).json({ message: 'Task proof not found' });
        }

        const completedByEntry = task.completedBy.find(entry => entry.userId.toString() === userId);
        if (!completedByEntry) {
            return res.status(404).json({ message: 'Proof not found in task' });
        }

        userTask.status = approve ? 'completed' : 'rejected';
        completedByEntry.status = approve ? 'completed' : 'rejected';
        if (approve) {
            userTask.completedAt = new Date();
            completedByEntry.completedAt = new Date();
        }

        if (approve) {
            if (userTask.status !== 'completed') {
                campaign.completedTasks += 1;
                participant.completed += 1;

                const user = await User.findById(userId);
                if (user) {
                    user.earnings += task.reward || 0;
                    const userTask = user.tasks.find(t =>
                        t.taskId.toString() === taskId &&
                        t.campaignId.toString() === req.params.id
                    );
                    if (userTask) {
                        userTask.status = 'completed';
                        userTask.completedAt = new Date();
                    }
                    const userCampaign = user.campaigns.find(c =>
                        c.campaignId.toString() === req.params.id
                    );
                    if (userCampaign) {
                        userCampaign.completed += 1;
                    }
                    await user.save();
                }
            }
        } else {
            if (userTask.status === 'completed') {
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
app.post('/games/start', authenticateToken, async (req, res) => {
    try {
        const { gameId, title } = req.body;

        // Validate gameId
        if (!mongoose.Types.ObjectId.isValid(gameId)) {
            return res.status(400).json({ message: 'Invalid game ID' });
        }

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const game = await Game.findById(gameId);
        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }

        const userGame = user.games.find(g => g.gameId.toString() === gameId);
        const today = new Date().toDateString();
        if (userGame && userGame.lastPlayed && new Date(userGame.lastPlayed).toDateString() === today) {
            return res.status(400).json({ message: 'Daily play limit reached' });
        }

        if (!userGame) {
            user.games.push({
                gameId,
                lastPlayed: new Date(),
                plays: 1
            });
        } else {
            userGame.lastPlayed = new Date();
            userGame.plays += 1;
        }

        user.gamesPlayed += 1;
        game.plays += 1;

        await Promise.all([user.save(), game.save()]);
        res.json({ message: 'Game session started' });
    } catch (err) {
        console.error('Start game error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Complete a game session and award rewards
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
      amount: parseFloat(game.reward.replace('₿ ', '')),
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
});

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
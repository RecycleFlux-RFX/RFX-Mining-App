const Campaign = require('../../models/Campaign');
const User = require('../../models/User');
const Transaction = require('../../models/Transaction');
const mongoose = require('mongoose');


const getAllCampaigns = async (req, res) => {
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
};


const findCampaignParticipant = (campaign, userId) => {
  if (!campaign?.participantsList || !userId) return null;
  
  return campaign.participantsList.find(p => 
    p.userId && p.userId.toString() === userId.toString()
  ) || null;
};

// Usage in uploadProof:
/* const participant = findCampaignParticipant(campaign, userId);
if (!participant) {
  console.error('Participation mismatch:', {
    userId,
    campaignId: campaign._id,
    participantCount: campaign.participantsList.length
  });
  return res.status(400).json({
    code: 'USER_NOT_IN_CAMPAIGN',
    message: 'Participation record not found',
    details: {
      requiresRepair: true,
      userInCampaigns: user.campaigns.some(c => c.campaignId.toString() === campaignId.toString())
    }
  });
} */
 

const getCampaignDetails = async (req, res) => {
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
};

const getUserCampaignDetails = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('participantsList.userId', 'username email')
      .lean();

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const hasJoined = user.campaigns.some(c => c.campaignId.toString() === req.params.id);
    const userCampaign = user.campaigns.find(c => c.campaignId.toString() === req.params.id);

    // Calculate day progress
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

    // Get user's tasks with enhanced status tracking
    const userTasks = campaign.tasksList.map(task => {
      const userTask = user.tasks.find(t =>
        t.taskId.toString() === task._id.toString() &&
        t.campaignId.toString() === req.params.id
      );
      
      const participantTask = campaign.participantsList
        .find(p => p.userId.toString() === req.user.userId)
        ?.tasks.find(t => t.taskId.toString() === task._id.toString());

      return {
        ...task,
        id: task._id.toString(),
        status: userTask?.status || 'open',
        proof: userTask?.proof || null,
        completed: userTask?.status === 'completed',
        submittedAt: userTask?.submittedAt,
        completedAt: userTask?.completedAt,
        participantStatus: participantTask?.status,
        day: task.day || 1
      };
    });

    // Filter tasks for current day
    const dailyTasks = userTasks.filter(task => task.day === currentDay);

    res.json({
      ...campaign,
      id: campaign._id.toString(),
      hasJoined,
      userCompleted: userCampaign?.completed || 0,
      currentDay,
      dayTimeLeft: {
        hours: Math.max(0, hours),
        minutes: Math.max(0, minutes),
        seconds: Math.max(0, seconds)
      },
      dailyTasks,
      allTasks: userTasks,
      progress: campaign.tasksList.length > 0 
        ? ((userCampaign?.completed || 0) / campaign.tasksList.length) * 100 
        : 0,
      reward: `${campaign.reward} RFX`,
      duration: `${campaign.duration} days`
    });
  } catch (err) {
    console.error('Get user campaign error:', err);
    res.status(500).json({ message: 'Failed to fetch campaign details' });
  }
};

const joinCampaign = async (req, res) => {
  try {
    const campaignId = req.params.id;
    const userId = req.user.userId;

    const [campaign, user] = await Promise.all([
      Campaign.findById(campaignId),
      User.findById(userId)
    ]);

    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if already joined
    if (user.campaigns.some(c => c.campaignId.toString() === campaignId)) {
      return res.status(400).json({ message: 'Already joined this campaign' });
    }

    // Check campaign status
    if (campaign.status !== 'active') {
      return res.status(400).json({ message: 'Campaign is not currently active' });
    }

    // Add to user's campaigns
    user.campaigns.push({
      campaignId: campaign._id,
      joinedAt: new Date(),
      lastActivity: new Date()
    });

    // Add to campaign participants
    campaign.participants += 1;
    campaign.participantsList.push({
      userId: user._id,
      username: user.username,
      email: user.email,
      joinedAt: new Date(),
      lastActivity: new Date(),
      tasks: campaign.tasksList.map(task => ({
        taskId: task._id,
        status: 'open'
      }))
    });

    await Promise.all([user.save(), campaign.save()]);

    res.json({
      message: 'Successfully joined campaign',
      campaignId: campaign._id,
      title: campaign.title,
      participants: campaign.participants
    });
  } catch (err) {
    console.error('Join campaign error:', err);
    res.status(500).json({ message: 'Failed to join campaign' });
  }
};

const uploadProof = async (req, res) => {
  try {
    const { campaignId, taskId } = req.params;
    const userId = req.user.userId;

    // Validate file exists
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'Proof file is required',
        code: 'MISSING_PROOF_FILE'
      });
    }

    // Find campaign, user, and task in parallel
    const [campaign, user] = await Promise.all([
      Campaign.findById(campaignId).lean(),
      User.findById(userId).lean()
    ]);

    // Validate entities exist
    if (!campaign) {
      return res.status(404).json({ 
        success: false,
        message: 'Campaign not found',
        code: 'CAMPAIGN_NOT_FOUND'
      });
    }
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND' 
      });
    }

    const task = campaign.tasksList.find(t => t._id.toString() === taskId);
    if (!task) {
      return res.status(404).json({ 
        success: false,
        message: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    // Check campaign participation
    const userCampaign = user.campaigns.find(c => 
      c.campaignId.toString() === campaignId
    );
    
    if (!userCampaign) {
      return res.status(400).json({ 
        success: false,
        message: 'Join the campaign first',
        code: 'USER_NOT_IN_CAMPAIGN',
        requiresRepair: false
      });
    }

    // Check existing task status
    const existingUserTask = user.tasks.find(t => 
      t.taskId.toString() === taskId && 
      t.campaignId.toString() === campaignId
    );
    
    if (existingUserTask?.status === 'completed') {
      return res.status(400).json({ 
        success: false,
        message: 'Task already completed',
        code: 'TASK_ALREADY_COMPLETED'
      });
    }

    if (existingUserTask?.status === 'pending') {
      return res.status(400).json({ 
        success: false,
        message: 'Proof already submitted and pending review',
        code: 'PROOF_PENDING_REVIEW'
      });
    }
    
    // Get proof URL from Cloudinary
    const proofUrl = req.file.path;

    // Refresh documents for updates
    const [updatedUser, updatedCampaign] = await Promise.all([
      User.findById(userId),
      Campaign.findById(campaignId)
    ]);

    // Update user's task
    const userUpdate = {
      $set: {
        'campaigns.$[campaign].lastActivity': new Date()
      }
    };

    if (!existingUserTask) {
      userUpdate.$push = {
        tasks: {
          campaignId,
          taskId,
          status: 'pending',
          proof: proofUrl,
          submittedAt: new Date()
        }
      };
    } else {
      userUpdate.$set['tasks.$[task].status'] = 'pending';
      userUpdate.$set['tasks.$[task].proof'] = proofUrl;
      userUpdate.$set['tasks.$[task].submittedAt'] = new Date();
    }

    // Update campaign participant's task
    let participant = updatedCampaign.participantsList.find(p => 
      p.userId.toString() === userId
    );

    // Attempt to repair participation if missing
    if (!participant) {
      const repaired = await repairCampaignParticipation(userId, campaignId);
      if (!repaired) {
        return res.status(400).json({ 
          success: false,
          message: 'Participation record not found',
          code: 'PARTICIPATION_MISMATCH',
          requiresRepair: true
        });
      }
      // Refresh campaign after repair
      await updatedCampaign.save();
      participant = updatedCampaign.participantsList.find(p => 
        p.userId.toString() === userId
      );
    }

    const participantTaskIndex = participant.tasks.findIndex(t => 
      t.taskId.toString() === taskId
    );

    const campaignUpdate = {
      $set: {
        'participantsList.$[participant].lastActivity': new Date()
      }
    };

    if (participantTaskIndex === -1) {
      campaignUpdate.$push = {
        'participantsList.$[participant].tasks': {
          taskId,
          status: 'pending',
          proof: proofUrl,
          submittedAt: new Date()
        }
      };
    } else {
      campaignUpdate.$set[`participantsList.$[participant].tasks.${participantTaskIndex}.status`] = 'pending';
      campaignUpdate.$set[`participantsList.$[participant].tasks.${participantTaskIndex}.proof`] = proofUrl;
      campaignUpdate.$set[`participantsList.$[participant].tasks.${participantTaskIndex}.submittedAt`] = new Date();
    }

    // Update task's completedBy
    const completedByIndex = task.completedBy.findIndex(entry => 
      entry.userId.toString() === userId
    );

    if (completedByIndex === -1) {
      campaignUpdate.$push = {
        'tasksList.$[task].completedBy': {
          userId,
          proofUrl,
          status: 'pending',
          submittedAt: new Date()
        }
      };
    } else {
      campaignUpdate.$set[`tasksList.$[task].completedBy.${completedByIndex}.proofUrl`] = proofUrl;
      campaignUpdate.$set[`tasksList.$[task].completedBy.${completedByIndex}.status`] = 'pending';
      campaignUpdate.$set[`tasksList.$[task].completedBy.${completedByIndex}.submittedAt`] = new Date();
    }

    // Execute all updates
    await Promise.all([
      User.updateOne(
        { _id: userId },
        userUpdate,
        {
          arrayFilters: [
            { 'campaign.campaignId': campaignId },
            ...(existingUserTask ? [{ 'task.taskId': taskId }] : [])
          ]
        }
      ),
      Campaign.updateOne(
        { _id: campaignId },
        campaignUpdate,
        {
          arrayFilters: [
            { 'participant.userId': userId },
            { 'task._id': taskId }
          ]
        }
      )
    ]);

    res.json({
      success: true,
      message: 'Proof uploaded successfully, pending verification',
      data: {
        proofUrl,
        taskId,
        status: 'pending',
        submittedAt: new Date()
      }
    });

  } catch (err) {
    console.error('Upload proof error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to upload proof',
      error: err.message,
      code: 'UPLOAD_ERROR'
    });
  }
};


async function repairCampaignParticipation(userId, campaignId) {
  const [user, campaign] = await Promise.all([
    User.findById(userId),
    Campaign.findById(campaignId)
  ]);

  if (!user || !campaign) return false;

  // Check if user is in campaign but not in participantsList
  const hasJoined = user.campaigns.some(c => c.campaignId.toString() === campaignId);
  const isParticipant = campaign.participantsList.some(p => p.userId.toString() === userId);

  if (hasJoined && !isParticipant) {
    campaign.participantsList.push({
      userId: user._id,
      username: user.username,
      email: user.email,
      joinedAt: new Date(),
      lastActivity: new Date(),
      tasks: campaign.tasksList.map(task => ({
        taskId: task._id,
        status: 'open'
      }))
    });
    await campaign.save();
    return true;
  }

  return false;
}

const completeTask = async (req, res) => {
  try {
    const { campaignId, taskId } = req.params;
    const userId = req.user.userId;

    // Validate input parameters
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid campaign ID format'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID format'
      });
    }

    // Get current state
    const [campaign, user] = await Promise.all([
      Campaign.findById(campaignId),
      User.findById(userId)
    ]);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const task = campaign.tasksList.id(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user has joined the campaign
    const userCampaign = user.campaigns.find(c => 
      c.campaignId.toString() === campaignId
    );
    
    if (!userCampaign) {
      return res.status(400).json({
        success: false,
        message: 'Join the campaign first',
        code: 'CAMPAIGN_NOT_JOINED'
      });
    }

    // Check if task is already completed
    const existingUserTask = user.tasks.find(t => 
      t.taskId.toString() === taskId && 
      t.campaignId.toString() === campaignId
    );
    
    if (existingUserTask?.status === 'completed') {
      return res.status(400).json({ 
        success: false,
        message: 'Task already completed',
        taskId,
        status: 'completed',
        code: 'TASK_ALREADY_COMPLETED'
      });
    }

    // Calculate reward with penalty for late completion
    const currentDate = new Date();
    const startDate = new Date(campaign.startDate);
    const dayDiff = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const daysLate = dayDiff - task.day;

    let penaltyFactor = 1;
    if (daysLate > 0) {
      penaltyFactor = Math.max(0.5, 1 - (daysLate * 0.1));
    }

    const baseReward = task.reward || 0;
    const finalReward = parseFloat((baseReward * penaltyFactor).toFixed(5));
    let co2Impact = parseFloat(task.co2Impact) || 2.0;

    // Validate reward calculation
    if (isNaN(finalReward) || finalReward < 0) {
      throw new Error('Invalid reward calculation');
    }

    // Prepare updates for User
    const userUpdates = {
      $inc: { earnings: finalReward },
      $set: {
        co2Saved: (parseFloat(user.co2Saved || '0') + co2Impact).toFixed(2),
        'campaigns.$[campaign].lastActivity': currentDate,
        'campaigns.$[campaign].completed': userCampaign.completed + 1
      }
    };

    if (!existingUserTask) {
      userUpdates.$push = {
        tasks: {
          campaignId,
          taskId,
          status: 'completed',
          completedAt: currentDate,
          rewardEarned: finalReward
        }
      };
    } else {
      userUpdates.$set = {
        ...userUpdates.$set,
        'tasks.$[task].status': 'completed',
        'tasks.$[task].completedAt': currentDate,
        'tasks.$[task].rewardEarned': finalReward
      };
    }

    // Prepare updates for Campaign
    const campaignUpdates = {
      $inc: { completedTasks: 1 },
      $set: {
        'participantsList.$[participant].lastActivity': currentDate,
        'participantsList.$[participant].completed': userCampaign.completed + 1
      }
    };

    // Check if participant exists
    const participantExists = campaign.participantsList.some(p => 
      p.userId.toString() === userId
    );

    if (!participantExists) {
      campaignUpdates.$push = {
        participantsList: {
          userId,
          username: user.username,
          email: user.email,
          joinedAt: currentDate,
          lastActivity: currentDate,
          completed: 1,
          tasks: [{
            taskId,
            status: 'completed',
            completedAt: currentDate
          }]
        }
      };
    } else {
      // Check if task exists in participant's tasks
      const participantTaskExists = campaign.participantsList.some(p => 
        p.userId.toString() === userId && 
        p.tasks.some(t => t.taskId.toString() === taskId)
      );

      if (!participantTaskExists) {
        campaignUpdates.$push = {
          'participantsList.$[participant].tasks': {
            taskId,
            status: 'completed',
            completedAt: currentDate
          }
        };
      } else {
        campaignUpdates.$set = {
          ...campaignUpdates.$set,
          'participantsList.$[participant].tasks.$[task].status': 'completed',
          'participantsList.$[participant].tasks.$[task].completedAt': currentDate
        };
      }
    }

    // Handle completedBy in task
    const completedByExists = task.completedBy.some(c => 
      c.userId.toString() === userId
    );

    if (!completedByExists) {
      campaignUpdates.$push = {
        'tasksList.$[task].completedBy': {
          userId,
          status: 'completed',
          completedAt: currentDate
        }
      };
    } else {
      campaignUpdates.$set = {
        ...campaignUpdates.$set,
        'tasksList.$[task].completedBy.$[completedBy].status': 'completed',
        'tasksList.$[task].completedBy.$[completedBy].completedAt': currentDate
      };
    }

    // Prepare array filters
    const userArrayFilters = [
      { 'campaign.campaignId': campaignId }
    ];

    if (existingUserTask) {
      userArrayFilters.push({ 'task.taskId': taskId });
    }

    const campaignArrayFilters = [
      { 'participant.userId': userId },
      { 'task._id': taskId },
      { 'completedBy.userId': userId }
    ];

    // Execute all updates
    const [updatedUser, updatedCampaign] = await Promise.all([
      User.findByIdAndUpdate(
        userId, 
        userUpdates, 
        { 
          arrayFilters: userArrayFilters,
          new: true 
        }
      ),
      Campaign.findByIdAndUpdate(
        campaignId, 
        campaignUpdates, 
        { 
          arrayFilters: campaignArrayFilters,
          new: true 
        }
      ),
      new Transaction({
        userId,
        amount: finalReward,
        type: 'earn',
        category: 'Campaign',
        activity: `Completed task: ${task.title}`,
        description: `Earned ${finalReward.toFixed(5)} RFX for completing task in ${campaign.title}`,
        color: 'green',
        timestamp: currentDate
      }).save()
    ]);

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Task completed successfully',
      data: {
        task: {
          id: taskId,
          title: task.title,
          reward: finalReward,
          status: 'completed',
          completedAt: currentDate
        },
        userStats: {
          earnings: updatedUser.earnings,
          co2Saved: updatedUser.co2Saved
        },
        campaignProgress: {
          completed: userCampaign.completed + 1,
          total: campaign.tasksList.length,
          percentage: parseFloat(
            (((userCampaign.completed + 1) / campaign.tasksList.length) * 100).toFixed(2))
        },
        penalty: daysLate > 0 ? {
          daysLate,
          penaltyFactor,
          message: `${(1 - penaltyFactor) * 100}% penalty applied`
        } : null
      }
    });

  } catch (error) {
    console.error('Complete task error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to complete task',
      error: error.message,
      code: 'TASK_COMPLETION_FAILED',
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack
      })
    });
  }
};

const createCampaign = async (req, res) => {
  try {
    // Parse form data
    const formData = req.body;

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
      image: imageUrl,
      participants: 0,
      completedTasks: 0,
      participantsList: [],
      createdBy: new mongoose.Types.ObjectId(req.user.userId)
    });

    await campaign.save();

    res.status(201).json({
      ...campaign.toObject(),
      image: imageUrl
    });
  } catch (err) {
    console.error('Error creating campaign:', err);
    res.status(500).json({
      message: err.message || 'Failed to create campaign',
      error: process.env.NODE_ENV === 'development' ? err : undefined
    });
  }
};

const updateCampaign = async (req, res) => {
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
};

const deleteCampaign = async (req, res) => {
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
};




module.exports = {
  getAllCampaigns,
  getCampaignDetails,
  getUserCampaignDetails,
  joinCampaign,
  uploadProof,
  completeTask,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  repairCampaignParticipation
};
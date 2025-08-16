const Campaign = require('../../models/Campaign');
const Transaction  = require('../../models/Transaction');
const User = require('../../models/User');
const path = require('path');
const fs = require('fs');

const getAdminCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find()
      .sort({ createdAt: -1 })
      .lean();

    res.json(campaigns);
  } catch (err) {
    console.error('Get admin campaigns error:', err);
    res.status(500).json({ message: 'Failed to fetch campaigns' });
  }
};

const getAdminCampaignDetails = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('participantsList.userId', 'username email avatar lastActivity')
      .lean();

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Enhance participants data with activity information
    const enhancedParticipants = campaign.participantsList.map(participant => {
      return {
        ...participant,
        lastActivity: participant.lastActivity || participant.joinedAt,
        completedTasks: participant.tasks.filter(t => t.status === 'completed').length,
        totalTasks: campaign.tasksList.length
      };
    });

    res.json({
      ...campaign,
      participantsList: enhancedParticipants
    });
  } catch (err) {
    console.error('Get admin campaign details error:', err);
    res.status(500).json({ message: 'Failed to fetch campaign details' });
  }
};

// Add this to your campaign controller
const repairCampaignParticipation = async (req, res) => {
  try {
    const { id: campaignId } = req.params;
    const userId = req.user.userId;

    const [user, campaign] = await Promise.all([
      User.findById(userId),
      Campaign.findById(campaignId)
    ]);

    if (!user || !campaign) {
      return res.status(404).json({ message: 'User or campaign not found' });
    }

    // Check if repair is needed
    const userHasJoined = user.campaigns.some(c => 
      c.campaignId && c.campaignId.toString() === campaignId.toString()
    );
    
    const isInParticipants = campaign.participantsList.some(p => 
      p.userId && p.userId.toString() === userId.toString()
    );

    if (userHasJoined && !isInParticipants) {
      // Add to participants list
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
      return res.json({ 
        success: true, 
        repaired: true,
        message: 'Participation record repaired successfully'
      });
    }

    return res.json({ 
      success: true, 
      repaired: false,
      message: 'No repair needed - user participation is consistent'
    });
  } catch (error) {
    console.error('Repair error:', error);
    res.status(500).json({ 
      message: 'Repair failed', 
      error: error.message 
    });
  }
};

const getCampaignProofs = async (req, res) => {
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
};

const approveProof = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { proofs, approve } = req.body; // Now expects array of {taskId, userId}

    if (!proofs || !proofs.length || typeof approve !== 'boolean') {
      return res.status(400).json({ message: 'Invalid request data' });
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Process each proof
    const results = [];
    for (const { taskId, userId } of proofs) {
      const task = campaign.tasksList.id(taskId);
      if (!task) {
        results.push({ taskId, userId, success: false, message: 'Task not found' });
        continue;
      }

      const proof = task.completedBy.find(p => p.userId.toString() === userId);
      if (!proof) {
        results.push({ taskId, userId, success: false, message: 'Proof not found' });
        continue;
      }

      proof.status = approve ? 'completed' : 'rejected';
      results.push({ taskId, userId, success: true });
    }

    await campaign.save();
    res.json({ success: true, results });
  } catch (err) {
    console.error('Approve proof error:', err);
    res.status(500).json({ message: 'Failed to update proof status' });
  }
};

module.exports = {
  getAdminCampaigns,
  getAdminCampaignDetails,
  getCampaignProofs,
  approveProof
};
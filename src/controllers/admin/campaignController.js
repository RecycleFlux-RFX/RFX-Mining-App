const Campaign = require('../../models/Campaign');
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
    const { taskId, userId, approve } = req.body;
    const campaignId = req.params.id;

    const campaign = await Campaign.findById(campaignId); 
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

    proof.status = approve ? 'completed' : 'rejected';

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
    if (approve) {
      user = await User.findById(userId);
      if (!user) {
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

      let co2Impact = parseFloat(task.co2Impact);
      if (isNaN(co2Impact) || co2Impact <= 0.01) {
        console.warn(`Invalid co2Impact (${task.co2Impact}) for task ${task.title}, updating to 2.0`);
        task.co2Impact = 2.0;
        await campaign.save();
      }
      co2Impact = parseFloat(task.co2Impact) || 2.0;
      user.earnings += task.reward || 0;
      const newCo2Saved = (parseFloat(user.co2Saved || '0') + co2Impact).toFixed(2);
      user.co2Saved = newCo2Saved;

      const transaction = new Transaction({
        userId: user._id,
        amount: task.reward || 0,
        type: 'earn',
        category: 'Campaign',
        activity: `Completed task: ${task.title}`,
        description: `Earned ${task.reward || 0} RFX for completing task in ${campaign.title}`,
        color: 'green',
        timestamp: new Date()
      });

      await transaction.save();
      await user.save();
    }

    campaign.completedTasks += 1;
    await campaign.save();

    res.json({
      message: `Proof ${approve ? 'approved' : 'rejected'} successfully`,
      status: approve ? 'completed' : 'rejected',
      co2Saved: approve ? user.co2Saved : undefined
    });
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
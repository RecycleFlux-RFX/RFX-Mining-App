const Campaign = require('../../models/Campaign');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const getTask = async (req, res) => {
  try {
    const { id: campaignId, taskId } = req.params;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const task = campaign.tasksList.id(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(task);
  } catch (err) {
    console.error('Get task error:', err);
    res.status(500).json({ message: 'Failed to get task' });
  }
};

const createTask = async (req, res) => {
  try {
    const { id: campaignId } = req.params;
    const { 
      day, 
      title, 
      description, 
      type, 
      platform = '', 
      reward, 
      requirements = '', 
      contentUrl = '' 
    } = req.body;

    // Validate required fields
    if (!day || !title || !description || !type || !reward) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Handle file upload
    let finalContentUrl = contentUrl;
    if (req.file) {
      finalContentUrl = req.file.path; // Cloudinary URL
    }

    const newTask = {
      _id: new mongoose.Types.ObjectId(), // Generate new ObjectId
      day: parseInt(day),
      title,
      description,
      type,
      platform: platform || null,
      reward: parseFloat(reward),
      requirements: requirements ? requirements.split(',').map(r => r.trim()) : [],
      contentUrl: finalContentUrl,
      completedBy: []
    };

    campaign.tasksList.push(newTask);
    await campaign.save();

    res.status(201).json({
      message: 'Task created successfully',
      task: newTask
    });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ 
      message: 'Failed to create task',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

const updateTask = async (req, res) => {
  try {
    const { id: campaignId, taskId } = req.params;
    
    // Get data from form fields
    const { 
      day, 
      title, 
      description, 
      type, 
      platform = '', 
      reward, 
      requirements = '', 
      contentUrl = '' 
    } = req.body;

    // Validate required fields
    if (!day || !title || !description || !type || !reward) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const task = campaign.tasksList.id(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Handle file upload if present
    let finalContentUrl = contentUrl || task.contentUrl;
    if (req.file) {
      finalContentUrl = req.file.path;
      // Optionally delete old file if it exists
      if (task.contentUrl && task.contentUrl !== finalContentUrl) {
        try {
          fs.unlinkSync(path.join(__dirname, '..', task.contentUrl));
        } catch (err) {
          console.error('Error deleting old file:', err);
        }
      }
    }

    // Update task fields
    task.day = parseInt(day);
    task.title = title;
    task.description = description;
    task.type = type;
    task.platform = platform || null;
    task.reward = parseFloat(reward);
    task.requirements = requirements ? 
      requirements.split(',').map(r => r.trim()).filter(r => r) : 
      task.requirements;
    task.contentUrl = finalContentUrl;

    await campaign.save();

    res.json({
      message: 'Task updated successfully',
      task: {
        _id: task._id,
        day: task.day,
        title: task.title,
        description: task.description,
        type: task.type,
        platform: task.platform,
        reward: task.reward,
        requirements: task.requirements,
        contentUrl: task.contentUrl
      }
    });
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ 
      message: 'Failed to update task',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

const deleteTask = async (req, res) => {
  try {
    const { id: campaignId, taskId } = req.params;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const task = campaign.tasksList.id(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Instead of preventing deletion, we'll:
    // 1. Remove the task from the campaign
    // 2. Clean up references in participants
    // 3. Keep the proofs for record-keeping

    // Remove task from campaign
    campaign.tasksList.pull(taskId);

    // Remove task from participants
    campaign.participantsList.forEach(participant => {
      participant.tasks = participant.tasks.filter(t => t.taskId.toString() !== taskId);
    });

    await campaign.save();

    // Remove task from users (but keep their proofs in the transaction history)
    await User.updateMany(
      { 'tasks.taskId': taskId },
      { $pull: { tasks: { taskId: taskId } } }
    );

    res.json({ 
      message: 'Task deleted successfully',
      deletedProofsCount: task.completedBy.length // Inform admin how many proofs were affected
    });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ 
      message: 'Failed to delete task',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

module.exports = {
  getTask,
  createTask,
  updateTask,
  deleteTask
};
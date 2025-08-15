const User = require('../../models/User');
const Transaction = require('../../models/Transaction');
const ethers = require('ethers');

const getTransactions = async (req, res) => {
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
};

const sendTokens = async (req, res) => {
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
};

const getRank = async (req, res) => {
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
};

module.exports = {
  getTransactions,
  sendTokens,
  getRank
};
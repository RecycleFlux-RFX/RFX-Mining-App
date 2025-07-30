const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    type: {
        type: String,
        required: true,
        enum: ['earn', 'send', 'receive']
    },
    category: {
        type: String,
        required: true,
        enum: ['Game', 'Campaign', 'Real World', 'Bonus', 'Referral', 'Competition', 'Transfer']
    },
    activity: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 100
    },
    description: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 500
    },
    color: {
        type: String,
        required: true,
        enum: ['purple', 'blue', 'green', 'orange', 'yellow']
    },
    timestamp: {
        type: Date,
        required: true,
        default: Date.now
    }
});

module.exports = mongoose.model('Transaction', transactionSchema);
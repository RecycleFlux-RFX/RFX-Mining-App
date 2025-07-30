const mongoose = require('mongoose');
const Campaign = require('./models/campaign');
const dotenv = require('dotenv');
dotenv.config();

async function migrateCampaigns() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const campaigns = await Campaign.find({});
        for (const campaign of campaigns) {
            // Initialize participantsList if it doesn't exist
            if (!campaign.participantsList) {
                campaign.participantsList = [];
            }

            // Rename tasks to tasksList if necessary
            if (campaign.tasks && !campaign.tasksList) {
                campaign.tasksList = campaign.tasks;
                campaign.tasks = undefined;
            }

            // Ensure participants count matches participantsList length
            campaign.participants = campaign.participantsList.length;

            // Add completedTasks if missing
            if (campaign.completedTasks === undefined) {
                campaign.completedTasks = 0;
            }

            await campaign.save();
            console.log(`Updated campaign ${campaign._id}`);
        }

        console.log('Migration completed');
        mongoose.connection.close();
    } catch (err) {
        console.error('Migration error:', err);
        mongoose.connection.close();
    }
}

migrateCampaigns();
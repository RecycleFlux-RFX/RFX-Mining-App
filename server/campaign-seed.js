const mongoose = require('mongoose');
const Campaign = require('./models/campaign');
const User = require('./models/User');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Sample campaign data
const campaigns = [
    {
        title: "Ocean Cleanup Challenge",
        description: "Join us in cleaning up our oceans by completing daily tasks that reduce plastic pollution and raise awareness about marine conservation.",
        category: "Ocean",
        reward: 0.01,
        difficulty: "Medium",
        duration: 7,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "active",
        featured: true,
        new: true,
        trending: true,
        ending: false,
        tasksList: [
            {
                day: 1,
                title: "Watch Ocean Documentary",
                description: "Watch a documentary about ocean pollution to understand the issue better.",
                type: "video-watch",
                reward: 0.001,
                contentUrl: "https://www.youtube.com/watch?v=6zr0nf-3tw4",
                requirements: [
                    "Watch at least 15 minutes",
                    "Take a screenshot of the video"
                ],
                completedBy: []
            },
            {
                day: 1,
                title: "Share Ocean Facts",
                description: "Share 3 facts about ocean pollution on your social media.",
                type: "social-post",
                platform: "Twitter",
                reward: 0.0015,
                requirements: [
                    "Use hashtag #SaveOurOceans",
                    "Tag 3 friends"
                ],
                completedBy: []
            },
            {
                day: 2,
                title: "Plastic-Free Day",
                description: "Go an entire day without using single-use plastics and document your experience.",
                type: "proof-upload",
                reward: 0.002,
                requirements: [
                    "Take photos of your meals",
                    "Show alternatives you used"
                ],
                completedBy: []
            },
            {
                day: 3,
                title: "Beach Cleanup",
                description: "Organize or join a beach cleanup event in your area.",
                type: "proof-upload",
                reward: 0.0025,
                requirements: [
                    "Take before/after photos",
                    "Show the trash collected"
                ],
                completedBy: []
            },
            {
                day: 4,
                title: "Sustainable Seafood Research",
                description: "Research and list 5 sustainable seafood options in your area.",
                type: "article-read",
                reward: 0.001,
                contentUrl: "https://www.seafoodwatch.org/recommendations",
                completedBy: []
            },
            {
                day: 5,
                title: "Follow Marine Conservation",
                description: "Follow at least 3 marine conservation organizations on social media.",
                type: "social-follow",
                platform: "Instagram",
                reward: 0.001,
                requirements: [
                    "@oceanconservancy",
                    "@sealegacy",
                    "@4ocean"
                ],
                completedBy: []
            },
            {
                day: 6,
                title: "Plastic Alternatives",
                description: "Create a social media post showing 5 plastic alternatives you can use daily.",
                type: "social-post",
                platform: "Facebook",
                reward: 0.0015,
                completedBy: []
            },
            {
                day: 7,
                title: "Reflection Post",
                description: "Share what you learned during this week-long challenge.",
                type: "social-post",
                platform: "Twitter",
                reward: 0.002,
                requirements: [
                    "Use hashtag #OceanCleanupChallenge",
                    "Tag our account @EcoRewards"
                ],
                completedBy: []
            }
        ],
        participants: 0,
        completedTasks: 0,
        participantsList: []
    },
    {
        title: "Forest Guardians",
        description: "Protect our forests by completing tasks that promote reforestation and sustainable forestry practices.",
        category: "Forest",
        reward: 0.008,
        difficulty: "Easy",
        duration: 5,
        startDate: new Date(),
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: "active",
        featured: false,
        new: false,
        trending: true,
        ending: false,
        tasksList: [
            {
                day: 1,
                title: "Tree Planting Pledge",
                description: "Pledge to plant a tree this month or donate to a tree-planting organization.",
                type: "proof-upload",
                reward: 0.0015,
                requirements: [
                    "Screenshot of donation or pledge"
                ],
                completedBy: []
            },
            {
                day: 2,
                title: "Paper Reduction Challenge",
                description: "Go a day without using paper products where possible.",
                type: "proof-upload",
                reward: 0.001,
                completedBy: []
            },
            {
                day: 3,
                title: "Forest Facts",
                description: "Share 3 interesting facts about forests on your social media.",
                type: "social-post",
                platform: "Instagram",
                reward: 0.001,
                requirements: [
                    "Use hashtag #ForestGuardians"
                ],
                completedBy: []
            },
            {
                day: 4,
                title: "Sustainable Wood Research",
                description: "Research and list 3 FSC-certified wood products.",
                type: "article-read",
                reward: 0.001,
                contentUrl: "https://www.fsc.org/",
                completedBy: []
            },
            {
                day: 5,
                title: "Join Forest Community",
                description: "Join a local forest conservation group or online community.",
                type: "proof-upload",
                reward: 0.0015,
                requirements: [
                    "Screenshot of membership"
                ],
                completedBy: []
            }
        ],
        participants: 0,
        completedTasks: 0,
        participantsList: []
    },
    {
        title: "Clean Air Initiative",
        description: "Reduce air pollution by completing tasks that promote cleaner air and sustainable transportation.",
        category: "Air",
        reward: 0.007,
        difficulty: "Hard",
        duration: 10,
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        status: "upcoming",
        featured: false,
        new: true,
        trending: false,
        ending: false,
        tasksList: [
            {
                day: 1,
                title: "Car-Free Day",
                description: "Go an entire day without using a car. Walk, bike, or use public transport.",
                type: "proof-upload",
                reward: 0.002,
                completedBy: []
            },
            {
                day: 2,
                title: "Air Quality Research",
                description: "Research and share your local air quality index.",
                type: "social-post",
                platform: "Twitter",
                reward: 0.001,
                completedBy: []
            },
            {
                day: 3,
                title: "Plant Air-Purifying Plants",
                description: "Get at least one air-purifying plant for your home or office.",
                type: "proof-upload",
                reward: 0.0015,
                completedBy: []
            },
            {
                day: 4,
                title: "Watch Air Pollution Documentary",
                description: "Watch a documentary about air pollution and its effects.",
                type: "video-watch",
                reward: 0.001,
                contentUrl: "https://www.youtube.com/watch?v=e6rglsLy1Ys",
                completedBy: []
            },
            {
                day: 5,
                title: "Public Transport Challenge",
                description: "Use public transport for all your trips for one day.",
                type: "proof-upload",
                reward: 0.002,
                completedBy: []
            },
            {
                day: 6,
                title: "Share Electric Vehicle Benefits",
                description: "Research and share 3 benefits of electric vehicles.",
                type: "social-post",
                platform: "Facebook",
                reward: 0.001,
                completedBy: []
            },
            {
                day: 7,
                title: "Energy Audit",
                description: "Conduct a simple home energy audit and identify areas for improvement.",
                type: "proof-upload",
                reward: 0.0015,
                completedBy: []
            },
            {
                day: 8,
                title: "Follow Clean Air Organizations",
                description: "Follow 2 clean air advocacy groups on social media.",
                type: "social-follow",
                platform: "Twitter",
                reward: 0.001,
                completedBy: []
            },
            {
                day: 9,
                title: "Meat-Free Day",
                description: "Go a day without eating meat to reduce your carbon footprint.",
                type: "proof-upload",
                reward: 0.0015,
                completedBy: []
            },
            {
                day: 10,
                title: "Final Reflection",
                description: "Share what you learned about air pollution and how you'll continue to help.",
                type: "social-post",
                platform: "Instagram",
                reward: 0.002,
                completedBy: []
            }
        ],
        participants: 0,
        completedTasks: 0,
        participantsList: []
    },
    {
        title: "Community Recycling Drive",
        description: "Help improve recycling rates in your community by completing these educational and action-oriented tasks.",
        category: "Community",
        reward: 0.005,
        difficulty: "Medium",
        duration: 5,
        startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        status: "active",
        featured: false,
        new: false,
        trending: false,
        ending: true,
        tasksList: [
            {
                day: 1,
                title: "Learn Recycling Rules",
                description: "Research and list what can be recycled in your local area.",
                type: "article-read",
                reward: 0.001,
                contentUrl: "https://www.epa.gov/recycle",
                completedBy: []
            },
            {
                day: 2,
                title: "Home Recycling Setup",
                description: "Set up a proper recycling station in your home.",
                type: "proof-upload",
                reward: 0.0015,
                completedBy: []
            },
            {
                day: 3,
                title: "Educate a Neighbor",
                description: "Teach one neighbor or friend about proper recycling practices.",
                type: "proof-upload",
                reward: 0.0015,
                completedBy: []
            },
            {
                day: 4,
                title: "Recycling Social Post",
                description: "Share recycling tips on your social media.",
                type: "social-post",
                platform: "Facebook",
                reward: 0.001,
                completedBy: []
            },
            {
                day: 5,
                title: "Community Cleanup",
                description: "Organize or participate in a local cleanup event.",
                type: "proof-upload",
                reward: 0.002,
                completedBy: []
            }
        ],
        participants: 0,
        completedTasks: 0,
        participantsList: []
    },
    {
        title: "Sustainable Living Challenge",
        description: "Adopt sustainable living practices through daily challenges that reduce your environmental impact.",
        category: "Community",
        reward: 0.012,
        difficulty: "Hard",
        duration: 14,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "active",
        featured: true,
        new: false,
        trending: true,
        ending: false,
        tasksList: [
            {
                day: 1,
                title: "Carbon Footprint Calculator",
                description: "Calculate your carbon footprint and share one area for improvement.",
                type: "article-read",
                reward: 0.001,
                contentUrl: "https://www.carbonfootprint.com/calculator.aspx",
                completedBy: []
            },
            {
                day: 2,
                title: "Meatless Monday",
                description: "Go a full day without eating meat.",
                type: "proof-upload",
                reward: 0.0015,
                completedBy: []
            },
            {
                day: 3,
                title: "Zero-Waste Shopping",
                description: "Do one grocery shopping trip with zero packaging waste.",
                type: "proof-upload",
                reward: 0.002,
                completedBy: []
            },
            {
                day: 4,
                title: "Energy Conservation",
                description: "Reduce your energy use by 20% for one day.",
                type: "proof-upload",
                reward: 0.0015,
                completedBy: []
            },
            {
                day: 5,
                title: "Sustainable Fashion",
                description: "Research and share 3 sustainable clothing brands.",
                type: "social-post",
                platform: "Instagram",
                reward: 0.001,
                completedBy: []
            },
            {
                day: 6,
                title: "DIY Cleaning Products",
                description: "Make your own eco-friendly cleaning product.",
                type: "proof-upload",
                reward: 0.002,
                completedBy: []
            },
            {
                day: 7,
                title: "Water Conservation",
                description: "Reduce your water usage by 25% for one day.",
                type: "proof-upload",
                reward: 0.0015,
                completedBy: []
            },
            {
                day: 8,
                title: "Local Food Challenge",
                description: "Eat only locally sourced food for one day.",
                type: "proof-upload",
                reward: 0.002,
                completedBy: []
            },
            {
                day: 9,
                title: "Minimalism Challenge",
                description: "Donate or recycle 10 items you no longer need.",
                type: "proof-upload",
                reward: 0.0015,
                completedBy: []
            },
            {
                day: 10,
                title: "Public Transport Week",
                description: "Use only public transport, bike, or walk for a week.",
                type: "proof-upload",
                reward: 0.003,
                completedBy: []
            },
            {
                day: 11,
                title: "Sustainable Finance",
                description: "Research and share one sustainable banking or investment option.",
                type: "social-post",
                platform: "Twitter",
                reward: 0.001,
                completedBy: []
            },
            {
                day: 12,
                title: "Eco-Friendly Home",
                description: "Switch one household product to an eco-friendly alternative.",
                type: "proof-upload",
                reward: 0.0015,
                completedBy: []
            },
            {
                day: 13,
                title: "Educate Others",
                description: "Teach someone about sustainable living practices.",
                type: "proof-upload",
                reward: 0.002,
                completedBy: []
            },
            {
                day: 14,
                title: "Reflection & Commitment",
                description: "Share what you've learned and commit to 3 ongoing sustainable practices.",
                type: "social-post",
                platform: "Facebook",
                reward: 0.0025,
                completedBy: []
            }
        ],
        participants: 0,
        completedTasks: 0,
        participantsList: []
    }
];

const seedCampaigns = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });


        // Find the admin user
        const adminUser = await User.findOne({ email: 'abubakar.nabil.210@gmail.com' });
        const createdBy = adminUser ? adminUser._id : null;

        // Add createdBy to each campaign
        const campaignsWithCreatedBy = campaigns.map(campaign => ({
            ...campaign,
            createdBy
        }));

        // Delete existing campaigns
        await Campaign.deleteMany({});


        // Insert new campaigns
        const insertedCampaigns = await Campaign.insertMany(campaignsWithCreatedBy);


    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
    }
};

seedCampaigns();
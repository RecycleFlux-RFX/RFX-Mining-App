const mongoose = require('mongoose');
const Game = require('./models/Game');
require('dotenv').config();// Adjust path to your Game model

// MongoDB connection with error handling
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
}

const games = [
    {
        title: "EcoSort Master",
        subtitle: "Trash Sorting Challenge",
    description: 'Drag and drop falling waste items into the correct recycling bins as fast as possible to earn points and rewards!',
    description_long: 'Test your reflexes and recycling knowledge in this exciting drag-and-drop game. Sort falling waste items into the correct bins before they hit the ground. Build combos for bonus points and compete for the high score!',
        category: "Puzzle",
        difficulty: "Easy",
        players: 24891,
        avgTime: "3 min",
        reward: "RFX 0.00050",
        xpReward: 25,
        featured: true,
        new: false,
        trending: true,
        rating: 4.8,
        plays: 125000,
        achievements: 8,
        powerUps: ["Double Points", "Time Freeze", "Auto Sort"],
        gameMode: ["Classic", "Time Attack", "Endless"],
        screenshots: 4,
        locked: false,
        path: "/games/trash-sort",
        bgColor: "from-green-500 to-blue-500",
        cardColor: "bg-green-100",
        canPlay: true,
        dailyLimit: 3,
        wasteItems: [
            { name: "Plastic Bottle", correct: "Plastic", emoji: "♳" },
            { name: "Newspaper", correct: "Paper", emoji: "📰" },
            { name: "Tin Can", correct: "Metal", emoji: "🥫" },
            { name: "Apple Core", correct: "Organic", emoji: "🍎" },
            { name: "Glass Jar", correct: "Glass", emoji: "🍶" }
        ],
        triviaQuestions: [
            {
                question: "Which material takes the longest to decompose?",
                options: ["Plastic", "Paper", "Metal", "Glass"],
                correctAnswer: 0,
                explanation: "Plastic can take up to 1000 years to decompose naturally."
            }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
    title: 'Recycle Rush',
    subtitle: 'Fast-Paced Sorting Challenge',
    description: 'Drag and drop falling waste items into the correct recycling bins as fast as possible to earn points and rewards!',
    description_long: 'Test your reflexes and recycling knowledge in this exciting drag-and-drop game. Sort falling waste items into the correct bins before they hit the ground. Build combos for bonus points and compete for the high score!',
        category: "Strategy",
        difficulty: "Hard",
        players: 12453,
        avgTime: "15 min",
        reward: "RFX 0.00010",
        xpReward: 60,
        featured: true,
        new: false,
        trending: false,
        rating: 4.9,
        plays: 45000,
        achievements: 20,
        powerUps: ["Fast Growth", "Disease Immunity", "Fire Protection"],
        gameMode: ["Campaign", "Sandbox", "Multiplayer"],
        screenshots: 7,
        locked: false,
        path: "/games/recycle-rush",
        bgColor: "from-emerald-500 to-teal-500",
        cardColor: "bg-emerald-100",
        canPlay: true,
        dailyLimit: 5,
        wasteItems: [
            { name: "Wooden Plank", correct: "Organic", emoji: "🪵" },
            { name: "Plastic Wrapper", correct: "Plastic", emoji: "🍬" }
        ],
        triviaQuestions: [
            {
                question: "How much oxygen does one tree produce annually?",
                options: ["10 lbs", "50 lbs", "100 lbs", "260 lbs"],
                correctAnswer: 3,
                explanation: "A single tree can produce about 260 pounds of oxygen per year."
            }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
    title: 'Blockchain & Recycling Trivia',
    subtitle: 'Test Your Knowledge',
    description: 'Answer questions on blockchain and recycling to earn points and rewards!',
    description_long: 'Challenge yourself with trivia questions about blockchain technology and recycling practices. Test your knowledge, build streaks, and earn rewards in this educational and engaging quiz game.',
        category: "Strategy",
        difficulty: "Hard",
        players: 9876,
        avgTime: "20 min",
        reward: "",
        xpReward: 80,
        featured: false,
        new: false,
        trending: false,
        rating: 4.5,
        plays: 32000,
        achievements: 25,
        powerUps: ["Efficiency Boost", "Weather Control", "Tech Upgrade"],
        gameMode: ["Tycoon", "Scenario", "Competitive"],
        screenshots: 8,
        locked: false,
        path: "/games/Trivial",
        bgColor: "from-yellow-500 to-orange-500",
        cardColor: "bg-yellow-100",
        canPlay: true,
        dailyLimit: 2,
        wasteItems: [
            { name: "Solar Panel Scrap", correct: "Metal", emoji: "☀️" },
            { name: "Battery", correct: "Metal", emoji: "🔋" }
        ],
        triviaQuestions: [
            {
                question: "What percentage of global electricity comes from renewables?",
                options: ["10%", "20%", "30%", "40%"],
                correctAnswer: 2,
                explanation: "As of 2023, about 30% of global electricity comes from renewable sources."
            }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
    }
];

async function seedDatabase() {
    try {
        // Connect to database
        await connectDB();

        // Clear existing data with confirmation
        const deleteResult = await Game.deleteMany({});
        console.log(`Deleted ${deleteResult.deletedCount} existing games`);

        // Insert new data with validation
        const createdGames = await Game.insertMany(games);
        console.log(`Successfully seeded ${createdGames.length} games`);

        // Verify the inserted data
        const count = await Game.countDocuments();
        console.log(`Total games in database: ${count}`);

    } catch (error) {
        console.error('Error during seeding:', error);
    } finally {
        // Close connection
        await mongoose.disconnect();
        console.log('Disconnected from database');
        process.exit(0);
    }
}

// Run the seeder
seedDatabase();
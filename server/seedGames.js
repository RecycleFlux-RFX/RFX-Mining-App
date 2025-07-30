const mongoose = require('mongoose');
const Game = require('./models/game');
require('dotenv').config();

const games = [
    {
        title: "EcoSort Master",
        subtitle: "Trash Sorting Challenge",
        description: "Sort waste into correct recycling categories as fast as possible. Test your knowledge of recycling rules while earning rewards!",
        description_long: "Master the art of waste sorting in this fast-paced puzzle game. Learn real recycling rules while competing with players worldwide. Each correct sort earns points and helps save the virtual environment!",
        category: "Puzzle",
        difficulty: "Easy",
        players: 24891,
        avgTime: "3 min",
        reward: "₿ 0.00150",
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
        path: "/games/re",
        locked: false,
        wasteItems: [
            { name: "Plastic Bottle", correct: "Plastic", emoji: "♳" },
            { name: "Newspaper", correct: "Paper", emoji: "📰" },
            { name: "Tin Can", correct: "Metal", emoji: "🥫" },
            { name: "Apple Core", correct: "Organic", emoji: "🍎" },
            { name: "Glass Jar", correct: "Glass", emoji: "🍶" }
        ]
    },
    {
        title: "Ocean Defender",
        subtitle: "Underwater Cleanup",
        description: "Navigate underwater worlds and clean up ocean pollution. Battle against time and sea creatures to restore marine ecosystems.",
        description_long: "Dive deep into polluted oceans and become the ultimate ocean defender. Use special tools to clean up plastic waste, rescue marine life, and restore coral reefs in this immersive underwater adventure.",
        category: "Action",
        difficulty: "Medium",
        players: 18734,
        avgTime: "8 min",
        reward: "₿ 0.00300",
        xpReward: 45,
        featured: false,
        new: true,
        trending: false,
        rating: 4.6,
        plays: 89000,
        achievements: 12,
        powerUps: ["Turbo Speed", "Pollution Magnet", "Shield Boost"],
        gameMode: ["Story", "Survival", "Co-op"],
        screenshots: 6,
        path: "/games/recycle-rush",
        locked: false,
        wasteItems: [
            { name: "Plastic Bag", correct: "Plastic", emoji: "🛍️" },
            { name: "Fish Bone", correct: "Organic", emoji: "🐟" },
            { name: "Broken Glass", correct: "Glass", emoji: "🥂" }
        ]
    },
    {
        title: "Carbon Footprint Quest",
        subtitle: "Lifestyle Simulator",
        description: "Make daily choices that impact your carbon footprint. Learn sustainable living while building your eco-friendly virtual life.",
        description_long: "Experience the consequences of everyday choices in this life simulation game. Build an eco-friendly lifestyle, manage resources, and see how your decisions impact the planet's health over time.",
        category: "Simulation",
        difficulty: "Medium",
        players: 15672,
        avgTime: "12 min",
        reward: "₿ 0.00250",
        xpReward: 35,
        featured: false,
        new: false,
        trending: true,
        rating: 4.7,
        plays: 67000,
        achievements: 15,
        powerUps: ["Green Energy", "Smart Home", "Eco Transport"],
        gameMode: ["Career", "Challenge", "Free Play"],
        screenshots: 5,
        path: "/games/recycle-builders",
        locked: false,
        wasteItems: [
            { name: "Cardboard Box", correct: "Paper", emoji: "📦" },
            { name: "Aluminum Can", correct: "Metal", emoji: "🥤" }
        ]
    },
    {
        title: "Forest Guardian",
        subtitle: "Tree Planting Adventure",
        description: "Plant and nurture forests while defending them from threats. Grow your forest empire and earn rewards for every tree saved.",
        description_long: "Become a forest guardian and protect nature from destruction. Plant trees, manage ecosystems, and defend against wildfires and deforestation in this strategic tower defense game.",
        category: "Strategy",
        difficulty: "Hard",
        players: 12453,
        avgTime: "15 min",
        reward: "₿ 0.00450",
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
        path: "/games/recycle-builders",
        locked: false,
        wasteItems: [
            { name: "Wooden Plank", correct: "Organic", emoji: "🪵" },
            { name: "Plastic Wrapper", correct: "Plastic", emoji: "🍬" }
        ]
    },
    {
        title: "Green Energy Tycoon",
        subtitle: "Renewable Power Empire",
        description: "Build and manage renewable energy facilities. Create a sustainable power grid while maximizing profits and minimizing environmental impact.",
        description_long: "Build your renewable energy empire from the ground up. Research new technologies, manage resources, and compete with other players to create the most efficient green energy network.",
        category: "Strategy",
        difficulty: "Hard",
        players: 9876,
        avgTime: "20 min",
        reward: "₿ 0.00600",
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
        path: "/games/recycle-builders",
        locked: false,
        wasteItems: [
            { name: "Solar Panel Scrap", correct: "Metal", emoji: "☀️" },
            { name: "Battery", correct: "Metal", emoji: "🔋" }
        ]
    },
    {
        title: "Eco Puzzle Challenge",
        subtitle: "Environmental Brain Teasers",
        description: "Solve environmental puzzles and learn about sustainability. Each puzzle teaches real-world eco facts while challenging your mind.",
        description_long: "Exercise your brain with eco-themed puzzles that teach environmental science. From climate change scenarios to biodiversity challenges, each puzzle is both fun and educational.",
        category: "Puzzle",
        difficulty: "Easy",
        players: 21345,
        avgTime: "5 min",
        reward: "₿ 0.00100",
        xpReward: 20,
        featured: false,
        new: false,
        trending: false,
        rating: 4.4,
        plays: 156000,
        achievements: 10,
        powerUps: ["Hint System", "Skip Puzzle", "Double XP"],
        gameMode: ["Daily Challenge", "Progressive", "Time Trial"],
        screenshots: 3,
        path: "/games/recycle-builders",
        locked: false,
        wasteItems: [
            { name: "Coffee Cup", correct: "Paper", emoji: "☕" },
            { name: "Plastic Straw", correct: "Plastic", emoji: "🥤" }
        ]
    }
];

const seedGames = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected successfully');

        await Game.deleteMany({});
        console.log('Cleared existing games');

        await Game.insertMany(games);
        console.log('Inserted games successfully');

        mongoose.connection.close();
    } catch (err) {
        console.error('Error seeding games:', err);
        mongoose.connection.close();
    }
};

seedGames();
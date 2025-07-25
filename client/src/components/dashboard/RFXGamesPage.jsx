import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Home, MapPin, Gamepad2, Wallet, Settings,
    Play, Trophy, Star, Clock, Users, Zap,
    Target, Recycle, Trash2, TreePine, Droplets,
    Award, Crown, TrendingUp, Flame, Puzzle,
    Sword, Shield, Brain, Timer, Gift,
    ArrowRight, Medal, Globe, Lock
} from 'lucide-react';

export default function RFXGamesPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('games');
    const [selectedGame, setSelectedGame] = useState(null);
    const [playerStats, setPlayerStats] = useState({
        level: 12,
        xp: 2847,
        totalXp: 3000,
        gamesPlayed: 156,
        tokensEarned: 0.15478
    });
    const [error, setError] = useState(null);
    const [gameProgress, setGameProgress] = useState([]); // Store user's game progress

    const BASE_URL = 'http://localhost:3000';

    const games = [
        {
            id: 1,
            title: "EcoSort Master",
            subtitle: "Trash Sorting Challenge",
            description: "Sort waste into correct recycling categories as fast as possible. Test your knowledge of recycling rules while earning rewards!",
            category: "Puzzle",
            icon: Trash2,
            bgColor: "from-green-400 to-green-600",
            cardColor: "green",
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
            description_long: "Master the art of waste sorting in this fast-paced puzzle game. Learn real recycling rules while competing with players worldwide. Each correct sort earns points and helps save the virtual environment!",
            screenshots: 4,
            locked: false
        },
        {
            id: 2,
            title: "Ocean Defender",
            subtitle: "Underwater Cleanup",
            description: "Navigate underwater worlds and clean up ocean pollution. Battle against time and sea creatures to restore marine ecosystems.",
            category: "Action",
            icon: Droplets,
            bgColor: "from-blue-400 to-cyan-600",
            cardColor: "blue",
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
            description_long: "Dive deep into polluted oceans and become the ultimate ocean defender. Use special tools to clean up plastic waste, rescue marine life, and restore coral reefs in this immersive underwater adventure.",
            screenshots: 6,
            locked: false
        },
        {
            id: 3,
            title: "Carbon Footprint Quest",
            subtitle: "Lifestyle Simulator",
            description: "Make daily choices that impact your carbon footprint. Learn sustainable living while building your eco-friendly virtual life.",
            category: "Simulation",
            icon: Globe,
            bgColor: "from-purple-400 to-pink-600",
            cardColor: "purple",
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
            description_long: "Experience the consequences of everyday choices in this life simulation game. Build an eco-friendly lifestyle, manage resources, and see how your decisions impact the planet's health over time.",
            screenshots: 5,
            locked: false
        },
        {
            id: 4,
            title: "Forest Guardian",
            subtitle: "Tree Planting Adventure",
            description: "Plant and nurture forests while defending them from threats. Grow your forest empire and earn rewards for every tree saved.",
            category: "Strategy",
            icon: TreePine,
            bgColor: "from-green-500 to-emerald-600",
            cardColor: "emerald",
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
            description_long: "Become a forest guardian and protect nature from destruction. Plant trees, manage ecosystems, and defend against wildfires and deforestation in this strategic tower defense game.",
            screenshots: 7,
            locked: false
        },
        {
            id: 5,
            title: "Green Energy Tycoon",
            subtitle: "Renewable Power Empire",
            description: "Build and manage renewable energy facilities. Create a sustainable power grid while maximizing profits and minimizing environmental impact.",
            category: "Strategy",
            icon: Zap,
            bgColor: "from-yellow-400 to-orange-500",
            cardColor: "yellow",
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
            description_long: "Build your renewable energy empire from the ground up. Research new technologies, manage resources, and compete with other players to create the most efficient green energy network.",
            screenshots: 8,
            locked: false
        },
        {
            id: 6,
            title: "Eco Puzzle Challenge",
            subtitle: "Environmental Brain Teasers",
            description: "Solve environmental puzzles and learn about sustainability. Each puzzle teaches real-world eco facts while challenging your mind.",
            category: "Puzzle",
            icon: Brain,
            bgColor: "from-indigo-400 to-purple-600",
            cardColor: "indigo",
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
            description_long: "Exercise your brain with eco-themed puzzles that teach environmental science. From climate change scenarios to biodiversity challenges, each puzzle is both fun and educational.",
            screenshots: 3,
            locked: false
        }
    ];

    const navItems = [
        { icon: Home, label: 'Home', id: 'home', path: '/' },
        { icon: MapPin, label: 'Campaign', id: 'campaign', path: '/campaign' },
        { icon: Gamepad2, label: 'Games', id: 'games', path: '/games' },
        { icon: Wallet, label: 'Wallet', id: 'wallet', path: '/wallet' },
        { icon: Settings, label: 'Settings', id: 'settings', path: '/settings' }
    ];

    const categories = ["All", "Puzzle", "Action", "Simulation", "Strategy"];
    const [selectedCategory, setSelectedCategory] = useState("All");

    const filteredGames = selectedCategory === "All"
        ? games
        : games.filter(game => game.category === selectedCategory);

    const featuredGames = games.filter(game => game.featured);

    useEffect(() => {
        const currentNavItem = navItems.find((item) => item.path === location.pathname);
        if (currentNavItem) {
            setActiveTab(currentNavItem.id);
        }
    }, [location.pathname]);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.log('No auth token found, redirecting to login');
            setError('Please log in to access games');
            navigate('/login');
        }
    }, [navigate]);

    useEffect(() => {
        // In RFXGamesPage.jsx, modify fetchGameProgress
        const fetchGameProgress = async () => {
            try {
                const token = localStorage.getItem('authToken');
                if (!token) {
                    throw new Error('No auth token found');
                }

                const response = await fetch(`${BASE_URL}/games/progress`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    if (response.status === 401 || response.status === 403) {
                        localStorage.removeItem('authToken');
                        navigate('/login');
                        setError('Session expired. Please log in again.');
                        return;
                    }
                    throw new Error(errorData.message || 'Failed to fetch game progress');
                }

                const data = await response.json();
                setPlayerStats(data.playerStats || {
                    level: 1,
                    xp: 0,
                    totalXp: 1000,
                    gamesPlayed: 0,
                    tokensEarned: 0
                });
                setGameProgress(data.games || []);
            } catch (error) {
                console.error('Error fetching game progress:', error.message);
                setError(error.message || 'Failed to load game progress');
                setGameProgress([]);
                setPlayerStats({
                    level: 1,
                    xp: 0,
                    totalXp: 1000,
                    gamesPlayed: 0,
                    tokensEarned: 0
                });
            }
        };

        if (localStorage.getItem('authToken')) {
            fetchGameProgress();
        }
    }, [navigate]);

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.log('No auth token found, redirecting to login');
                setError('Please log in to access games');
                navigate('/login');
                return;
            }

            console.log('Fetching user data, network stats, and referral link...');
            try {
                const headers = {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                };

                const [userResponse, statsResponse, referralResponse] = await Promise.all([
                    fetch(`${BASE_URL}/user/user`, {
                        method: 'GET',
                        headers,
                    }),
                    fetch(`${BASE_URL}/user/network-stats`, {
                        method: 'GET',
                        headers,
                    }),
                    fetch(`${BASE_URL}/user/referral-link`, {
                        method: 'GET',
                        headers,
                    }),
                ]);

                if (!userResponse.ok) {
                    const errorData = await userResponse.json();
                    throw new Error(errorData.message || 'Failed to fetch user data');
                }
                if (!statsResponse.ok) {
                    const errorData = await statsResponse.json();
                    throw new Error(errorData.message || 'Failed to fetch network stats');
                }
                if (!referralResponse.ok) {
                    const errorData = await referralResponse.json();
                    throw new Error(errorData.message || 'Failed to fetch referral link');
                }

                const userDataResult = await userResponse.json();
                const statsDataResult = await statsResponse.json();
                const referralDataResult = await referralResponse.json();

                console.log('User data gotten:', userDataResult);
                console.log('Network stats gotten:', statsDataResult);
                console.log('Referral link gotten:', referralDataResult.referralLink);
            } catch (error) {
                console.error('Error fetching data:', error.message);
                setError(error.message || 'Failed to fetch data. Please try again.');
                if (error.message.includes('Authentication') || error.message.includes('Invalid token')) {
                    console.log('Authentication error, redirecting to login');
                    localStorage.removeItem('authToken');
                    navigate('/login');
                }
            }
        };

        fetchData();
    }, [navigate]);

    const startGameSession = async (game) => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('No auth token found');
            }

            const response = await fetch(`${BASE_URL}/games/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    gameId: game.id,
                    title: game.title,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to start game');
            }

            const data = await response.json();
            console.log('Game started:', data);

            navigate(`/game/${game.id}`);
        } catch (error) {
            console.error('Error starting game:', error.message);
            setError(error.message || 'Failed to start game');
            if (error.message.includes('User not found') || error.message.includes('Invalid token')) {
                localStorage.removeItem('authToken');
                navigate('/login');
            }
        }
    };

    return (
        <div className="w-full min-h-screen bg-gradient-to-br from-black via-gray-900 to-black overflow-hidden relative">
            {/* Animated Background */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-t from-green-500/10 via-transparent to-transparent"></div>
                <div className="absolute top-0 left-1/3 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

                {[...Array(25)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-green-400 rounded-full animate-float opacity-70"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${8 + Math.random() * 8}s`
                        }}
                    ></div>
                ))}
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-24">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-center justify-between mb-8 pt-4 space-y-4 sm:space-y-0">
                    <div className="flex items-center space-x-3">
                        <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center transform rotate-12 transition-transform hover:rotate-0">
                                <Gamepad2 className="w-8 h-8 text-black" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-400 rounded-full animate-ping"></div>
                        </div>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                EcoGames
                            </h1>
                            <p className="text-gray-400 text-sm">Play, Learn, Earn & Save the Planet</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2 px-4 py-2 bg-gray-800/50 backdrop-blur-sm rounded-full border border-gray-700">
                            <Crown className="w-4 h-4 text-yellow-400" />
                            <span className="text-gray-300 text-sm">Level {playerStats.level}</span>
                        </div>
                        <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-gray-800 to-gray-700 rounded-full">
                            <Trophy className="w-4 h-4 text-green-400" />
                            <span className="text-gray-300 text-sm font-mono">₿ {playerStats.tokensEarned}</span>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-4 bg-red-400/20 text-red-400 rounded-xl text-center">
                        {error}
                    </div>
                )}

                {/* Player Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Level', value: playerStats.level, icon: Crown, color: 'yellow', suffix: '' },
                        { label: 'Games Played', value: playerStats.gamesPlayed, icon: Gamepad2, color: 'purple', suffix: '' },
                        { label: 'Total Earned', value: playerStats.tokensEarned, icon: Award, color: 'green', suffix: ' BTC' },
                        { label: 'XP Progress', value: `${playerStats.xp}/${playerStats.totalXp}`, icon: TrendingUp, color: 'blue', suffix: '' }
                    ].map((stat, index) => (
                        <div key={index} className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-4 border border-gray-700">
                            <div className="flex items-center justify-between mb-2">
                                <stat.icon className={`w-5 h-5 ${stat.color === 'yellow' ? 'text-yellow-400' :
                                    stat.color === 'purple' ? 'text-purple-400' :
                                        stat.color === 'green' ? 'text-green-400' : 'text-blue-400'
                                    }`} />
                                <div className="text-xs text-gray-400">{stat.label}</div>
                            </div>
                            <div className="text-lg font-bold text-white">{stat.value}{stat.suffix}</div>
                            {stat.label === 'XP Progress' && (
                                <div className="w-full bg-gray-700 rounded-full h-1 mt-2">
                                    <div
                                        className="bg-gradient-to-r from-blue-400 to-blue-500 h-1 rounded-full"
                                        style={{ width: `${(playerStats.xp / playerStats.totalXp) * 100}%` }}
                                    ></div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Featured Games */}
                {featuredGames.length > 0 && (
                    <div className="mb-8">
                        <div className="flex items-center space-x-2 mb-6">
                            <Flame className="w-6 h-6 text-orange-400 animate-pulse" />
                            <h2 className="text-2xl font-bold text-white">Featured Games</h2>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {featuredGames.map((game) => {
                                const gameProgressData = gameProgress.find(g => g.id === game.id);
                                const canPlay = !gameProgressData || new Date(gameProgressData.lastPlayed).toDateString() !== new Date().toDateString();
                                return (
                                    <div key={game.id} className="relative group">
                                        <div className={`absolute inset-0 bg-gradient-to-r ${game.bgColor.replace('to-', 'to-').replace('from-', 'from-').replace('400', '400/20').replace('500', '500/20').replace('600', '600/20')} rounded-3xl blur-xl group-hover:blur-2xl transition-all`}></div>
                                        <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 border border-gray-700 overflow-hidden">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-400/10 rounded-full blur-3xl transform translate-x-32 -translate-y-32"></div>

                                            <div className="relative z-10">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex items-center space-x-3">
                                                        <div className={`w-14 h-14 bg-gradient-to-br ${game.bgColor} rounded-2xl flex items-center justify-center transform group-hover:rotate-12 transition-transform`}>
                                                            <game.icon className="w-8 h-8 text-black" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-xl font-bold text-white">{game.title}</h3>
                                                            <p className="text-gray-400 text-sm">{game.subtitle}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                                        <span className="text-white text-sm font-semibold">{game.rating}</span>
                                                    </div>
                                                </div>

                                                <p className="text-gray-300 text-sm mb-6">{game.description}</p>

                                                <div className="grid grid-cols-3 gap-4 mb-6">
                                                    <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                                                        <div className="text-green-400 font-bold">{game.reward}</div>
                                                        <div className="text-gray-400 text-xs">Reward</div>
                                                    </div>
                                                    <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                                                        <div className="text-blue-400 font-bold">{game.xpReward} XP</div>
                                                        <div className="text-gray-400 text-xs">Experience</div>
                                                    </div>
                                                    <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                                                        <div className="text-orange-400 font-bold">{game.avgTime}</div>
                                                        <div className="text-gray-400 text-xs">Avg Time</div>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => !game.locked && canPlay && startGameSession(game)}
                                                    className={`w-full bg-gradient-to-r ${game.bgColor} text-black font-bold py-4 rounded-2xl text-lg transition-all transform hover:scale-105 flex items-center justify-center space-x-2 ${game.locked || !canPlay ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    disabled={game.locked || !canPlay}
                                                >
                                                    {game.locked ? (
                                                        <>
                                                            <Lock className="w-5 h-5" />
                                                            <span>COMING SOON</span>
                                                        </>
                                                    ) : !canPlay ? (
                                                        <>
                                                            <Lock className="w-5 h-5" />
                                                            <span>DAILY LIMIT REACHED</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Play className="w-5 h-5" />
                                                            <span>PLAY NOW</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Category Filter */}
                <div className="flex items-center space-x-4 mb-6 overflow-x-auto pb-2">
                    {categories.map((category) => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-6 py-3 rounded-full font-semibold text-sm whitespace-nowrap transition-all ${selectedCategory === category
                                ? 'bg-gradient-to-r from-purple-400 to-pink-400 text-black'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>

                {/* Games Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredGames.map((game) => {
                        const gameProgressData = gameProgress.find(g => g.id === game.id);
                        const canPlay = !gameProgressData || new Date(gameProgressData.lastPlayed).toDateString() !== new Date().toDateString();
                        return (
                            <div key={game.id} className="group relative">
                                <div className={`absolute inset-0 bg-gradient-to-r ${game.bgColor.replace('to-', 'to-').replace('from-', 'from-').replace('400', '400/10').replace('500', '500/10').replace('600', '600/10')} rounded-2xl blur-lg group-hover:blur-xl transition-all`}></div>

                                <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700 transition-all hover:border-gray-600">
                                    {game.locked && (
                                        <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center z-10">
                                            <div className="flex flex-col items-center space-y-2">
                                                <Lock className="w-8 h-8 text-gray-400" />
                                                <span className="text-white font-bold">COMING SOON</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center space-x-2">
                                            {game.new && (
                                                <div className="px-2 py-1 bg-green-400 text-black text-xs font-bold rounded animate-pulse">
                                                    NEW
                                                </div>
                                            )}
                                            {game.trending && (
                                                <div className="px-2 py-1 bg-orange-400 text-black text-xs font-bold rounded">
                                                    HOT
                                                </div>
                                            )}
                                        </div>
                                        <div className={`px-2 py-1 rounded text-xs font-semibold ${game.difficulty === 'Easy' ? 'bg-green-400/20 text-green-400' :
                                            game.difficulty === 'Medium' ? 'bg-yellow-400/20 text-yellow-400' :
                                                'bg-red-400/20 text-red-400'
                                            }`}>
                                            {game.difficulty}
                                        </div>
                                    </div>

                                    <div className="flex items-start space-x-4 mb-4">
                                        <div className={`w-12 h-12 bg-gradient-to-br ${game.bgColor} rounded-xl flex items-center justify-center transform group-hover:rotate-12 transition-transform`}>
                                            <game.icon className="w-6 h-6 text-black" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-white font-bold text-lg mb-1">{game.title}</h3>
                                            <p className="text-gray-400 text-sm">{game.subtitle}</p>
                                            <div className="flex items-center space-x-1 mt-1">
                                                <Star className="w-3 h-3 text-yellow-400 fill-current" />
                                                <span className="text-gray-400 text-xs">{game.rating} • {game.plays.toLocaleString()} plays</span>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-gray-300 text-sm mb-4 line-clamp-2">{game.description}</p>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="bg-gray-800/50 rounded-lg p-3">
                                            <div className="text-green-400 font-bold text-sm">{game.reward}</div>
                                            <div className="text-gray-400 text-xs">Per Game</div>
                                        </div>
                                        <div className="bg-gray-800/50 rounded-lg p-3">
                                            <div className="text-blue-400 font-bold text-sm">{game.xpReward} XP</div>
                                            <div className="text-gray-400 text-xs">Experience</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mb-4 text-xs text-gray-400">
                                        <span>{game.players.toLocaleString()} players</span>
                                        <span>~{game.avgTime}</span>
                                    </div>

                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => !game.locked && canPlay && startGameSession(game)}
                                            className={`flex-1 bg-gradient-to-r ${game.bgColor} text-black font-bold py-3 rounded-xl transition-all transform hover:scale-105 flex items-center justify-center space-x-2 ${game.locked || !canPlay ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            disabled={game.locked || !canPlay}
                                        >
                                            {game.locked ? (
                                                <>
                                                    <Lock className="w-4 h-4" />
                                                    <span>COMING SOON</span>
                                                </>
                                            ) : !canPlay ? (
                                                <>
                                                    <Lock className="w-4 h-4" />
                                                    <span>DAILY LIMIT REACHED</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Play className="w-4 h-4" />
                                                    <span>PLAY</span>
                                                </>
                                            )}
                                        </button>
                                        <button className="px-4 py-3 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition-all">
                                            <Trophy className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Daily Challenges */}
                <div className="mt-12 bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 border border-gray-700">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                                <Gift className="w-6 h-6 text-black" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Daily Challenges</h3>
                                <p className="text-gray-400 text-sm">Complete challenges for bonus rewards</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 px-3 py-1 bg-orange-400/20 rounded-full text-orange-400 text-sm font-semibold">
                            <Timer className="w-4 h-4" />
                            <span>12h left</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { title: "Eco Novice", desc: "Play 3 puzzle games", progress: 2, total: 3, reward: "₿ 0.001" },
                            { title: "Forest Protector", desc: "Score 1000+ in Forest Guardian", progress: 0, total: 1, reward: "₿ 0.002" },
                            { title: "Trivia Master", desc: "Answer 10 questions in Trivia on Recycling", progress: 3, total: 10, reward: "₿ 0.003" }
                        ].map((challenge, index) => (
                            <div key={index} className="bg-gray-800/50 rounded-xl p-4 backdrop-blur-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-white font-semibold text-sm">{challenge.title}</h4>
                                    <span className="text-green-400 text-xs font-bold">{challenge.reward}</span>
                                </div>
                                <p className="text-gray-400 text-xs mb-3">{challenge.desc}</p>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-gray-300 text-xs">{challenge.progress}/{challenge.total}</span>
                                    <span className="text-gray-400 text-xs">{Math.round((challenge.progress / challenge.total) * 100)}%</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                    <div
                                        className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all duration-1000"
                                        style={{ width: `${(challenge.progress / challenge.total) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Game Detail Modal */}
            {selectedGame && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center space-x-4">
                                <div className={`w-16 h-16 bg-gradient-to-br ${selectedGame.bgColor} rounded-2xl flex items-center justify-center`}>
                                    <selectedGame.icon className="w-10 h-10 text-black" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white">{selectedGame.title}</h2>
                                    <p className="text-gray-400">{selectedGame.subtitle}</p>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <div className="flex items-center space-x-1">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={`w-4 h-4 ${i < Math.floor(selectedGame.rating) ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} />
                                            ))}
                                        </div>
                                        <span className="text-white font-semibold">{selectedGame.rating}</span>
                                        <span className="text-gray-400">({selectedGame.plays.toLocaleString()} plays)</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedGame(null)}
                                className="text-gray-400 hover:text-white p-2"
                            >
                                ✕
                            </button>
                        </div>

                        <p className="text-gray-300 mb-6">{selectedGame.description_long}</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                                <div className="text-green-400 font-bold">{selectedGame.reward}</div>
                                <div className="text-gray-400 text-xs">Reward</div>
                            </div>
                            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                                <div className="text-blue-400 font-bold">{selectedGame.xpReward} XP</div>
                                <div className="text-gray-400 text-xs">Experience</div>
                            </div>
                            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                                <div className="text-orange-400 font-bold">{selectedGame.avgTime}</div>
                                <div className="text-gray-400 text-xs">Avg Time</div>
                            </div>
                            <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                                <div className="text-purple-400 font-bold">{selectedGame.achievements}</div>
                                <div className="text-gray-400 text-xs">Achievements</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <h4 className="text-white font-semibold mb-3">Game Modes</h4>
                                <div className="space-y-2">
                                    {selectedGame.gameMode.map((mode, index) => (
                                        <div key={index} className="flex items-center space-x-2 text-gray-300 text-sm">
                                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                            <span>{mode}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-white font-semibold mb-3">Power-ups</h4>
                                <div className="space-y-2">
                                    {selectedGame.powerUps.map((powerUp, index) => (
                                        <div key={index} className="flex items-center space-x-2 text-gray-300 text-sm">
                                            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                                            <span>{powerUp}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex space-x-4">
                            <button
                                onClick={() => startGameSession(selectedGame)}
                                className={`flex-1 bg-gradient-to-r ${selectedGame.bgColor} text-black font-bold py-4 rounded-2xl text-lg transition-all transform hover:scale-105 flex items-center justify-center space-x-2`}
                            >
                                <Play className="w-5 h-5" />
                                <span>START PLAYING</span>
                            </button>
                            <button className="px-6 py-4 bg-gray-700 text-gray-300 rounded-2xl hover:bg-gray-600 transition-all flex items-center space-x-2">
                                <Medal className="w-5 h-5" />
                                <span>Leaderboard</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-lg border-t border-gray-800 px-4 py-3 z-20">
                <div className="max-w-lg mx-auto">
                    <div className="flex justify-around items-center">
                        {navItems.map((item) => (
                            <Link
                                key={item.id}
                                to={item.path}
                                className={`group flex flex-col items-center space-y-1 p-2 rounded-xl transition-all ${activeTab === item.id
                                    ? 'text-purple-400 bg-purple-400/10'
                                    : 'text-gray-400 hover:text-gray-300'
                                    }`}
                            >
                                <item.icon className={`w-6 h-6 transition-transform ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'
                                    }`} />
                                <span className="text-xs font-medium">{item.label}</span>
                            </Link>
                        ))}
                    </div>

                    <div className="flex justify-center mt-3">
                        <div className="w-32 h-1 bg-white/20 rounded-full"></div>
                    </div>
                </div>
            </div>

            <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        
        .delay-1000 {
          animation-delay: 1s;
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
        </div>
    );
}
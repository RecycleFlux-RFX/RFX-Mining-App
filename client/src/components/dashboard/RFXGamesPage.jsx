import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Home, MapPin, Gamepad2, Wallet, Settings,
    Play, Trophy, Star, Clock, Users, Zap,
    Trash2, Droplets, Globe, TreePine, Brain,
    Award, Crown, TrendingUp, Flame, Puzzle,
    Timer, Gift, Medal, Lock
} from 'lucide-react';

// Map category to icon for rendering with safe defaults
const categoryIcons = {
    Puzzle: Puzzle,
    Action: Zap,
    Simulation: Globe,
    Strategy: Brain,
    Default: Puzzle
};

const BASE_URL = 'https://rfx-mining-app.onrender.com';

export default function RFXGamesPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('games');
    const [selectedGame, setSelectedGame] = useState(null);
    const [games, setGames] = useState([]);
    const [leaderboard, setLeaderboard] = useState(null);
    const [userRank, setUserRank] = useState(null);
    const [loading, setLoading] = useState({
        games: true,
        stats: true,
        leaderboard: false
    });
    const [playerStats, setPlayerStats] = useState({
        level: 0,
        xp: 0,
        totalXp: 0,
        gamesPlayed: 0,
        tokensEarned: 0
    });
    const [error, setError] = useState(null);

    const categories = ["All", "Puzzle", "Action", "Simulation", "Strategy"];
    const [selectedCategory, setSelectedCategory] = useState("All");

const navItems = [
    { icon: Home, label: 'Home', id: 'home', path: '/' },
    { icon: MapPin, label: 'Campaign', id: 'campaign', path: '/campaign' },
    { icon: Gamepad2, label: 'Games', id: 'games', path: '/games' },
    { icon: Wallet, label: 'Wallet', id: 'wallet', path: '/wallet' },
    { icon: Settings, label: 'Settings', id: 'settings', path: '/settings' },
];

    // Fetch with authentication
    const fetchWithAuth = async (url, options = {}) => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.error('No auth token found');
            navigate('/dashboard');
            throw new Error('No authentication token found');
        }

        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...options.headers,
        };

        try {
            const response = await fetch(url, { ...options, headers });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.message || `Request failed with status ${response.status}`;
                if (response.status === 401) {
                    console.error('Unauthorized request:', errorMessage);
                    localStorage.removeItem('authToken');
                    navigate('/dashboard');
                }
                throw new Error(errorMessage);
            }

            return await response.json();
        } catch (error) {
            console.error(`API request failed for ${url}:`, error.message);
            setError({
                type: 'error',
                message: error.message || 'Failed to complete request',
            });
            throw error;
        }
    };

    // Fetch games
    useEffect(() => {
        const fetchGames = async () => {
            setLoading(prev => ({ ...prev, games: true }));
            try {
                const response = await fetchWithAuth(`${BASE_URL}/games`);
                if (response && Array.isArray(response)) {
                    const validatedGames = response.map(game => ({
                        ...game,
                        id: game._id || game.id,
                        path: game.path || `/game/${game.title.toLowerCase().replace(/\s+/g, '-')}`,
                        bgColor: game.bgColor || 'from-purple-500 to-blue-500',
                        cardColor: game.cardColor || 'bg-purple-100',
                        canPlay: game.canPlay !== undefined ? game.canPlay : true,
                        locked: game.locked || false,
                        plays: game.plays || 0,
                        rating: game.rating || 0,
                        reward: game.reward || 'RFX 0.00000',
                        xpReward: game.xpReward || 0
                    }));
                    setGames(validatedGames);
                } else {
                    throw new Error('Invalid games data received');
                }
            } catch (err) {
                console.error('Error fetching games:', err);
                setError({
                    type: 'error',
                    message: err.message || 'Failed to load games. Please try again later.',
                });
            } finally {
                setLoading(prev => ({ ...prev, games: false }));
            }
        };
        fetchGames();
    }, [navigate]);

    // Fetch player stats
    useEffect(() => {
        const fetchPlayerStats = async () => {
            setLoading(prev => ({ ...prev, stats: true }));
            try {
                const response = await fetchWithAuth(`${BASE_URL}/games/progress`);
                if (response && response.playerStats) {
                    setPlayerStats({
                        level: response.playerStats.level || 0,
                        xp: response.playerStats.xp || 0,
                        totalXp: response.playerStats.totalXp || 1000,
                        gamesPlayed: response.playerStats.gamesPlayed || 0,
                        tokensEarned: response.playerStats.tokensEarned || 0
                    });
                } else {
                    throw new Error('Invalid player stats data received');
                }
            } catch (err) {
                console.error('Error fetching player stats:', err);
                setError({
                    type: 'error',
                    message: err.message || 'Failed to load player stats.',
                });
            } finally {
                setLoading(prev => ({ ...prev, stats: false }));
            }
        };
        fetchPlayerStats();
    }, [navigate]);

    // Update active tab based on location
    useEffect(() => {
        const currentNavItem = navItems.find((item) => item.path === location.pathname);
        if (currentNavItem) {
            setActiveTab(currentNavItem.id);
        }
    }, [location.pathname]);

    // Fetch leaderboard when game is selected
    useEffect(() => {
        if (selectedGame) {
            const fetchLeaderboard = async () => {
                setLoading(prev => ({ ...prev, leaderboard: true }));
                try {
                    const response = await fetchWithAuth(`${BASE_URL}/games/${selectedGame.id}/leaderboard`);
                    setLeaderboard(response.scores.slice(0, 3)); // Get top 3
                    setUserRank(response.userRank);
                } catch (err) {
                    console.error('Error fetching leaderboard:', err);
                    setError({
                        type: 'error',
                        message: 'Failed to load leaderboard data'
                    });
                } finally {
                    setLoading(prev => ({ ...prev, leaderboard: false }));
                }
            };
            fetchLeaderboard();
        }
    }, [selectedGame, navigate]);

    // Start game session
    const startGameSession = async (game) => {
        if (game.locked || !game.canPlay) return;

        try {
            const response = await fetchWithAuth(`${BASE_URL}/games/start`, {
                method: 'POST',
                body: JSON.stringify({
                    gameId: game.id,
                    title: game.title,
                    path: game.path
                }),
            });

            if (response.path) {
                navigate(response.path);
            } else {
                navigate(game.path);
            }
        } catch (err) {
            console.error('Error starting game:', err);
            setError({
                type: 'error',
                message: err.message || 'Failed to start game session. Please try again.',
            });
        }
    };

    // Helper functions
    const filteredGames = selectedCategory === "All"
        ? games
        : games.filter(game => game.category === selectedCategory);

    const featuredGames = games.filter(game => game.featured);

    const getGradientClasses = (bgColor = 'from-purple-500 to-blue-500') => {
        if (!bgColor) return 'from-purple-500 to-blue-500';
        try {
            return bgColor
                .replace('to-', 'to-')
                .replace('from-', 'from-')
                .replace('400', '400/20')
                .replace('500', '500/20')
                .replace('600', '600/20');
        } catch (e) {
            return 'from-purple-500/20 to-blue-500/20';
        }
    };

    const getErrorColor = () => {
        if (!error) return '';
        switch (error.type) {
            case 'success': return 'bg-green-500/50';
            case 'error': return 'bg-red-500/50';
            case 'info': return 'bg-blue-500/50';
            default: return 'bg-gray-500/50';
        }
    };

    // Loading state
    if (loading.games || loading.stats) {
        return (
            <div className="w-full min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
                <div className="text-white text-xl">Loading games...</div>
            </div>
        );
    }

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
                {/* Error Message */}
                {error && (
                    <div className={`mb-4 p-4 rounded-xl text-white ${getErrorColor()} flex justify-between items-center`}>
                        <span>{error.message}</span>
                        <button
                            onClick={() => setError(null)}
                            className="text-white hover:text-gray-300 ml-4"
                        >
                            ✕
                        </button>
                    </div>
                )}

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
                            <span className="text-gray-300 text-sm font-mono">RFX {playerStats.tokensEarned.toFixed(5)}</span>
                        </div>
                    </div>
                </div>

                {/* Player Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Level', value: playerStats.level, icon: Crown, color: 'yellow', suffix: '' },
                        { label: 'Games Played', value: playerStats.gamesPlayed, icon: Gamepad2, color: 'purple', suffix: '' },
                        { label: 'Total Earned', value: playerStats.tokensEarned.toFixed(5), icon: Award, color: 'green', suffix: ' RFX' },
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
                                const GameIcon = categoryIcons[game.category] || categoryIcons.Default;
                                return (
                                    <div
                                        key={game.id}
                                        className="relative group"
                                        onClick={() => !game.locked && setSelectedGame(game)}
                                    >
                                        <div className={`absolute inset-0 bg-gradient-to-r ${getGradientClasses(game.bgColor)} rounded-3xl blur-xl group-hover:blur-2xl transition-all`}></div>
                                        <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 border border-gray-700 overflow-hidden cursor-pointer">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-400/10 rounded-full blur-3xl transform translate-x-32 -translate-y-32"></div>

                                            <div className="relative z-10">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex items-center space-x-3">
                                                        <div className={`w-14 h-14 bg-gradient-to-br ${game.bgColor} rounded-2xl flex items-center justify-center transform group-hover:rotate-12 transition-transform`}>
                                                            <GameIcon className="w-8 h-8 text-black" />
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
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        startGameSession(game);
                                                    }}
                                                    className={`w-full bg-gradient-to-r ${game.bgColor} text-black font-bold py-4 rounded-2xl text-lg transition-all transform hover:scale-105 flex items-center justify-center space-x-2 ${game.locked || !game.canPlay ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    disabled={game.locked || !game.canPlay}
                                                >
                                                    {game.locked ? (
                                                        <>
                                                            <Lock className="w-5 h-5" />
                                                            <span>COMING SOON</span>
                                                        </>
                                                    ) : !game.canPlay ? (
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
                        const GameIcon = categoryIcons[game.category] || categoryIcons.Default;
                        return (
                            <div
                                key={game.id}
                                className="group relative"
                                onClick={() => !game.locked && setSelectedGame(game)}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-r ${getGradientClasses(game.bgColor)} rounded-2xl blur-lg group-hover:blur-xl transition-all`}></div>

                                <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700 transition-all hover:border-gray-600 cursor-pointer">
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
                                            <GameIcon className="w-6 h-6 text-black" />
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
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                startGameSession(game);
                                            }}
                                            className={`flex-1 bg-gradient-to-r ${game.bgColor} text-black font-bold py-3 rounded-xl transition-all transform hover:scale-105 flex items-center justify-center space-x-2 ${game.locked || !game.canPlay ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            disabled={game.locked || !game.canPlay}
                                        >
                                            {game.locked ? (
                                                <>
                                                    <Lock className="w-4 h-4" />
                                                    <span>COMING SOON</span>
                                                </>
                                            ) : !game.canPlay ? (
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
                                        <button
                                            className="px-4 py-3 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition-all"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedGame(game);
                                            }}
                                        >
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
                            { title: "Eco Novice", desc: "Play 3 puzzle games", progress: 2, total: 3, reward: "RFX 0.001" },
                            { title: "Ocean Savior", desc: "Score 1000+ in Ocean Defender", progress: 0, total: 1, reward: "RFX 0.002" },
                            { title: "Green Streak", desc: "Win 5 games in a row", progress: 3, total: 5, reward: "RFX 0.003" }
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
                                    {React.createElement(categoryIcons[selectedGame.category] || categoryIcons.Default, { className: "w-10 h-10 text-black" })}
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

                        {/* Leaderboard Section */}
                        {loading.leaderboard ? (
                            <div className="mb-6 p-4 bg-gray-800/50 rounded-xl flex justify-center">
                                <div className="animate-pulse text-gray-400">Loading leaderboard...</div>
                            </div>
                        ) : (
                            <>
                                {leaderboard && leaderboard.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="text-white font-semibold mb-3">Top Players</h4>
                                        <div className="grid grid-cols-1 gap-3">
                                            {leaderboard.map((player, index) => (
                                                <div 
                                                    key={player.userId._id} 
                                                    className={`flex items-center space-x-3 p-3 rounded-xl ${index === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20' : 
                                                        index === 1 ? 'bg-gradient-to-r from-gray-500/20 to-gray-600/20' : 
                                                        index === 2 ? 'bg-gradient-to-r from-amber-600/20 to-amber-700/20' : 'bg-gray-800/50'}`}
                                                >
                                                    <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${index === 0 ? 'bg-yellow-400 text-black' : 
                                                        index === 1 ? 'bg-gray-300 text-black' : 
                                                        index === 2 ? 'bg-amber-600 text-white' : 'bg-gray-700 text-white'}`}>
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-white font-medium">{player.userId.username}</div>
                                                        <div className="text-gray-400 text-xs">Score: {player.score}</div>
                                                    </div>
                                                    {index === 0 && <Crown className="w-5 h-5 text-yellow-400" />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {userRank && (
                                    <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl p-4 mb-6">
                                        <h4 className="text-white font-semibold mb-2">Your Rank</h4>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-blue-500 rounded-full flex items-center justify-center font-bold">
                                                    {userRank.rank}
                                                </div>
                                                <div>
                                                    <div className="text-white font-medium">Your Best Score</div>
                                                    <div className="text-gray-300">{userRank.score}</div>
                                                </div>
                                            </div>
                                            <div className="text-gray-400 text-xs">
                                                Played on {new Date(userRank.playedAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

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
                                    {selectedGame.gameMode?.map((mode, index) => (
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
                                    {selectedGame.powerUps?.map((powerUp, index) => (
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
                                className={`flex-1 bg-gradient-to-r ${selectedGame.bgColor} text-black font-bold py-4 rounded-2xl text-lg transition-all transform hover:scale-105 flex items-center justify-center space-x-2 ${selectedGame.locked || !selectedGame.canPlay ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={selectedGame.locked || !selectedGame.canPlay}
                            >
                                {selectedGame.locked ? (
                                    <>
                                        <Lock className="w-5 h-5" />
                                        <span>COMING SOON</span>
                                    </>
                                ) : !selectedGame.canPlay ? (
                                    <>
                                        <Lock className="w-5 h-5" />
                                        <span>DAILY LIMIT REACHED</span>
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-5 h-5" />
                                        <span>START PLAYING</span>
                                    </>
                                )}
                            </button>
                            <button 
                                className="px-6 py-4 bg-gray-700 text-gray-300 rounded-2xl hover:bg-gray-600 transition-all flex items-center space-x-2"
                                onClick={() => {
                                    // Refresh leaderboard
                                    const fetchLeaderboard = async () => {
                                        setLoading(prev => ({ ...prev, leaderboard: true }));
                                        try {
                                            const response = await fetchWithAuth(`${BASE_URL}/games/${selectedGame.id}/leaderboard`);
                                            setLeaderboard(response.scores.slice(0, 3));
                                            setUserRank(response.userRank);
                                        } catch (err) {
                                            console.error('Error refreshing leaderboard:', err);
                                        } finally {
                                            setLoading(prev => ({ ...prev, leaderboard: false }));
                                        }
                                    };
                                    fetchLeaderboard();
                                }}
                            >
                                <Medal className="w-5 h-5" />
                                <span>Refresh Leaderboard</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Navigation */}
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
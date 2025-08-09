import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Home, MapPin, Gamepad2, Wallet, Settings,
    Trophy, TrendingUp, Recycle, Trash2,
    Sparkles, Zap, Star, ArrowUp, Users, Coins, Clock
} from 'lucide-react';
import { throttle } from 'lodash';

export default function RFXVerseInterface() {
    const location = useLocation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('home');
    const [userData, setUserData] = useState({
        earnings: 0,
        co2Saved: '0.00',
        walletAddress: '',
        fullName: '',
    });
    const [networkStats, setNetworkStats] = useState({
        totalRecycled: '0.00',
        activeUsers: 0,
    });
    const [referralInfo, setReferralInfo] = useState({
        referralCount: 0,
        referralEarnings: 0,
        referrals: [],
        referralLink: ''
    });
    const [isAnimating, setIsAnimating] = useState(false);
    const [error, setError] = useState(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0
    });
    const [newsItems, setNewsItems] = useState([]);
    const containerRef = useRef(null);

    const BASE_URL = 'http://localhost:3000/user';

    const navItems = [
        { icon: Home, label: 'Home', id: 'home', path: '/dashboard' },
        { icon: MapPin, label: 'Campaign', id: 'campaign', path: '/campaign' },
        { icon: Gamepad2, label: 'Games', id: 'games', path: '/games' },
        { icon: Wallet, label: 'Wallet', id: 'wallet', path: '/wallet' },
        { icon: Settings, label: 'Settings', id: 'settings', path: '/settings' },
    ];

    // Enhanced countdown timer
// Enhanced countdown timer - Fixed version
useEffect(() => {
    const calculateTimeLeft = () => {
        // Set launch date to 100 days from now
        const launchDate = new Date();
        launchDate.setDate(launchDate.getDate() + 100);
        launchDate.setHours(0, 0, 0, 0); // Set to midnight for consistency
        
        const now = new Date();
        const difference = launchDate - now;
        
        // Calculate time components
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        
        setTimeLeft({
            days,
            hours,
            minutes,
            seconds
        });
    };

    // Calculate immediately
    calculateTimeLeft();
    
    // Then update every second
    const timer = setInterval(calculateTimeLeft, 1000);
    
    // Cleanup interval on unmount
    return () => clearInterval(timer);
}, []);

    // Enhanced news fetch
    useEffect(() => {
        const fetchNews = async () => {
            try {
                const mockNewsSources = [
                    {
                        title: 'RFX Partners with Major Recycling Chain',
                        desc: 'New collaboration will expand recycling rewards to 500+ locations nationwide',
                        source: 'EcoTech News',
                        time: 'Just now',
                        trending: true
                    },
                    {
                        title: 'Crypto Recycling Initiatives Gain Traction',
                        desc: 'How blockchain is incentivizing sustainability worldwide',
                        source: 'Blockchain Daily',
                        time: '30 minutes ago'
                    },
                    {
                        title: 'RFX Token Listed on New Exchange',
                        desc: 'Trading begins next week with special launch rewards',
                        source: 'Crypto Updates',
                        time: '2 hours ago',
                        trending: true
                    },
                    {
                        title: 'Green Tech Startups Raise $120M in Q2',
                        desc: 'Sustainable projects attracting major investor interest',
                        source: 'Tech Finance',
                        time: '5 hours ago'
                    },
                    {
                        title: 'Main Launch Countdown',
                        desc: 'Official platform launch scheduled in 100 days',
                        source: 'RFX Official',
                        time: '1 day ago',
                        trending: true
                    },
                    {
                        title: 'Mobile App Beta Testing Begins Next Week',
                        desc: 'Early access available for premium members',
                        source: 'App Insider',
                        time: '3 days ago'
                    }
                ];
                
                const shuffledNews = [...mockNewsSources]
                    .sort(() => 0.5 - Math.random())
                    .slice(0, 2)
                    .map(item => ({
                        ...item,
                        title: item.title.includes('Countdown') ? 
                            `Main Launch Countdown: ${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m left` : 
                            item.title
                    }));
                
                setNewsItems(shuffledNews);
            } catch (error) {
                console.error('Error fetching news:', error);
                setNewsItems([
                    {
                        title: 'Stay tuned for latest updates',
                        desc: 'News feed will be available shortly',
                        source: 'RFX Team',
                        time: 'Just now'
                    }
                ]);
            }
        };

        fetchNews();
        const newsInterval = setInterval(fetchNews, 300000);
        return () => clearInterval(newsInterval);
    }, [timeLeft]);

    // Existing fetch functions
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

    useEffect(() => {
        const fetchReferralInfo = async () => {
            try {
                const data = await fetchWithAuth(`${BASE_URL}/referral-info`);
                setReferralInfo({
                    referralCount: data.referralCount,
                    referralEarnings: data.referralEarnings,
                    referrals: data.referrals,
                    referralLink: data.referralLink
                });
            } catch (error) {
                console.error('Failed to fetch referral info:', error);
            }
        };
        
        fetchReferralInfo();
    }, []);

    useEffect(() => {
        const currentNavItem = navItems.find((item) => item.path === location.pathname);
        if (currentNavItem) {
            setActiveTab(currentNavItem.id);
        }
    }, [location.pathname]);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.error('No auth token found during checkAuth');
                navigate('/dashboard');
                return;
            }

            try {
                const data = await fetchWithAuth(`${BASE_URL}/validate-token`);
                if (!data.valid) {
                    throw new Error(data.message || 'Invalid token');
                }
                await fetchInitialData();
            } catch (error) {
                console.error('Authentication check failed:', error.message);
                localStorage.removeItem('authToken');
                navigate('/dashboard');
            }
        };

        checkAuth();
    }, [navigate]);

    const fetchInitialData = async () => {
        try {
            const [userResponse, statsResponse, referralResponse] = await Promise.all([
                fetchWithAuth(`${BASE_URL}/user`),
                fetchWithAuth(`${BASE_URL}/network-stats`),
                fetchWithAuth(`${BASE_URL}/referral-link`),
            ]);

            setUserData({
                earnings: userResponse.earnings || 0,
                co2Saved: userResponse.co2Saved || '0.00',
                walletAddress: userResponse.walletAddress || '',
                fullName: userResponse.fullName || '',
                games: userResponse.games || []
            });

            setNetworkStats({
                totalRecycled: statsResponse.totalRecycled || '0.00',
                activeUsers: statsResponse.activeUsers || 0,
            });

            setReferralInfo((prev) => ({
                ...prev,
                referralLink: referralResponse.referralLink || ''
            }));
        } catch (error) {
            console.error('Data fetch error:', error.message);
            setError({
                type: 'error',
                message: error.message || 'Failed to load data. Please try again.',
            });
        }
    };

    const handleMouseMove = throttle((e) => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setMousePosition({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            });
        }
    }, 100);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            handleMouseMove.cancel();
        };
    }, [handleMouseMove]);

    const handleClaim = async () => {
        setIsAnimating(true);
        setError(null);

        try {
            const data = await fetchWithAuth(`${BASE_URL}/claim-reward`, {
                method: 'POST',
                body: JSON.stringify({}),
            });

            setUserData((prev) => ({
                ...prev,
                earnings: data.newBalance || prev.earnings,
            }));

            setError({
                type: 'success',
                message: `+${data.amount || '0.0001'} RFX claimed!`,
            });
        } catch (error) {
            if (error.message.includes('Daily reward already claimed')) {
                const nextClaimTime = new Date(error.nextClaim || Date.now()).toLocaleTimeString();
                setError({
                    type: 'info',
                    message: `Come back after ${nextClaimTime} for your next reward`,
                });
            } else {
                setError({
                    type: 'error',
                    message: error.message || 'Failed to claim reward',
                });
            }
        } finally {
            setTimeout(() => setIsAnimating(false), 1000);
        }
    };

    const handleCopyReferralLink = () => {
        if (referralInfo.referralLink) {
            navigator.clipboard.writeText(referralInfo.referralLink);
            setError({
                type: 'success',
                message: 'Referral link copied!',
            });
            setTimeout(() => setError(null), 2000);
        }
    };

    const handleActionClick = (title) => {
        if (title === 'Trash') {
            navigate('/games');
        } else {
            setError({
                type: 'info',
                message: `${title} feature coming soon!`,
            });
        }
    };

    const handleNewsClick = (title) => {
        setError({
            type: 'info',
            message: `${title} - read more soon!`,
        });
    };

    const calculateTreeEquivalent = (co2Kg) => {
        const co2 = parseFloat(co2Kg) || 0;
        const trees = (co2 / 21).toFixed(2);
        return trees > 0 ? trees : '0';
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

    return (
        <div className="w-full min-h-screen bg-gradient-to-br from-black via-gray-900 to-black overflow-hidden relative" ref={containerRef}>
            {/* Cursor Effect */}
            <div
                className="absolute w-4 h-4 bg-green-400 rounded-full pointer-events-none opacity-50"
                style={{
                    left: mousePosition.x,
                    top: mousePosition.y,
                    transform: 'translate(-50%, -50%)',
                    transition: 'all 0.1s ease',
                }}
            ></div>

            {/* Animated Background */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-t from-green-500/10 via-transparent to-transparent"></div>
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-green-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                {[...Array(10)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-green-400 rounded-full animate-float"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${10 + Math.random() * 10}s`,
                        }}
                    ></div>
                ))}
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-24">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-center justify-between mb-8 pt-4 space-y-4 sm:space-y-0">
                    <div className="flex items-center space-x-3">
                        <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center transform rotate-12 transition-transform hover:rotate-0">
                                <Recycle className="w-8 h-8 text-black" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
                            RecycleFlux
                        </h1>
                    </div>
                </div>

                {/* Error/Success Message */}
                {error && (
                    <div className={`mb-6 p-4 rounded-xl text-white ${getErrorColor()}`}>
                        <span>{error.message}</span>
                    </div>
                )}

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Earnings Card */}
                    <div className="lg:col-span-2">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-green-600/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all"></div>
                            <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 sm:p-8 border border-gray-700 overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-green-400/10 rounded-full blur-3xl transform translate-x-32 -translate-y-32"></div>

                                <div className="relative z-10">
                                    <div className="flex flex-col sm:flex-row justify-between items-start mb-6">
                                        <div>
                                            <div className="flex items-center space-x-2 mb-3">
                                                <h2 className="text-xl sm:text-2xl font-bold text-white">Earnings Summary</h2>
                                                <Sparkles className="w-5 h-5 text-yellow-400 animate-spin-slow" />
                                            </div>

                                            <div className="flex items-baseline space-x-2 mb-4">
                                                <span className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
                                                    {userData.earnings.toFixed(5)} RFX
                                                </span>
{/*                                                 <div className="flex items-center space-x-1 text-green-400 text-sm">
                                                    <ArrowUp className="w-4 h-4" />
                                                    <span>+12.5%</span>
                                                </div> */}
                                            </div>

                                            {/* <div className="grid grid-cols-2 gap-4 mb-6">
                                                <div className="bg-gray-800/50 rounded-xl p-3 backdrop-blur-sm">
                                                    <div className="text-gray-400 text-xs mb-1">Current Rate</div>
                                                    <div className="text-white font-semibold flex items-center space-x-1">
                                                        <Zap className="w-4 h-4 text-yellow-400" />
                                                        <span>2,400 hrs</span>
                                                    </div>
                                                </div>
                                                <div className="bg-gray-800/50 rounded-xl p-3 backdrop-blur-sm">
                                                    <div className="text-gray-400 text-xs mb-1">Active Hours</div>
                                                    <div className="text-white font-semibold">0 h</div>
                                                </div>
                                            </div> */}
                                        </div>

                                        <div className="mt-4 sm:mt-0">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-600 rounded-2xl blur animate-pulse"></div>
                                                <div className="relative bg-gray-900 rounded-2xl p-4 border border-green-400/50">
                                                    <div className="flex items-center space-x-2 mb-2">
                                                        <Users className="w-5 h-5 text-green-400" />
                                                        <span className="text-green-400 font-bold">INVITE & EARN</span>
                                                    </div>
                                                    <div className="text-gray-300 text-sm">
                                                        Get 20% commission on your referrals' earnings
                                                    </div>
                                                    <div className="flex items-center mt-2 space-x-2">
                                                        <div className="text-xs bg-green-900/50 text-green-400 px-2 py-1 rounded">
                                                            {referralInfo.referralCount} Friends Joined
                                                        </div>
                                                        <div className="text-xs bg-purple-900/50 text-purple-400 px-2 py-1 rounded">
                                                            {referralInfo.referralEarnings.toFixed(5)} RFX Earned
                                                        </div>
                                                    </div>
                                                    <div className="mt-3">
                                                        <div className="text-xs text-gray-400 mb-1">Your Referral Link:</div>
                                                        <div className="flex items-center space-x-2">
                                                            <input 
                                                                type="text" 
                                                                value={referralInfo.referralLink || 'Loading...'} 
                                                                readOnly 
                                                                className="flex-1 bg-gray-800 text-gray-300 text-xs p-2 rounded truncate"
                                                            />
                                                            <button
                                                                onClick={handleCopyReferralLink}
                                                                className="px-3 py-2 bg-green-400 text-black rounded text-sm hover:bg-green-500 transition-colors"
                                                            >
                                                                Copy
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleClaim}
                                        className={`w-full relative overflow-hidden bg-gradient-to-r from-green-400 to-green-500 text-black font-bold py-4 sm:py-5 rounded-2xl text-lg sm:text-xl transition-all transform hover:scale-105 ${isAnimating ? 'animate-bounce' : ''}`}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 -translate-x-full animate-shimmer"></div>
                                        <span className="relative z-10 flex items-center justify-center space-x-2">
                                            <Coins className="w-6 h-6" />
                                            <span>CLAIM REWARD</span>
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Panel */}
                    <div className="space-y-4">
                        <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/20 rounded-2xl p-6 border border-purple-700/50 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white font-semibold">Network Stats</h3>
                                <Star className="w-5 h-5 text-yellow-400" />
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <div className="text-gray-400 text-sm">Total CO₂ Saved</div>
                                    <div className="text-2xl font-bold text-white">
                                        {networkStats.totalRecycled} kg
                                    </div>
                                </div>
                                <div>
                                    <div className="text-gray-400 text-sm">Active Recyclers</div>
                                    <div className="text-2xl font-bold text-white">
                                        {networkStats.activeUsers.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/20 rounded-2xl p-6 border border-blue-700/50 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white font-semibold">Your Impact</h3>
                                <Recycle className="w-5 h-5 text-green-400 animate-spin-slow" />
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-green-400 mb-2">
                                    {userData.co2Saved} kg
                                </div>
                                <div className="text-gray-400 text-sm">CO₂ Saved</div>
                                <div className="mt-3 text-xs text-gray-500">
                                    Equivalent to {calculateTreeEquivalent(userData.co2Saved)} trees
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                    {/* Enhanced Countdown Timer */}
                    <div className="group relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700 transition-all hover:scale-105 hover:border-gray-600 cursor-pointer">
                        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-transparent group-hover:from-purple-400/10 group-hover:to-transparent transition-all"></div>
                        <div className="absolute top-2 right-2 px-2 py-1 bg-purple-400 text-black text-xs font-bold rounded animate-pulse">
                            COMING
                        </div>
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center mb-4 transform group-hover:rotate-12 transition-transform">
                                <Clock className="w-6 h-6 text-black" />
                            </div>
                            <div className="text-white font-semibold">Main Launch</div>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-purple-400">{timeLeft.days}</div>
                                    <div className="text-gray-400 text-xs">Days</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-purple-400">{timeLeft.hours}</div>
                                    <div className="text-gray-400 text-xs">Hours</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-purple-400">{timeLeft.minutes}</div>
                                    <div className="text-gray-400 text-xs">Minutes</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-purple-400">{timeLeft.seconds}</div>
                                    <div className="text-gray-400 text-xs">Seconds</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {[
                        { icon: Trash2, title: 'Trash', subtitle: 'Sort Game', color: 'yellow', badge: 'HOT' },
                        { icon: TrendingUp, title: 'Upgrade', subtitle: 'Plant', color: 'blue' },
                        { icon: Trophy, title: 'Leaderboard', subtitle: 'Top 100', color: 'purple' },
                    ].map((item, index) => (
                        <div
                            key={index}
                            className="group relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700 transition-all hover:scale-105 hover:border-gray-600 cursor-pointer"
                            onClick={() => handleActionClick(item.title)}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-transparent group-hover:from-green-400/10 group-hover:to-transparent transition-all"></div>
                            {item.badge && (
                                <div
                                    className={`absolute top-2 right-2 px-2 py-1 ${item.badge === 'NEW' ? 'bg-green-400' : 'bg-orange-400'} text-black text-xs font-bold rounded animate-pulse`}
                                >
                                    {item.badge}
                                </div>
                            )}
                            <div className="relative z-10">
                                <div
                                    className={`w-12 h-12 bg-gradient-to-br ${item.color === 'green'
                                        ? 'from-green-400 to-green-600'
                                        : item.color === 'yellow'
                                            ? 'from-yellow-400 to-orange-500'
                                            : item.color === 'blue'
                                                ? 'from-blue-400 to-blue-600'
                                                : 'from-purple-400 to-purple-600'
                                        } rounded-xl flex items-center justify-center mb-4 transform group-hover:rotate-12 transition-transform`}
                                >
                                    <item.icon className="w-6 h-6 text-black" />
                                </div>
                                <div className="text-white font-semibold">{item.title}</div>
                                {item.subtitle && <div className="text-gray-400 text-sm">{item.subtitle}</div>}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Enhanced News Section */}
                <div className="mt-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 sm:p-8 border border-gray-700">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl sm:text-2xl font-bold text-white">Latest News</h3>
                        <div className="flex items-center space-x-2">
                            <div className="px-3 py-1 bg-green-400/20 rounded-full text-green-400 text-sm font-semibold animate-pulse">
                                LIVE
                            </div>
                            <div className="text-xs text-gray-400">
                                Updated: {new Date().toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {newsItems.map((news, index) => (
                            <div
                                key={index}
                                className="group relative overflow-hidden bg-gray-800/50 rounded-2xl p-5 backdrop-blur-sm border border-gray-700 transition-all hover:border-green-400/50 cursor-pointer"
                                onClick={() => handleNewsClick(news.title)}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-green-400/0 to-green-400/0 group-hover:from-green-400/10 group-hover:to-transparent transition-all"></div>
                                <div className="relative z-10">
                                    <div className="flex items-start space-x-4">
                                        <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center flex-shrink-0 transform group-hover:rotate-6 transition-transform">
                                            <Sparkles className="w-7 h-7 text-black" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                                <h4 className="text-white font-semibold text-lg mb-1 sm:mb-0">
                                                    {news.title}
                                                </h4>
                                                {news.trending && (
                                                    <div className="px-2 py-1 bg-orange-400/20 rounded text-orange-400 text-xs font-semibold mb-2 sm:mb-0">
                                                        TRENDING
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-gray-400 text-sm mb-2">{news.desc}</p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-500 text-xs">{news.source}</span>
                                                <span className="text-gray-500 text-xs">{news.time}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 text-right">
                        <button 
                            className="text-green-400 text-sm hover:underline"
                            onClick={() => {
                                setNewsItems(prev => [...prev].sort(() => 0.5 - Math.random()).slice(0, 2));
                            }}
                        >
                            Refresh News →
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-lg border-t border-gray-800 px-4 py-3 z-20">
                <div className="max-w-lg mx-auto">
                    <div className="flex justify-around items-center">
                        {navItems.map((item) => (
                            <Link
                                key={item.id}
                                to={item.path}
                                className={`group flex flex-col items-center space-y-1 p-2 rounded-xl transition-all ${activeTab === item.id ? 'text-purple-400 bg-purple-400/10' : 'text-gray-400 hover:text-gray-300'}`}
                                onClick={() => setActiveTab(item.id)}
                            >
                                <item.icon
                                    className={`w-6 h-6 transition-transform ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`}
                                />
                                <span className="text-xs font-medium">{item.label}</span>
                            </Link>
                        ))}
                    </div>
                    <div className="flex justify-center mt-3">
                        <div className="w-32 h-1 bg-white/20 rounded-full"></div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }
                @keyframes shimmer {
                    100% { transform: translateX(200%) skewX(-12deg); }
                }
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-float {
                    animation: float 10s ease-in-out infinite;
                }
                .animate-shimmer {
                    animation: shimmer 2s infinite;
                }
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
                .animate-bounce {
                    animation: bounce 0.5s infinite;
                }
                .delay-1000 {
                    animation-delay: 1s;
                }
            `}</style>
        </div>
    );
}
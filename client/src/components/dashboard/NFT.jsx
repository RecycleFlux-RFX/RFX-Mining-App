import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Home,
    MapPin,
    Gamepad2,
    Wallet,
    Settings,
    Trophy,
    TrendingUp,
    Recycle,
    Trash2,
    Sparkles,
    Zap,
    Star,
    ArrowUp,
    Users,
    Coins,
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
    const [referralLink, setReferralLink] = useState('');
    const [isAnimating, setIsAnimating] = useState(false);
    const [error, setError] = useState(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);

    const BASE_URL = 'http://localhost:3000/user';

    const navItems = [
        { icon: Home, label: 'Home', id: 'home', path: '/' },
        { icon: MapPin, label: 'Campaign', id: 'campaign', path: '/campaign' },
        { icon: Gamepad2, label: 'Games', id: 'games', path: '/games' },
        { icon: Wallet, label: 'Wallet', id: 'wallet', path: '/wallet' },
        { icon: Settings, label: 'Settings', id: 'settings', path: '/settings' },
    ];

    // Set active tab based on current path
    useEffect(() => {
        const currentNavItem = navItems.find((item) => item.path === location.pathname);
        if (currentNavItem) {
            setActiveTab(currentNavItem.id);
        }
    }, [location.pathname]);

    // Redirect to login if no token
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.log('No auth token found, redirecting to login');
            setError({ type: 'error', message: 'Please log in to view data' });
            navigate('/login');
        }
    }, [navigate]);

    // Fetch user data
    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('authToken');
            if (!token) {
                setError({ type: 'error', message: 'Please log in to view data' });
                navigate('/login');
                return;
            }

            try {
                const headers = {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                };

                const [userResponse, statsResponse, referralResponse] = await Promise.all([
                    fetch(`${BASE_URL}/user`, { method: 'GET', headers }),
                    fetch(`${BASE_URL}/network-stats`, { method: 'GET', headers }),
                    fetch(`${BASE_URL}/referral-link`, { method: 'GET', headers }),
                ]);

                const errors = [];
                if (!userResponse.ok) {
                    const errorData = await userResponse.json();
                    errors.push(errorData.message || 'Failed to fetch user data');
                }
                if (!statsResponse.ok) {
                    const errorData = await statsResponse.json();
                    errors.push(errorData.message || 'Failed to fetch network stats');
                }
                if (!referralResponse.ok) {
                    const errorData = await referralResponse.json();
                    errors.push(errorData.message || 'Failed to fetch referral link');
                }
                if (errors.length > 0) {
                    throw new Error(errors.join('; '));
                }

                const [userDataResult, statsDataResult, referralDataResult] = await Promise.all([
                    userResponse.json(),
                    statsResponse.json(),
                    referralResponse.json(),
                ]);

                setUserData(userDataResult);
                setNetworkStats(statsDataResult);
                setReferralLink(referralDataResult.referralLink);
            } catch (error) {
                console.error('Error fetching data:', error);
                setError({ type: 'error', message: error.message || 'Failed to fetch data' });
                if (error.message.includes('Authentication') || error.message.includes('Invalid token')) {
                    localStorage.removeItem('authToken');
                    navigate('/login');
                }
            }
        };

        fetchData();
    }, [navigate]);

    // Throttled mouse move handler
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
        console.log('Claiming daily reward...');
        setIsAnimating(true);
        setError(null);

        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                navigate('/login');
                return;
            }

            const response = await fetch(`${BASE_URL}/claim-reward`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({})
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (errorData.message === 'Daily reward already claimed today') {
                    const nextClaimTime = new Date(errorData.nextClaim).toLocaleTimeString();
                    throw new Error(`Come back after ${nextClaimTime} for your next reward`);
                }
                throw new Error(errorData.message || 'Failed to claim reward');
            }

            const data = await response.json();
            setUserData(prev => ({
                ...prev,
                earnings: data.newBalance || data.earnings || prev.earnings
            }));

            setError({
                type: 'success',
                message: `+${data.amount || '0.0001'} BTC claimed!`
            });
        } catch (error) {
            console.error('Claim error:', error);
            setError({
                type: 'error',
                message: error.message || 'Failed to claim reward'
            });
        } finally {
            setTimeout(() => setIsAnimating(false), 1000);
        }
    };

    const handleCopyReferralLink = () => {
        if (referralLink) {
            navigator.clipboard.writeText(referralLink);
            setError({
                type: 'success',
                message: 'Referral link copied!'
            });
            setTimeout(() => setError(null), 2000);
        } else {
            setError({
                type: 'error',
                message: 'Referral link not available. Please try again.'
            });
        }
    };

    const handleActionClick = (title) => {
        setError({
            type: 'info',
            message: `${title} feature coming soon!`
        });
        setTimeout(() => setError(null), 2000);
    };

    const handleNewsClick = (title) => {
        setError({
            type: 'info',
            message: `${title} - read more soon!`
        });
        setTimeout(() => setError(null), 2000);
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
                            RFX Verse
                        </h1>
                    </div>

                    <div className="flex items-center space-x-3">
                        <div className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-gray-800/50 backdrop-blur-sm rounded-full border border-gray-700">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-gray-300 text-sm">{userData.walletAddress ? 'Connected' : 'Not Connected'}</span>
                        </div>
                        <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-gray-800 to-gray-700 rounded-full">
                            <span className="text-gray-300 text-sm font-mono">
                                {userData.walletAddress ? `${userData.walletAddress.slice(0, 6)}...${userData.walletAddress.slice(-4)}` : '0x3a...e1'}
                            </span>
                        </div>
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
                                                    ₿ {userData.earnings.toFixed(5)}
                                                </span>
                                                <div className="flex items-center space-x-1 text-green-400 text-sm">
                                                    <ArrowUp className="w-4 h-4" />
                                                    <span>+12.5%</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 mb-6">
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
                                            </div>
                                        </div>

                                        <div className="mt-4 sm:mt-0">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-600 rounded-2xl blur animate-pulse"></div>
                                                <div className="relative bg-gray-900 rounded-2xl p-4 border border-green-400/50">
                                                    <div className="flex items-center space-x-2 mb-2">
                                                        <Users className="w-5 h-5 text-green-400" />
                                                        <span className="text-green-400 font-bold">INVITE & EARN</span>
                                                    </div>
                                                    <div className="text-gray-300 text-sm">Get 20% commission</div>
                                                    <div className="text-gray-300 text-xs mt-2 break-all">{referralLink || 'Loading...'}</div>
                                                    <button
                                                        onClick={handleCopyReferralLink}
                                                        className="mt-2 px-3 py-1 bg-green-400 text-black rounded text-sm hover:bg-green-500 transition-colors"
                                                    >
                                                        Copy Link
                                                    </button>
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
                                    <div className="text-gray-400 text-sm">Total Recycled</div>
                                    <div className="text-2xl font-bold text-white">{networkStats.totalRecycled} kg</div>
                                </div>
                                <div>
                                    <div className="text-gray-400 text-sm">Active Users</div>
                                    <div className="text-2xl font-bold text-white">{networkStats.activeUsers}</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/20 rounded-2xl p-6 border border-blue-700/50 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white font-semibold">Your Impact</h3>
                                <Recycle className="w-5 h-5 text-green-400 animate-spin-slow" />
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-green-400 mb-2">{userData.co2Saved} kg</div>
                                <div className="text-gray-400 text-sm">CO₂ Saved</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                    {[
                        { icon: Recycle, title: 'Recycle', subtitle: 'Box', color: 'green', badge: 'NEW' },
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

                {/* News Section */}
                <div className="mt-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 sm:p-8 border border-gray-700">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl sm:text-2xl font-bold text-white">Latest News</h3>
                        <div className="px-3 py-1 bg-green-400/20 rounded-full text-green-400 text-sm font-semibold animate-pulse">
                            LIVE
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                            { title: 'New recycling partner added!', desc: 'Expanding our network for greater impact', time: '2 hours ago', trending: true },
                            { title: 'What is Proof of Stake?', desc: 'Learn about our consensus mechanism', time: '5 hours ago' },
                        ].map((news, index) => (
                            <div
                                key={index}
                                className="group relative overflow-hidden bg-gray-800/50 rounded-2xl p-5 backdrop-blur-sm border border-gray-700 transition-all hover:border-green-400/50 cursor-pointer"
                                onClick={() => handleNewsClick(news.title)}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-green-400/0 to-green-400/0 group-hover:from-green-400/10 group-hover:to-transparent transition-all"></div>
                                <div className="relative z-10 flex items-start space-x-4">
                                    <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center flex-shrink-0 transform group-hover:rotate-6 transition-transform">
                                        <Sparkles className="w-7 h-7 text-black" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <h4 className="text-white font-semibold text-lg">{news.title}</h4>
                                            {news.trending && (
                                                <div className="px-2 py-1 bg-orange-400/20 rounded text-orange-400 text-xs font-semibold">
                                                    TRENDING
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-gray-400 text-sm mb-2">{news.desc}</p>
                                        <span className="text-gray-500 text-xs">{news.time}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
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
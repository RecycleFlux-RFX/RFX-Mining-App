import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, MapPin, Gamepad2, Wallet, Settings,
  Trophy, TrendingUp, Recycle, Trash2,
  Sparkles, Users, Coins, Clock, X, Star
} from 'lucide-react';
import { throttle } from 'lodash';

const RFXVerseInterface = () => {
  // State management
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
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState({ rank: 0, totalUsers: 0 });
  const containerRef = useRef(null);

  // Constants
  const BASE_URL = 'http://localhost:3000/user';
  const REFRESH_INTERVAL = 20000;

  const navItems = [
    { icon: Home, label: 'Home', id: 'home', path: '/dashboard' },
    { icon: MapPin, label: 'Campaign', id: 'campaign', path: '/campaign' },
    { icon: Gamepad2, label: 'Games', id: 'games', path: '/games' },
    { icon: Wallet, label: 'Wallet', id: 'wallet', path: '/wallet' },
    { icon: Settings, label: 'Settings', id: 'settings', path: '/settings' },
  ];

  const environmentalBlogs = [
    {
      title: 'Earth911 Recycling Guides',
      desc: 'Your complete resource for recycling information',
      source: 'Earth911',
      link: 'https://earth911.com/',
      time: 'Updated daily',
      icon: Recycle
    },
    {
      title: 'Recycle Nation Solutions',
      desc: 'Find recycling locations near you',
      source: 'Recycle Nation',
      link: 'https://recyclenation.com/',
      time: 'Local resources',
      icon: MapPin
    },
    {
      title: 'Plastic Pollution Coalition',
      desc: 'Working towards a plastic-free world',
      source: 'PPC',
      link: 'https://www.plasticpollutioncoalition.org/blog',
      time: 'Advocacy',
      icon: Trash2
    }
  ];

  const platformNews = [
    {
      title: 'RFX Partners with Major Recycling Chain',
      desc: 'New collaboration will expand recycling rewards to 500+ locations nationwide',
      source: 'EcoTech News',
      time: 'Just now',
      trending: true
    },
    {
      title: 'RFX Token Listed on New Exchange',
      desc: 'Trading begins next week with special launch rewards',
      source: 'Crypto Updates',
      time: '2 hours ago',
      trending: true
    }
  ];

  // Data fetching functions
  const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('authToken');
    if (!token) {
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
          localStorage.removeItem('authToken');
          navigate('/dashboard');
        }
        throw new Error(errorMessage);
      }
      return await response.json();
    } catch (error) {
      setError({
        type: 'error',
        message: error.message || 'Failed to complete request',
      });
      throw error;
    }
  };

const fetchLeaderboard = async () => {
  try {
    const data = await fetchWithAuth(`${BASE_URL}/leaderboard`);
    setLeaderboard(data);
  } catch (error) {
    console.error('Leaderboard error:', error);
    setError({
      type: 'error',
      message: 'Failed to load leaderboard'
    });
  }
};

const fetchInitialData = async () => {
  try {
    const [userResponse, statsResponse, referralResponse, rankResponse] = await Promise.all([
      fetchWithAuth(`${BASE_URL}/user`),
      fetchWithAuth(`${BASE_URL}/network-stats`),
      fetchWithAuth(`${BASE_URL}/referral-info`),
      fetchWithAuth(`${BASE_URL}/rank`)
    ]);

    setUserData({
      earnings: userResponse.earnings || 0,
      co2Saved: userResponse.co2Saved || '0.00',
      walletAddress: userResponse.walletAddress || '',
      fullName: userResponse.fullName || '',
    });

    setNetworkStats({
      totalRecycled: statsResponse.totalRecycled || '0.00',
      activeUsers: statsResponse.activeUsers || 0,
    });

    setReferralInfo({
      referralCount: referralResponse.referralCount || 0,
      referralEarnings: referralResponse.referralEarnings || 0,
      referralLink: referralResponse.referralLink || ''
    });

    setUserRank(rankResponse);
  } catch (error) {
    console.error('Initial data error:', error);
    setError({
      type: 'error',
      message: 'Failed to load data'
    });
  }
};

  // Countdown timer effect
  useEffect(() => {
    const calculateTimeLeft = () => {
      const launchDate = new Date('2025-12-31T00:00:00');
      const now = new Date();
      const difference = launchDate - now;
      
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  // News refresh effect
  useEffect(() => {
    const refreshNews = () => {
      const allNews = [...environmentalBlogs, ...platformNews];
      const shuffledNews = [...allNews]
        .sort(() => 0.5 - Math.random())
        .slice(0, 2);
      setNewsItems(shuffledNews);
    };

    refreshNews();
    const interval = setInterval(refreshNews, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Initial data and auth check
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        navigate('/dashboard');
        return;
      }

      try {
        const data = await fetchWithAuth(`${BASE_URL}/validate-token`);
        if (!data.valid) throw new Error('Invalid token');
        await fetchInitialData();
      } catch (error) {
        localStorage.removeItem('authToken');
        navigate('/dashboard');
      }
    };

    checkAuth();
    const dataInterval = setInterval(fetchInitialData, REFRESH_INTERVAL);
    return () => clearInterval(dataInterval);
  }, [navigate]);

  // Fetch leaderboard when modal opens
  useEffect(() => {
    if (showLeaderboard) {
      fetchLeaderboard();
    }
  }, [showLeaderboard]);

  // Active tab management
  useEffect(() => {
    const currentNavItem = navItems.find((item) => item.path === location.pathname);
    if (currentNavItem) setActiveTab(currentNavItem.id);
  }, [location.pathname]);

  // Mouse position tracking
  useEffect(() => {
    const handleMouseMove = throttle((e) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    }, 100);

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      handleMouseMove.cancel();
    };
  }, []);

  // Event handlers
  const handleClaim = async () => {
    setIsAnimating(true);
    setError(null);

    try {
      const data = await fetchWithAuth(`${BASE_URL}/claim-reward`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      setUserData(prev => ({
        ...prev,
        earnings: data.newBalance || prev.earnings,
      }));

      setError({
        type: 'success',
        message: `+${data.amount || '0.00010'} RFX claimed!`,
      });
    } catch (error) {
      setError({
        type: error.message.includes('Daily reward already claimed') ? 'info' : 'error',
        message: error.message.includes('Daily reward already claimed') ?
          `Come back after ${new Date(error.nextClaim || Date.now()).toLocaleTimeString()} for your next reward` :
          error.message || 'Failed to claim reward'
      });
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
    } else if (title === 'Leaderboard') {
      setShowLeaderboard(true);
    } else {
      setError({
        type: 'info',
        message: `${title} feature coming soon!`,
      });
    }
  };

  const handleNewsClick = (item) => {
    if (item.link) {
      window.open(item.link, '_blank');
    } else {
      setError({
        type: 'info',
        message: `${item.title} - read more soon!`,
      });
    }
  };

  // Utility functions
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

  // Leaderboard Modal Component
// Leaderboard Modal Component
const LeaderboardModal = () => (
  <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden border-2 border-purple-500 shadow-xl shadow-purple-500/20">
      {/* Header with gradient */}
      <div className="flex justify-between items-center p-6 bg-gradient-to-r from-purple-900/80 to-blue-900/80 border-b border-purple-500/30">
        <div className="flex items-center space-x-3">
          <Trophy className="w-8 h-8 text-yellow-400 fill-yellow-400/20" />
          <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-300 via-blue-300 to-green-300 bg-clip-text text-transparent">
            Global Leaderboard
          </h3>
        </div>
        <button 
          onClick={() => setShowLeaderboard(false)}
          className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors text-gray-300 hover:text-white"
        >
          <X size={24} />
        </button>
      </div>
      
      {/* Leaderboard content with animated background */}
      <div className="relative overflow-y-auto max-h-[70vh]">
        {/* Animated background elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-purple-500 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-1/3 right-1/3 w-40 h-40 bg-blue-500 rounded-full blur-xl animate-pulse delay-1000"></div>
        </div>
        
        <table className="w-full relative z-10">
          <thead className="sticky top-0 bg-gradient-to-b from-gray-800 to-gray-900">
            <tr className="text-left text-gray-300 border-b border-gray-700">
              <th className="p-4 pl-6">Rank</th>
              <th className="p-4">User</th>
              <th className="p-4 text-right">RFX</th>
              <th className="p-4 text-right">CO₂ Saved</th>
              <th className="p-4 pr-6 text-right">Level</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((user, index) => {
              // Determine row styling based on rank
              let rowClass = "border-b border-gray-700/50";
              let rankClass = "font-mono";
              
              if (index === 0) {
                rowClass += " bg-gradient-to-r from-yellow-500/10 to-yellow-500/5";
                rankClass += " text-yellow-400";
              } else if (index === 1) {
                rowClass += " bg-gradient-to-r from-gray-500/10 to-gray-500/5";
                rankClass += " text-gray-300";
              } else if (index === 2) {
                rowClass += " bg-gradient-to-r from-amber-700/10 to-amber-700/5";
                rankClass += " text-amber-500";
              } else if (index % 2 === 0) {
                rowClass += " bg-gray-800/50";
              } else {
                rowClass += " bg-gray-850/50";
              }

              // Highlight current user
              const isCurrentUser = user.username === userData.fullName;
              if (isCurrentUser) {
                rowClass += " bg-gradient-to-r from-green-500/20 to-green-700/10";
              }

              return (
                <tr key={user.rank} className={rowClass}>
                  <td className={`p-4 pl-6 ${rankClass}`}>
                    <div className="flex items-center">
                      {index < 3 ? (
                        <span className="mr-2">{index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}</span>
                      ) : null}
                      #{user.rank}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center">
                      {isCurrentUser && (
                        <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                      )}
                      <span className={isCurrentUser ? "text-green-300 font-medium" : "text-white"}>
                        {user.username}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-right font-mono text-yellow-300">
                    {user.earnings.toFixed(5)}
                  </td>
                  <td className="p-4 text-right font-mono text-green-300">
                    {user.co2Saved} kg
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <div className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold">
                      Lv. {user.level}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Footer with user rank */}
      <div className="p-6 bg-gradient-to-b from-gray-900 to-gray-800 border-t border-gray-700/50">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">{userRank.rank}</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-gray-900"></div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Your position</div>
              <div className="text-lg font-bold text-white">
                Top {Math.ceil((userRank.rank / userRank.totalUsers) * 100)}%
              </div>
            </div>
          </div>
          <button 
            onClick={() => setShowLeaderboard(false)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-medium hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg shadow-purple-500/20"
          >
            Close Leaderboard
          </button>
        </div>
      </div>
    </div>
  </div>
);

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

      {/* Leaderboard Modal */}
      {showLeaderboard && <LeaderboardModal />}

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

            <div 
              className="bg-gradient-to-br from-blue-900/20 to-blue-800/20 rounded-2xl p-6 border border-blue-700/50 backdrop-blur-sm cursor-pointer hover:bg-blue-900/30 transition"
              onClick={() => setShowLeaderboard(true)}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Your Rank</h3>
                <Trophy className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">
                  #{userRank.rank || '--'}
                </div>
                <div className="text-gray-400 text-sm">of {userRank.totalUsers} users</div>
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
                onClick={() => handleNewsClick(news)}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-green-400/0 to-green-400/0 group-hover:from-green-400/10 group-hover:to-transparent transition-all"></div>
                <div className="relative z-10">
                  <div className="flex items-start space-x-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center flex-shrink-0 transform group-hover:rotate-6 transition-transform">
                      {news.icon ? (
                        <news.icon className="w-7 h-7 text-black" />
                      ) : (
                        <Sparkles className="w-7 h-7 text-black" />
                      )}
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
                const allNews = [...environmentalBlogs, ...platformNews];
                const shuffledNews = [...allNews]
                  .sort(() => 0.5 - Math.random())
                  .slice(0, 2);
                setNewsItems(shuffledNews);
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
};

export default RFXVerseInterface;
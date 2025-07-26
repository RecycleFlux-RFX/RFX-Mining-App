import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Modal from 'react-modal';
import {
    Home, MapPin, Gamepad2, Wallet, Settings,
    Recycle, Leaf, Target, Clock, Trophy, Star, Award, Globe,
    ArrowRight, CheckCircle, Play, Droplets, TreePine, Wind, Upload,
    BookOpen, Link as LinkIcon
} from 'lucide-react';

// Add social media icons from react-icons
import { 
    FaTwitter as Twitter,
    FaDiscord as Discord,
    FaYoutube as Youtube,
    FaInstagram as Instagram,
    FaFacebook as Facebook,
    FaReddit as Reddit,
    FaLinkedin as LinkedIn,
    FaTiktok as TikTok
} from 'react-icons/fa';

import api from '../../api/api';

// Bind modal to app element for accessibility
Modal.setAppElement('#root');

export default function RFXCampaignPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('campaign');
    const [campaigns, setCampaigns] = useState([]);
    const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 45, seconds: 12 });
    const [userRank, setUserRank] = useState(null);
    const [userStats, setUserStats] = useState({ earnings: 0, co2Saved: '0.00' });
    const [networkStats, setNetworkStats] = useState({ totalRecycled: '0.00', activeUsers: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);
    const [currentDay, setCurrentDay] = useState(1);
    const [dayTimeLeft, setDayTimeLeft] = useState({ hours: 23, minutes: 59, seconds: 59 });

    const iconMap = {
        Ocean: Droplets,
        Forest: TreePine,
        Air: Wind,
        Community: Recycle,
    };

    const platformIcons = {
        twitter: Twitter,
        discord: Discord,
        youtube: Youtube,
        instagram: Instagram,
        facebook: Facebook,
        reddit: Reddit,
        linkedin: LinkedIn,
        tiktok: TikTok,
        default: LinkIcon
    };

    const getColorClasses = (category) => {
        const colorMaps = {
            Ocean: {
                gradient: 'from-blue-400 to-blue-600',
                text: 'text-blue-400',
                bg: 'bg-blue-400/20',
                border: 'border-blue-400/20',
                button: 'from-blue-400 to-blue-500'
            },
            Forest: {
                gradient: 'from-green-400 to-green-600',
                text: 'text-green-400',
                bg: 'bg-green-400/20',
                border: 'border-green-400/20',
                button: 'from-green-400 to-green-500'
            },
            Air: {
                gradient: 'from-cyan-400 to-cyan-600',
                text: 'text-cyan-400',
                bg: 'bg-cyan-400/20',
                border: 'border-cyan-400/20',
                button: 'from-cyan-400 to-cyan-500'
            },
            Community: {
                gradient: 'from-purple-400 to-purple-600',
                text: 'text-purple-400',
                bg: 'bg-purple-400/20',
                border: 'border-purple-400/20',
                button: 'from-purple-400 to-purple-500'
            }
        };
        return colorMaps[category] || colorMaps.Ocean;
    };

    // Set active tab based on current path
    useEffect(() => {
        const navItems = [
            { id: 'home', path: '/' },
            { id: 'campaign', path: '/campaign' },
            { id: 'games', path: '/games' },
            { id: 'wallet', path: '/wallet' },
            { id: 'settings', path: '/settings' },
        ];

        const currentNavItem = navItems.find((item) => item.path === location.pathname);
        if (currentNavItem) {
            setActiveTab(currentNavItem.id);
        }
    }, [location.pathname]);

    // Fetch user data, rank, network stats, and campaigns
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            setError('Please log in to access campaigns');
            navigate('/login');
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                const [userResponse, rankResponse, networkResponse, campaignsResponse] = await Promise.all([
                    api.get('/user/user'),
                    api.get('/wallet/rank'),
                    api.get('/user/network-stats'),
                    api.get('/campaigns'),
                ]);

                setUserStats({
                    earnings: userResponse.earnings || 0,
                    co2Saved: userResponse.co2Saved || '0.00',
                });
                setUserRank(rankResponse.rank);
                setNetworkStats({
                    totalRecycled: networkResponse.totalRecycled || '0.00',
                    activeUsers: networkResponse.activeUsers || 0,
                });
                setCampaigns(campaignsResponse.map(c => ({
                    ...c,
                    tasks: c.tasks || 0,
                    completed: c.completed || 0,
                })));
            } catch (error) {
                console.error('Fetch data error:', error);
                setError(error || 'Failed to fetch data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    // Daily countdown timer
    useEffect(() => {
        const timer = setInterval(() => {
            setDayTimeLeft(prev => {
                if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
                if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
                if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };

                // When day ends, reset timer and move to next day
                setCurrentDay(prev => prev + 1);
                return { hours: 23, minutes: 59, seconds: 59 };
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Filter tasks by current day
    const dailyTasks = tasks.filter(task => task.day === currentDay);

    // Fetch campaign details for tasks
    const fetchCampaignDetails = async (campaignId) => {
        try {
            const response = await api.get(`/campaigns/${campaignId}`);
            const mappedTasks = response.tasks.map(task => ({
                ...task,
                status: task.status === 'in-progress' ? 'pending' : task.status,
            }));
            setTasks(mappedTasks || []);
            setSelectedCampaign(prev => ({ ...prev, ...response }));

            // Calculate current day based on start date
            if (response.startDate) {
                const startDate = new Date(response.startDate);
                const today = new Date();
                const diffTime = today - startDate;
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
                setCurrentDay(Math.min(diffDays, response.duration));
            }
        } catch (error) {
            console.error('Fetch campaign details error:', error);
            setError(error || 'Failed to fetch campaign details');
        }
    };

    // Handle proof upload
    const handleProofUpload = async (taskId, file) => {
        setUploading(true);
        const formData = new FormData();
        formData.append('campaignId', selectedCampaign.id);
        formData.append('taskId', taskId);
        formData.append('proof', file);

        try {
            const response = await api.post('/campaigns/upload-proof', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setTasks(tasks.map(task =>
                task.id === taskId ? { ...task, status: 'pending', proof: response.proofUrl } : task
            ));
            alert('Proof uploaded, pending verification');
        } catch (error) {
            console.error('Upload proof error:', error);
            setError(error || 'Failed to upload proof');
        } finally {
            setUploading(false);
        }
    };

    // Handle joining a campaign
    const handleJoinCampaign = async (campaignId) => {
        setLoading(true);
        try {
            await api.post('/campaigns/join', { campaignId });
            const campaign = campaigns.find(c => c.id === campaignId);
            if (!campaign) {
                throw new Error('Campaign not found in local state');
            }

            await fetchCampaignDetails(campaignId);
            setSelectedCampaign(campaign);
            setModalIsOpen(true);

            // Update local state to reflect the join
            setCampaigns(campaigns.map(c =>
                c.id === campaignId
                    ? { ...c, participants: (c.participants || 0) + 1 }
                    : c
            ));
        } catch (error) {
            console.error('Join campaign error:', error);
            setError(error?.response?.data?.message || 'Failed to join campaign');
        } finally {
            setLoading(false);
        }
    };

    // Handle task completion
    const handleCompleteTask = async (campaignId, taskId) => {
        try {
            const response = await api.post('/campaigns/complete-task', { campaignId, taskId });
            setTasks(tasks.map(task =>
                task.id === taskId ? { ...task, status: 'completed', completed: true } : task
            ));
            setUserStats(prev => ({
                ...prev,
                earnings: response.balance,
            }));
            alert(`Task completed! Earned ${response.reward} RFX`);
            const campaignsResponse = await api.get('/campaigns');
            setCampaigns(campaignsResponse.map(c => ({
                ...c,
                tasks: c.tasks || 0,
                completed: c.completed || 0,
            })));
        } catch (error) {
            console.error('Complete task error:', error);
            setError(error || 'Failed to complete task');
        }
    };

    // Countdown timer for global campaign
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
                if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
                if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
                return prev;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Mouse position tracking
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setMousePosition({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                });
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const activeCampaigns = campaigns.filter(c => c.completed < c.tasks);
    const completedCampaigns = campaigns.filter(c => c.completed === c.tasks);

    if (loading) {
        return (
            <div className="w-full min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading campaigns...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full min-h-screen bg-gray-900 flex flex-col items-center justify-center">
                <div className="text-red-400 text-xl mb-4">{error}</div>
                <button
                    onClick={() => navigate('/login')}
                    className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 text-white"
                >
                    Go to Login
                </button>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen bg-gradient-to-br from-black via-gray-900 to-black overflow-hidden relative" ref={containerRef}>
            {/* Animated Background */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-t from-green-500/10 via-transparent to-transparent"></div>
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                {[...Array(15)].map((_, i) => (
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
                                <MapPin className="w-8 h-8 text-black" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                        </div>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
                                Campaigns
                            </h1>
                            <p className="text-gray-400 text-sm">Make an impact, earn rewards</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2 px-4 py-2 bg-gray-800/50 backdrop-blur-sm rounded-full border border-gray-700">
                            <Clock className="w-4 h-4 text-orange-400" />
                            <span className="text-gray-300 text-sm font-mono">
                                {String(timeLeft.hours).padStart(2, '0')}:
                                {String(timeLeft.minutes).padStart(2, '0')}:
                                {String(timeLeft.seconds).padStart(2, '0')}
                            </span>
                        </div>
                        <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-gray-800 to-gray-700 rounded-full">
                            <Trophy className="w-4 h-4 text-yellow-400" />
                            <span className="text-gray-300 text-sm">Rank #{userRank || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Active Campaigns', value: activeCampaigns.length, icon: Target, color: 'green' },
                        { label: 'Total Earned', value: `₿ ${userStats.earnings.toFixed(5)}`, icon: Award, color: 'yellow' },
                        { label: 'Global Impact', value: `${networkStats.totalRecycled} kg`, icon: Globe, color: 'blue' },
                        { label: 'Your Contribution', value: `${userStats.co2Saved} kg`, icon: Leaf, color: 'purple' },
                    ].map((stat, index) => (
                        <div key={index} className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-4 border border-gray-700">
                            <div className="flex items-center justify-between mb-2">
                                <stat.icon className={`w-5 h-5 ${stat.color === 'green' ? 'text-green-400' :
                                    stat.color === 'yellow' ? 'text-yellow-400' :
                                        stat.color === 'blue' ? 'text-blue-400' : 'text-purple-400'
                                    }`} />
                                <div className="text-xs text-gray-400">{stat.label}</div>
                            </div>
                            <div className="text-xl font-bold text-white">{stat.value}</div>
                        </div>
                    ))}
                </div>

                {/* Featured Campaign */}
                {campaigns.find(c => c.featured) && (
                    <div className="mb-8">
                        <div className="flex items-center space-x-2 mb-4">
                            <Star className="w-5 h-5 text-yellow-400" />
                            <h2 className="text-xl font-bold text-white">Featured Campaign</h2>
                        </div>

                        {(() => {
                            const featured = campaigns.find(c => c.featured);
                            const Icon = iconMap[featured.category];
                            const colors = getColorClasses(featured.category);
                            return (
                                <div className="relative group">
                                    <div className={`absolute inset-0 ${colors.bg} rounded-3xl blur-xl group-hover:blur-2xl transition-all`}></div>
                                    <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 sm:p-8 border border-gray-700 overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl transform translate-x-32 -translate-y-32"></div>

                                        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                                            <div>
                                                <div className="flex items-center space-x-3 mb-4">
                                                    <div className={`w-12 h-12 bg-gradient-to-br ${colors.gradient} rounded-xl flex items-center justify-center`}>
                                                        <Icon className="w-6 h-6 text-black" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-2xl font-bold text-white">{featured.title}</h3>
                                                        <p className="text-gray-400">{featured.description}</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 mb-6">
                                                    <div className="bg-gray-800/50 rounded-xl p-3">
                                                        <div className="text-gray-400 text-xs mb-1">Reward</div>
                                                        <div className="text-green-400 font-bold text-lg">{featured.reward}</div>
                                                    </div>
                                                    <div className="bg-gray-800/50 rounded-xl p-3">
                                                        <div className="text-gray-400 text-xs mb-1">Participants</div>
                                                        <div className="text-white font-bold text-lg">{featured.participants.toLocaleString()}</div>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleJoinCampaign(featured.id)}
                                                    className={`w-full bg-gradient-to-r ${colors.button} text-black font-bold py-4 rounded-2xl text-lg transition-all transform hover:scale-105 flex items-center justify-center space-x-2`}
                                                    disabled={loading}
                                                >
                                                    <Play className="w-5 h-5" />
                                                    <span>{loading ? 'Joining...' : 'JOIN CAMPAIGN'}</span>
                                                </button>
                                            </div>

                                            <div className="relative">
                                                <div className="bg-gray-800/30 rounded-2xl p-6 backdrop-blur-sm">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <span className="text-gray-400">Progress</span>
                                                        <span className="text-white font-bold">{Math.round(featured.progress)}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-700 rounded-full h-3 mb-4">
                                                        <div
                                                            className={`bg-gradient-to-r ${colors.button} h-3 rounded-full transition-all duration-1000`}
                                                            style={{ width: `${featured.progress}%` }}
                                                        ></div>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-4 text-center">
                                                        <div>
                                                            <div className="text-2xl font-bold text-blue-400">{featured.tasks}</div>
                                                            <div className="text-gray-400 text-xs">Tasks</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-2xl font-bold text-green-400">{featured.completed}</div>
                                                            <div className="text-gray-400 text-xs">Completed</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-2xl font-bold text-orange-400">{featured.duration}</div>
                                                            <div className="text-gray-400 text-xs">Duration</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* Campaign Sections */}
                <div className="space-y-8">
                    {/* Active Campaigns */}
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">Active Campaigns</h2>
                            <div className="flex items-center space-x-2 text-gray-400 text-sm">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span>{activeCampaigns.length} Active</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {activeCampaigns.map((campaign) => {
                                const Icon = iconMap[campaign.category];
                                const colors = getColorClasses(campaign.category);
                                return (
                                    <div key={campaign.id} className="group relative">
                                        <div className={`absolute inset-0 ${colors.bg} rounded-2xl blur-lg group-hover:blur-xl transition-all`}></div>

                                        <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700 transition-all hover:border-gray-600">
                                            {/* Badges */}
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center space-x-2">
                                                    {campaign.new && (
                                                        <div className="px-2 py-1 bg-green-400 text-black text-xs font-bold rounded animate-pulse">
                                                            NEW
                                                        </div>
                                                    )}
                                                    {campaign.trending && (
                                                        <div className="px-2 py-1 bg-orange-400 text-black text-xs font-bold rounded">
                                                            TRENDING
                                                        </div>
                                                    )}
                                                    {campaign.ending && (
                                                        <div className="px-2 py-1 bg-red-400 text-black text-xs font-bold rounded animate-pulse">
                                                            ENDING SOON
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`px-2 py-1 rounded text-xs font-semibold ${campaign.difficulty === 'Easy' ? 'bg-green-400/20 text-green-400' :
                                                    campaign.difficulty === 'Medium' ? 'bg-yellow-400/20 text-yellow-400' :
                                                        'bg-red-400/20 text-red-400'
                                                    }`}>
                                                    {campaign.difficulty}
                                                </div>
                                            </div>

                                            {/* Campaign Info */}
                                            <div className="flex items-start space-x-4 mb-4">
                                                <div className={`w-12 h-12 bg-gradient-to-br ${colors.gradient} rounded-xl flex items-center justify-center transform group-hover:rotate-12 transition-transform`}>
                                                    <Icon className="w-6 h-6 text-black" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-white font-bold text-lg mb-1">{campaign.title}</h3>
                                                    <p className="text-gray-400 text-sm">{campaign.description}</p>
                                                </div>
                                            </div>

                                            {/* Progress */}
                                            <div className="mb-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-gray-400 text-sm">Tasks Progress</span>
                                                    <span className="text-white text-sm font-semibold">{campaign.completed}/{campaign.tasks}</span>
                                                </div>
                                                <div className="w-full bg-gray-700 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full transition-all duration-1000 bg-gradient-to-r ${colors.button}`}
                                                        style={{ width: `${(campaign.completed / campaign.tasks) * 100}%` }}
                                                    ></div>
                                                </div>
                                            </div>

                                            {/* Stats */}
                                            <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                                                <div>
                                                    <div className="text-green-400 font-bold">{campaign.reward}</div>
                                                    <div className="text-gray-400 text-xs">Reward</div>
                                                </div>
                                                <div>
                                                    <div className="text-white font-bold">{campaign.participants.toLocaleString()}</div>
                                                    <div className="text-gray-400 text-xs">Participants</div>
                                                </div>
                                                <div>
                                                    <div className="text-orange-400 font-bold">{campaign.duration}</div>
                                                    <div className="text-gray-400 text-xs">Duration</div>
                                                </div>
                                            </div>

                                            {/* Action Button */}
                                            <button
                                                onClick={() => handleJoinCampaign(campaign.id)}
                                                className={`w-full bg-gradient-to-r ${colors.button} text-black font-bold py-3 rounded-xl transition-all transform hover:scale-105 flex items-center justify-center space-x-2`}
                                                disabled={loading}
                                            >
                                                {campaign.completed > 0 ? (
                                                    <>
                                                        <Play className="w-4 h-4" />
                                                        <span>{loading ? 'Continuing...' : 'CONTINUE'}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ArrowRight className="w-4 h-4" />
                                                        <span>{loading ? 'Starting...' : 'START'}</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Completed Campaigns */}
                    {completedCampaigns.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white">Completed Campaigns</h2>
                                <div className="flex items-center space-x-2 text-gray-400 text-sm">
                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                    <span>{completedCampaigns.length} Completed</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {completedCampaigns.map((campaign) => {
                                    const Icon = iconMap[campaign.category];
                                    const colors = getColorClasses(campaign.category);
                                    return (
                                        <div key={campaign.id} className="group relative opacity-75">
                                            <div className={`absolute inset-0 ${colors.bg} rounded-2xl blur-lg`}></div>

                                            <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="px-3 py-1 bg-green-400 text-black text-xs font-bold rounded-full flex items-center space-x-1">
                                                        <CheckCircle className="w-3 h-3" />
                                                        <span>COMPLETED</span>
                                                    </div>
                                                    <div className="text-green-400 font-bold">{campaign.reward}</div>
                                                </div>

                                                <div className="flex items-start space-x-4 mb-4">
                                                    <div className={`w-12 h-12 bg-gradient-to-br ${colors.gradient} rounded-xl flex items-center justify-center`}>
                                                        <Icon className="w-6 h-6 text-black" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="text-white font-bold text-lg mb-1">{campaign.title}</h3>
                                                        <p className="text-gray-400 text-sm">{campaign.description}</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 text-center">
                                                    <div>
                                                        <div className="text-green-400 font-bold">{campaign.tasks}</div>
                                                        <div className="text-gray-400 text-xs">Tasks Completed</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-white font-bold">{campaign.participants.toLocaleString()}</div>
                                                        <div className="text-gray-400 text-xs">Total Participants</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Campaign Details Modal */}
            <Modal
                isOpen={modalIsOpen}
                onRequestClose={() => setModalIsOpen(false)}
                className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 max-w-4xl mx-auto mt-16 border border-gray-700 shadow-2xl"
                overlayClassName="fixed inset-0 bg-black bg-opacity-75 flex items-start justify-center p-4 z-50 overflow-y-auto"
            >
                {selectedCampaign ? (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-4">
                                {(() => {
                                    const Icon = iconMap[selectedCampaign.category];
                                    const colors = getColorClasses(selectedCampaign.category);
                                    return (
                                        <div className={`w-16 h-16 bg-gradient-to-br ${colors.gradient} rounded-2xl flex items-center justify-center`}>
                                            <Icon className="w-8 h-8 text-black" />
                                        </div>
                                    );
                                })()}
                                <div>
                                    <h2 className="text-2xl font-bold text-white">{selectedCampaign.title}</h2>
                                    <p className="text-gray-400">{selectedCampaign.description}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setModalIsOpen(false)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                                <div className="text-green-400 font-bold text-xl">{selectedCampaign.reward}</div>
                                <div className="text-gray-400 text-sm">Total Reward</div>
                            </div>
                            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                                <div className="text-blue-400 font-bold text-xl">{selectedCampaign.tasks}</div>
                                <div className="text-gray-400 text-sm">Total Tasks</div>
                            </div>
                            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                                <div className="text-orange-400 font-bold text-xl">{selectedCampaign.duration}</div>
                                <div className="text-gray-400 text-sm">Duration</div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-white mb-4">Daily Tasks</h3>
                            {dailyTasks.length > 0 ? (
                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                    <div className="bg-gray-800 p-3 rounded-xl mb-4 text-center">
                                        <div className="text-sm text-gray-400 mb-1">Day {currentDay} of {selectedCampaign.duration}</div>
                                        <div className="text-lg font-bold text-white">
                                            {String(dayTimeLeft.hours).padStart(2, '0')}:
                                            {String(dayTimeLeft.minutes).padStart(2, '0')}:
                                            {String(dayTimeLeft.seconds).padStart(2, '0')}
                                        </div>
                                        <div className="text-xs text-gray-400">Time remaining to complete today's tasks</div>
                                    </div>

                                    {dailyTasks.map((task, index) => (
                                        <div key={task.id} className="bg-gray-800/50 rounded-xl p-4">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-start space-x-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${task.completed ? 'bg-green-400 text-black' :
                                                        task.status === 'pending' ? 'bg-yellow-400 text-black' :
                                                            'bg-gray-600 text-white'
                                                        }`}>
                                                        {task.completed ? <CheckCircle className="w-4 h-4" /> : index + 1}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="text-white font-semibold">{task.title}</h4>
                                                        <p className="text-gray-400 text-sm">{task.description}</p>

                                                        {/* Task-specific content */}
                                                        {(task.type === 'video-watch' || task.type === 'article-read') && task.contentUrl && (
                                                            <div className="mt-2">
                                                                <a
                                                                    href={task.contentUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-blue-400 text-sm flex items-center"
                                                                >
                                                                    {task.type === 'video-watch' ? (
                                                                        <><Play className="w-3 h-3 mr-1" /> Watch Video</>
                                                                    ) : (
                                                                        <><BookOpen className="w-3 h-3 mr-1" /> Read Article</>
                                                                    )}
                                                                </a>
                                                            </div>
                                                        )}

                                                        {task.requirements && (
                                                            <div className="mt-2">
                                                                <div className="text-xs text-gray-500 mb-1">Requirements:</div>
                                                                <ul className="text-xs text-gray-400 space-y-1">
                                                                    {task.requirements.map((req, i) => (
                                                                        <li key={i} className="flex items-center space-x-2">
                                                                            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                                                            <span>{req}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-green-400 font-bold">{task.reward}</div>
                                            </div>

                                            {task.completed ? (
                                                <div className="flex items-center space-x-2 text-green-400">
                                                    <CheckCircle className="w-4 h-4" />
                                                    <span className="text-sm font-medium">Task Completed</span>
                                                </div>
                                            ) : task.status === 'pending' ? (
                                                <div className="flex items-center space-x-2 text-yellow-400">
                                                    <span className="text-sm font-medium">Pending Review</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center space-x-3">
                                                    {/* For social follow/join tasks */}
                                                            {(task.type === 'social-follow' || task.type === 'discord-join') && task.contentUrl && (
                                                                <a
                                                                    href={task.contentUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="px-4 py-2 bg-blue-400/20 text-blue-400 border border-blue-400/30 rounded-lg text-sm font-medium hover:bg-blue-400/30 flex items-center space-x-2"
                                                                >
                                                                    {task.platform && platformIcons[task.platform.toLowerCase()] ? (
                                                                        <>
                                                                            {React.createElement(platformIcons[task.platform.toLowerCase()], { className: "w-4 h-4" })}
                                                                            <span>{task.type === 'discord-join' ? 'Join Discord' : `Follow on ${task.platform}`}</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <LinkIcon className="w-4 h-4" />
                                                                            <span>{task.type === 'discord-join' ? 'Join Discord' : 'Follow'}</span>
                                                                        </>
                                                                    )}
                                                                </a>
                                                            )}

                                                    {/* For proof upload tasks */}
                                                    {(task.type === 'social-post' || task.type === 'proof-upload') && (
                                                        <>
                                                            <input
                                                                type="file"
                                                                id={`file-${task.id}`}
                                                                className="hidden"
                                                                accept="image/*"
                                                                onChange={(e) => {
                                                                    if (e.target.files[0]) {
                                                                        handleProofUpload(task.id, e.target.files[0]);
                                                                    }
                                                                }}
                                                            />
                                                            <label
                                                                htmlFor={`file-${task.id}`}
                                                                className="flex items-center space-x-2 px-4 py-2 rounded-lg cursor-pointer transition-all bg-blue-400/20 text-blue-400 border border-blue-400/30 hover:bg-blue-400/30"
                                                            >
                                                                <Upload className="w-4 h-4" />
                                                                <span className="text-sm font-medium">
                                                                    {task.type === 'social-post' ? 'Upload Post Proof' : 'Upload Proof'}
                                                                </span>
                                                            </label>
                                                        </>
                                                    )}

                                                    {/* Complete button appears after action is taken */}
                                                    {task.status === 'in-progress' && (
                                                        <button
                                                            onClick={() => handleCompleteTask(selectedCampaign.id, task.id)}
                                                            className="px-4 py-2 bg-green-400/20 text-green-400 border border-green-400/30 rounded-lg text-sm font-medium hover:bg-green-400/30"
                                                        >
                                                            Complete Task
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-gray-400 text-center py-8">
                                    {currentDay > selectedCampaign.duration ? (
                                        "Campaign completed! Thanks for participating."
                                    ) : (
                                        "No tasks available for today. Check back tomorrow!"
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-gray-400 text-center">Loading campaign details...</div>
                )}
            </Modal>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm border-t border-gray-800 px-4 py-2 z-50">
                <div className="max-w-md mx-auto">
                    <div className="flex items-center justify-around">
                        {[
                            { id: 'home', icon: Home, label: 'Home', path: '/' },
                            { id: 'campaign', icon: MapPin, label: 'Campaigns', path: '/campaign' },
                            { id: 'games', icon: Gamepad2, label: 'Games', path: '/games' },
                            { id: 'wallet', icon: Wallet, label: 'Wallet', path: '/wallet' },
                            { id: 'settings', icon: Settings, label: 'Notifications', path: '/settings' },
                        ].map((item) => (
                            <Link
                                key={item.id}
                                to={item.path}
                                className={`flex flex-col items-center space-y-1 py-2 px-3 rounded-lg transition-all ${activeTab === item.id ? 'text-green-400 bg-green-400/10' : 'text-gray-400 hover:text-gray-300'
                                    }`}
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="text-xs font-medium">{item.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }
                .animate-float {
                    animation: float 10s ease-in-out infinite;
                }
                .delay-1000 {
                    animation-delay: 1s;
                }
            `}</style>
        </div>
    );
}
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Modal from 'react-modal';
import {
    Home, MapPin, Gamepad2, Wallet, Settings,
    Recycle, Leaf, Target, Clock, Trophy, Star, Award, Globe,
    ArrowRight, CheckCircle, Play, Droplets, TreePine, Wind, Upload,
    BookOpen, Link as LinkIcon, Users
} from 'lucide-react';
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
import axios from 'axios';
import Swal from 'sweetalert2';
// Bind modal to app element
Modal.setAppElement('#root');

const BASE_URL = 'https://rfx-mining-app.onrender.com';

export default function RFXCampaignPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('campaign');
    const [campaigns, setCampaigns] = useState([]);
    const [userCampaigns, setUserCampaigns] = useState([]);
    const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 45, seconds: 12 });
    const [userRank, setUserRank] = useState(null);
    const [userStats, setUserStats] = useState({ earnings: 0, co2Saved: '0.00', fullName: '' });
    const [networkStats, setNetworkStats] = useState({ totalRecycled: '0.00', activeUsers: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [currentDay, setCurrentDay] = useState(1);
    const [dayTimeLeft, setDayTimeLeft] = useState({ hours: 23, minutes: 59, seconds: 59 });
    const [dailyTasks, setDailyTasks] = useState([]);
    const [globalImpact, setGlobalImpact] = useState('0.00');
    const [yourContribution, setYourContribution] = useState('0.00');

    // Flag to include pending tasks in progress calculation (configurable)
    const includePendingInProgress = true;

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

    const getErrorColor = () => {
        if (!error) return '';
        switch (error.type) {
            case 'success': return 'bg-green-500/50';
            case 'error': return 'bg-red-500/50';
            case 'info': return 'bg-blue-500/50';
            default: return 'bg-gray-500/50';
        }
    };

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
            const response = await fetch(url, {
                ...options,
                headers,
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Request failed with status ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (error.message.includes('401')) {
                localStorage.removeItem('authToken');
                navigate('/dashboard');
            }
            throw error;
        }
    };

    const fetchImpactData = async () => {
        try {
            const networkStatsResponse = await axios.get(`${BASE_URL}/user/network-stats`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
            });
            setGlobalImpact(networkStatsResponse.data.totalRecycled);

            const userResponse = await axios.get(`${BASE_URL}/user/user`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
            });
            setYourContribution(userResponse.data.co2Saved);
        } catch (err) {
            console.error('Fetch impact data error:', err);
            setError({ type: 'error', message: 'Failed to load impact data' });
        }
    };

    const calculateDayProgress = (campaign) => {
        if (!campaign || !campaign.startDate || !campaign.duration) {
            console.warn('Invalid campaign data for day calculation:', campaign);
            return { currentDay: 1, timeLeft: { hours: 23, minutes: 59, seconds: 59 } };
        }

        const startDate = new Date(campaign.startDate);
        if (isNaN(startDate.getTime())) {
            console.warn('Invalid startDate:', campaign.startDate);
            return { currentDay: 1, timeLeft: { hours: 23, minutes: 59, seconds: 59 } };
        }

        const duration = parseInt(campaign.duration, 10) || 1;
        const now = new Date();
        const diffTime = now - startDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        const currentDay = Math.min(diffDays, duration);

        const nextDay = new Date(startDate);
        nextDay.setDate(startDate.getDate() + currentDay);
        const timeUntilNextDay = nextDay - now;

        const hours = Math.floor((timeUntilNextDay % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeUntilNextDay % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeUntilNextDay % (1000 * 60)) / 1000);

        const result = {
            currentDay,
            timeLeft: {
                hours: Math.max(0, hours),
                minutes: Math.max(0, minutes),
                seconds: Math.max(0, seconds)
            }
        };
        ('Calculated day progress:', result, 'for campaign:', campaign.title);
        return result;
    };

    useEffect(() => {
        if (selectedCampaign && tasks.length > 0) {

            setDailyTasks(tasks.filter(task => task.day === currentDay || (isNaN(currentDay) && task.day === 1)));
        } else {
            setDailyTasks([]);
        }
    }, [tasks, currentDay, selectedCampaign]);

    useEffect(() => {
        if (selectedCampaign) {
            const { currentDay, timeLeft } = calculateDayProgress(selectedCampaign);
            setCurrentDay(currentDay);
            setDayTimeLeft(timeLeft);

            const timer = setInterval(() => {
                setDayTimeLeft(prev => {
                    if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
                    if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
                    if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };

                    const duration = parseInt(selectedCampaign.duration, 10) || 1;
                    const newDay = Math.min(currentDay + 1, duration);

                    if (newDay !== currentDay) {
                        setCurrentDay(newDay);
                        fetchCampaignDetails(selectedCampaign.id);
                    }

                    return { hours: 23, minutes: 59, seconds: 59 };
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [selectedCampaign]);

    useEffect(() => {
        const navItems = [
            { icon: Home, label: 'Home', id: 'home', path: '/dashboard' },
            { icon: MapPin, label: 'Campaign', id: 'campaign', path: '/campaign' },
            { icon: Gamepad2, label: 'Games', id: 'games', path: '/games' },
            { icon: Wallet, label: 'Wallet', id: 'wallet', path: '/wallet' },
            { icon: Settings, label: 'Settings', id: 'settings', path: '/settings' },
        ];

        const currentNavItem = navItems.find((item) => item.path === location.pathname);
        if (currentNavItem) {
            setActiveTab(currentNavItem.id);
        }
    }, [location.pathname]);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('authToken');
            if (!token) {
                setError({
                    type: 'error',
                    message: 'Please log in to access campaigns',
                });
                navigate('/dashboard');
                setLoading(false);
                return;
            }

            try {
                const data = await fetchWithAuth(`${BASE_URL}/user/validate-token`);
                if (!data.valid) {
                    throw new Error(data.message || 'Invalid token');
                }
                await Promise.all([fetchInitialData(), fetchImpactData()]);
            } catch (error) {
                console.error('Authentication check failed:', error.message);
                localStorage.removeItem('authToken');
                navigate('/dashboard');
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, [navigate]);

const fetchInitialData = async () => {
    setLoading(true);
    try {
        const [userResponse, rankResponse, networkResponse, campaignsResponse] = await Promise.all([
            fetchWithAuth(`${BASE_URL}/user/user`).catch(error => {
                if (error.message.includes('404')) return { username: '', email: '', campaigns: [] };
                throw error;
            }),
            fetchWithAuth(`${BASE_URL}/wallet/rank`).catch(error => {
                if (error.message.includes('404')) return { rank: 'N/A' };
                throw error;
            }),
            fetchWithAuth(`${BASE_URL}/user/network-stats`).catch(error => {
                if (error.message.includes('404')) return { totalRecycled: '0.00', activeUsers: 0 };
                throw error;
            }),
            fetchWithAuth(`${BASE_URL}/campaigns`).catch(error => {
                if (error.message.includes('404')) return { data: [] };
                throw error;
            }),
        ]);

        let userCampaignsData = [];
        try {
            const userCampaignsResponse = await fetchWithAuth(`${BASE_URL}/user/campaigns`);
            userCampaignsData = Array.isArray(userCampaignsResponse) ? userCampaignsResponse : [];
        } catch (error) {
            console.error('Error fetching user campaigns:', error);
            userCampaignsData = (userResponse.campaigns || []).map(c => ({
                ...c,
                id: c.campaignId?.toString(),
                _id: c.campaignId,
                userJoined: true,
                userCompleted: c.completed || 0,
                progress: 0
            }));
        }

        const campaignsData = campaignsResponse.data || campaignsResponse;

        // Check for any campaigns that just ended
        const now = new Date();
        const justEndedCampaigns = campaignsData.filter(c => {
            if (!c.endDate) return false;
            const endDate = new Date(c.endDate);
            // Check if campaign ended in the last 5 minutes (adjust as needed)
            return endDate <= now && endDate > new Date(now.getTime() - 5 * 60 * 1000);
        });

        // Show SweetAlert for each just-ended campaign the user participated in
        justEndedCampaigns.forEach(campaign => {
            const userCampaign = userCampaignsData.find(uc => 
                uc._id?.toString() === campaign._id?.toString() || 
                uc.id?.toString() === campaign._id?.toString()
            );
            
            if (userCampaign) {
                Swal.fire({
                    title: 'Campaign Ended!',
                    text: `The "${campaign.title}" campaign has ended. Thanks for participating!`,
                    icon: 'success',
                    confirmButtonText: 'OK',
                    background: '#1a202c',
                    color: '#ffffff',
                    confirmButtonColor: '#38a169'
                });
            }
        });

        const mappedCampaigns = (campaignsData || []).map((c) => {
            const userCampaign = userCampaignsData.find(uc => 
                uc._id?.toString() === c._id?.toString() || 
                uc.id?.toString() === c._id?.toString()
            ) || null;

            const userProgress = userCampaign && c.tasksList && c.tasksList.length > 0 
                ? (userCampaign.userCompleted / c.tasksList.length) * 100 
                : 0;

            const userCompletedWithPending = userCampaign && c.tasksList 
                ? userResponse.tasks.filter(t => 
                    t.campaignId.toString() === c._id.toString() && 
                    (t.status === 'completed' || (includePendingInProgress && t.status === 'pending'))
                ).length
                : userCampaign?.userCompleted || 0;

            const userProgressWithPending = c.tasksList && c.tasksList.length > 0 
                ? (userCompletedWithPending / c.tasksList.length) * 100 
                : 0;

            const globalProgress = c.tasksList && c.participants > 0
                ? (c.completedTasks / (c.tasksList.length * c.participants)) * 100
                : 0;

            return {
                ...c,
                id: c._id?.toString() || c.id,
                tasks: c.tasksList ? c.tasksList.length : 0,
                completed: c.completedTasks || 0,
                participants: c.participants || 0,
                progress: userCampaign ? (includePendingInProgress ? userProgressWithPending : userProgress) : globalProgress,
                reward: c.reward ? `${c.reward} RFX` : '0 RFX',
                duration: c.duration ? `${c.duration} days` : 'N/A',
                userJoined: !!userCampaign,
                userCompleted: userCampaign ? userCampaign.userCompleted || 0 : 0,
                startDate: c.startDate ? new Date(c.startDate).toISOString() : new Date().toISOString(),
                endDate: c.endDate ? new Date(c.endDate).toISOString() : null,
                status: c.status || (c.endDate && new Date(c.endDate) <= now ? 'completed' : 'active')
            };
        });

        // Filter out ended campaigns from active display
const now1 = new Date();
const activeCampaigns = campaigns.filter(c => 
    c.status === 'active' || 
    (c.endDate && new Date(c.endDate) > now1)
);
const completedCampaigns = campaigns.filter(c => 
    c.status === 'completed' || 
    (c.endDate && new Date(c.endDate) <= now1)
);

        setCampaigns(mappedCampaigns);
        setUserCampaigns(activeCampaigns.filter(c => c.userJoined));
        setUserStats({
            earnings: userResponse.earnings || 0,
            co2Saved: userResponse.co2Saved || '0.00',
            fullName: userResponse.fullName || ''
        });
        setUserRank(rankResponse.rank || 'N/A');
        setNetworkStats({
            totalRecycled: networkResponse.totalRecycled || '0.00',
            activeUsers: networkResponse.activeUsers || 0
        });
    } catch (error) {
        console.error('Fetch data error:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        setError({
            type: 'error',
            message: error.message || 'Failed to fetch data',
        });
        if (error.message === 'User not found' || error.message.includes('Invalid token') || error.status === 401) {
            localStorage.removeItem('authToken');
            navigate('/dashboard');
        }
    } finally {
        setLoading(false);
    }
};

    const fetchCampaignDetails = async (campaignId) => {
        try {

            const response = await fetchWithAuth(`${BASE_URL}/campaigns/${campaignId}/user`);


            const mappedTasks = (response.tasksList || []).map((task) => {
                const userTask = response.participantsList
                    ?.find(p => p.userId.toString() === localStorage.getItem('userId'))
                    ?.tasks?.find(t => t.taskId.toString() === task._id) || {};
                return {
                    ...task,
                    id: task._id || `temp-${Math.random()}`,
                    status: userTask.status || 'open',
                    reward: task.reward ? `${task.reward} RFX` : '0 RFX',
                    completed: userTask.status === 'completed',
                    proof: userTask.proof || null,
                    day: task.day || 1,
                };
            });


            setTasks(mappedTasks);
            setSelectedCampaign({
                ...response,
                id: response._id,
                tasks: mappedTasks.length,
                reward: response.reward ? `${response.reward} RFX` : '0 RFX',
                duration: response.duration ? `${response.duration} days` : '1 day',
                startDate: response.startDate ? new Date(response.startDate).toISOString() : new Date().toISOString(),
                currentDay: response.currentDay || 1,
                dayTimeLeft: response.dayTimeLeft || { hours: 23, minutes: 59, seconds: 59 }
            });
            setCurrentDay(response.currentDay || 1);
            setDayTimeLeft(response.dayTimeLeft || { hours: 23, minutes: 59, seconds: 59 });
        } catch (error) {
            console.error('Fetch campaign error:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            setError({
                type: 'error',
                message: error.message || 'Failed to load campaign details',
            });
        }
    };

    const handleCompleteTask = async (campaignId, taskId) => {
        try {
            const task = tasks.find(t => t.id === taskId);
            if (!task) throw new Error('Task not found');
            if (task.type === 'proof-upload') {
                setError({ type: 'info', message: 'Proof-upload tasks require proof submission' });
                return;
            }
            const response = await fetchWithAuth(`${BASE_URL}/campaigns/${campaignId}/tasks/${taskId}/complete`, {
                method: 'POST',
            });
            setTasks(prev => prev.map(t => 
                t.id === taskId ? { ...t, status: 'completed', completed: true } : t
            ));
            await Promise.all([
                fetchInitialData(),
                fetchCampaignDetails(campaignId)
            ]);
            setError({ type: 'success', message: `Task completed! Earned ${response.reward || '0'} RFX` });
        } catch (error) {
            console.error('Complete task error:', error);
            setError({ type: 'error', message: error.message || 'Failed to complete task' });
        }
    };

    const handleProofUpload = async (campaignId, taskId, file) => {
        try {
            if (!file) throw new Error('No file selected');
            setUploading(true);
            const formData = new FormData();
            formData.append('proof', file);
            const response = await fetchWithAuth(`${BASE_URL}/campaigns/${campaignId}/tasks/${taskId}/proof`, {
                method: 'POST',
                body: formData,
            });
            setTasks(prev => prev.map(t => 
                t.id === taskId ? { ...t, status: 'pending', proof: response.proofUrl } : t
            ));
            await Promise.all([
                fetchInitialData(),
                fetchCampaignDetails(campaignId)
            ]);
            setError({ type: 'success', message: 'Proof uploaded successfully, pending verification' });
        } catch (error) {
            console.error('Proof upload error:', error);
            setError({ type: 'error', message: error.message || 'Failed to upload proof' });
        } finally {
            setUploading(false);
        }
    };

    const handleJoinCampaign = async (campaignId) => {
        setLoading(true);
        try {
            const response = await fetchWithAuth(`${BASE_URL}/campaigns/${campaignId}/join`, {
                method: 'POST',
            });

            const campaign = campaigns.find((c) => c.id === campaignId);
            if (!campaign) {
                throw new Error('Campaign not found');
            }

            setCampaigns((prev) => prev.map((c) =>
                c.id === campaignId ? {
                    ...c,
                    participants: (c.participants || 0) + 1,
                    userJoined: true,
                    userCompleted: 0
                } : c
            ));
            setUserCampaigns((prev) => [
                ...prev,
                { ...campaign, userJoined: true, userCompleted: 0 }
            ]);

            await fetchCampaignDetails(campaignId);
            setSelectedCampaign(campaign);
            setModalIsOpen(true);

            setError({
                type: 'success',
                message: 'Successfully joined campaign!',
            });
        } catch (error) {
            console.error('Join campaign error:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            setError({
                type: 'error',
                message: error.message || 'Failed to join campaign',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
                if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
                if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
                return { hours: 0, minutes: 0, seconds: 0 };
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const activeCampaigns = campaigns.filter((c) => c.status === 'active');
    const completedCampaigns = campaigns.filter((c) => c.status === 'completed');

    if (loading) {
        return (
            <div className="w-full min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white text-center text-lg">Loading...</div>
            </div>
        );
    }

    if (error && error.message !== 'Successfully joined campaign!' && error.message !== 'Proof uploaded successfully, pending verification' && !error.message.includes('Task completed') && error.message !== 'Wallet connected successfully!' && error.message !== 'Failed to connect wallet') {
        return (
            <div className="w-full min-h-screen bg-gray-900 flex flex-col items-center justify-center">
                <div className="flex flex-col items-center justify-center space-y-4">
                    <div className={`text-white text-lg ${getErrorColor()} mb-4`}>{error.message}</div>
                    <button
                        onClick={() => navigate('/login')}
                        className="px-4 py-2 bg-blue-500 rounded-full text-white hover:bg-blue-600 font-medium"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen bg-gradient-to-br from-black via-gray-900 to-black overflow-hidden relative">
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-24">
                <div className="flex flex-col sm:flex-row items-center justify-between mb-8 pt-4 space-y-4 sm:space-y-0">
                    <div className="flex items-center space-x-3">
                        <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-green-600 rounded-xl flex items-center justify-center transform rotate-12 transition-transform hover:rotate-0">
                                <MapPin className="text-black w-8 h-8" />
                            </div>
                            <div className="absolute top-0 right-0 w-3 h-3 bg-blue-400 rounded-full animate-ping"></div>
                        </div>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-green-300 bg-clip-text text-transparent">
                                Campaigns
                            </h1>
                            <p className="text-gray-500 text-sm font-medium">Join campaigns to earn rewards</p>
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
                        <div className="flex items-center space-x-2 px-4 py-2 bg-gray-800/30 rounded-full">
                            <Trophy className="w-4 h-4 text-yellow-400" />
                            <span className="text-blue-400 text-sm">Your Rank #{userRank || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                {error && (
                    <div className={`mb-3 p-2 rounded-md ${getErrorColor()} max-w-xs mx-auto`}>
                        <p className="text-white text-xs text-center">{error.message}</p>
                    </div>
                )}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Active Campaigns', value: activeCampaigns.length, icon: Target, color: 'green' },
                        { label: 'Total Earned', value: `${userStats.earnings.toFixed(5)} RFX`, icon: Award, color: 'yellow' },
                        { label: 'Global Impact', value: `${globalImpact} kg`, icon: Globe, color: 'blue' },
                        { label: 'Your Contribution', value: `${yourContribution} kg`, icon: Leaf, color: 'purple' },
                    ].map((stat, index) => (
                        <div key={index} className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                                <stat.icon className={`w-5 h-5 ${stat.color === 'green' ? 'text-green-400' :
                                    stat.color === 'yellow' ? 'text-yellow-400' :
                                    stat.color === 'blue' ? 'text-blue-500' : 'text-purple-400'
                                }`} />
                                <span className="text-gray-500 text-sm font-medium">{stat.label}</span>
                            </div>
                            <span className="text-lg font-semibold text-white">{stat.value}</span>
                        </div>
                    ))}
                </div>
                {userCampaigns.length > 0 && (
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">My Campaigns</h2>
                            <div className="flex items-center space-x-2 text-gray-400 text-sm">
                                <CheckCircle className="w-4 h-4 text-green-400" />
                                <span>{userCampaigns.length} Joined</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {userCampaigns.map((campaign) => {
                                const Icon = iconMap[campaign.category];
                                const colors = getColorClasses(campaign.category);
                                return (
                                    <div key={campaign.id} className="group relative">
                                        <div className={`absolute inset-0 ${colors.bg} rounded-2xl blur-lg group-hover:blur-xl transition-all`}></div>
                                        <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700 transition-all hover:border-gray-600">
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
                                            <div className="flex items-start space-x-4 mb-4">
                                                <div className={`w-12 h-12 bg-gradient-to-br ${colors.gradient} rounded-xl flex items-center justify-center transform group-hover:rotate-12 transition-transform`}>
                                                    <Icon className="w-6 h-6 text-black" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-white font-bold text-lg mb-1">{campaign.title}</h3>
                                                    <p className="text-gray-400 text-sm">{campaign.description}</p>
                                                </div>
                                            </div>
                                            <div className="mb-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-gray-400 text-sm">Tasks Progress</span>
                                                    <span className="text-white text-sm font-semibold">{campaign.userCompleted}/{campaign.tasks}</span>
                                                </div>
                                                <div className="w-full bg-gray-700 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full transition-all duration-1000 bg-gradient-to-r ${colors.button}`}
                                                        style={{ width: `${Math.min(100, Math.max(0, campaign.userJoined ? campaign.progress : campaign.globalProgress))}%` }}
                                                    ></div>
                                                </div>
                                            </div>
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
                                            <button
                                                onClick={() => {
                                                    if (campaign.userJoined) {
                                                        setSelectedCampaign(campaign);
                                                        fetchCampaignDetails(campaign.id);
                                                        setModalIsOpen(true);
                                                    } else {
                                                        handleJoinCampaign(campaign.id);
                                                    }
                                                }}
                                                className={`w-full bg-gradient-to-r ${colors.button} text-black font-bold py-3 rounded-xl transition-all transform hover:scale-105 flex items-center justify-center space-x-2`}
                                                disabled={loading}
                                            >
                                                {campaign.userJoined ? (
                                                    <>
                                                        <ArrowRight className="w-4 h-4" />
                                                        <span>{loading ? 'Loading...' : 'CONTINUE'}</span>
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
                )}
                {campaigns.find((c) => c.featured) && (
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
                                    <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 border border-gray-700 overflow-hidden">
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
                                                    onClick={() => {
                                                        if (featured.userJoined) {
                                                            setSelectedCampaign(featured);
                                                            fetchCampaignDetails(featured.id);
                                                            setModalIsOpen(true);
                                                        } else {
                                                            handleJoinCampaign(featured.id);
                                                        }
                                                    }}
                                                    className={`w-full bg-gradient-to-r ${colors.button} text-black font-bold py-4 rounded-2xl text-lg transition-all transform hover:scale-105 flex items-center justify-center space-x-2`}
                                                    disabled={loading}
                                                >
                                                    {featured.userJoined ? (
                                                        <>
                                                            <ArrowRight className="w-5 h-5" />
                                                            <span>{loading ? 'Loading...' : 'CONTINUE'}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ArrowRight className="w-5 h-5" />
                                                            <span>{loading ? 'Starting...' : 'START'}</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                            <div className="relative">
                                                <div className="bg-gray-800/30 rounded-2xl p-6 backdrop-blur-sm">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <span className="text-gray-400">Progress</span>
                                                        <span className="text-white font-bold">{Math.round(Math.min(100, Math.max(0, featured.progress)))}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-700 rounded-full h-3 mb-4">
                                                        <div
                                                            className={`bg-gradient-to-r ${colors.button} h-3 rounded-full transition-all duration-1000`}
                                                            style={{ width: `${Math.min(100, Math.max(0, featured.progress))}%` }}
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
                <div className="space-y-8">
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
                                            <div className="flex items-start space-x-4 mb-4">
                                                <div className={`w-12 h-12 bg-gradient-to-br ${colors.gradient} rounded-xl flex items-center justify-center transform group-hover:rotate-12 transition-transform`}>
                                                    <Icon className="w-6 h-6 text-black" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-white font-bold text-lg mb-1">{campaign.title}</h3>
                                                    <p className="text-gray-400 text-sm">{campaign.description}</p>
                                                </div>
                                            </div>
                                            <div className="mb-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-gray-400 text-sm">Tasks Progress</span>
                                                    <span className="text-white text-sm font-semibold">{campaign.userCompleted}/{campaign.tasks}</span>
                                                </div>
                                                <div className="w-full bg-gray-700 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full transition-all duration-1000 bg-gradient-to-r ${colors.button}`}
                                                        style={{ width: `${Math.min(100, Math.max(0, campaign.userJoined ? campaign.progress : campaign.globalProgress))}%` }}
                                                    ></div>
                                                </div>
                                            </div>
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
                                            <button
                                                onClick={() => {
                                                    if (campaign.userJoined) {
                                                        setSelectedCampaign(campaign);
                                                        fetchCampaignDetails(campaign.id);
                                                        setModalIsOpen(true);
                                                    } else {
                                                        handleJoinCampaign(campaign.id);
                                                    }
                                                }}
                                                className={`w-full bg-gradient-to-r ${colors.button} text-black font-bold py-3 rounded-xl transition-all transform hover:scale-105 flex items-center justify-center space-x-2`}
                                                disabled={loading}
                                            >
                                                {campaign.userJoined ? (
                                                    <>
                                                        <ArrowRight className="w-4 h-4" />
                                                        <span>{loading ? 'Loading...' : 'CONTINUE'}</span>
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
                                        {dailyTasks.map((task, index) => {
                                            const colors = getColorClasses(selectedCampaign.category);
                                            return (
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
                                                                {(task.type === 'video-watch' || task.type === 'article-read') && task.contentUrl && (
                                                                    <button
                                                                        onClick={() => window.open(task.contentUrl, '_blank')}
                                                                        className="text-blue-400 text-sm flex items-center hover:underline mt-2"
                                                                    >
                                                                        {task.type === 'video-watch' ? (
                                                                            <><Play className="w-3 h-3 mr-1" /> Watch Video</>
                                                                        ) : (
                                                                            <><BookOpen className="w-3 h-3 mr-1" /> Read Article</>
                                                                        )}
                                                                    </button>
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
                                                            {(task.type === 'proof-upload') && (
                                                                <div className="mt-3">
                                                                    <div className="text-xs text-gray-500 mb-1">
                                                                        Upload proof:
                                                                    </div>
                                                                    <input
                                                                        type="file"
                                                                        id={`file-${task.id}`}
                                                                        className="hidden"
                                                                        accept="image/*,video/*"
                                                                        onChange={(e) => {
                                                                            if (e.target.files[0]) {
                                                                                handleProofUpload(selectedCampaign.id, task.id, e.target.files[0]);
                                                                            }
                                                                        }}
                                                                    />
                                                                    <label
                                                                        htmlFor={`file-${task.id}`}
                                                                        className="flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-all bg-blue-400/20 text-blue-400 border border-blue-400/30 hover:bg-blue-400/30 text-sm"
                                                                    >
                                                                        <Upload className="w-4 h-4" />
                                                                        <span>{uploading ? 'Uploading...' : 'Upload proof'}</span>
                                                                    </label>
                                                                </div>
                                                            )}
                                                            {(task.type === 'video-watch' || task.type === 'article-read' || task.type === 'social-post' || task.type === 'social-follow') && (
                                                                <button
                                                                    onClick={() => handleCompleteTask(selectedCampaign.id, task.id)}
                                                                    className={`px-4 py-2 bg-gradient-to-r ${colors.button} text-black font-medium rounded-lg text-sm hover:scale-105 transition-transform`}
                                                                    disabled={loading}
                                                                >
                                                                    {loading ? 'Completing...' : 'Complete Task'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-gray-400 text-center py-8">
                                        {currentDay > parseInt(selectedCampaign.duration) ? (
                                            "Campaign completed! Thanks for participating."
                                        ) : (
                                            `No tasks available for day ${currentDay}. Check console for task data or verify campaign configuration.`
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-gray-400 text-center">Loading campaign details...</div>
                    )}
                </Modal>
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
                                    className={`flex flex-col items-center space-y-1 py-2 px-3 rounded-lg transition-all ${activeTab === item.id ? 'text-green-400 bg-green-400/10' : 'text-gray-400 hover:text-gray-300'}`}
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
                `}</style>
            </div>
        </div>
    );
}
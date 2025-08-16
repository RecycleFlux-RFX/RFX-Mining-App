import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Modal from 'react-modal';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  Home, MapPin, Gamepad2, Wallet, Settings,
  Recycle, Leaf, Target, Clock, Trophy, Star, Award, Globe,
  ArrowRight, CheckCircle, Play, Droplets, TreePine, Wind, Upload,
  BookOpen, Link as LinkIcon, Users, RefreshCw
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

Modal.setAppElement('#root');

const BASE_URL = 'http://localhost:3000';

const CAMPAIGN_CATEGORIES = {
  Ocean: Droplets,
  Forest: TreePine,
  Air: Wind,
  Community: Recycle,
  //Default
  default: Recycle
};


const Icon = CAMPAIGN_CATEGORIES[campaign.category] || CAMPAIGN_CATEGORIES.default;
const IconComponent = CAMPAIGN_CATEGORIES[campaign.category] || Droplets;


const PLATFORM_ICONS = {
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

const PlatformIconComponent = PLATFORM_ICONS[task.platform?.toLowerCase()] || LinkIcon;

const COLOR_SCHEMES = {
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

const NAV_ITEMS = [
  { icon: Home, label: 'Home', id: 'home', path: '/dashboard' },
  { icon: MapPin, label: 'Campaign', id: 'campaign', path: '/campaign' },
  { icon: Gamepad2, label: 'Games', id: 'games', path: '/games' },
  { icon: Wallet, label: 'Wallet', id: 'wallet', path: '/wallet' },
  { icon: Settings, label: 'Settings', id: 'settings', path: '/settings' },
];

const BOTTOM_NAV_ITEMS = [
  { id: 'home', icon: Home, label: 'Home', path: '/dashboard' },
  { id: 'campaign', icon: MapPin, label: 'Campaigns', path: '/campaign' },
  { id: 'games', icon: Gamepad2, label: 'Games', path: '/games' },
  { id: 'wallet', icon: Wallet, label: 'Wallet', path: '/wallet' },
  { id: 'settings', icon: Settings, label: 'Notifications', path: '/settings' },
];


class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div className="text-red-500 p-4">Something went wrong. Please check the console for errors.</div>;
    }

    return this.props.children;
  }
}

export default function RFXCampaignPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('campaign');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [userCampaigns, setUserCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [dailyTasks, setDailyTasks] = useState([]);
  const [userStats, setUserStats] = useState({ 
    earnings: 0, 
    co2Saved: '0.00', 
    fullName: '' 
  });
  const [userRank, setUserRank] = useState(null);
  const [networkStats, setNetworkStats] = useState({ 
    totalRecycled: '0.00', 
    activeUsers: 0 
  });
  const [globalImpact, setGlobalImpact] = useState('0.00');
  const [yourContribution, setYourContribution] = useState('0.00');
  const [uploadingTaskId, setUploadingTaskId] = useState(null);
  const [showUploadSuccess, setShowUploadSuccess] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ActiveCampaigns, setActiveCampaigns] = useState([]);
  const [CompletedCampaigns, setCompletedCampaigns] = useState([]);
  const [timeLeft, setTimeLeft] = useState({ 
    hours: 23, 
    minutes: 45, 
    seconds: 12 
  });
  const [currentDay, setCurrentDay] = useState(1);
  const [dayTimeLeft, setDayTimeLeft] = useState({ 
    hours: 23, 
    minutes: 59, 
    seconds: 59 
  });
    
  const [completingTask, setCompletingTask] = useState(null);

  const getColorClasses = (category) => {
    return COLOR_SCHEMES[category] || COLOR_SCHEMES.Ocean;
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

  const detectUrls = (text) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
};

  const areAllTasksCompleted = (tasks, currentDay) => {
    const todayTasks = tasks.filter(task => task.day === currentDay);
    if (todayTasks.length === 0) return false;
    return todayTasks.every(task => 
      task.status === 'completed' || task.status === 'pending'
    );
  };

  const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/dashboard');
      throw new Error('No authentication token found');
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
        credentials: 'include'
      });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.code = errorData.code; // Add this line to capture error codes
    throw error;
  }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      if (error.status === 401) {
        localStorage.removeItem('authToken');
        navigate('/dashboard');
      }
      throw error;
    }
  };

const calculateDayProgress = (campaign) => {
  if (!campaign?.startDate || !campaign?.duration) {
    return { currentDay: 1, timeLeft: { hours: 23, minutes: 59, seconds: 59 } };
  }

  try {
    const startDate = new Date(campaign.startDate);
    const now = new Date();
    
    // Ensure startDate is valid
    if (isNaN(startDate.getTime())) {
      return { currentDay: 1, timeLeft: { hours: 23, minutes: 59, seconds: 59 } };
    }

    // Calculate elapsed time in milliseconds
    const elapsedMs = now - startDate;
    
    // Calculate elapsed days (1-based)
    const elapsedDays = Math.max(1, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)) + 1);
    
    // Ensure we don't exceed campaign duration
    const currentDay = Math.min(elapsedDays, parseInt(campaign.duration) || 1);
    
    // Calculate time until next day
    const nextDayStart = new Date(startDate);
    nextDayStart.setDate(startDate.getDate() + currentDay);
    const timeUntilNextDay = nextDayStart - now;

    // Ensure time values are valid numbers
    return {
      currentDay,
      timeLeft: {
        hours: Math.max(0, Math.floor((timeUntilNextDay % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))),
        minutes: Math.max(0, Math.floor((timeUntilNextDay % (1000 * 60 * 60)) / (1000 * 60))),
        seconds: Math.max(0, Math.floor((timeUntilNextDay % (1000 * 60)) / 1000))
      }
    };
  } catch (error) {
    console.error('Error calculating day progress:', error);
    return { currentDay: 1, timeLeft: { hours: 23, minutes: 59, seconds: 59 } };
  }
};


  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [userResponse, rankResponse, networkResponse, campaignsResponse] = await Promise.all([
        fetchWithAuth(`${BASE_URL}/user/user`),
        fetchWithAuth(`${BASE_URL}/wallet/rank`),
        fetchWithAuth(`${BASE_URL}/user/network-stats`),
        fetchWithAuth(`${BASE_URL}/campaigns`)
      ]);

      const userCampaignsResponse = await fetchWithAuth(`${BASE_URL}/user/campaigns`);
      const userCampaignsData = Array.isArray(userCampaignsResponse) ? userCampaignsResponse : [];

      const campaignsData = campaignsResponse.data || campaignsResponse;
      const now = new Date();

      const mappedCampaigns = campaignsData.map((c) => {
        const userCampaign = userCampaignsData.find(uc => 
          uc._id?.toString() === c._id?.toString() || 
          uc.id?.toString() === c._id?.toString()
        ) || null;

        const userProgress = userCampaign && c.tasksList?.length > 0 
          ? (userCampaign.userCompleted / c.tasksList.length) * 100 
          : 0;

        return {
          ...c,
          id: c._id?.toString() || c.id,
          tasks: c.tasksList?.length || 0,
          completed: c.completedTasks || 0,
          participants: c.participants || 0,
          progress: userProgress,
          reward: c.reward ? `${c.reward} RFX` : '0 RFX',
          duration: c.duration ? `${c.duration} days` : 'N/A',
          userJoined: !!userCampaign,
          userCompleted: userCampaign?.userCompleted || 0,
          startDate: c.startDate ? new Date(c.startDate).toISOString() : new Date().toISOString(),
          endDate: c.endDate ? new Date(c.endDate).toISOString() : null,
          status: c.endDate && new Date(c.endDate) <= now ? 'completed' : 'active'
        };
      });

      const activeCampaigns = mappedCampaigns.filter(c => 
        c.status === 'active' || (c.endDate && new Date(c.endDate) > now)
      );
      const completedCampaigns = mappedCampaigns.filter(c => 
        c.status === 'completed' || (c.endDate && new Date(c.endDate) <= now)
      );

      setCampaigns(mappedCampaigns);
      setUserCampaigns(activeCampaigns.filter(c => c.userJoined));
      setActiveCampaigns(activeCampaigns);
      setCompletedCampaigns(completedCampaigns);
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
      setGlobalImpact(networkResponse.totalRecycled || '0.00');
      setYourContribution(userResponse.co2Saved || '0.00');
    } catch (error) {
      console.error('Fetch data error:', error);
      setError({
        type: 'error',
        message: error.message || 'Failed to fetch data',
      });
    } finally {
      setLoading(false);
    }
  };

const fetchCampaignDetails = async (campaignId) => {
  try {
    const response = await fetchWithAuth(`${BASE_URL}/campaigns/${campaignId}/user`);

    // When mapping tasks, add the index to each task
    const mappedTasks = (response.tasksList || []).map((task, index) => {
      const userTask = response.participantsList
        ?.find(p => p.userId?.toString() === localStorage.getItem('userId'))
        ?.tasks?.find(t => t.taskId?.toString() === task._id?.toString()) || {};
      
      return {
        ...task,
        id: task._id || `temp-${Math.random()}`,
        status: userTask.status || 'open',
        reward: task.reward ? `${task.reward} RFX` : '0 RFX',
        completed: userTask.status === 'completed',
        proof: userTask.proof || null,
        day: task.day || 1,
        taskNumber: index + 1
      };
    });

    const { currentDay, timeLeft } = calculateDayProgress(response);
    
    // Calculate progress
    const userCampaign = response.participantsList?.find(p => 
      p.userId?.toString() === localStorage.getItem('userId')
    );
    const progress = response.tasksList?.length > 0 
      ? ((userCampaign?.completed || 0) / response.tasksList.length) * 100 
      : 0;

    setTasks(mappedTasks);
    setSelectedCampaign({
      ...response,
      id: response._id,
      tasks: mappedTasks.length,
      reward: response.reward ? `${response.reward} RFX` : '0 RFX',
      duration: response.duration ? `${response.duration} days` : '1 day',
      startDate: response.startDate ? new Date(response.startDate).toISOString() : new Date().toISOString(),
      currentDay,
      dayTimeLeft: timeLeft,
      progress: Math.min(100, Math.max(0, progress))
    });
    setCurrentDay(currentDay);
    setDayTimeLeft(timeLeft);
  } catch (error) {
    console.error('Fetch campaign error:', error);
    setError({
      type: 'error',
      message: error.message || 'Failed to load campaign details',
    });
  }
};

const handleCompleteTask = async (campaignId, taskId) => {
    setCompletingTask(taskId);
    
    try {
        // Optimistic update
        setTasks(prev => prev.map(t => 
            t.id === taskId ? { ...t, status: 'completing' } : t
        ));
        
        setDailyTasks(prev => prev.map(t => 
            t.id === taskId ? { ...t, status: 'completing' } : t
        ));

        const response = await fetchWithAuth(
            `${BASE_URL}/campaigns/${campaignId}/tasks/${taskId}/complete`, 
            { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json' // Explicitly ask for JSON
                }
            }
        );

        // Check if response exists
        if (!response) {
            throw new Error('Server did not respond');
        }

        // Get response text first for debugging
        const responseText = await response.text();
        let responseData;
        
        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
            console.error('Failed to parse JSON:', e, 'Response text:', responseText);
            throw new Error('Server returned invalid data');
        }

        // Check for error response
        if (!response.ok || responseData.error) {
            throw new Error(responseData.message || 'Task completion failed');
        }

        // Only update state if we got valid data
        if (responseData.success) {
            setTasks(prev => prev.map(t => 
                t.id === taskId ? { 
                    ...t, 
                    status: 'completed',
                    completed: true,
                    reward: responseData.task?.reward || t.reward
                } : t
            ));

            setDailyTasks(prev => prev.map(t => 
                t.id === taskId ? { 
                    ...t, 
                    status: 'completed',
                    completed: true
                } : t
            ));

            setUserStats(prev => ({
                ...prev,
                earnings: responseData.userStats?.earnings || prev.earnings,
                co2Saved: responseData.userStats?.co2Saved || prev.co2Saved
            }));

            setSelectedCampaign(prev => ({
                ...prev,
                tasks: prev.tasks.map(t => 
                    t.id === taskId ? { 
                        ...t, 
                        status: 'completed',
                        completed: true
                    } : t
                ),
                userCompleted: responseData.campaignProgress?.completed || prev.userCompleted
            }));

            Swal.fire({
                title: 'Task Completed!',
                text: `You earned ${(responseData.task?.reward || 0).toFixed(5)} RFX`,
                icon: 'success',
                background: '#1a202c',
                color: '#ffffff',
                confirmButtonColor: '#38a169'
            });
        }

    } catch (error) {
        console.error('Complete task error:', error);
        
        // Check if this is a "already completed" error
        if (error.message.includes('already completed')) {
            // Update state to reflect completion
            setTasks(prev => prev.map(t => 
                t.id === taskId ? { 
                    ...t, 
                    status: 'completed',
                    completed: true
                } : t
            ));
            
            setDailyTasks(prev => prev.map(t => 
                t.id === taskId ? { 
                    ...t, 
                    status: 'completed',
                    completed: true
                } : t
            ));

            Swal.fire({
                title: 'Already Completed',
                text: 'This task was already completed',
                icon: 'info',
                background: '#1a202c',
                color: '#ffffff',
                confirmButtonColor: '#38a169'
            });
        } else {
            // For other errors, reset to open status
            setTasks(prev => prev.map(t => 
                t.id === taskId ? { ...t, status: 'open' } : t
            ));
            
            setDailyTasks(prev => prev.map(t => 
                t.id === taskId ? { ...t, status: 'open' } : t
            ));

            Swal.fire({
                title: 'Error',
                text: error.message || 'Failed to complete task',
                icon: 'error',
                background: '#1a202c',
                color: '#ffffff',
                confirmButtonColor: '#38a169'
            });
        }
    } finally {
        setCompletingTask(null);
    }
};

const repairCampaignParticipation = async (campaignId) => {
  try {
    const response = await fetchWithAuth(
      `${BASE_URL}/campaigns/${campaignId}/repair-participation`,
      { method: 'POST' }
    );
    
    if (response.success) {
      await fetchInitialData(); // Refresh all data
      await fetchCampaignDetails(campaignId); // Refresh campaign details
      return true;
    }
    return false;
  } catch (error) {
    console.error('Repair failed:', error);
    return false;
  }
}


  
const handleProofUpload = async (campaignId, taskId, file) => {
  setUploadingTaskId(taskId);
  try {
    const formData = new FormData();
    formData.append('proof', file);
    
    const response = await axios.post(
      `${BASE_URL}/campaigns/${campaignId}/tasks/${taskId}/proof`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    // Update UI state
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { 
        ...t, 
        status: 'pending',
        proof: response.data.proofUrl
      } : t
    ));

    setShowUploadSuccess(true);
    setTimeout(() => setShowUploadSuccess(false), 3000);

  } catch (error) {
    console.error('Upload failed:', error);
    
    let errorMessage = 'Proof upload failed';
    if (error.response) {
      switch(error.response.data?.code) {
        case 'USER_NOT_IN_CAMPAIGN':
          errorMessage = 'Please join the campaign first';
          break;
        case 'PARTICIPATION_MISMATCH':
          // Attempt repair automatically
          const repaired = await repairCampaignParticipation(campaignId);
          if (repaired) {
            return handleProofUpload(campaignId, taskId, file); // Retry
          }
          errorMessage = 'Could not verify your participation';
          break;
        default:
          errorMessage = error.response.data?.message || errorMessage;
      }
    }

    Swal.fire({
      title: 'Upload Failed',
      text: errorMessage,
      icon: 'error'
    });
  } finally {
    setUploadingTaskId(null);
  }
};

  const handleJoinCampaign = async (campaignId) => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(
        `${BASE_URL}/campaigns/${campaignId}/join`, 
        { method: 'POST' }
      );

      const campaign = campaigns.find((c) => c.id === campaignId);
      if (!campaign) throw new Error('Campaign not found');

      setCampaigns(prev => prev.map((c) =>
        c.id === campaignId ? {
          ...c,
          participants: (c.participants || 0) + 1,
          userJoined: true,
          userCompleted: 0
        } : c
      ));
      
      setUserCampaigns(prev => [...prev, { ...campaign, userJoined: true, userCompleted: 0 }]);

      await fetchCampaignDetails(campaignId);
      setSelectedCampaign(campaign);
      setModalIsOpen(true);

      setError({
        type: 'success',
        message: 'Successfully joined campaign!',
      });
    } catch (error) {
      console.error('Join campaign error:', error);
      setError({
        type: 'error',
        message: error.message || 'Failed to join campaign',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCampaign && tasks.length > 0) {
      setDailyTasks(tasks.filter(task => 
        task.day === currentDay || (isNaN(currentDay) && task.day === 1)
      ));
    } else {
      setDailyTasks([]);
    }
  }, [tasks, currentDay, selectedCampaign]);

  useEffect(() => {
    if (!selectedCampaign) return;

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
  }, [selectedCampaign]);

  useEffect(() => {
    const currentNavItem = NAV_ITEMS.find((item) => item.path === location.pathname);
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
        await Promise.all([fetchInitialData()]);
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

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 0, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center text-lg">Loading...</div>
      </div>
    );
  }

  if (error && ![
    'Successfully joined campaign!',
    'Proof uploaded successfully, pending verification',
    'Task completed',
    'Wallet connected successfully!',
    'Failed to connect wallet'
  ].some(msg => error.message.includes(msg))) {
    return (
      <div className="w-full min-h-screen bg-gray-900 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className={`text-white text-lg ${getErrorColor()} mb-4`}>
            {error.message}
          </div>
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
        {/* Header */}
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

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Active Campaigns', value: ActiveCampaigns.length, icon: Target, color: 'green' },
            { label: 'Total Earned', value: `${userStats.earnings.toFixed(5)} RFX`, icon: Award, color: 'yellow' },
            { label: 'Global Impact', value: `${globalImpact} kg`, icon: Globe, color: 'blue' },
            { label: 'Your Contribution', value: `${yourContribution} kg`, icon: Leaf, color: 'purple' },
          ].map((stat, index) => (
            <div key={index} className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <stat.icon className={`w-5 h-5 ${
                  stat.color === 'green' ? 'text-green-400' :
                  stat.color === 'yellow' ? 'text-yellow-400' :
                  stat.color === 'blue' ? 'text-blue-500' : 'text-purple-400'
                }`} />
                <span className="text-gray-500 text-sm font-medium">{stat.label}</span>
              </div>
              <span className="text-lg font-semibold text-white">{stat.value}</span>
            </div>
          ))}
        </div>

        {/* User campaigns section */}
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
                const Icon = CAMPAIGN_CATEGORIES[campaign.category];
                const colors = getColorClasses(campaign.category);
                
                return (
                  <div key={campaign.id} className="group relative">
                    <div className={`absolute inset-0 ${colors.bg} rounded-2xl blur-lg group-hover:blur-xl transition-all`}></div>
                    <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700 transition-all hover:border-gray-600">
                      {/* Campaign badges */}
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
                        <div className={`px-2 py-1 rounded text-xs font-semibold ${
                          campaign.difficulty === 'Easy' ? 'bg-green-400/20 text-green-400' :
                          campaign.difficulty === 'Medium' ? 'bg-yellow-400/20 text-yellow-400' :
                          'bg-red-400/20 text-red-400'
                        }`}>
                          {campaign.difficulty}
                        </div>
                      </div>

                      {/* Campaign info */}
                      <div className="flex items-start space-x-4 mb-4">
                        <div className={`w-12 h-12 bg-gradient-to-br ${colors.gradient} rounded-xl flex items-center justify-center transform group-hover:rotate-12 transition-transform`}>
                          <Icon className="w-6 h-6 text-black" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-white font-bold text-lg mb-1">{campaign.title}</h3>
                          <p className="text-gray-400 text-sm">{campaign.description}</p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-sm">Tasks Progress</span>
                          <span className="text-white text-sm font-semibold">{campaign.userCompleted}/{campaign.tasks}</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-1000 bg-gradient-to-r ${colors.button}`}
                            style={{ width: `${Math.min(100, Math.max(0, campaign.progress))}%` }}
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

                      {/* Action button */}
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

        {/* Featured campaign */}
        {campaigns.find((c) => c.featured) && (
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <Star className="w-5 h-5 text-yellow-400" />
              <h2 className="text-xl font-bold text-white">Featured Campaign</h2>
            </div>
            
            {(() => {
              const featured = campaigns.find(c => c.featured);
              const Icon = CAMPAIGN_CATEGORIES[featured.category];
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

        {/* All campaigns sections */}
        <div className="space-y-8">
          {/* Active campaigns */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Active Campaigns</h2>
              <div className="flex items-center space-x-2 text-gray-400 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>{ActiveCampaigns.length} Active</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ActiveCampaigns.map((campaign) => {
                const Icon = CAMPAIGN_CATEGORIES[campaign.category];
                const colors = getColorClasses(campaign.category);
                
                return (
                  <div key={campaign.id} className="group relative">
                    <div className={`absolute inset-0 ${colors.bg} rounded-2xl blur-lg group-hover:blur-xl transition-all`}></div>
                    <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700 transition-all hover:border-gray-600">
                      {/* Campaign badges */}
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
                        <div className={`px-2 py-1 rounded text-xs font-semibold ${
                          campaign.difficulty === 'Easy' ? 'bg-green-400/20 text-green-400' :
                          campaign.difficulty === 'Medium' ? 'bg-yellow-400/20 text-yellow-400' :
                          'bg-red-400/20 text-red-400'
                        }`}>
                          {campaign.difficulty}
                        </div>
                      </div>

                      {/* Campaign info */}
                      <div className="flex items-start space-x-4 mb-4">
                        <div className={`w-12 h-12 bg-gradient-to-br ${colors.gradient} rounded-xl flex items-center justify-center transform group-hover:rotate-12 transition-transform`}>
                          <Icon className="w-6 h-6 text-black" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-white font-bold text-lg mb-1">{campaign.title}</h3>
                          <p className="text-gray-400 text-sm">{campaign.description}</p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-sm">Tasks Progress</span>
                          <span className="text-white text-sm font-semibold">{campaign.userCompleted}/{campaign.tasks}</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-1000 bg-gradient-to-r ${colors.button}`}
                            style={{ width: `${Math.min(100, Math.max(0, campaign.progress))}%` }}
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

                      {/* Action button */}
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

          {/* Completed campaigns */}
          {CompletedCampaigns.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Completed Campaigns</h2>
                <div className="flex items-center space-x-2 text-gray-400 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>{CompletedCampaigns.length} Completed</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {CompletedCampaigns.map((campaign) => {
                  const Icon = CAMPAIGN_CATEGORIES[campaign.category];
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

        {/* Campaign Modal */}
<Modal
    isOpen={modalIsOpen}
    onRequestClose={() => setModalIsOpen(false)}
    className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 max-w-4xl mx-auto mt-16 border border-gray-700 shadow-2xl"
    overlayClassName="fixed inset-0 bg-black bg-opacity-75 flex items-start justify-center p-4 z-50 overflow-y-auto"
>
    {showUploadSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50 animate-slideIn">
            <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>Proof uploaded successfully!</span>
            </div>
        </div>
    )}

    {selectedCampaign ? (
        <div>
            {/* Modal header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                    <button 
                        onClick={() => fetchCampaignDetails(selectedCampaign.id)}
                        className="flex items-center text-gray-400 hover:text-white transition-colors"
                    >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        <span className="text-sm">Refresh</span>
                    </button>
                    {(() => {
                        const Icon = CAMPAIGN_CATEGORIES[selectedCampaign.category];
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

            {/* Campaign stats */}
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

            {/* Daily tasks section */}
            <div>
                <h3 className="text-xl font-bold text-white mb-4">Daily Tasks</h3>
                
                {areAllTasksCompleted(dailyTasks, currentDay) ? (
                    <div className="text-center py-8">
                        <div className="inline-block p-4 bg-green-400/20 rounded-full mb-4">
                            <CheckCircle className="w-12 h-12 text-green-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">All Tasks Completed!</h3>
                        <p className="text-gray-400 mb-6">
                            You've completed all tasks for today. Come back tomorrow for new tasks!
                        </p>
                        <div className="text-sm text-gray-500">
                            Next tasks unlock in: {String(dayTimeLeft.hours).padStart(2, '0')}:
                            {String(dayTimeLeft.minutes).padStart(2, '0')}:
                            {String(dayTimeLeft.seconds).padStart(2, '0')}
                        </div>
                    </div>
                ) : dailyTasks.length > 0 ? (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
<div className="bg-gray-800 p-3 rounded-xl mb-4 text-center">
  <div className="text-sm text-gray-400 mb-1">
    {!isNaN(currentDay) && !isNaN(selectedCampaign?.duration) ? (
      `Day ${currentDay} of ${selectedCampaign.duration}`
    ) : (
      "Day 1 of 7"
    )}
  </div>
  <div className="text-lg font-bold text-white">
    {!isNaN(dayTimeLeft?.hours) && !isNaN(dayTimeLeft?.minutes) && !isNaN(dayTimeLeft?.seconds) ? (
      `${String(dayTimeLeft.hours).padStart(2, '0')}:${String(dayTimeLeft.minutes).padStart(2, '0')}:${String(dayTimeLeft.seconds).padStart(2, '0')}`
    ) : (
      "23:59:59"
    )}
  </div>
  <div className="text-xs text-gray-400">Time remaining to complete today's tasks</div>
</div>
                        
                        {dailyTasks.map((task) => {
                            const colors = getColorClasses(selectedCampaign.category);
                            const PlatformIcon = task.platform 
                                ? PLATFORM_ICONS[task.platform.toLowerCase()] || PLATFORM_ICONS.default
                                : PLATFORM_ICONS.default;
                            const isUploading = uploadingTaskId === task.id;
                            const isLocked = task.status === 'completed' || task.status === 'pending' || task.status === 'completing';
                            
                            return (
                                <div key={task.id} className="bg-gray-800/50 rounded-xl p-4 relative">
                                    {isLocked && (
                                        <div className="absolute inset-0 bg-black bg-opacity-70 rounded-xl flex items-center justify-center z-10">
                                            <div className="text-center p-4">
                                                {task.status === 'completed' ? (
                                                    <>
                                                        <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                                                        <p className="text-white font-medium">Task Completed</p>
                                                        <p className="text-gray-300 text-sm mt-1">You earned {task.reward}</p>
                                                        {task.proof && (
                                                            <a 
                                                                href={task.proof} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="text-blue-400 text-xs mt-2 inline-block hover:underline"
                                                            >
                                                                View Submitted Proof
                                                            </a>
                                                        )}
                                                    </>
                                                ) : task.status === 'completing' ? (
                                                    <>
                                                        <RefreshCw className="w-8 h-8 text-blue-400 mx-auto mb-2 animate-spin" />
                                                        <p className="text-white font-medium">Completing Task</p>
                                                        <p className="text-gray-300 text-sm mt-1">
                                                            Please wait while we process your completion
                                                        </p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Clock className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                                                        <p className="text-white font-medium">Pending Verification</p>
                                                        <p className="text-gray-300 text-sm mt-1">
                                                            Your proof is being reviewed
                                                        </p>
                                                        {task.proof && (
                                                            <a 
                                                                href={task.proof} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="text-blue-400 text-xs mt-2 inline-block hover:underline"
                                                            >
                                                                View Submitted Proof
                                                            </a>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Task header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-start space-x-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                                task.status === 'completed' ? 'bg-green-400 text-black' :
                                                task.status === 'pending' ? 'bg-yellow-400 text-black' :
                                                task.status === 'completing' ? 'bg-blue-400 text-black' :
                                                'bg-gray-600 text-white'
                                            }`}>
                                                {task.status === 'completed' ? <CheckCircle className="w-4 h-4" /> : 
                                                 task.status === 'completing' ? <RefreshCw className="w-4 h-4 animate-spin" /> : 
                                                 task.taskNumber}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-white font-semibold">{task.title}</h4>
                                                <p className="text-gray-400 text-sm">{task.description}</p>
                                                
                                                {/* Status indicator */}
                                                <div className="flex items-center mt-2">
                                                    <div className={`w-2 h-2 rounded-full mr-2 ${
                                                        task.status === 'completed' ? 'bg-green-400' :
                                                        task.status === 'pending' ? 'bg-yellow-400' :
                                                        task.status === 'completing' ? 'bg-blue-400 animate-pulse' :
                                                        'bg-gray-400'
                                                    }`}></div>
                                                    <span className={`text-xs ${
                                                        task.status === 'completed' ? 'text-green-400' :
                                                        task.status === 'pending' ? 'text-yellow-400' :
                                                        task.status === 'completing' ? 'text-blue-400' :
                                                        'text-gray-400'
                                                    }`}>
                                                        {task.status === 'completed' ? 'Completed' :
                                                         task.status === 'pending' ? 'Pending Review' :
                                                         task.status === 'completing' ? 'Processing...' : 
                                                         'Not Started'}
                                                    </span>
                                                </div>
                                                
                                                {(task.type === 'video-watch' || task.type === 'article-read') && task.contentUrl && (
                                                    <button
                                                        onClick={() => window.open(task.contentUrl, '_blank')}
                                                        className="text-blue-400 text-sm flex items-center hover:underline mt-2"
                                                        disabled={isLocked}
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
      {task.requirements.map((req, i) => {
        const urls = detectUrls(req);
        let remainingText = req;
        let elements = [];
        
        if (urls.length > 0) {
          urls.forEach((url, urlIndex) => {
            const parts = remainingText.split(url);
            if (parts[0]) {
              elements.push(<span key={`text-${i}-${urlIndex}`}>{parts[0]}</span>);
            }
            elements.push(
              <a 
                key={`link-${i}-${urlIndex}`}
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline inline-flex items-center"
              >
                {url.includes('twitter.com') ? 'Twitter' : 
                 url.includes('facebook.com') ? 'Facebook' : 
                 url.includes('instagram.com') ? 'Instagram' : 
                 url.includes('youtube.com') ? 'YouTube' : 
                 url.includes('discord.gg') ? 'Discord' : 
                 url.includes('tiktok.com') ? 'TikTok' : 
                 url.includes('linkedin.com') ? 'LinkedIn' : 
                 url.includes('reddit.com') ? 'Reddit' : 
                 'Visit Link'}
                <LinkIcon className="w-3 h-3 ml-1" />
              </a>
            );
            remainingText = parts[1] || '';
          });
          if (remainingText) {
            elements.push(<span key={`text-end-${i}`}>{remainingText}</span>);
          }
        } else {
          elements = [<span key={`text-only-${i}`}>{req}</span>];
        }

        return (
          <li key={i} className="flex items-start space-x-2">
            <div className="w-1 h-1 bg-gray-400 rounded-full mt-1.5"></div>
            <div className="flex flex-wrap gap-1">
              {elements}
            </div>
          </li>
        );
      })}
    </ul>
  </div>
)}
                                            </div>
                                        </div>
                                        <div className="text-green-400 font-bold">{task.reward}</div>
                                    </div>
                                    
                                    {!isLocked && (
                                        <div className="flex items-center space-x-3">
                                            {(task.type === 'social-follow' || task.type === 'discord-join') && task.contentUrl && (
                                                <a
                                                    href={task.contentUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-4 py-2 bg-blue-400/20 text-blue-400 border border-blue-400/30 rounded-lg text-sm font-medium hover:bg-blue-400/30 flex items-center space-x-2"
                                                >
                                                    <PlatformIcon className="w-4 h-4" />
                                                    <span>{task.type === 'discord-join' ? 'Join Discord' : `Follow on ${task.platform}`}</span>
                                                </a>
                                            )}
                                            
{task.type === 'proof-upload' && (
    <div className="mt-3">
        <div className="text-xs text-gray-500 mb-1">
            {task.status === 'pending' ? 'Proof submitted' : 'Upload proof'}
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
            disabled={task.status === 'pending' || task.status === 'completed'}
        />
        <label
            htmlFor={`file-${task.id}`}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
                uploadingTaskId === task.id
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : task.status === 'pending' || task.status === 'completed'
                        ? 'bg-green-400/20 text-green-400 border border-green-400/30 cursor-not-allowed'
                        : 'bg-blue-400/20 text-blue-400 border border-blue-400/30 hover:bg-blue-400/30 cursor-pointer'
            } text-sm`}
        >
            <Upload className="w-4 h-4" />
            <span>
                {uploadingTaskId === task.id
                    ? 'Uploading...'
                    : task.status === 'pending'
                        ? 'Proof Submitted'
                        : task.status === 'completed'
                            ? 'Completed'
                            : 'Upload Proof'
                }
            </span>
        </label>
        {task.status === 'pending' && task.proof && (
            <div className="mt-2">
                <a 
                    href={task.proof} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 text-xs hover:underline"
                >
                    View Submitted Proof
                </a>
            </div>
        )}
    </div>
)}
                                            
                                            {(task.type === 'video-watch' || task.type === 'article-read' || 
                                              task.type === 'social-post' || task.type === 'social-follow') && (
                                                <button
                                                    onClick={() => handleCompleteTask(selectedCampaign.id, task.id)}
                                                    disabled={completingTask === task.id}
                                                    className={`px-4 py-2 bg-gradient-to-r ${colors.button} text-black font-medium rounded-lg text-sm hover:scale-105 transition-transform ${
                                                        isLocked ? 'opacity-50 cursor-not-allowed' : ''
                                                    }`}
                                                >
                                                    {completingTask === task.id ? (
                                                        <span className="flex items-center">
                                                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                                            Completing...
                                                        </span>
                                                    ) : task.status === 'pending' ? (
                                                        'Pending Review'
                                                    ) : task.status === 'completed' ? (
                                                        'Completed'
                                                    ) : (
                                                        'Complete Task'
                                                    )}
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
                            `No tasks available for day ${currentDay}. Check back tomorrow.`
                        )}
                    </div>
                )}
            </div>
        </div>
    ) : (
        <div className="text-gray-400 text-center">Loading campaign details...</div>
    )}
</Modal>

        {/* Bottom navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm border-t border-gray-800 px-4 py-2 z-50">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-around">
              {BOTTOM_NAV_ITEMS.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex flex-col items-center space-y-1 py-2 px-3 rounded-lg transition-all ${
                    activeTab === item.id ? 'text-green-400 bg-green-400/10' : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Animation styles */}
        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          .animate-float {
            animation: float 10s ease-in-out infinite;
          }
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          .animate-slideIn {
            animation: slideIn 0.3s ease-out forwards;
          }
        `}</style>
      </div>
    </div>
  );
}
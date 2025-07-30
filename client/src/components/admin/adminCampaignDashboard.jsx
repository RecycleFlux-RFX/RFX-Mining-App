import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Trash2, Edit, Check, X, Upload,
    BarChart2, Users, List, Settings, Search,
    Filter, Eye, Calendar, Clock, Award,
    TrendingUp, Star, Zap, ChevronDown
} from 'react-feather';
import api from '../../api/api';
import Modal from 'react-modal';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import { format, addDays } from 'date-fns';
import axios from 'axios';

Modal.setAppElement('#root');

const AdminCampaignDashboard = () => {
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState([]);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState(0);
    const [proofs, setProofs] = useState([]);
    const [selectedProofs, setSelectedProofs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');

    // Form states with improved initial values
    const initialFormData = {
        title: '',
        description: '',
        category: 'Ocean',
        reward: 0.005,
        difficulty: 'Easy',
        duration: '7',
        featured: false,
        new: false,
        trending: false,
        ending: false,
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: '',
        status: 'active',
        image: null,
        tasksList: []
    };

    const [formData, setFormData] = useState(initialFormData);
    const [taskForm, setTaskForm] = useState({
        day: '1',
        title: '',
        description: '',
        type: 'social-follow',
        platform: 'Twitter',
        reward: 0.001,
        requirements: '',
        contentUrl: '',
        contentFile: null
    });

    // Reset form data
    const resetFormData = useCallback(() => {
        setFormData(initialFormData);
    }, [initialFormData]);

    // Calculate end date based on duration
    useEffect(() => {
        if (formData.duration && formData.startDate) {
            const endDate = addDays(new Date(formData.startDate), parseInt(formData.duration));
            setFormData(prev => ({
                ...prev,
                endDate: format(endDate, 'yyyy-MM-dd')
            }));
        }
    }, [formData.duration, formData.startDate]);

    // Fetch campaigns on mount
    useEffect(() => {
        const fetchCampaigns = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('No authentication token found. Please log in.');
                }

                const response = await api.get('/admin/campaigns', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                console.log('API Response:', response.data); // Debug the response
                setCampaigns(Array.isArray(response.data) ? response.data : []);
            } catch (error) {
                console.error('Error fetching campaigns:', error);
                setError(error.response?.data?.message || error.message);
                setCampaigns([]); // Fallback to empty array
                alert('Failed to fetch campaigns: ' + (error.response?.data?.message || error.message));
            } finally {
                setLoading(false);
            }
        };

        fetchCampaigns();
    }, []);

    // Fetch campaign details when selected
    useEffect(() => {
        if (selectedCampaign) {
            const fetchCampaignDetails = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const response = await api.get(`/admin/campaigns/${selectedCampaign._id}`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    setSelectedCampaign(response.data);

                    if (activeTab === 3) {
                        const proofsRes = await api.get(`/admin/campaigns/${selectedCampaign._id}/proofs`, {
                            headers: {
                                Authorization: `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        });
                        setProofs(proofsRes.data);
                    }
                } catch (err) {
                    setError(err.response?.data?.message || 'Failed to fetch campaign details');
                }
            };

            fetchCampaignDetails();
        }
    }, [selectedCampaign?._id, activeTab]);

    // Handle form changes
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleTaskChange = (e) => {
        const { name, value, type, files } = e.target;
        setTaskForm(prev => ({
            ...prev,
            [name]: type === 'file' ? files[0] : value
        }));
    };

    // Submit campaign form
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const formPayload = new FormData();

            // Append all form data
            Object.entries(formData).forEach(([key, value]) => {
                if (key !== 'tasksList' && key !== 'image') {
                    formPayload.append(key, value);
                }
            });

            // Handle image upload
            if (formData.image) {
                formPayload.append('image', formData.image);
            } else if (selectedCampaign?.image) {
                // If editing and no new image, keep the existing one
                formPayload.append('image', '');
            }

            // Handle tasks
            if (formData.tasksList.length > 0) {
                formPayload.append('tasks', JSON.stringify(formData.tasksList));
            }

            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            };

            let response;
            if (selectedCampaign) {
                response = await api.put(
                    `/admin/campaigns/${selectedCampaign._id}`,
                    formPayload,
                    config
                );
            } else {
                response = await api.post(
                    '/admin/campaigns',
                    formPayload,
                    config
                );
            }

            // Update state and close modal
            setCampaigns(prev => {
                const existing = prev.find(c => c._id === response.data._id);
                if (existing) {
                    return prev.map(c => c._id === response.data._id ? response.data : c);
                }
                return [response.data, ...prev];
            });

            setIsModalOpen(false);
            resetFormData();
        } catch (err) {
            console.error('Error saving campaign:', err);
            setError(err.response?.data?.message ||
                err.response?.data?.error ||
                'Failed to save campaign');
        } finally {
            setLoading(false);
        }
    };

    // Add task to form
    const handleAddTask = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            let contentUrl = taskForm.contentUrl;

            // Handle file upload if present
            if (taskForm.contentFile) {
                const formData = new FormData();
                formData.append('content', taskForm.contentFile);

                const uploadRes = await api.post(
                    '/upload',
                    formData,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'multipart/form-data'
                        }
                    }
                );
                contentUrl = uploadRes.data.url;
            }

            const newTask = {
                day: parseInt(taskForm.day),
                title: taskForm.title,
                description: taskForm.description,
                type: taskForm.type,
                platform: taskForm.platform,
                reward: parseFloat(taskForm.reward),
                requirements: taskForm.requirements.split(',').map(r => r.trim()),
                contentUrl: contentUrl || null
            };

            setFormData(prev => ({
                ...prev,
                tasksList: [...prev.tasksList, newTask]
            }));

            // Reset task form
            setTaskForm({
                day: '1',
                title: '',
                description: '',
                type: 'social-follow',
                platform: 'Twitter',
                reward: 0.001,
                requirements: '',
                contentUrl: '',
                contentFile: null
            });

            setIsTaskModalOpen(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add task');
        } finally {
            setLoading(false);
        }
    };

    // Delete campaign
    const handleDeleteCampaign = async (id) => {
        if (!window.confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await api.delete(
                `/admin/campaigns/${id}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Update campaigns state
            setCampaigns(prev => prev.filter(c => c._id !== id));

            // Clear selected campaign if it's the one being deleted
            if (selectedCampaign?._id === id) {
                setSelectedCampaign(null);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete campaign');
        }
    };

    // Approve/reject proof
    const handleApproveProof = async (taskId, userId, approve) => {
        try {
            const token = localStorage.getItem('token');
            await api.post(
                `/admin/campaigns/${selectedCampaign._id}/approve-proof`,
                { taskId, userId, approve },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Update proofs state
            setProofs(prev => prev.map(proofGroup => {
                if (proofGroup.taskId === taskId) {
                    return {
                        ...proofGroup,
                        proofs: proofGroup.proofs.map(p => {
                            if (p.userId === userId) {
                                return { ...p, status: approve ? 'completed' : 'rejected' };
                            }
                            return p;
                        })
                    };
                }
                return proofGroup;
            }));

            // Update selected campaign state
            setSelectedCampaign(prev => {
                if (!prev) return prev;
                const updatedTasks = prev.tasksList.map(task => {
                    if (task._id === taskId) {
                        const updatedCompletions = task.completedBy.map(cb => {
                            if (cb.userId === userId) {
                                return { ...cb, status: approve ? 'completed' : 'rejected' };
                            }
                            return cb;
                        }).filter(cb => approve || cb.userId !== userId);
                        return { ...task, completedBy: updatedCompletions };
                    }
                    return task;
                });
                return { ...prev, tasksList: updatedTasks };
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update proof status');
        }
    };

    const handleBulkApprove = async (approve) => {
        if (selectedProofs.length === 0) return;

        try {
            const token = localStorage.getItem('token');
            await Promise.all(selectedProofs.map(async ({ taskId, userId }) => {
                await api.post(
                    `/admin/campaigns/${selectedCampaign._id}/approve-proof`,
                    { taskId, userId, approve },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
            }));

            // Refresh proofs after bulk action
            const proofsRes = await api.get(
                `/admin/campaigns/${selectedCampaign._id}/proofs`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            setProofs(proofsRes.data);
            setSelectedProofs([]);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to bulk update proofs');
        }
    };

    // Select proof for bulk action
    const toggleProofSelection = (taskId, userId) => {
        setSelectedProofs(prev => {
            const existing = prev.find(p => p.taskId === taskId && p.userId === userId);
            if (existing) {
                return prev.filter(p => !(p.taskId === taskId && p.userId === userId));
            }
            return [...prev, { taskId, userId }];
        });
    };

    // Open edit modal with campaign data
    const openEditModal = (campaign) => {
        setFormData({
            title: campaign.title || '',
            description: campaign.description || '',
            category: campaign.category || 'Ocean',
            reward: campaign.reward || 0.005,
            difficulty: campaign.difficulty || 'Easy',
            duration: campaign.duration?.toString() || '7',
            featured: campaign.featured || false,
            new: campaign.new || false,
            trending: campaign.trending || false,
            ending: campaign.ending || false,
            startDate: campaign.startDate ? format(new Date(campaign.startDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
            endDate: campaign.endDate ? format(new Date(campaign.endDate), 'yyyy-MM-dd') : '',
            status: campaign.status || 'active',
            image: null,
            tasksList: campaign.tasksList || []
        });
        setSelectedCampaign(campaign);
        setIsModalOpen(true);
    };

    // Get category config
    const getCategoryConfig = (category) => {
        const configs = {
            Ocean: { color: 'bg-blue-500', icon: '🌊', gradient: 'from-blue-500 to-cyan-500' },
            Forest: { color: 'bg-green-500', icon: '🌲', gradient: 'from-green-500 to-emerald-500' },
            Air: { color: 'bg-cyan-500', icon: '💨', gradient: 'from-cyan-500 to-sky-500' },
            Community: { color: 'bg-purple-500', icon: '👥', gradient: 'from-purple-500 to-violet-500' }
        };
        return configs[category] || { color: 'bg-gray-500', icon: '📋', gradient: 'from-gray-500 to-gray-600' };
    };

    // Get difficulty config
    const getDifficultyConfig = (difficulty) => {
        const configs = {
            Easy: { color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-100' },
            Medium: { color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-100' },
            Hard: { color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-100' }
        };
        return configs[difficulty] || { color: 'bg-gray-500', textColor: 'text-gray-700', bgColor: 'bg-gray-100' };
    };

    // Get status config
    const getStatusConfig = (status) => {
        const configs = {
            active: { color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-100', icon: '🟢' },
            upcoming: { color: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-100', icon: '🔵' },
            completed: { color: 'bg-purple-500', textColor: 'text-purple-700', bgColor: 'bg-purple-100', icon: '🟣' }
        };
        return configs[status] || { color: 'bg-gray-500', textColor: 'text-gray-700', bgColor: 'bg-gray-100', icon: '⚪' };
    };

    // Filter campaigns
    const filteredCampaigns = campaigns
        ? campaigns
            .filter(campaign => campaign) // Remove any undefined/null campaigns
            .filter(campaign => {
                const matchesSearch =
                    (campaign.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        campaign.description?.toLowerCase().includes(searchTerm.toLowerCase())) ?? false;

                const matchesStatus =
                    filterStatus === 'all' || campaign.status === filterStatus;

                const matchesCategory =
                    filterCategory === 'all' || campaign.category === filterCategory;

                return matchesSearch && matchesStatus && matchesCategory;
            })
        : [];
    if (loading && !selectedCampaign) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-xl font-semibold text-gray-700">Loading campaigns...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="text-red-500 text-6xl mb-4">⚠️</div>
                    <div className="text-red-600 text-xl font-semibold">{error}</div>
                    <button
                        onClick={() => setError(null)}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
            {/* Modern Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                                <BarChart2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                                    Campaign Management
                                </h1>
                                <p className="text-sm text-gray-500 mt-1">Manage your environmental campaigns</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/admin')}
                            className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105"
                        >
                            <Settings size={18} />
                            <span className="font-medium">Admin Dashboard</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
                                <div className="text-3xl font-bold text-gray-900">{campaigns.length}</div>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <BarChart2 className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Active Campaigns</p>
                                <div className="text-3xl font-bold text-green-600">
                                    {campaigns.filter(c => c.status === 'active').length}
                                </div>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Participants</p>
                                <div className="text-3xl font-bold text-purple-600">
                                    {campaigns.reduce((sum, c) => sum + (c.participants || 0), 0)}
                                </div>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                <Users className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Rewards</p>
                                <div className="text-3xl font-bold text-orange-600">
                                    {campaigns.reduce((sum, c) => sum + (c.reward || 0), 0).toFixed(3)} RFX
                                </div>
                            </div>
                            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                                <Award className="w-6 h-6 text-orange-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Campaign List Section */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    {/* Header with Search and Filters */}
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">All Campaigns</h2>
                                <p className="text-sm text-gray-500 mt-1">{filteredCampaigns.length} campaigns found</p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search campaigns..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
                                    />
                                </div>

                                {/* Filters */}
                                <div className="flex gap-2">
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="active">Active</option>
                                        <option value="upcoming">Upcoming</option>
                                        <option value="completed">Completed</option>
                                    </select>

                                    <select
                                        value={filterCategory}
                                        onChange={(e) => setFilterCategory(e.target.value)}
                                        className="px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    >
                                        <option value="all">All Categories</option>
                                        <option value="Ocean">Ocean</option>
                                        <option value="Forest">Forest</option>
                                        <option value="Air">Air</option>
                                        <option value="Community">Community</option>
                                    </select>
                                </div>

                                <button
                                    onClick={() => {
                                        setSelectedCampaign(null);
                                        resetFormData();
                                        setIsModalOpen(true);
                                    }}
                                    className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-xl transition-all duration-200 hover:scale-105 font-medium"
                                >
                                    <Plus size={18} />
                                    <span>New Campaign</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Campaign Grid */}
                    <div className="p-6">
                        {filteredCampaigns.length > 0 ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredCampaigns.map((campaign) => {
                                    const categoryConfig = getCategoryConfig(campaign.category);
                                    const statusConfig = getStatusConfig(campaign.status);
                                    const difficultyConfig = getDifficultyConfig(campaign.difficulty);

                                    return (
                                        <div
                                            key={campaign._id}
                                            className={`bg-white rounded-2xl shadow-md border-2 transition-all duration-200 hover:shadow-xl hover:scale-[1.02] cursor-pointer ${selectedCampaign?._id === campaign._id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100 hover:border-gray-200'
                                                }`}
                                            onClick={() => setSelectedCampaign(campaign)}
                                        >
                                            {/* Campaign Image/Header */}
                                            <div className={`h-32 bg-gradient-to-r ${categoryConfig.gradient} rounded-t-2xl relative overflow-hidden`}>
                                                {campaign.image ? (
                                                    <img
                                                        src={campaign.image}
                                                        alt={campaign.title}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = '';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-white text-4xl">
                                                        {categoryConfig.icon}
                                                    </div>
                                                )}

                                                {/* Status Badge */}
                                                <div className="absolute top-3 left-3">
                                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusConfig.bgColor} ${statusConfig.textColor} backdrop-blur-sm`}>
                                                        {statusConfig.icon} {campaign.status}
                                                    </span>
                                                </div>

                                                {/* Featured badges */}
                                                <div className="absolute top-3 right-3 flex space-x-1">
                                                    {campaign.featured && (
                                                        <span className="bg-yellow-100 text-yellow-700 px-2 py-1 text-xs font-bold rounded-full">
                                                            <Star size={12} className="inline" />
                                                        </span>
                                                    )}
                                                    {campaign.trending && (
                                                        <span className="bg-pink-100 text-pink-700 px-2 py-1 text-xs font-bold rounded-full">
                                                            <TrendingUp size={12} className="inline" />
                                                        </span>
                                                    )}
                                                    {campaign.new && (
                                                        <span className="bg-green-100 text-green-700 px-2 py-1 text-xs font-bold rounded-full">
                                                            <Zap size={12} className="inline" />
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Campaign Content */}
                                            <div className="p-5">
                                                <div className="flex items-start justify-between mb-3">
                                                    <h3 className="text-lg font-bold text-gray-900 line-clamp-2">{campaign.title}</h3>
                                                    <div className="flex space-x-1 ml-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openEditModal(campaign);
                                                            }}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteCampaign(campaign._id);
                                                            }}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{campaign.description}</p>

                                                {/* Campaign Stats */}
                                                <div className="grid grid-cols-2 gap-3 mb-4">
                                                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                                                        <div className="text-lg font-bold text-gray-900">{campaign.participants || 0}</div>
                                                        <div className="text-xs text-gray-500">Participants</div>
                                                    </div>
                                                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                                                        <div className="text-lg font-bold text-green-600">{campaign.reward} RFX</div>
                                                        <div className="text-xs text-gray-500">Reward</div>
                                                    </div>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="mb-4">
                                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                        <span>Progress</span>
                                                        <span>{Math.round(campaign.progress || 0)}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className={`h-2 rounded-full bg-gradient-to-r ${categoryConfig.gradient}`}
                                                            style={{ width: `${campaign.progress || 0}%` }}
                                                        ></div>
                                                    </div>
                                                </div>

                                                {/* Bottom Row */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${categoryConfig.color} text-white`}>
                                                            {campaign.category}
                                                        </span>
                                                        <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${difficultyConfig.bgColor} ${difficultyConfig.textColor}`}>
                                                            {campaign.difficulty}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center text-xs text-gray-500">
                                                        <Clock size={12} className="mr-1" />
                                                        {campaign.duration || 0}d
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="text-gray-400 text-6xl mb-4">📋</div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No campaigns found</h3>
                                <p className="text-gray-500 mb-6">Create your first campaign or adjust your filters</p>
                                <button
                                    onClick={() => {
                                        setSelectedCampaign(null);
                                        resetFormData();
                                        setIsModalOpen(true);
                                    }}
                                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                                >
                                    Create Campaign
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Campaign Details */}
                {selectedCampaign && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        <Tabs selectedIndex={activeTab} onSelect={index => setActiveTab(index)}>
                            <TabList className="flex border-b border-gray-200 bg-gray-50">
                                <Tab className="flex-1 px-4 py-4 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none cursor-pointer transition-colors">
                                    <div className="flex items-center justify-center space-x-2">
                                        <BarChart2 size={18} />
                                        <span className="hidden sm:inline">Overview</span>
                                    </div>
                                </Tab>
                                <Tab className="flex-1 px-4 py-4 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none cursor-pointer transition-colors">
                                    <div className="flex items-center justify-center space-x-2">
                                        <Users size={18} />
                                        <span className="hidden sm:inline">Participants</span>
                                        <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
                                            {selectedCampaign.participants || 0}
                                        </span>
                                    </div>
                                </Tab>
                                <Tab className="flex-1 px-4 py-4 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none cursor-pointer transition-colors">
                                    <div className="flex items-center justify-center space-x-2">
                                        <List size={18} />
                                        <span className="hidden sm:inline">Tasks</span>
                                        <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
                                            {selectedCampaign.tasksList?.length || 0}
                                        </span>
                                    </div>
                                </Tab>
                                <Tab className="flex-1 px-4 py-4 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none cursor-pointer transition-colors">
                                    <div className="flex items-center justify-center space-x-2">
                                        <Upload size={18} />
                                        <span className="hidden sm:inline">Proofs</span>
                                    </div>
                                </Tab>
                            </TabList>

                            <TabPanel>
                                <div className="p-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* Campaign Image */}
                                        <div className="lg:col-span-1">
                                            {selectedCampaign.image ? (
                                                <img
                                                    src={selectedCampaign.image}
                                                    alt={selectedCampaign.title}
                                                    className="w-full h-64 object-cover rounded-2xl shadow-lg"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = '';
                                                    }}
                                                />
                                            ) : (
                                                <div className={`w-full h-64 bg-gradient-to-r ${getCategoryConfig(selectedCampaign.category).gradient} rounded-2xl flex items-center justify-center text-white text-6xl shadow-lg`}>
                                                    {getCategoryConfig(selectedCampaign.category).icon}
                                                </div>
                                            )}
                                        </div>

                                        {/* Campaign Details */}
                                        <div className="lg:col-span-2 space-y-6">
                                            <div>
                                                <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedCampaign.title || 'N/A'}</h3>
                                                <p className="text-gray-600 leading-relaxed">{selectedCampaign.description || 'No description'}</p>
                                            </div>

                                            {/* Stats Grid */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl">
                                                    <div className="text-sm text-green-600 font-medium">Total Reward</div>
                                                    <div className="text-2xl font-bold text-green-700">{selectedCampaign.reward || 0} RFX</div>
                                                </div>
                                                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl">
                                                    <div className="text-sm text-blue-600 font-medium">Participants</div>
                                                    <div className="text-2xl font-bold text-blue-700">{selectedCampaign.participants || 0}</div>
                                                </div>
                                                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl">
                                                    <div className="text-sm text-purple-600 font-medium">Completion</div>
                                                    <div className="text-2xl font-bold text-purple-700">
                                                        {selectedCampaign.tasksList?.length > 0 && selectedCampaign.participants > 0
                                                            ? Math.round((selectedCampaign.completedTasks / (selectedCampaign.tasksList.length * selectedCampaign.participants)) * 100)
                                                            : 0}%
                                                    </div>
                                                </div>
                                                <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-xl">
                                                    <div className="text-sm text-orange-600 font-medium">Duration</div>
                                                    <div className="text-2xl font-bold text-orange-700">{selectedCampaign.duration || 0}d</div>
                                                </div>
                                            </div>

                                            {/* Campaign Properties */}
                                            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="flex items-center space-x-3">
                                                        <span className="text-gray-500 font-medium w-24">Category:</span>
                                                        <span className={`px-3 py-1 text-sm font-semibold rounded-lg ${getCategoryConfig(selectedCampaign.category).color} text-white`}>
                                                            {getCategoryConfig(selectedCampaign.category).icon} {selectedCampaign.category || 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center space-x-3">
                                                        <span className="text-gray-500 font-medium w-24">Difficulty:</span>
                                                        <span className={`px-3 py-1 text-sm font-semibold rounded-lg ${getDifficultyConfig(selectedCampaign.difficulty).bgColor} ${getDifficultyConfig(selectedCampaign.difficulty).textColor}`}>
                                                            {selectedCampaign.difficulty || 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center space-x-3">
                                                        <span className="text-gray-500 font-medium w-24">Status:</span>
                                                        <span className={`px-3 py-1 text-sm font-semibold rounded-lg ${getStatusConfig(selectedCampaign.status).bgColor} ${getStatusConfig(selectedCampaign.status).textColor}`}>
                                                            {getStatusConfig(selectedCampaign.status).icon} {selectedCampaign.status || 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center space-x-3">
                                                        <span className="text-gray-500 font-medium w-24">Started:</span>
                                                        <span className="text-gray-700">
                                                            {selectedCampaign.startDate ? format(new Date(selectedCampaign.startDate), 'MMM d, yyyy') : 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {selectedCampaign.endDate && (
                                                    <div className="flex items-center space-x-3">
                                                        <span className="text-gray-500 font-medium w-24">Ends:</span>
                                                        <span className="text-gray-700">{format(new Date(selectedCampaign.endDate), 'MMM d, yyyy')}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabPanel>

                            <TabPanel>
                                <div className="p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-bold text-gray-900">
                                            Participants ({selectedCampaign.participants || 0})
                                        </h3>
                                    </div>

                                    {selectedCampaign.participantsList?.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {selectedCampaign.participantsList.map((user) => {
                                                const userCampaign = user.campaigns?.find(c => c.campaignId === selectedCampaign._id);
                                                const completionPercentage = (userCampaign?.completed || 0) / (selectedCampaign.tasksList?.length || 1) * 100;

                                                return (
                                                    <div key={user._id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                                                        <div className="flex items-center space-x-3 mb-3">
                                                            {user.avatar ? (
                                                                <img
                                                                    className="w-12 h-12 rounded-full border-2 border-gray-200"
                                                                    src={user.avatar}
                                                                    alt={user.username}
                                                                    onError={(e) => {
                                                                        e.target.onerror = null;
                                                                        e.target.src = '';
                                                                        e.target.className = 'w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg';
                                                                        e.target.textContent = user.username?.charAt(0)?.toUpperCase() || 'N';
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                                                                    {user.username?.charAt(0)?.toUpperCase() || 'N'}
                                                                </div>
                                                            )}
                                                            <div className="flex-1">
                                                                <div className="font-semibold text-gray-900">{user.username || 'N/A'}</div>
                                                                <div className="text-sm text-gray-500">{user.email || 'N/A'}</div>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-gray-600">Progress</span>
                                                                <span className="font-medium">{userCampaign?.completed || 0}/{selectedCampaign.tasksList?.length || 0}</span>
                                                            </div>
                                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                                <div
                                                                    className={`h-2 rounded-full bg-gradient-to-r ${getCategoryConfig(selectedCampaign.category).gradient}`}
                                                                    style={{ width: `${completionPercentage}%` }}
                                                                ></div>
                                                            </div>
                                                            <div className="flex justify-between text-xs text-gray-500">
                                                                <span>Earned: {((userCampaign?.completed || 0) * (selectedCampaign.reward || 0)).toFixed(5)} RFX</span>
                                                                <span>
                                                                    {userCampaign?.lastActivity ? format(new Date(userCampaign.lastActivity), 'MMM d') : 'No activity'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <div className="text-gray-400 text-6xl mb-4">👥</div>
                                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No participants yet</h3>
                                            <p className="text-gray-500">Participants will appear here once they join the campaign</p>
                                        </div>
                                    )}
                                </div>
                            </TabPanel>

                            <TabPanel>
                                <div className="p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-bold text-gray-900">
                                            Tasks ({selectedCampaign.tasksList?.length || 0})
                                        </h3>
                                        <button
                                            onClick={() => setIsTaskModalOpen(true)}
                                            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-xl transition-all duration-200"
                                        >
                                            <Plus size={16} />
                                            <span>Add Task</span>
                                        </button>
                                    </div>

                                    {selectedCampaign.tasksList?.length > 0 ? (
                                        <div className="space-y-4">
                                            {selectedCampaign.tasksList.map((task, index) => (
                                                <div key={task._id || index} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0">
                                                        <div className="flex-1">
                                                            <div className="flex items-center space-x-3 mb-2">
                                                                <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold px-3 py-1 rounded-lg text-sm">
                                                                    Day {task.day}
                                                                </span>
                                                                <h4 className="text-lg font-semibold text-gray-900">{task.title}</h4>
                                                            </div>
                                                            <p className="text-gray-600 mb-3">{task.description}</p>

                                                            {task.requirements?.length > 0 && (
                                                                <div className="mb-3">
                                                                    <span className="text-sm font-medium text-gray-700">Requirements:</span>
                                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                                        {task.requirements.map((req, i) => (
                                                                            <span key={i} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs">
                                                                                {req}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="text-right space-y-2">
                                                            <div className="text-xl font-bold text-green-600">{task.reward} RFX</div>
                                                            <div className="space-x-2">
                                                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-medium capitalize">
                                                                    {task.type}
                                                                </span>
                                                                {task.platform && (
                                                                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-md text-xs font-medium">
                                                                        {task.platform}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {task.contentUrl && (
                                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                                            <a
                                                                href={task.contentUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                                                            >
                                                                <Eye size={16} className="mr-2" />
                                                                View Content
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <div className="text-gray-400 text-6xl mb-4">📝</div>
                                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No tasks added yet</h3>
                                            <p className="text-gray-500 mb-6">Add tasks to make your campaign interactive</p>
                                            <button
                                                onClick={() => setIsTaskModalOpen(true)}
                                                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                                            >
                                                Add First Task
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </TabPanel>

                            <TabPanel>
                                <div className="p-6">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-6">
                                        <h3 className="text-xl font-bold text-gray-900">Submitted Proofs</h3>
                                        {selectedProofs.length > 0 && (
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleBulkApprove(true)}
                                                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl transition-colors"
                                                >
                                                    <Check size={16} />
                                                    <span>Approve Selected</span>
                                                </button>
                                                <button
                                                    onClick={() => handleBulkApprove(false)}
                                                    className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl transition-colors"
                                                >
                                                    <X size={16} />
                                                    <span>Reject Selected</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {proofs.length > 0 ? (
                                        <div className="space-y-6">
                                            {proofs.map((proofGroup) => (
                                                <div key={proofGroup.taskId} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                                                        <div className="flex justify-between items-center">
                                                            <h4 className="font-semibold text-gray-900">
                                                                {proofGroup.taskTitle} (Day {proofGroup.day})
                                                            </h4>
                                                            <div className="text-sm text-gray-500">
                                                                {proofGroup.proofs.filter(p => p.status === 'completed').length} / {proofGroup.proofs.length} approved
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="p-6">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                            {proofGroup.proofs.map((proof) => (
                                                                <div key={`${proofGroup.taskId}-${proof.userId}`} className="border border-gray-200 rounded-lg p-4">
                                                                    <div className="flex items-center space-x-2 mb-3">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedProofs.some(p => p.taskId === proofGroup.taskId && p.userId === proof.userId)}
                                                                            onChange={() => toggleProofSelection(proofGroup.taskId, proof.userId)}
                                                                            className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                                        />
                                                                        {proof.avatar ? (
                                                                            <img
                                                                                className="w-8 h-8 rounded-full"
                                                                                src={proof.avatar}
                                                                                alt={proof.username}
                                                                                onError={(e) => {
                                                                                    e.target.onerror = null;
                                                                                    e.target.src = '';
                                                                                    e.target.className = 'w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold';
                                                                                    e.target.textContent = proof.username?.charAt(0)?.toUpperCase() || 'N';
                                                                                }}
                                                                            />
                                                                        ) : (
                                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                                                                                {proof.username?.charAt(0)?.toUpperCase() || 'N'}
                                                                            </div>
                                                                        )}
                                                                        <div className="flex-1">
                                                                            <div className="text-sm font-medium text-gray-900">{proof.username || 'N/A'}</div>
                                                                            <div className="text-xs text-gray-500">{proof.email || 'N/A'}</div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="space-y-2">
                                                                        <a
                                                                            href={proof.proofUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                                                                        >
                                                                            <Eye size={14} className="mr-1" />
                                                                            View Proof
                                                                        </a>

                                                                        <div className="flex items-center justify-between">
                                                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${proof.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                                                proof.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                                                    'bg-yellow-100 text-yellow-800'
                                                                                }`}>
                                                                                {proof.status || 'pending'}
                                                                            </span>

                                                                            <div className="flex space-x-1">
                                                                                {proof.status !== 'completed' && (
                                                                                    <button
                                                                                        onClick={() => handleApproveProof(proofGroup.taskId, proof.userId, true)}
                                                                                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                                                    >
                                                                                        <Check size={14} />
                                                                                    </button>
                                                                                )}
                                                                                {proof.status !== 'rejected' && (
                                                                                    <button
                                                                                        onClick={() => handleApproveProof(proofGroup.taskId, proof.userId, false)}
                                                                                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                                                    >
                                                                                        <X size={14} />
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <div className="text-gray-400 text-6xl mb-4">📸</div>
                                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No proofs submitted yet</h3>
                                            <p className="text-gray-500">Participant proof submissions will appear here</p>
                                        </div>
                                    )}
                                </div>
                            </TabPanel>
                        </Tabs>
                    </div>
                )}
            </main>

            {/* Enhanced Campaign Form Modal */}
            <Modal
                isOpen={isModalOpen}
                onRequestClose={() => setIsModalOpen(false)}
                className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-auto my-8 overflow-y-auto max-h-[90vh]"
                overlayClassName="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 z-50"
                contentLabel="Campaign Form"
            >
                <div className="p-8">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                {selectedCampaign ? 'Edit Campaign' : 'Create New Campaign'}
                            </h2>
                            <p className="text-gray-500 mt-1">Configure your environmental campaign settings</p>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Basic Information */}
                        <div className="bg-gray-50 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                                        Campaign Title *
                                    </label>
                                    <input
                                        type="text"
                                        id="title"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="Enter campaign title"
                                        required
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                                        Description *
                                    </label>
                                    <textarea
                                        id="description"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        rows={4}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                                        placeholder="Describe your campaign goals and impact"
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                                        Category *
                                    </label>
                                    <select
                                        id="category"
                                        name="category"
                                        value={formData.category}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        required
                                    >
                                        <option value="Ocean">🌊 Ocean</option>
                                        <option value="Forest">🌲 Forest</option>
                                        <option value="Air">💨 Air</option>
                                        <option value="Community">👥 Community</option>
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
                                        Campaign Image
                                    </label>
                                    <input
                                        type="file"
                                        id="image"
                                        name="image"
                                        onChange={(e) => setFormData({ ...formData, image: e.target.files[0] })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        accept="image/*"
                                    />
                                    {selectedCampaign?.image && !formData.image && (
                                        <div className="mt-3">
                                            <img
                                                src={selectedCampaign.image}
                                                alt="Current"
                                                className="h-20 w-auto rounded-lg border border-gray-200"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = '';
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Campaign Settings */}
                        <div className="bg-gray-50 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Settings</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                    <label htmlFor="reward" className="block text-sm font-medium text-gray-700 mb-2">
                                        Reward (RFX) *
                                    </label>
                                    <input
                                        type="number"
                                        id="reward"
                                        name="reward"
                                        value={formData.reward}
                                        onChange={handleChange}
                                        step="0.00001"
                                        min="0"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="0.005"
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-2">
                                        Difficulty *
                                    </label>
                                    <select
                                        id="difficulty"
                                        name="difficulty"
                                        value={formData.difficulty}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        required
                                    >
                                        <option value="Easy">Easy</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Hard">Hard</option>
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                                        Duration (days) *
                                    </label>
                                    <input
                                        type="number"
                                        id="duration"
                                        name="duration"
                                        value={formData.duration}
                                        onChange={handleChange}
                                        min="1"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="7"
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                                        Status *
                                    </label>
                                    <select
                                        id="status"
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        required
                                    >
                                        <option value="active">🟢 Active</option>
                                        <option value="upcoming">🔵 Upcoming</option>
                                        <option value="completed">🟣 Completed</option>
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                                        Start Date *
                                    </label>
                                    <input
                                        type="date"
                                        id="startDate"
                                        name="startDate"
                                        value={formData.startDate}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                                        End Date (auto-calculated)
                                    </label>
                                    <input
                                        type="date"
                                        id="endDate"
                                        name="endDate"
                                        value={formData.endDate}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        readOnly
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Campaign Features */}
                        <div className="bg-gray-50 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Features</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-white transition-colors cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="featured"
                                        checked={formData.featured}
                                        onChange={handleChange}
                                        className="w-4 h-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700">⭐ Featured</span>
                                </label>

                                <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-white transition-colors cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="new"
                                        checked={formData.new}
                                        onChange={handleChange}
                                        className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700">🆕 New</span>
                                </label>

                                <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-white transition-colors cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="trending"
                                        checked={formData.trending}
                                        onChange={handleChange}
                                        className="w-4 h-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700">📈 Trending</span>
                                </label>

                                <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-white transition-colors cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="ending"
                                        checked={formData.ending}
                                        onChange={handleChange}
                                        className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700">⏰ Ending Soon</span>
                                </label>
                            </div>
                        </div>

                        {/* Tasks Section */}
                        <div className="bg-gray-50 rounded-xl p-6">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Campaign Tasks</h3>
                                    <p className="text-sm text-gray-500">{formData.tasksList.length} tasks configured</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsTaskModalOpen(true)}
                                    className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg transition-all duration-200"
                                >
                                    <Plus size={16} />
                                    <span>Add Task</span>
                                </button>
                            </div>

                            {formData.tasksList.length > 0 ? (
                                <div className="space-y-3 max-h-60 overflow-y-auto">
                                    {formData.tasksList.map((task, index) => (
                                        <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2 mb-1">
                                                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                                                            Day {task.day}
                                                        </span>
                                                        <h4 className="font-medium text-gray-900">{task.title}</h4>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                                                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                                                        <span className="bg-gray-100 px-2 py-1 rounded">{task.type}</span>
                                                        <span className="text-green-600 font-medium">{task.reward} RFX</span>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            tasksList: prev.tasksList.filter((_, i) => i !== index)
                                                        }));
                                                    }}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                                    <div className="text-gray-400 text-4xl mb-2">📝</div>
                                    <p className="text-gray-500 text-sm">No tasks added yet. Add tasks to make your campaign interactive.</p>
                                </div>
                            )}
                        </div>

                        {/* Form Actions */}
                        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={loading}
                            >
                                {loading ? (
                                    <div className="flex items-center space-x-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Saving...</span>
                                    </div>
                                ) : (
                                    `${selectedCampaign ? 'Update' : 'Create'} Campaign`
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Enhanced Task Form Modal */}
            <Modal
                isOpen={isTaskModalOpen}
                onRequestClose={() => setIsTaskModalOpen(false)}
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-auto my-8 overflow-y-auto max-h-[90vh]"
                overlayClassName="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 z-50"
                contentLabel="Task Form"
            >
                <div className="p-8">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Add New Task
                            </h2>
                            <p className="text-gray-500 mt-1">Configure a new task for your campaign</p>
                        </div>
                        <button
                            onClick={() => setIsTaskModalOpen(false)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleAddTask} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="task-day" className="block text-sm font-medium text-gray-700 mb-2">
                                    Day Number *
                                </label>
                                <input
                                    type="number"
                                    id="task-day"
                                    name="day"
                                    value={taskForm.day}
                                    onChange={handleTaskChange}
                                    min="1"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="1"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="task-reward" className="block text-sm font-medium text-gray-700 mb-2">
                                    Reward (RFX) *
                                </label>
                                <input
                                    type="number"
                                    id="task-reward"
                                    name="reward"
                                    value={taskForm.reward}
                                    onChange={handleTaskChange}
                                    step="0.00001"
                                    min="0"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="0.001"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="task-title" className="block text-sm font-medium text-gray-700 mb-2">
                                Task Title *
                            </label>
                            <input
                                type="text"
                                id="task-title"
                                name="title"
                                value={taskForm.title}
                                onChange={handleTaskChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="Enter task title"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="task-description" className="block text-sm font-medium text-gray-700 mb-2">
                                Description *
                            </label>
                            <textarea
                                id="task-description"
                                name="description"
                                value={taskForm.description}
                                onChange={handleTaskChange}
                                rows={3}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                                placeholder="Describe what participants need to do"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="task-type" className="block text-sm font-medium text-gray-700 mb-2">
                                    Task Type *
                                </label>
                                <select
                                    id="task-type"
                                    name="type"
                                    value={taskForm.type}
                                    onChange={handleTaskChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    required
                                >
                                    <option value="social-follow">📱 Social Follow</option>
                                    <option value="social-post">📝 Social Post</option>
                                    <option value="video-watch">🎥 Video Watch</option>
                                    <option value="article-read">📖 Article Read</option>
                                    <option value="discord-join">💬 Discord Join</option>
                                    <option value="proof-upload">📸 Proof Upload</option>
                                </select>
                            </div>

                            {(taskForm.type === 'social-follow' || taskForm.type === 'social-post') && (
                                <div>
                                    <label htmlFor="task-platform" className="block text-sm font-medium text-gray-700 mb-2">
                                        Platform *
                                    </label>
                                    <select
                                        id="task-platform"
                                        name="platform"
                                        value={taskForm.platform}
                                        onChange={handleTaskChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        required
                                    >
                                        <option value="Twitter">🐦 Twitter</option>
                                        <option value="Facebook">📘 Facebook</option>
                                        <option value="Instagram">📷 Instagram</option>
                                        <option value="YouTube">📺 YouTube</option>
                                        <option value="Discord">💬 Discord</option>
                                        <option value="Telegram">✈️ Telegram</option>
                                        <option value="Reddit">🤖 Reddit</option>
                                        <option value="TikTok">🎵 TikTok</option>
                                        <option value="LinkedIn">💼 LinkedIn</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {(taskForm.type === 'video-watch' || taskForm.type === 'article-read') && (
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="task-contentUrl" className="block text-sm font-medium text-gray-700 mb-2">
                                        Content URL
                                    </label>
                                    <input
                                        type="url"
                                        id="task-contentUrl"
                                        name="contentUrl"
                                        value={taskForm.contentUrl}
                                        onChange={handleTaskChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="https://example.com/content"
                                    />
                                    <p className="mt-1 text-sm text-gray-500">Or upload content file below</p>
                                </div>

                                <div>
                                    <label htmlFor="task-contentFile" className="block text-sm font-medium text-gray-700 mb-2">
                                        Content File
                                    </label>
                                    <input
                                        type="file"
                                        id="task-contentFile"
                                        name="contentFile"
                                        onChange={handleTaskChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        accept={taskForm.type === 'video-watch' ? 'video/*' : 'application/pdf,text/*'}
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label htmlFor="task-requirements" className="block text-sm font-medium text-gray-700 mb-2">
                                Requirements (comma separated)
                            </label>
                            <input
                                type="text"
                                id="task-requirements"
                                name="requirements"
                                value={taskForm.requirements}
                                onChange={handleTaskChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="e.g., Twitter account, Email verification"
                            />
                            <p className="mt-1 text-sm text-gray-500">Optional requirements participants must meet</p>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={() => setIsTaskModalOpen(false)}
                                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50"
                                disabled={loading}
                            >
                                {loading ? (
                                    <div className="flex items-center space-x-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Adding...</span>
                                    </div>
                                ) : (
                                    'Add Task'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
};

export default AdminCampaignDashboard;
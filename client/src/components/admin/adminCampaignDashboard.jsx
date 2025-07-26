import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Trash2, Edit, Check, X, Upload,
    BarChart2, Users, List, Settings
} from 'react-feather';
import api from '../../api/api';
import Modal from 'react-modal';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import { format } from 'date-fns';
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

    // Form states
    const [formData, setFormData] = useState({
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
    });

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

    // Fetch campaigns on mount
    // AdminCampaignDashboard.jsx, inside useEffect
    useEffect(() => {
        const fetchCampaigns = async () => {
            setLoading(true); // Ensure loading is true at start
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('No authentication token found. Please log in.');
                }

                const response = await axios.get('http://localhost:3000/admin/campaigns', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                setCampaigns(response.data);
                setLoading(false); // Set loading to false on success
            } catch (error) {
                console.error('Error fetching campaigns:', {
                    message: error.message,
                    response: error.response?.data,
                    status: error.response?.status,
                    headers: error.response?.headers,
                });
                setError(error.response?.data?.message || error.message); // Set error state
                setLoading(false); // Set loading to false on error
                alert('Failed to fetch campaigns: ' + (error.response?.data?.message || error.message));
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
                    const response = await axios.get(`http://localhost:3000/admin/campaigns/${selectedCampaign._id}`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    setSelectedCampaign(response.data);

                    if (activeTab === 2) {
                        const proofsRes = await axios.get(`http://localhost:3000/admin/campaigns/${selectedCampaign._id}/proofs`, {
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

            // Append all form data except tasksList and image
            Object.entries(formData).forEach(([key, value]) => {
                if (key !== 'image' && key !== 'tasksList') {
                    formPayload.append(key, value);
                }
            });

            if (formData.image) {
                formPayload.append('image', formData.image);
            }

            if (formData.tasksList.length > 0) {
                formPayload.append('tasks', JSON.stringify(formData.tasksList));
            }

            let response;
            if (selectedCampaign) {
                response = await axios.put(`http://localhost:3000/admin/campaigns/${selectedCampaign._id}`, formPayload, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                });
            } else {
                response = await axios.post('http://localhost:3000/admin/campaigns', formPayload, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                });
            }

            setCampaigns(prev => {
                const existing = prev.find(c => c._id === response.data._id);
                if (existing) {
                    return prev.map(c => c._id === response.data._id ? response.data : c);
                }
                return [response.data, ...prev];
            });

            setIsModalOpen(false);
            setFormData({
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
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save campaign');
        } finally {
            setLoading(false);
        }
    };

    // Add task to form
    const handleAddTask = async (e) => {
        e.preventDefault();

        try {
            const token = localStorage.getItem('token');
            let contentUrl = taskForm.contentUrl;
            if (taskForm.contentFile) {
                const formData = new FormData();
                formData.append('content', taskForm.contentFile);
                const uploadRes = await axios.post('http://localhost:3000/upload', formData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                });
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
                contentUrl
            };

            setFormData(prev => ({
                ...prev,
                tasksList: [...prev.tasksList, newTask]
            }));

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
        }
    };

    // Delete campaign
    const handleDeleteCampaign = async (id) => {
        if (window.confirm('Are you sure you want to delete this campaign?')) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`http://localhost:3000/admin/campaigns/${id}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                setCampaigns(prev => prev.filter(c => c._id !== id));
                if (selectedCampaign?._id === id) {
                    setSelectedCampaign(null);
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete campaign');
            }
        }
    };

    // Approve/reject proof
    const handleApproveProof = async (taskId, userId, approve) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`http://localhost:3000/admin/campaigns/${selectedCampaign._id}/approve-proof`, {
                taskId,
                userId,
                approve
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

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

    // Bulk approve/reject proofs
    const handleBulkApprove = async (approve) => {
        try {
            const token = localStorage.getItem('token');
            await Promise.all(selectedProofs.map(async ({ taskId, userId }) => {
                await axios.post(`http://localhost:3000/admin/campaigns/${selectedCampaign._id}/approve-proof`, {
                    taskId,
                    userId,
                    approve
                }, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }));

            const proofsRes = await axios.get(`http://localhost:3000/admin/campaigns/${selectedCampaign._id}/proofs`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
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

    // Get category color
    const getCategoryColor = (category) => {
        switch (category) {
            case 'Ocean': return 'bg-blue-500';
            case 'Forest': return 'bg-green-500';
            case 'Air': return 'bg-cyan-500';
            case 'Community': return 'bg-purple-500';
            default: return 'bg-gray-500';
        }
    };

    // Get difficulty color
    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'Easy': return 'bg-green-500';
            case 'Medium': return 'bg-yellow-500';
            case 'Hard': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    // Get status color
    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'bg-green-500';
            case 'upcoming': return 'bg-blue-500';
            case 'completed': return 'bg-purple-500';
            default: return 'bg-gray-500';
        }
    };

    if (loading && !selectedCampaign) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-xl">Loading campaigns...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-red-500 text-xl">{error}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-900">Campaign Management</h1>
                    <button
                        onClick={() => navigate('/admin')}
                        className="flex items-center space-x-2 bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded"
                    >
                        <Settings size={16} />
                        <span>Admin Dashboard</span>
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
                {/* Campaign List */}
                <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="text-lg font-medium text-gray-900">All Campaigns</h2>
                        <button
                            onClick={() => {
                                setSelectedCampaign(null);
                                setIsModalOpen(true);
                            }}
                            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                        >
                            <Plus size={16} />
                            <span>New Campaign</span>
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participants</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reward</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {campaigns.map((campaign) => (
                                    <tr
                                        key={campaign._id}
                                        className={`hover:bg-gray-50 cursor-pointer ${selectedCampaign?._id === campaign._id ? 'bg-blue-50' : ''}`}
                                        onClick={() => setSelectedCampaign(campaign)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                {campaign.image && (
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <img className="h-10 w-10 rounded" src={campaign.image} alt={campaign.title} />
                                                    </div>
                                                )}
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{campaign.title}</div>
                                                    <div className="text-sm text-gray-500">{campaign.difficulty}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getCategoryColor(campaign.category)} text-white`}>
                                                {campaign.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(campaign.status)} text-white`}>
                                                {campaign.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {campaign.participants || 0}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                <div
                                                    className={`h-2.5 rounded-full ${getCategoryColor(campaign.category)}`}
                                                    style={{ width: `${campaign.progress || 0}%` }}
                                                ></div>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {Math.round(campaign.progress || 0)}% complete
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {campaign.reward} RFX
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openEditModal(campaign);
                                                }}
                                                className="text-blue-600 hover:text-blue-900 mr-4"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteCampaign(campaign._id);
                                                }}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Campaign Details */}
                {selectedCampaign && (
                    <div className="bg-white shadow rounded-lg overflow-hidden">
                        <Tabs selectedIndex={activeTab} onSelect={index => setActiveTab(index)}>
                            <TabList className="flex border-b border-gray-200">
                                <Tab className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none cursor-pointer">
                                    <div className="flex items-center">
                                        <BarChart2 size={16} className="mr-2" />
                                        Overview
                                    </div>
                                </Tab>
                                <Tab className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none cursor-pointer">
                                    <div className="flex items-center">
                                        <Users size={16} className="mr-2" />
                                        Participants ({selectedCampaign.participants || 0})
                                    </div>
                                </Tab>
                                <Tab className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none cursor-pointer">
                                    <div className="flex items-center">
                                        <List size={16} className="mr-2" />
                                        Tasks ({selectedCampaign.tasksList?.length || 0})
                                    </div>
                                </Tab>
                                <Tab className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none cursor-pointer">
                                    <div className="flex items-center">
                                        <Upload size={16} className="mr-2" />
                                        Proofs
                                    </div>
                                </Tab>
                            </TabList>

                            <TabPanel>
                                <div className="p-6">
                                    <div className="flex flex-col md:flex-row gap-6">
                                        <div className="md:w-1/3">
                                            {selectedCampaign.image ? (
                                                <img
                                                    src={selectedCampaign.image}
                                                    alt={selectedCampaign.title}
                                                    className="w-full h-auto rounded-lg shadow"
                                                />
                                            ) : (
                                                <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                                                    <span className="text-gray-500">No image</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="md:w-2/3">
                                            <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedCampaign.title || 'N/A'}</h3>
                                            <p className="text-gray-600 mb-4">{selectedCampaign.description || 'No description'}</p>

                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                    <div className="text-sm text-gray-500">Total Reward</div>
                                                    <div className="text-xl font-bold text-green-600">{selectedCampaign.reward || 0} RFX</div>
                                                </div>
                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                    <div className="text-sm text-gray-500">Participants</div>
                                                    <div className="text-xl font-bold">{selectedCampaign.participants || 0}</div>
                                                </div>
                                                <div className="bg-gray-50 p-4 rounded-lg">
                                                    <div className="text-sm text-gray-500">Completion</div>
                                                    <div className="text-xl font-bold">
                                                        {selectedCampaign.tasksList?.length > 0 && selectedCampaign.participants > 0
                                                            ? Math.round((selectedCampaign.completedTasks / (selectedCampaign.tasksList.length * selectedCampaign.participants)) * 100)
                                                            : 0}%
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex items-center">
                                                    <span className="w-32 text-gray-500">Category:</span>
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${selectedCampaign.category ? getCategoryColor(selectedCampaign.category) : 'bg-gray-500'} text-white`}>
                                                        {selectedCampaign.category || 'N/A'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="w-32 text-gray-500">Difficulty:</span>
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${selectedCampaign.difficulty ? getDifficultyColor(selectedCampaign.difficulty) : 'bg-gray-500'} text-white`}>
                                                        {selectedCampaign.difficulty || 'N/A'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="w-32 text-gray-500">Duration:</span>
                                                    <span>{selectedCampaign.duration || 0} days</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="w-32 text-gray-500">Start Date:</span>
                                                    <span>{selectedCampaign.startDate ? format(new Date(selectedCampaign.startDate), 'MMM d, yyyy') : 'N/A'}</span>
                                                </div>
                                                {selectedCampaign.endDate && (
                                                    <div className="flex items-center">
                                                        <span className="w-32 text-gray-500">End Date:</span>
                                                        <span>{format(new Date(selectedCampaign.endDate), 'MMM d, yyyy')}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center">
                                                    <span className="w-32 text-gray-500">Status:</span>
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${selectedCampaign.status ? getStatusColor(selectedCampaign.status) : 'bg-gray-500'} text-white`}>
                                                        {selectedCampaign.status || 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabPanel>

                            <TabPanel>
                                <div className="p-6">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Participants ({selectedCampaign.participants || 0})</h3>

                                    {selectedCampaign.participantsList?.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed Tasks</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Earned</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {selectedCampaign.participantsList.map((user) => {
                                                        const userCampaign = user.campaigns?.find(c => c.campaignId === selectedCampaign._id);
                                                        return (
                                                            <tr key={user._id}>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="flex items-center">
                                                                        {user.avatar ? (
                                                                            <img className="h-10 w-10 rounded-full" src={user.avatar} alt={user.username} />
                                                                        ) : (
                                                                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                                                <span className="text-gray-500">{user.username?.charAt(0)?.toUpperCase() || 'N/A'}</span>
                                                                            </div>
                                                                        )}
                                                                        <div className="ml-4">
                                                                            <div className="text-sm font-medium text-gray-900">{user.username || 'N/A'}</div>
                                                                            <div className="text-sm text-gray-500">{user.email || 'N/A'}</div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="text-sm text-gray-900">{userCampaign?.completed || 0}/{selectedCampaign.tasksList?.length || 0}</div>
                                                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                                                        <div
                                                                            className={`h-2 rounded-full ${getCategoryColor(selectedCampaign.category)}`}
                                                                            style={{
                                                                                width: `${(userCampaign?.completed || 0) / (selectedCampaign.tasksList?.length || 1) * 100}%`
                                                                            }}
                                                                        ></div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                    {((userCampaign?.completed || 0) * (selectedCampaign.reward || 0)).toFixed(5)} RFX
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                    {userCampaign?.lastActivity ? format(new Date(userCampaign.lastActivity), 'MMM d, yyyy') : 'N/A'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            No participants yet
                                        </div>
                                    )}
                                </div>
                            </TabPanel>

                            <TabPanel>
                                <div className="p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-medium text-gray-900">Tasks ({selectedCampaign.tasksList?.length || 0})</h3>
                                        <button
                                            onClick={() => setIsTaskModalOpen(true)}
                                            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                                        >
                                            <Plus size={16} />
                                            <span>Add Task</span>
                                        </button>
                                    </div>

                                    {selectedCampaign.tasksList?.length > 0 ? (
                                        <div className="space-y-4">
                                            {selectedCampaign.tasksList.map((task, index) => (
                                                <div key={task._id || index} className="border border-gray-200 rounded-lg p-4">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="flex items-center space-x-2">
                                                                <span className="font-medium">{task.title}</span>
                                                                <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(selectedCampaign.difficulty)} text-white`}>
                                                                    Day {task.day}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-gray-600 mt-1">{task.description}</p>

                                                            {task.requirements?.length > 0 && (
                                                                <div className="mt-2">
                                                                    <span className="text-xs text-gray-500">Requirements:</span>
                                                                    <ul className="text-xs text-gray-600 list-disc list-inside">
                                                                        {task.requirements.map((req, i) => (
                                                                            <li key={i}>{req}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-sm font-medium text-green-600">{task.reward} RFX</div>
                                                            <div className="text-xs text-gray-500 capitalize">{task.type}</div>
                                                            {task.platform && (
                                                                <div className="text-xs text-gray-500">{task.platform}</div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {task.contentUrl && (
                                                        <div className="mt-3">
                                                            <a
                                                                href={task.contentUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                                                            >
                                                                <span>View Content</span>
                                                                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                                </svg>
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            No tasks added yet
                                        </div>
                                    )}
                                </div>
                            </TabPanel>

                            <TabPanel>
                                <div className="p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-medium text-gray-900">Submitted Proofs</h3>
                                        {selectedProofs.length > 0 && (
                                            <div className="space-x-2">
                                                <button
                                                    onClick={() => handleBulkApprove(true)}
                                                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                                                >
                                                    <Check size={16} />
                                                    <span>Approve Selected</span>
                                                </button>
                                                <button
                                                    onClick={() => handleBulkApprove(false)}
                                                    className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
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
                                                <div key={proofGroup.taskId} className="border border-gray-200 rounded-lg p-4">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <h4 className="font-medium">{proofGroup.taskTitle} (Day {proofGroup.day})</h4>
                                                        <div className="text-sm text-gray-500">
                                                            {proofGroup.proofs.filter(p => p.status === 'completed').length} / {proofGroup.proofs.length} approved
                                                        </div>
                                                    </div>

                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full divide-y divide-gray-200">
                                                            <thead className="bg-gray-50">
                                                                <tr>
                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proof</th>
                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-white divide-y divide-gray-200">
                                                                {proofGroup.proofs.map((proof) => (
                                                                    <tr key={`${proofGroup.taskId}-${proof.userId}`}>
                                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={selectedProofs.some(p => p.taskId === proofGroup.taskId && p.userId === proof.userId)}
                                                                                onChange={() => toggleProofSelection(proofGroup.taskId, proof.userId)}
                                                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                                            />
                                                                        </td>
                                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                                            <div className="flex items-center">
                                                                                {proof.avatar ? (
                                                                                    <img className="h-10 w-10 rounded-full" src={proof.avatar} alt={proof.username} />
                                                                                ) : (
                                                                                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                                                        <span className="text-gray-500">{proof.username?.charAt(0)?.toUpperCase() || 'N/A'}</span>
                                                                                    </div>
                                                                                )}
                                                                                <div className="ml-4">
                                                                                    <div className="text-sm font-medium text-gray-900">{proof.username || 'N/A'}</div>
                                                                                    <div className="text-sm text-gray-500">{proof.email || 'N/A'}</div>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                                            <a
                                                                                href={proof.proofUrl}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="text-blue-600 hover:text-blue-800 text-sm"
                                                                            >
                                                                                View Proof
                                                                            </a>
                                                                        </td>
                                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${proof.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                                                proof.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                                                    'bg-yellow-100 text-yellow-800'
                                                                                }`}>
                                                                                {proof.status || 'pending'}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                            {proof.status !== 'completed' && (
                                                                                <button
                                                                                    onClick={() => handleApproveProof(proofGroup.taskId, proof.userId, true)}
                                                                                    className="text-green-600 hover:text-green-900 mr-4"
                                                                                >
                                                                                    <Check size={16} />
                                                                                </button>
                                                                            )}
                                                                            {proof.status !== 'rejected' && (
                                                                                <button
                                                                                    onClick={() => handleApproveProof(proofGroup.taskId, proof.userId, false)}
                                                                                    className="text-red-600 hover:text-red-900"
                                                                                >
                                                                                    <X size={16} />
                                                                                </button>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            No proofs submitted yet
                                        </div>
                                    )}
                                </div>
                            </TabPanel>
                        </Tabs>
                    </div>
                )}
            </main>

            {/* Campaign Form Modal */}
            <Modal
                isOpen={isModalOpen}
                onRequestClose={() => setIsModalOpen(false)}
                className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-auto my-8 overflow-y-auto"
                overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50"
                contentLabel="Campaign Form"
            >
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-gray-900">
                            {selectedCampaign ? 'Edit Campaign' : 'Create New Campaign'}
                        </h2>
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="text-gray-400 hover:text-gray-500"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                                    Title*
                                </label>
                                <input
                                    type="text"
                                    id="title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                                    Category*
                                </label>
                                <select
                                    id="category"
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    required
                                >
                                    <option value="Ocean">Ocean</option>
                                    <option value="Forest">Forest</option>
                                    <option value="Air">Air</option>
                                    <option value="Community">Community</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                    Description*
                                </label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
                                    Campaign Image
                                </label>
                                <input
                                    type="file"
                                    id="image"
                                    name="image"
                                    onChange={(e) => setFormData({ ...formData, image: e.target.files[0] })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    accept="image/*"
                                />
                                {selectedCampaign?.image && !formData.image && (
                                    <div className="mt-2">
                                        <img src={selectedCampaign.image} alt="Current" className="h-20 w-auto" />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label htmlFor="reward" className="block text-sm font-medium text-gray-700 mb-1">
                                    Reward (RFX)*
                                </label>
                                <input
                                    type="number"
                                    id="reward"
                                    name="reward"
                                    value={formData.reward}
                                    onChange={handleChange}
                                    step="0.00001"
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                                    Difficulty*
                                </label>
                                <select
                                    id="difficulty"
                                    name="difficulty"
                                    value={formData.difficulty}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    required
                                >
                                    <option value="Easy">Easy</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Hard">Hard</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                                    Duration (days)*
                                </label>
                                <input
                                    type="number"
                                    id="duration"
                                    name="duration"
                                    value={formData.duration}
                                    onChange={handleChange}
                                    min="1"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                                    Status*
                                </label>
                                <select
                                    id="status"
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    required
                                >
                                    <option value="active">Active</option>
                                    <option value="upcoming">Upcoming</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                                    Start Date*
                                </label>
                                <input
                                    type="date"
                                    id="startDate"
                                    name="startDate"
                                    value={formData.startDate}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                                    End Date (optional)
                                </label>
                                <input
                                    type="date"
                                    id="endDate"
                                    name="endDate"
                                    value={formData.endDate}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="featured"
                                    name="featured"
                                    checked={formData.featured}
                                    onChange={handleChange}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="featured" className="ml-2 block text-sm text-gray-700">
                                    Featured Campaign
                                </label>
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="new"
                                    name="new"
                                    checked={formData.new}
                                    onChange={handleChange}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="new" className="ml-2 block text-sm text-gray-700">
                                    New Campaign
                                </label>
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="trending"
                                    name="trending"
                                    checked={formData.trending}
                                    onChange={handleChange}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="trending" className="ml-2 block text-sm text-gray-700">
                                    Trending
                                </label>
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="ending"
                                    name="ending"
                                    checked={formData.ending}
                                    onChange={handleChange}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="ending" className="ml-2 block text-sm text-gray-700">
                                    Ending Soon
                                </label>
                            </div>
                        </div>

                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-gray-900">Tasks ({formData.tasksList.length})</h3>
                                <button
                                    type="button"
                                    onClick={() => setIsTaskModalOpen(true)}
                                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                                >
                                    <Plus size={16} />
                                    <span>Add Task</span>
                                </button>
                            </div>

                            {formData.tasksList.length > 0 ? (
                                <div className="space-y-3">
                                    {formData.tasksList.map((task, index) => (
                                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-medium">{task.title}</div>
                                                    <div className="text-sm text-gray-600">{task.description}</div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Day {task.day} • {task.type} • {task.reward} RFX
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
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4 text-gray-500 border border-gray-200 rounded-lg">
                                    No tasks added yet
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : 'Save Campaign'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Task Form Modal */}
            <Modal
                isOpen={isTaskModalOpen}
                onRequestClose={() => setIsTaskModalOpen(false)}
                className="bg-white rounded-lg shadow-xl max-w-md w-full mx-auto my-8 overflow-y-auto"
                overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50"
                contentLabel="Task Form"
            >
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-900">Add New Task</h2>
                        <button
                            onClick={() => setIsTaskModalOpen(false)}
                            className="text-gray-400 hover:text-gray-500"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleAddTask}>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label htmlFor="task-day" className="block text-sm font-medium text-gray-700 mb-1">
                                    Day Number*
                                </label>
                                <input
                                    type="number"
                                    id="task-day"
                                    name="day"
                                    value={taskForm.day}
                                    onChange={handleTaskChange}
                                    min="1"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="task-title" className="block text-sm font-medium text-gray-700 mb-1">
                                    Title*
                                </label>
                                <input
                                    type="text"
                                    id="task-title"
                                    name="title"
                                    value={taskForm.title}
                                    onChange={handleTaskChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="task-description" className="block text-sm font-medium text-gray-700 mb-1">
                                    Description*
                                </label>
                                <textarea
                                    id="task-description"
                                    name="description"
                                    value={taskForm.description}
                                    onChange={handleTaskChange}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="task-type" className="block text-sm font-medium text-gray-700 mb-1">
                                    Task Type*
                                </label>
                                <select
                                    id="task-type"
                                    name="type"
                                    value={taskForm.type}
                                    onChange={handleTaskChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    required
                                >
                                    <option value="social-follow">Social Follow</option>
                                    <option value="social-post">Social Post</option>
                                    <option value="video-watch">Video Watch</option>
                                    <option value="article-read">Article Read</option>
                                    <option value="discord-join">Discord Join</option>
                                    <option value="proof-upload">Proof Upload</option>
                                </select>
                            </div>

                            {(taskForm.type === 'social-follow' || taskForm.type === 'social-post') && (
                                <div>
                                    <label htmlFor="task-platform" className="block text-sm font-medium text-gray-700 mb-1">
                                        Platform*
                                    </label>
                                    <select
                                        id="task-platform"
                                        name="platform"
                                        value={taskForm.platform}
                                        onChange={handleTaskChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    >
                                        <option value="Twitter">Twitter</option>
                                        <option value="Facebook">Facebook</option>
                                        <option value="Instagram">Instagram</option>
                                        <option value="YouTube">YouTube</option>
                                        <option value="Discord">Discord</option>
                                        <option value="Telegram">Telegram</option>
                                        <option value="Reddit">Reddit</option>
                                        <option value="TikTok">TikTok</option>
                                        <option value="LinkedIn">LinkedIn</option>
                                    </select>
                                </div>
                            )}

                            {(taskForm.type === 'video-watch' || taskForm.type === 'article-read') && (
                                <div>
                                    <label htmlFor="task-contentUrl" className="block text-sm font-medium text-gray-700 mb-1">
                                        Content URL
                                    </label>
                                    <input
                                        type="url"
                                        id="task-contentUrl"
                                        name="contentUrl"
                                        value={taskForm.contentUrl}
                                        onChange={handleTaskChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <p className="mt-1 text-sm text-gray-500">Or upload content file below</p>
                                </div>
                            )}

                            {(taskForm.type === 'video-watch' || taskForm.type === 'article-read') && (
                                <div>
                                    <label htmlFor="task-contentFile" className="block text-sm font-medium text-gray-700 mb-1">
                                        Content File
                                    </label>
                                    <input
                                        type="file"
                                        id="task-contentFile"
                                        name="contentFile"
                                        onChange={handleTaskChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        accept={taskForm.type === 'video-watch' ? 'video/*' : 'application/pdf,text/*'}
                                    />
                                </div>
                            )}

                            <div>
                                <label htmlFor="task-reward" className="block text-sm font-medium text-gray-700 mb-1">
                                    Reward (RFX)*
                                </label>
                                <input
                                    type="number"
                                    id="task-reward"
                                    name="reward"
                                    value={taskForm.reward}
                                    onChange={handleTaskChange}
                                    step="0.00001"
                                    min="0"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="task-requirements" className="block text-sm font-medium text-gray-700 mb-1">
                                    Requirements (comma separated)
                                </label>
                                <input
                                    type="text"
                                    id="task-requirements"
                                    name="requirements"
                                    value={taskForm.requirements}
                                    onChange={handleTaskChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., Twitter account, Email verification"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={() => setIsTaskModalOpen(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                disabled={loading}
                            >
                                {loading ? 'Adding...' : 'Add Task'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
};

export default AdminCampaignDashboard;
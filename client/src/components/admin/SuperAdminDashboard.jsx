import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Trash2, Lock, User, Users, BarChart2, PieChart, Calendar, Activity, 
  Shield, FileText, Settings, LogOut, ArrowUp, ArrowDown
} from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';

// Error Boundary Component

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-red-500 p-4 bg-red-50 rounded">
          <p>Chart rendering error</p>
          {this.state.error && (
            <p className="text-xs mt-2">{this.state.error.message}</p>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

const SuperAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [admins, setAdmins] = useState([]);
  const [users, setUsers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState({
    admins: true,
    users: true,
    campaigns: true,
    stats: true
  });
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalAdmins: 0,
    dailySignups: [],
    userActivity: []
  });
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [newAdmin, setNewAdmin] = useState({
    username: '',
    email: '',
    fullName: '',
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const navigate = useNavigate();

  // Color palette for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  // Sample data for charts (replace with real data from your API)
  const userGrowthData = [
    { name: 'Jan', users: 400 },
    { name: 'Feb', users: 600 },
    { name: 'Mar', users: 800 },
    { name: 'Apr', users: 1000 },
    { name: 'May', users: 1200 },
    { name: 'Jun', users: 1500 },
  ];

  const campaignPerformanceData = [
    { name: 'Eco Challenge', participants: 400, completed: 240 },
    { name: 'Recycle Rally', participants: 300, completed: 180 },
    { name: 'Green Living', participants: 200, completed: 160 },
    { name: 'Zero Waste', participants: 500, completed: 350 },
    { name: 'Clean Energy', participants: 350, completed: 210 },
  ];

  const userActivityData = [
    { name: 'Mon', active: 4000, new: 2400 },
    { name: 'Tue', active: 3000, new: 1398 },
    { name: 'Wed', active: 2000, new: 9800 },
    { name: 'Thu', active: 2780, new: 3908 },
    { name: 'Fri', active: 1890, new: 4800 },
    { name: 'Sat', active: 2390, new: 3800 },
    { name: 'Sun', active: 3490, new: 4300 },
  ];

  const campaignStatusData = [
    { name: 'Active', value: 400 },
    { name: 'Completed', value: 300 },
    { name: 'Upcoming', value: 200 },
    { name: 'Draft', value: 100 },
  ];

  useEffect(() => {
    const verifySuperAdminStatus = async () => {
      const token = localStorage.getItem('authToken');
      console.log('Token from localStorage:', token);

      if (!token) {
        console.error('No token found, redirecting to login');
        navigate('/login', { state: { error: 'Please log in to access the dashboard' } });
        return;
      }

      try {
        const decoded = jwtDecode(token);
        console.log('Decoded token:', decoded);

        if (decoded.isSuperAdmin) {
          await fetchInitialData();
          return;
        }

        if (decoded.email === import.meta.env.VITE_SUPER_ADMIN_EMAIL) {
          console.log('Super admin email matched, needs passcode verification');
          setNeedsVerification(true);
          return;
        }

        console.error('Access denied - not super admin');
        navigate('/admin/dashboard', { state: { error: 'Super admin access required' } });
      } catch (err) {
        console.error('Token verification error:', err.message);
        setError('Invalid or expired token. Please log in again.');
        navigate('/login', { state: { error: 'Invalid or expired token' } });
      }
    };

    verifySuperAdminStatus();
  }, [navigate]);

  const fetchInitialData = async () => {
    try {
      await Promise.all([
        fetchAdmins(),
        fetchUsers(),
        fetchCampaigns(),
        fetchStatistics()
      ]);
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setError(err.message);
    }
  };

  const fetchAdmins = async () => {
    try {
      setLoading(prev => ({ ...prev, admins: true }));
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/admins`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch admins');
      }

      const data = await response.json();
      setAdmins(data);
    } catch (err) {
      console.error('Fetch admins error:', err);
      setError(err.message);
      if (err.message.includes('401')) {
        localStorage.removeItem('authToken');
        navigate('/login', { state: { error: 'Session expired. Please log in again.' } });
      } else if (err.message.includes('403')) {
        navigate('/admin/dashboard', { state: { error: 'Super admin access required' } });
      }
    } finally {
      setLoading(prev => ({ ...prev, admins: false }));
    }
  };

  const fetchUsers = async (page = 1, limit = 10) => {
    try {
      setLoading(prev => ({ ...prev, users: true }));
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/admin/users?page=${page}&limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch users');
      }

      const { data, pagination: paginationData } = await response.json();
      setUsers(data);
      setPagination(paginationData);
    } catch (err) {
      console.error('Fetch users error:', err);
      setError(err.message);
      if (err.message.includes('401')) {
        localStorage.removeItem('authToken');
        navigate('/login', { state: { error: 'Session expired. Please log in again.' } });
      } else if (err.message.includes('403')) {
        navigate('/admin/dashboard', { state: { error: 'Super admin access required' } });
      }
    } finally {
      setLoading(prev => ({ ...prev, users: false }));
    }
  };

  const fetchStatistics = async () => {
    try {
      setLoading(prev => ({ ...prev, stats: true }));
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch statistics');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Fetch statistics error:', err);
      setError(err.message);
      if (err.message.includes('401')) {
        localStorage.removeItem('authToken');
        navigate('/login', { state: { error: 'Session expired. Please log in again.' } });
      } else if (err.message.includes('403')) {
        navigate('/admin/dashboard', { state: { error: 'Super admin access required' } });
      }
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  };

  const fetchCampaigns = async () => {
    try {
      setLoading(prev => ({ ...prev, campaigns: true }));
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/campaigns`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403) {
          setError('Access denied: Super admin access required');
          navigate('/login', { state: { error: 'Super admin access required' } });
          return;
        }
        throw new Error(errorData.message || 'Failed to fetch campaigns');
      }

      const data = await response.json();
      setCampaigns(data);
    } catch (err) {
      console.error('Fetch campaigns error:', err);
      setError(err.message);
      if (err.message.includes('401')) {
        localStorage.removeItem('authToken');
        navigate('/login', { state: { error: 'Session expired. Please log in again.' } });
      }
    } finally {
      setLoading(prev => ({ ...prev, campaigns: false }));
    }
  };

  const handleVerifyPasscode = async () => {
    if (!passcode) {
      setError('Passcode is required');
      return;
    }
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/superadmin/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ passcode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Invalid passcode');
      }

      const data = await response.json();
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('isSuperAdmin', 'true');
      setNeedsVerification(false);
      setPasscode('');
      await fetchInitialData();
    } catch (err) {
      console.error('Passcode verification error:', err);
      setError(err.message);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newAdmin),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create admin');
      }

      const data = await response.json();
      setAdmins([...admins, data.admin]);
      setNewAdmin({ username: '', email: '', fullName: '' });
      setShowCreateForm(false);
      alert(`Admin created successfully! Temporary password: ${data.tempPassword}`);
    } catch (err) {
      console.error('Create admin error:', err);
      setError(err.message);
    }
  };

  const handleResetPassword = async (adminId) => {
    if (!window.confirm("Are you sure you want to reset this admin's password?")) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/admins/${adminId}/reset-password`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reset password');
      }

      const data = await response.json();
      alert(`Password reset successful! New temporary password: ${data.tempPassword}`);
    } catch (err) {
      console.error('Reset password error:', err);
      setError(err.message);
    }
  };

  const handleDeactivateAdmin = async (adminId) => {
    if (!window.confirm('Are you sure you want to deactivate this admin?')) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/admins/${adminId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to deactivate admin');
      }

      await fetchAdmins();
      alert('Admin deactivated successfully');
    } catch (err) {
      console.error('Deactivate admin error:', err);
      setError(err.message);
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete campaign');
      }

      await fetchCampaigns();
      alert('Campaign deleted successfully');
    } catch (err) {
      console.error('Delete campaign error:', err);
      setError(err.message);
    }
  };

  const handleSuspendUser = async (userId) => {
    if (!window.confirm('Are you sure you want to suspend this user?')) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/users/${userId}/suspend`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to suspend user');
      }

      await fetchUsers();
      alert('User suspended successfully');
    } catch (err) {
      console.error('Suspend user error:', err);
      setError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('isSuperAdmin');
    navigate('/login');
  };

  if (needsVerification) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center">Super Admin Verification</h2>
          {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Enter Passcode</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Super admin passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyPasscode()}
            />
          </div>
          <button
            onClick={handleVerifyPasscode}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700"
          >
            Verify
          </button>
        </div>
      </div>
    );
  }

  const renderDashboardTab = () => (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-semibold">{stats.totalUsers}</p>
              <p className="text-sm text-green-500 flex items-center">
                <ArrowUp className="w-4 h-4 mr-1" />
                <span>12% from last month</span>
              </p>
            </div>
            <div className="bg-indigo-100 p-3 rounded-full">
              <Users className="text-indigo-600 w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Users</p>
              <p className="text-2xl font-semibold">{stats.activeUsers}</p>
              <p className="text-sm text-green-500 flex items-center">
                <ArrowUp className="w-4 h-4 mr-1" />
                <span>8% from last week</span>
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <Activity className="text-green-600 w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Campaigns</p>
              <p className="text-2xl font-semibold">{stats.totalCampaigns}</p>
              <p className="text-sm text-green-500 flex items-center">
                <ArrowUp className="w-4 h-4 mr-1" />
                <span>5 new this month</span>
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <FileText className="text-blue-600 w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Campaigns</p>
              <p className="text-2xl font-semibold">{stats.activeCampaigns}</p>
              <p className="text-sm text-red-500 flex items-center">
                <ArrowDown className="w-4 h-4 mr-1" />
                <span>2 ending soon</span>
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <Calendar className="text-purple-600 w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">User Growth</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ErrorBoundary>
<AreaChart data={userGrowthData}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Area type="monotone" dataKey="users" stroke="#8884d8" fill="#8884d8" />
</AreaChart>
              </ErrorBoundary>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Campaign Status Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Campaign Status</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ErrorBoundary>
<PieChart>
  <Pie
    data={campaignStatusData}
    cx="50%"
    cy="50%"
    labelLine={false}
    outerRadius={80}
    fill="#8884d8"
    dataKey="value"
    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
  >
    {campaignStatusData.map((entry, index) => (
      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
    ))}
  </Pie>
  <Tooltip />
  <Legend />
</PieChart>
              </ErrorBoundary>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="flex items-start pb-4 border-b border-gray-100 last:border-0">
              <div className="bg-indigo-100 p-2 rounded-full mr-4">
                <User className="text-indigo-600 w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">New user registered</p>
                <p className="text-sm text-gray-500">User #{item} signed up via email</p>
                <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderUsersTab = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium">User Management</h3>
        <p className="text-sm text-gray-500">Manage all user accounts in the system</p>
      </div>
      
      {loading.users ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Loading users...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                        <div className="text-sm text-gray-500">{user.fullName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleSuspendUser(user._id)}
                      className={`mr-4 ${user.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                      title={user.isActive ? 'Suspend User' : 'Activate User'}
                    >
                      {user.isActive ? 'Suspend' : 'Activate'}
                    </button>
                    <button className="text-indigo-600 hover:text-indigo-900">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination Controls */}
          <div className="px-6 py-4 flex justify-between items-center border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} users)
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => fetchUsers(pagination.page - 1, pagination.limit)}
                disabled={pagination.page === 1}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => fetchUsers(pagination.page + 1, pagination.limit)}
                disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderCampaignsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium">Campaign Management</h3>
          <p className="text-sm text-gray-500">Manage all campaigns in the system</p>
        </div>
        
        {loading.campaigns ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500">Loading campaigns...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participants</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaigns.map((campaign) => (
                  <tr key={campaign._id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{campaign.title}</div>
                      <div className="text-sm text-gray-500">{campaign.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                        campaign.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{campaign.participants}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-indigo-600 h-2.5 rounded-full" 
                          style={{ width: `${(campaign.completedTasks / (campaign.tasksList?.length * campaign.participants || 1)) * 100}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {Math.round((campaign.completedTasks / (campaign.tasksList?.length * campaign.participants || 1)) * 100)}% complete
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{new Date(campaign.startDate).toLocaleDateString()}</div>
                      <div>to</div>
                      <div>{new Date(campaign.endDate).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-indigo-600 hover:text-indigo-900 mr-4">
                        View
                      </button>
                      <button 
                        onClick={() => handleDeleteCampaign(campaign._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Campaign Performance Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Campaign Performance</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ErrorBoundary>
<BarChart data={campaignPerformanceData}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Bar dataKey="participants" fill="#8884d8" name="Participants" />
  <Bar dataKey="completed" fill="#82ca9d" name="Completed" />
</BarChart>
            </ErrorBoundary>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderAdminsTab = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Admin Management</h3>
          <p className="text-sm text-gray-500">Manage all admin accounts in the system</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          {showCreateForm ? 'Cancel' : 'Add Admin'}
        </button>
      </div>

      {showCreateForm && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-md font-medium mb-4">Create New Admin</h4>
          <form onSubmit={handleCreateAdmin}>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  value={newAdmin.username}
                  onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  value={newAdmin.fullName}
                  onChange={(e) => setNewAdmin({ ...newAdmin, fullName: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Create Admin
              </button>
            </div>
          </form>
        </div>
      )}

      {loading.admins ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Loading admins...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {admins.map((admin) => (
                <tr key={admin._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{admin.fullName}</div>
                        <div className="text-sm text-gray-500">@{admin.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{admin.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      admin.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {admin.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {admin.email !== import.meta.env.VITE_SUPER_ADMIN_EMAIL && (
                      <>
                        <button
                          onClick={() => handleResetPassword(admin._id)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                          title="Reset Password"
                        >
                          <Lock className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeactivateAdmin(admin._id)}
                          className="text-red-600 hover:text-red-900"
                          title="Deactivate Admin"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-8">
      {/* User Activity Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">User Activity</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ErrorBoundary>
<LineChart data={userActivityData}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Line type="monotone" dataKey="active" stroke="#8884d8" activeDot={{ r: 8 }} />
  <Line type="monotone" dataKey="new" stroke="#82ca9d" />
</LineChart>
            </ErrorBoundary>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Campaign Participation */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Campaign Participation</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ErrorBoundary>
<BarChart data={campaignPerformanceData}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Bar dataKey="participants" fill="#8884d8" name="Participants" />
  <Bar dataKey="completed" fill="#82ca9d" name="Completed" />
</BarChart>
            </ErrorBoundary>
          </ResponsiveContainer>
        </div>
      </div>

      {/* User Demographics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">User Locations</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ErrorBoundary>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'North America', value: 400 },
                      { name: 'Europe', value: 300 },
                      { name: 'Asia', value: 200 },
                      { name: 'Africa', value: 100 },
                      { name: 'South America', value: 150 },
                      { name: 'Oceania', value: 50 },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {[1, 2, 3, 4, 5, 6].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
<Tooltip 
  contentStyle={{ 
    backgroundColor: '#fff', 
    border: '1px solid #eee',
    borderRadius: '4px',
    padding: '8px'
  }}
  itemStyle={{ 
    color: '#333',
    fontSize: '12px'
  }}
  formatter={(value) => [value, value === 'active' ? 'Active Users' : 'New Users']}
  labelFormatter={(label) => `Date: ${label}`}
/>
                  <Legend />
                </PieChart>
              </ErrorBoundary>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">User Devices</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ErrorBoundary>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Mobile', value: 600 },
                      { name: 'Desktop', value: 300 },
                      { name: 'Tablet', value: 100 },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {[1, 2, 3].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
<Tooltip 
  contentStyle={{ 
    backgroundColor: '#fff', 
    border: '1px solid #eee',
    borderRadius: '4px',
    padding: '8px'
  }}
  itemStyle={{ 
    color: '#333',
    fontSize: '12px'
  }}
  formatter={(value) => [value, value === 'active' ? 'Active Users' : 'New Users']}
  labelFormatter={(label) => `Date: ${label}`}
/>
                  <Legend />
                </PieChart>
              </ErrorBoundary>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 bg-indigo-700">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <h1 className="text-white text-xl font-bold">Super Admin</h1>
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full ${
                  activeTab === 'dashboard' ? 'bg-indigo-800 text-white' : 'text-indigo-100 hover:bg-indigo-600 hover:bg-opacity-75'
                }`}
              >
                <BarChart2 className="mr-3 h-5 w-5" />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full ${
                  activeTab === 'users' ? 'bg-indigo-800 text-white' : 'text-indigo-100 hover:bg-indigo-600 hover:bg-opacity-75'
                }`}
              >
                <Users className="mr-3 h-5 w-5" />
                Users
              </button>
              <button
                onClick={() => setActiveTab('campaigns')}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full ${
                  activeTab === 'campaigns' ? 'bg-indigo-800 text-white' : 'text-indigo-100 hover:bg-indigo-600 hover:bg-opacity-75'
                }`}
              >
                <FileText className="mr-3 h-5 w-5" />
                Campaigns
              </button>
              <button
                onClick={() => setActiveTab('admins')}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full ${
                  activeTab === 'admins' ? 'bg-indigo-800 text-white' : 'text-indigo-100 hover:bg-indigo-600 hover:bg-opacity-75'
                }`}
              >
                <Shield className="mr-3 h-5 w-5" />
                Admins
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full ${
                  activeTab === 'analytics' ? 'bg-indigo-800 text-white' : 'text-indigo-100 hover:bg-indigo-600 hover:bg-opacity-75'
                }`}
              >
                <PieChart className="mr-3 h-5 w-5" />
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full ${
                  activeTab === 'settings' ? 'bg-indigo-800 text-white' : 'text-indigo-100 hover:bg-indigo-600 hover:bg-opacity-75'
                }`}
              >
                <Settings className="mr-3 h-5 w-5" />
                Settings
              </button>
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-indigo-800 p-4">
            <button
              onClick={handleLogout}
              className="flex-shrink-0 w-full group block"
            >
              <div className="flex items-center">
                <div className="ml-3">
                  <p className="text-sm font-medium text-white group-hover:text-indigo-200">
                    Sign out
                  </p>
                </div>
                <LogOut className="ml-auto h-5 w-5 text-indigo-200 group-hover:text-white" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="md:pl-64 flex flex-col">
        {/* Mobile header */}
        <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-indigo-700">
          <div className="flex items-center justify-between">
            <h1 className="text-white text-xl font-bold px-4 py-2">Super Admin</h1>
            <button className="text-white p-2">
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
          <div className="flex overflow-x-auto py-2 space-x-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                activeTab === 'dashboard' ? 'bg-indigo-800 text-white' : 'text-indigo-200 hover:bg-indigo-600 hover:bg-opacity-75'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                activeTab === 'users' ? 'bg-indigo-800 text-white' : 'text-indigo-200 hover:bg-indigo-600 hover:bg-opacity-75'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                activeTab === 'campaigns' ? 'bg-indigo-800 text-white' : 'text-indigo-200 hover:bg-indigo-600 hover:bg-opacity-75'
              }`}
            >
              Campaigns
            </button>
            <button
              onClick={() => setActiveTab('admins')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                activeTab === 'admins' ? 'bg-indigo-800 text-white' : 'text-indigo-200 hover:bg-indigo-600 hover:bg-opacity-75'
              }`}
            >
              Admins
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                activeTab === 'analytics' ? 'bg-indigo-800 text-white' : 'text-indigo-200 hover:bg-indigo-600 hover:bg-opacity-75'
              }`}
            >
              Analytics
            </button>
          </div>
        </div>

        {/* Main area */}
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <h1 className="text-2xl font-semibold text-gray-900">
                {activeTab === 'dashboard' && 'Dashboard'}
                {activeTab === 'users' && 'User Management'}
                {activeTab === 'campaigns' && 'Campaign Management'}
                {activeTab === 'admins' && 'Admin Management'}
                {activeTab === 'analytics' && 'Analytics'}
                {activeTab === 'settings' && 'Settings'}
              </h1>
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-red-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'dashboard' && renderDashboardTab()}
              {activeTab === 'users' && renderUsersTab()}
              {activeTab === 'campaigns' && renderCampaignsTab()}
              {activeTab === 'admins' && renderAdminsTab()}
              {activeTab === 'analytics' && renderAnalyticsTab()}
              {activeTab === 'settings' && (
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium mb-4">System Settings</h3>
                  <p className="text-gray-500">Settings will be available soon</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
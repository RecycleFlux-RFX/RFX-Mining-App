import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Lock, User } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';

const SuperAdminDashboard = () => {
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [needsVerification, setNeedsVerification] = useState(false);
    const [passcode, setPasscode] = useState('');
    const [newAdmin, setNewAdmin] = useState({
        username: '',
        email: '',
        fullName: '',
    });
    const navigate = useNavigate();

    useEffect(() => {
        const verifySuperAdminStatus = async () => {
            const token = localStorage.getItem('authToken'); // Updated to authToken
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
                    await fetchAdmins();
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

    const fetchAdmins = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('authToken'); // Updated to authToken
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/admins`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Fetch admins failed:', errorData);
                throw new Error(errorData.message || 'Failed to fetch admins');
            }

            const data = await response.json();
            console.log('Fetched admins:', data);
            setAdmins(data);
            setLoading(false);
        } catch (err) {
            console.error('Fetch admins error:', err);
            setError(err.message);
            setLoading(false);
            if (err.message.includes('401')) {
                localStorage.removeItem('authToken'); // Updated to authToken
                navigate('/login', { state: { error: 'Session expired. Please log in again.' } });
            } else if (err.message.includes('403')) {
                navigate('/admin/dashboard', { state: { error: 'Super admin access required' } });
            }
        }
    };

    const handleVerifyPasscode = async () => {
        if (!passcode) {
            setError('Passcode is required');
            return;
        }
        try {
            const token = localStorage.getItem('authToken'); // Updated to authToken
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
                console.error('Passcode verification failed:', errorData);
                throw new Error(errorData.message || 'Invalid passcode');
            }

            const data = await response.json();
            console.log('Passcode verification response:', data);
            localStorage.setItem('authToken', data.token); // Updated to authToken
            localStorage.setItem('isSuperAdmin', 'true');
            setNeedsVerification(false);
            setPasscode('');
            await fetchAdmins();
        } catch (err) {
            console.error('Passcode verification error:', err);
            setError(err.message);
        }
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('authToken'); // Updated to authToken
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
            const token = localStorage.getItem('authToken'); // Updated to authToken
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
            const token = localStorage.getItem('authToken'); // Updated to authToken
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

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Admin Management</h1>
                    <button
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        {showCreateForm ? 'Cancel' : 'Add Admin'}
                    </button>
                </div>

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

                {showCreateForm && (
                    <div className="bg-white shadow rounded-lg p-6 mb-8">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Admin</h2>
                        <form onSubmit={handleCreateAdmin}>
                            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                <div className="sm:col-span-2">
                                    <label
                                        htmlFor="username"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        Username
                                    </label>
                                    <div className="mt-1">
                                        <input
                                            type="text"
                                            id="username"
                                            value={newAdmin.username}
                                            onChange={(e) =>
                                                setNewAdmin({ ...newAdmin, username: e.target.value })
                                            }
                                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="sm:col-span-2">
                                    <label
                                        htmlFor="email"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        Email
                                    </label>
                                    <div className="mt-1">
                                        <input
                                            type="email"
                                            id="email"
                                            value={newAdmin.email}
                                            onChange={(e) =>
                                                setNewAdmin({ ...newAdmin, email: e.target.value })
                                            }
                                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="sm:col-span-2">
                                    <label
                                        htmlFor="fullName"
                                        className="block text-sm font-medium text-gray-700"
                                    >
                                        Full Name
                                    </label>
                                    <div className="mt-1">
                                        <input
                                            type="text"
                                            id="fullName"
                                            value={newAdmin.fullName}
                                            onChange={(e) =>
                                                setNewAdmin({ ...newAdmin, fullName: e.target.value })
                                            }
                                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                            required
                                        />
                                    </div>
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

                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">Admin Accounts</h3>
                        <p className="mt-1 text-sm text-gray-500">Manage all admin accounts in the system</p>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                            <p className="mt-4 text-sm text-gray-500">Loading admins...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th
                                            scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Admin
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Email
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Status
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {admins.map((admin) => (
                                        <tr key={admin._id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                                        <User className="h-6 w-6 text-indigo-600" />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {admin.fullName}
                                                        </div>
                                                        <div className="text-sm text-gray-500">@{admin.username}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{admin.email}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                        admin.isActive
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-red-100 text-red-800'
                                                    }`}
                                                >
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
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
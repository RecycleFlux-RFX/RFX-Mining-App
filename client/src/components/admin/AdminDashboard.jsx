import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, List } from 'react-feather'; // Import List icon for campaigns

const AdminDashboard = () => {
    const navigate = useNavigate();

// AdminDashboard.jsx
const handleLogout = () => {
    // Clear all auth flags
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('adminAuthenticated');
    localStorage.removeItem('token'); // Add this
    navigate('/dashboard');
};

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => navigate('/admin/campaigns')}
                            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                        >
                            <List size={18} />
                            <span>Manage Campaigns</span>
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex items-center space-x-2 text-red-600 hover:text-red-800"
                        >
                            <LogOut size={18} />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-medium text-gray-900">Welcome to Admin Dashboard</h2>
                    <p className="mt-2 text-gray-600">Use the options above to manage campaigns or log out.</p>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
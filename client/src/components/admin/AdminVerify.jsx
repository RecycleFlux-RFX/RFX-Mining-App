import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Lock, AlertCircle } from 'lucide-react';

export default function AdminVerify() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();

    // Set initial email and password if provided
    useEffect(() => {
        const { state } = location;
        if (state?.email) {
            setEmail(state.email);
            if (state.password) {
                setPassword(state.password);
                handleSubmit(state.password);
            }
        } else {
            navigate('/login'); // Redirect to login if no email
        }
    }, [location, navigate]);

    const handleSubmit = async (pass = password) => {
        setIsLoading(true);
        setError(null);

        try {
            // First check if it's the hardcoded admin
            if (email === import.meta.env.VITE_ADMIN_EMAIL && pass === import.meta.env.VITE_ADMIN_PASSWORD) {
                const mockUser = {
                    id: 'admin',
                    email: import.meta.env.VITE_ADMIN_EMAIL,
                    isAdmin: true
                };

                localStorage.setItem('token', 'admin-token');
                localStorage.setItem('user', JSON.stringify(mockUser));
                localStorage.setItem('isAdmin', 'true');
                localStorage.setItem('adminAuthenticated', 'true');
                navigate('/admin/dashboard');
                return;
            }

            // If not hardcoded admin, check with backend
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/admin/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password: pass,
                }),
            });

            // Handle non-OK responses
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Store token and admin flag
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('isAdmin', 'true');
            localStorage.setItem('adminAuthenticated', 'true');

            // Redirect to admin dashboard
            navigate('/admin/dashboard');
        } catch (err) {
            console.error('Admin verification error:', err);
            setError(err.message || 'Failed to verify admin credentials. Please check your password.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        await handleSubmit();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden">
                <div className="p-6 sm:p-8">
                    <h1 className="text-2xl font-bold text-slate-900 mb-6">Admin Verification</h1>

                    {error && (
                        <div className="flex items-center space-x-2 p-4 bg-red-50 rounded-xl text-red-600 mb-6">
                            <AlertCircle className="w-5 h-5" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleFormSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Admin Password for {email}
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all ${isLoading
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                                }`}
                        >
                            {isLoading ? 'Verifying...' : 'Verify Admin'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
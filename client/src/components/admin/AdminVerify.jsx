import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Lock, AlertCircle } from 'lucide-react';

export default function AdminVerify() {
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();
    const { email, password: initialPassword } = location.state || {};

    // Set initial password and auto-submit if provided
    useEffect(() => {
        if (!email) {
            navigate('/login'); // Redirect to login if no email
        }
        if (initialPassword) {
            setPassword(initialPassword);
            handleAutoSubmit(initialPassword); // Auto-submit if password provided
        }
    }, [email, initialPassword]);

    const handleAutoSubmit = async (pass) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('http://localhost:3000/auth/admin/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password: pass,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Admin verification failed');
            }

            // Store token and admin flag
            localStorage.setItem('token', data.token); // Use 'token' instead of 'authToken'
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('isAdmin', 'true');

            // Redirect to admin campaigns
            navigate('/admin/campaigns');
        } catch (err) {
            console.error('Admin verification error:', err);
            setError(err.message || 'Failed to verify admin credentials');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await handleAutoSubmit(password); // Reuse the same logic
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

                    <form onSubmit={handleSubmit} className="space-y-6">
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
                                    disabled={isLoading || initialPassword} // Disable if auto-submitting
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || initialPassword}
                            className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all ${isLoading || initialPassword
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
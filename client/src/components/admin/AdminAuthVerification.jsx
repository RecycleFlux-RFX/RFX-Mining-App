import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, AlertCircle } from 'lucide-react';

const AdminAuthVerification = () => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // Check against admin credentials
            if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
                // Mark admin as authenticated
                localStorage.setItem('adminAuthenticated', 'true');
                localStorage.setItem('isAdmin', 'true');
                navigate('/admin/dashboard');
            } else {
                // Call backend for password verification
                const response = await fetch('/auth/admin-verify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ password }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Verification failed');
                }

                // Mark admin as authenticated
                localStorage.setItem('adminAuthenticated', 'true');
                localStorage.setItem('isAdmin', 'true');
                navigate('/admin/dashboard');
            }
        } catch (err) {
            setError(err.message || 'Verification failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden">
                <div className="p-6 sm:p-8 flex flex-col justify-center">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                            Admin Verification
                        </h1>
                        <p className="text-slate-600">
                            Please enter your admin password to continue
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center space-x-2 p-4 bg-red-50 rounded-xl text-red-600 mb-6">
                            <AlertCircle className="w-5 h-5" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                        {/* Password */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Admin Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-3 sm:py-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-slate-900 placeholder-slate-400"
                                    required
                                    aria-label="Password"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full py-3 sm:py-4 px-4 rounded-xl font-semibold text-white transition-all ${isLoading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 active:scale-95 shadow-lg'
                                }`}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center space-x-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Verifying...</span>
                                </div>
                            ) : (
                                'Verify Identity'
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-8 pt-6 border-t border-slate-200">
                        <p className="text-xs text-slate-500 text-center">
                            © {new Date().getFullYear()} Admin Portal. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAuthVerification;
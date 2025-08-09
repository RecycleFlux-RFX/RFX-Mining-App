import React, { useState } from 'react';
import { Eye, EyeOff, Lock, AlertCircle, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });
    const navigate = useNavigate();

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: formData.username,
                    password: formData.password,
                }),
            });

            const loginData = await response.json();

            if (!response.ok) {
                throw new Error(loginData.message || 'Login failed');
            }

            // Store token and user data
            localStorage.setItem('authToken', loginData.token);
            localStorage.setItem('user', JSON.stringify(loginData.user));
            
            if (loginData.user.isAdmin) {
                localStorage.setItem('isAdmin', 'true');
            }

            if (loginData.user.isSuperAdmin) {
                localStorage.setItem('isSuperAdmin', 'true');
            }

            // Redirect based on user role
            if (loginData.user.isAdmin || loginData.user.isSuperAdmin) {
                // All admin users go to verification page first
                navigate('/admin/verify', { 
                    state: { 
                        email: loginData.user.email,
                        isSuperAdmin: loginData.user.isSuperAdmin 
                    } 
                });
            } else {
                navigate('/dashboard');
            }

        } catch (err) {
            console.error('Login error:', err);
            setError(err.message || 'Failed to connect to the server. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden">
                <div className="p-6 sm:p-8 flex flex-col justify-center">
                    <div className="mb-8">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="w-8 h-8 bg-gradient-to-r from-cyan-600 to-teal-600 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                                    <line x1="4" y1="22" x2="4" y2="15" />
                                </svg>
                            </div>
                            <span className="text-lg font-semibold text-slate-800">RecycleFlux (RFX)</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                            Welcome back
                        </h1>
                        <p className="text-slate-600">
                            Enter your username or email to access your dashboard
                        </p>
                    </div>
                    {error && (
                        <div className="flex items-center space-x-2 p-4 bg-red-50 rounded-xl text-red-600 mb-6">
                            <AlertCircle className="w-5 h-5" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Username or Email</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => handleInputChange('username', e.target.value)}
                                    placeholder="Enter your username or email"
                                    className="w-full pl-10 pr-4 py-3 sm:py-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-slate-900 placeholder-slate-400"
                                    required
                                    aria-label="Username or Email"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={(e) => handleInputChange('password', e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-12 py-3 sm:py-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-slate-900 placeholder-slate-400"
                                    required
                                    aria-label="Password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 text-cyan-600 bg-white border-slate-300 rounded focus:ring-cyan-500 focus:ring-2"
                                    aria-label="Remember me for 30 days"
                                />
                                <span className="text-sm text-slate-600">Remember for 30 days</span>
                            </label>
                            <Link
                                to="/forgot-password"
                                className="text-sm text-cyan-600 hover:text-cyan-700 font-medium transition-colors"
                            >
                                Forgot password?
                            </Link>
                        </div>
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
                                    <span>Signing in...</span>
                                </div>
                            ) : (
                                'Sign in'
                            )}
                        </button>
                    </form>
                    <div className="text-center pt-4">
                        <span className="text-slate-600">Don't have an account? </span>
                        <Link
                            to="/signup"
                            className="text-cyan-600 hover:text-cyan-700 font-medium transition-colors"
                        >
                            Sign up
                        </Link>
                    </div>
                    <div className="mt-8 pt-6 border-t border-slate-200">
                        <p className="text-xs text-slate-500 text-center">
                            © {new Date().getFullYear()} RecycleFlux (RFX). All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
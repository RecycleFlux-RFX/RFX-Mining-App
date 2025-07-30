import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, Gift, CheckCircle, AlertCircle, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/api'; // Import the Axios instance

export default function Signup() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [passkey, setPasskey] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        fullName: '', // Added fullName field
        password: '',
        confirmPassword: ''
    });

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
    };

    const validatePasswordStrength = (password) => {
        const minLength = password.length >= 8;
        const hasLetters = /[a-zA-Z]/.test(password);
        const hasNumbers = /[0-9]/.test(password);
        const hasSymbols = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        return minLength && hasLetters && hasNumbers && hasSymbols;
    };

    const validateForm = () => {
        if (!formData.username.trim()) {
            setError('Username is required.');
            return false;
        }
        if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            setError('Valid email is required.');
            return false;
        }
        if (!formData.fullName.trim()) {
            setError('Full name is required.');
            return false;
        }
        if (!validatePasswordStrength(formData.password)) {
            setError('Password must be at least 8 characters long and include letters, numbers, and symbols.');
            return false;
        }
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match.');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setPasskey(null);

        if (!validateForm()) {
            setIsLoading(false);
            return;
        }

        try {
            console.log('Sending signup request with payload:', {
                username: formData.username,
                email: formData.email,
                fullName: formData.fullName, // Include fullName in payload
                password: formData.password
            });
            const response = await api.post('/auth/signup', {
                username: formData.username,
                email: formData.email,
                fullName: formData.fullName, // Include fullName in request
                password: formData.password
            });
            console.log('Signup response:', response.data);

            const { token, user, passkey: generatedPasskey } = response.data;

            localStorage.setItem('authToken', token);
            localStorage.setItem('rememberedKey', generatedPasskey);
            localStorage.setItem('user', JSON.stringify(user));

            setPasskey(generatedPasskey);
            console.log('Signup successful:', user);
            // Redirect to dashboard after successful signup
            window.location.href = '/dashboard';
        } catch (err) {
            console.error('Signup error:', err.response?.data);
            setError(err.response?.data?.message || 'Signup failed. Please try again.');
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
                                <Gift className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-lg font-semibold text-slate-800">RecycleFlux</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                            Create your account
                        </h1>
                        <p className="text-slate-600">
                            Create credentials to join RecycleFlux
                        </p>
                    </div>

                    {error && (
                        <div className="flex items-center space-x-2 p-4 bg-red-50 rounded-xl text-red-600 mb-6">
                            <AlertCircle className="w-5 h-5" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    {passkey && (
                        <div className="flex items-center space-x-2 p-4 bg-green-50 rounded-xl text-green-600 mb-6">
                            <CheckCircle className="w-5 h-5" />
                            <div className="text-sm">
                                <span>Use this passkey during login: </span>
                                <span className="font-mono font-bold text-green-700">{passkey}</span>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Username</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => handleInputChange('username', e.target.value)}
                                    placeholder="Enter your username"
                                    className="w-full pl-10 pr-4 py-3 sm:py-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-slate-900 placeholder-slate-400"
                                    required
                                    aria-label="Username"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={formData.fullName}
                                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                                    placeholder="Enter your full name"
                                    className="w-full pl-10 pr-4 py-3 sm:py-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-slate-900 placeholder-slate-400"
                                    required
                                    aria-label="Full Name"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    placeholder="Enter your email"
                                    className="w-full pl-10 pr-4 py-3 sm:py-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-slate-900 placeholder-slate-400"
                                    required
                                    aria-label="Email"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Create Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={(e) => handleInputChange('password', e.target.value)}
                                    placeholder="Create a strong password"
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
                            <p className="text-xs text-slate-500">
                                Minimum 8 characters with letters, numbers, and symbols
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={formData.confirmPassword}
                                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                    placeholder="Confirm your password"
                                    className="w-full pl-10 pr-12 py-3 sm:py-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-slate-900 placeholder-slate-400"
                                    required
                                    aria-label="Confirm password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-start space-x-2">
                            <input
                                type="checkbox"
                                required
                                className="w-4 h-4 text-cyan-600 bg-white border-slate-300 rounded focus:ring-cyan-500 focus:ring-2 mt-0.5"
                                aria-label="Agree to terms and privacy policy"
                            />
                            <span className="text-sm text-slate-600">
                                I agree to the{' '}
                                <button type="button" className="text-cyan-600 hover:text-cyan-700 font-medium">
                                    Terms of Service
                                </button>{' '}
                                and{' '}
                                <button type="button" className="text-cyan-600 hover:text-cyan-700 font-medium">
                                    Privacy Policy
                                </button>
                            </span>
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
                                    <span>Creating account...</span>
                                </div>
                            ) : (
                                'Create account'
                            )}
                        </button>

                        <div className="text-center pt-4">
                            <span className="text-slate-600">Already have an account? </span>
                            <Link
                                to="/login"
                                className="text-cyan-600 hover:text-cyan-700 font-medium transition-colors"
                            >
                                Sign in
                            </Link>
                        </div>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-200">
                        <p className="text-xs text-slate-500 text-center">
                            © {new Date().getFullYear()} RecycleFlux. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
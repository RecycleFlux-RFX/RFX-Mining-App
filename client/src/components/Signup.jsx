import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, User, CheckCircle, AlertCircle, Mail } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/api';

export default function Signup() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [passkey, setPasskey] = useState(null);
    const [referralStatus, setReferralStatus] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        fullName: '',
        password: '',
        confirmPassword: '',
        referralCode: ''
    });

    // Extract referral code from URL if present
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const refCode = params.get('ref');
        if (refCode) {
            setFormData(prev => ({ ...prev, referralCode: refCode }));
            setReferralStatus({
                code: refCode,
                valid: null,
                message: 'Referral code detected'
            });
        }
    }, [location.search]);

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
        setSuccess(null);
        setPasskey(null);

        if (!validateForm()) {
            setIsLoading(false);
            return;
        }

        try {
            // Prepare the data to send, excluding empty referral code
            const payload = {
                username: formData.username,
                email: formData.email,
                fullName: formData.fullName,
                password: formData.password,
                ...(formData.referralCode && { referralCode: formData.referralCode })
            };

            const response = await api.post('/auth/signup', payload);

            const { token, user, passkey: generatedPasskey, referralApplied } = response.data;

            // Store auth data
            localStorage.setItem('authToken', token);
            localStorage.setItem('rememberedKey', generatedPasskey);
            localStorage.setItem('user', JSON.stringify(user));

            // Show success message
            setPasskey(generatedPasskey);
            setSuccess('Account created successfully!');
            
            // Update referral status if applicable
            if (referralApplied) {
                setReferralStatus(prev => ({
                    ...prev,
                    valid: true,
                    message: 'Referral bonus applied!'
                }));
            }

            // Redirect after a short delay
            setTimeout(() => {
                navigate('/login', { replace: true });
            }, 2000);

        } catch (err) {
            console.error('Signup error:', err.response?.data);
            
            // Handle referral-specific errors
            if (err.response?.data?.message === 'Invalid referral') {
                const shouldContinue = window.confirm(
                    `${err.response.data.details}. Would you like to continue without the referral?`
                );
                
                if (shouldContinue) {
                    // Retry without referral code
                    try {
                        const retryResponse = await api.post('/auth/signup', {
                            username: formData.username,
                            email: formData.email,
                            fullName: formData.fullName,
                            password: formData.password
                        });

                        const { token, user, passkey: generatedPasskey } = retryResponse.data;
                        
                        localStorage.setItem('authToken', token);
                        localStorage.setItem('rememberedKey', generatedPasskey);
                        localStorage.setItem('user', JSON.stringify(user));
                        
                        setPasskey(generatedPasskey);
                        setSuccess('Account created successfully!');
                        setReferralStatus(null);
                        
                        setTimeout(() => {
                            navigate('/login', { replace: true });
                        }, 2000);
                        
                        return;
                    } catch (retryError) {
                        console.error('Retry signup error:', retryError);
                        setError(retryError.response?.data?.message || 'Signup failed. Please try again.');
                    }
                } else {
                    setReferralStatus(prev => ({
                        ...prev,
                        valid: false,
                        message: err.response.data.details
                    }));
                }
            } else {
                setError(err.response?.data?.message || 'Signup failed. Please try again.');
            }
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
                            Create your account
                        </h1>
                        <p className="text-slate-600">
                            Create credentials to join RecycleFlux (RFX)
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center space-x-2 p-4 bg-red-50 rounded-xl text-red-600 mb-6">
                            <AlertCircle className="w-5 h-5" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    {/* Success Message */}
                    {success && (
                        <div className="flex items-center space-x-2 p-4 bg-green-50 rounded-xl text-green-600 mb-6">
                            <CheckCircle className="w-5 h-5" />
                            <span className="text-sm">{success}</span>
                        </div>
                    )}

                    {/* Passkey Display */}
                    {passkey && (
                        <div className="flex items-start space-x-2 p-4 bg-blue-50 rounded-xl text-blue-600 mb-6">
                            <Lock className="w-5 h-5 mt-0.5 flex-shrink-0" />
                            <div className="text-sm">
                                <p className="font-medium">Your passkey:</p>
                                <p className="font-mono font-bold text-blue-700 break-all">{passkey}</p>
                                <p className="text-blue-500 mt-1">Save this securely for login.</p>
                            </div>
                        </div>
                    )}

                    {/* Referral Status */}
                    {referralStatus && (
                        <div className={`flex items-center space-x-2 p-4 rounded-xl mb-6 ${
                            referralStatus.valid === true ? 'bg-green-50 text-green-600' :
                            referralStatus.valid === false ? 'bg-yellow-50 text-yellow-600' :
                            'bg-blue-50 text-blue-600'
                        }`}>
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                                <line x1="4" y1="22" x2="4" y2="15" />
                            </svg>
                            <span className="text-sm">{referralStatus.message}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                        {/* Username Field */}
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

                        {/* Full Name Field */}
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

                        {/* Email Field */}
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

                        {/* Password Field */}
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

                        {/* Confirm Password Field */}
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

                        {/* Referral Code Field (only shown if not from URL) */}
                        {!location.search.includes('ref=') && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Referral Code (optional)</label>
                                <div className="relative">
                                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                                        <line x1="4" y1="22" x2="4" y2="15" />
                                    </svg>
                                    <input
                                        type="text"
                                        value={formData.referralCode}
                                        onChange={(e) => handleInputChange('referralCode', e.target.value)}
                                        placeholder="Enter referral code if you have one"
                                        className="w-full pl-10 pr-4 py-3 sm:py-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-slate-900 placeholder-slate-400"
                                        aria-label="Referral code"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Terms Checkbox */}
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

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full py-3 sm:py-4 px-4 rounded-xl font-semibold text-white transition-all ${
                                isLoading
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

                        {/* Login Link */}
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

                    {/* Footer */}
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
import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, Gift, CheckCircle, Wallet, AlertCircle } from 'lucide-react';

export default function AuthPages() {
    const [currentPage, setCurrentPage] = useState('login'); // 'login' or 'signup'
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [walletConnected, setWalletConnected] = useState(false);
    const [walletAddress, setWalletAddress] = useState('');
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: ''
    });

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const connectWallet = async () => {
        if (typeof window.ethereum !== 'undefined') {
            try {
                setIsLoading(true);
                const accounts = await window.ethereum.request({ method: 'eth_request_accounts' });
                if (accounts.length > 0) {
                    const address = accounts[0];
                    setWalletAddress(address);
                    setWalletConnected(true);
                }
            } catch (error) {
                console.error('Error connecting wallet:', error);
                // In a real app, show error notification
            } finally {
                setIsLoading(false);
            }
        } else {
            // MetaMask not installed
            window.open('https://metamask.io/download/', '_blank');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            // Handle success/error
        }, 2000);
    };

    const handleGoogleSignIn = () => {
        setIsLoading(true);
        setTimeout(() => setIsLoading(false), 1500);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
            {/* Main Container */}
            <div className="w-full max-w-6xl bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">

                    {/* Left Side - Form */}
                    <div className="p-6 sm:p-8 lg:p-12 flex flex-col justify-center">
                        {/* Header */}
                        <div className="mb-8">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="w-8 h-8 bg-gradient-to-r from-cyan-600 to-teal-600 rounded-lg flex items-center justify-center">
                                    <Gift className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-lg font-semibold text-slate-800">Free Airdrop</span>
                            </div>

                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
                                {currentPage === 'login' ? 'Welcome back' : 'Create your account'}
                            </h1>
                            <p className="text-slate-600">
                                {currentPage === 'login'
                                    ? 'Enter your email and password to access your dashboard'
                                    : 'Connect your wallet and create credentials to get started'
                                }
                            </p>
                        </div>

                        {/* Form */}
                        <div className="space-y-4 sm:space-y-6">
                            {/* MetaMask Wallet Connection (Signup only) */}
                            {currentPage === 'signup' && (
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-slate-700">Connect Wallet</label>
                                    {!walletConnected ? (
                                        <button
                                            onClick={connectWallet}
                                            disabled={isLoading}
                                            className="w-full p-4 border-2 border-dashed border-slate-300 rounded-xl hover:border-cyan-400 hover:bg-cyan-50 transition-all flex items-center justify-center space-x-3 group"
                                        >
                                            <Wallet className="w-6 h-6 text-slate-400 group-hover:text-cyan-500" />
                                            <div className="text-center">
                                                <div className="text-sm font-medium text-slate-700 group-hover:text-cyan-600">
                                                    {isLoading ? 'Connecting...' : 'Connect MetaMask Wallet'}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    Required to receive airdrop rewards
                                                </div>
                                            </div>
                                        </button>
                                    ) : (
                                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-3">
                                            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                                                <CheckCircle className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-emerald-700">Wallet Connected</div>
                                                <div className="text-xs text-emerald-600 font-mono">
                                                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {!walletConnected && (
                                        <div className="flex items-start space-x-2 text-xs text-amber-600 bg-amber-50 p-3 rounded-lg">
                                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                            <span>
                                                Don't have MetaMask? <button onClick={() => window.open('https://metamask.io/download/', '_blank')} className="underline hover:text-amber-700">Download here</button> to get started with crypto wallets.
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                            {/* Full Name (Signup only) */}
                            {currentPage === 'signup' && (
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
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Email */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">
                                    {currentPage === 'signup' ? 'Gmail Address' : 'Email'}
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                        placeholder={currentPage === 'signup' ? 'Enter your Gmail address' : 'Enter your email'}
                                        className="w-full pl-10 pr-4 py-3 sm:py-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-slate-900 placeholder-slate-400"
                                        required
                                    />
                                </div>
                                {currentPage === 'signup' && (
                                    <p className="text-xs text-slate-500">
                                        We'll use your Gmail for account verification and important updates
                                    </p>
                                )}
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">
                                    {currentPage === 'signup' ? 'Create Password' : 'Password'}
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={(e) => handleInputChange('password', e.target.value)}
                                        placeholder={currentPage === 'signup' ? 'Create a strong password' : '••••••••'}
                                        className="w-full pl-10 pr-12 py-3 sm:py-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-slate-900 placeholder-slate-400"
                                        required
                                    />
                                    <button
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {currentPage === 'signup' && (
                                    <p className="text-xs text-slate-500">
                                        Minimum 8 characters with letters, numbers, and symbols
                                    </p>
                                )}
                            </div>

                            {/* Confirm Password (Signup only) */}
                            {currentPage === 'signup' && (
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
                                        />
                                        <button
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Remember Me / Forgot Password (Login only) */}
                            {currentPage === 'login' && (
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="w-4 h-4 text-cyan-600 bg-white border-slate-300 rounded focus:ring-cyan-500 focus:ring-2"
                                        />
                                        <span className="text-sm text-slate-600">Remember for 30 days</span>
                                    </label>
                                    <button
                                        className="text-sm text-cyan-600 hover:text-cyan-700 font-medium transition-colors"
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                            )}

                            {/* Terms Agreement (Signup only) */}
                            {currentPage === 'signup' && (
                                <div className="flex items-start space-x-2">
                                    <input
                                        type="checkbox"
                                        required
                                        className="w-4 h-4 text-cyan-600 bg-white border-slate-300 rounded focus:ring-cyan-500 focus:ring-2 mt-0.5"
                                    />
                                    <span className="text-sm text-slate-600">
                                        I agree to the{' '}
                                        <button className="text-cyan-600 hover:text-cyan-700 font-medium">
                                            Terms of Service
                                        </button>{' '}
                                        and{' '}
                                        <button className="text-cyan-600 hover:text-cyan-700 font-medium">
                                            Privacy Policy
                                        </button>
                                    </span>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading || (currentPage === 'signup' && !walletConnected)}
                                className={`w-full py-3 sm:py-4 px-4 rounded-xl font-semibold text-white transition-all ${isLoading || (currentPage === 'signup' && !walletConnected)
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 active:scale-95 shadow-lg'
                                    }`}
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center space-x-2">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>{currentPage === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                                    </div>
                                ) : (
                                    currentPage === 'login' ? 'Sign in' : 'Create account'
                                )}
                            </button>

                            {/* Wallet Connection Warning for Signup */}
                            {currentPage === 'signup' && !walletConnected && (
                                <div className="flex items-center space-x-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>Connect your MetaMask wallet to continue with account creation</span>
                                </div>
                            )}

                            {/* Google Sign In - Login Only */}
                            {currentPage === 'login' && (
                                <button
                                    onClick={handleGoogleSignIn}
                                    disabled={isLoading}
                                    className="w-full py-3 sm:py-4 px-4 border border-slate-300 rounded-xl font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    <span>Sign in with Google</span>
                                </button>
                            )}

                            {/* Switch between Login/Signup */}
                            <div className="text-center pt-4">
                                <span className="text-slate-600">
                                    {currentPage === 'login' ? "Don't have an account? " : "Already have an account? "}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(currentPage === 'login' ? 'signup' : 'login')}
                                    className="text-cyan-600 hover:text-cyan-700 font-medium transition-colors"
                                >
                                    {currentPage === 'login' ? 'Sign up' : 'Sign in'}
                                </button>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-8 pt-6 border-t border-slate-200">
                            <p className="text-xs text-slate-500 text-center">
                                © {new Date().getFullYear()} Free Airdrop. All rights reserved.
                            </p>
                        </div>
                    </div>

                    {/* Right Side - Decorative */}
                    <div className="hidden lg:flex bg-gradient-to-br from-cyan-500 to-teal-600 relative overflow-hidden items-center justify-center">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full"></div>
                            <div className="absolute top-40 right-20 w-16 h-16 bg-white rounded-full"></div>
                            <div className="absolute bottom-20 left-16 w-12 h-12 bg-white rounded-full"></div>
                            <div className="absolute bottom-40 right-10 w-24 h-24 bg-white rounded-full"></div>
                        </div>

                        {/* Main Decorative Element */}
                        <div className="relative z-10 text-center text-white">
                            <div className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 mx-auto mb-8 bg-gradient-to-br from-white/20 to-white/5 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                                <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 bg-gradient-to-br from-cyan-300 to-teal-400 rounded-full flex items-center justify-center shadow-2xl">
                                    <Gift className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 text-white" />
                                </div>
                            </div>

                            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
                                {currentPage === 'login' ? 'Welcome Back!' : 'Start Your Journey'}
                            </h2>
                            <p className="text-cyan-100 text-lg max-w-md mx-auto">
                                {currentPage === 'login'
                                    ? 'Access your dashboard to track rewards, manage your wallet, and claim new airdrops.'
                                    : 'Connect your MetaMask wallet and Gmail to start earning crypto rewards through our secure platform.'
                                }
                            </p>

                            {/* Feature Highlights */}
                            <div className="mt-8 space-y-4 text-left max-w-sm mx-auto">
                                {currentPage === 'login' ? [
                                    'Access your dashboard',
                                    'Track reward history',
                                    'Manage wallet connections',
                                    'Claim pending airdrops'
                                ] : [
                                    'MetaMask wallet integration',
                                    'Gmail account verification',
                                    'Secure password protection',
                                    '24/7 platform support'
                                ].map((feature, index) => (
                                    <div key={index} className="flex items-center space-x-3">
                                        <CheckCircle className="w-5 h-5 text-cyan-200" />
                                        <span className="text-cyan-100">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Floating Elements */}
                        <div className="absolute top-20 left-20 w-6 h-6 bg-white/20 rounded-full animate-pulse"></div>
                        <div className="absolute bottom-32 right-32 w-4 h-4 bg-white/30 rounded-full animate-pulse delay-300"></div>
                        <div className="absolute top-1/2 left-8 w-2 h-2 bg-white/40 rounded-full animate-pulse delay-700"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
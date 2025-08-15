import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Home, MapPin, Gamepad2, Wallet, Settings,
    User, Shield, Bell, Globe, Moon, Sun,
    Volume2, VolumeX, Eye, EyeOff, Smartphone,
    Lock, CheckCircle, XCircle, AlertTriangle,
    Mail, Phone, Camera, Edit3, LogOut,
    HelpCircle, FileText, MessageSquare, Star,
    Users
} from 'lucide-react';

export default function RFXSettingsPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('settings');
    const [darkMode, setDarkMode] = useState(true);
    const [notifications, setNotifications] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [showBalance, setShowBalance] = useState(true);
    const [language, setLanguage] = useState('English');
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showComingSoon, setShowComingSoon] = useState(true);

    const BASE_URL = 'http://localhost:3000/user';

    const navItems = [
        { icon: Home, label: 'Home', id: 'home', path: '/dashboard' },
        { icon: MapPin, label: 'Campaign', id: 'campaign', path: '/campaign' },
        { icon: Gamepad2, label: 'Games', id: 'games', path: '/games' },
        { icon: Wallet, label: 'Wallet', id: 'wallet', path: '/wallet' },
        {
            icon: Settings,
            label: 'Settings',
            id: 'settings',
            path: '/settings',
            lockIcon: Lock,
            comingSoon: true
        },
    ];

    const userProfile = {
        name: 'Alex Rivera',
        email: 'alex.rivera@email.com',
        phone: '+1 (555) 123-4567',
        joinDate: 'March 2024',
        level: 12,
        kycStatus: 'verified',
        avatar: null
    };

    const languages = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese'];

    useEffect(() => {
        const currentNavItem = navItems.find((item) => item.path === location.pathname);
        if (currentNavItem) {
            setActiveTab(currentNavItem.id);
        }
    }, [location.pathname]);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            setError('Please log in to access settings');
            navigate('/dashboard');
        }
    }, [navigate]);

    return (
        <div className="w-full min-h-screen bg-gradient-to-br from-black via-gray-900 to-black overflow-hidden relative">
            {/* Coming Soon Overlay - Takes full screen except for bottom nav */}
            {showComingSoon && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm pb-24">
                    <div className="relative bg-gradient-to-br from-purple-900/80 to-blue-900/80 p-8 rounded-3xl border border-purple-500/30 max-w-md w-full mx-4">
                        <div className="absolute -top-3 -right-3 w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                            <Lock className="w-5 h-5" />
                        </div>
                        <h2 className="text-3xl font-bold text-center mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                            Coming Soon
                        </h2>
                        <p className="text-gray-300 text-center mb-6">
                            The Settings feature is currently under development and will be available in the next update.
                        </p>
                        <div className="flex justify-center">
                            <button 
                                onClick={() => {
                                    setShowComingSoon(false);
                                    navigate('/dashboard'); // Redirect to home when "Got It" is clicked
                                }}
                                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl text-white font-semibold hover:from-purple-600 hover:to-blue-600 transition-all"
                            >
                                Got It!
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Animated Background */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-t from-green-500/10 via-transparent to-transparent"></div>
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            {/* Main Content - Disabled when Coming Soon is shown */}
            <div className={`relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-24 ${showComingSoon ? 'opacity-30 pointer-events-none' : ''}`}>
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-center justify-between mb-8 pt-4 space-y-4 sm:space-y-0">
                    <div className="flex items-center space-x-3">
                        <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center transform rotate-12 transition-transform hover:rotate-0">
                                <Settings className="w-8 h-8 text-black" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-400 rounded-full animate-ping"></div>
                        </div>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                Settings
                            </h1>
                            <p className="text-gray-400 text-sm">Manage your account and preferences</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-gray-800 to-gray-700 rounded-full">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-gray-300 text-sm">Account Active</span>
                    </div>
                </div>

                {/* Rest of your settings page content remains here */}
                {/* ... */}
            </div>

            {/* Bottom Navigation - Always visible */}
            <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-lg border-t border-gray-800 px-4 py-3 z-20">
                <div className="max-w-lg mx-auto">
                    <div className="flex justify-around items-center">
                        {navItems.map((item) => (
                            <Link
                                key={item.id}
                                to={item.path}
                                className={`group flex flex-col items-center space-y-1 p-2 rounded-xl transition-all relative ${
                                    activeTab === item.id
                                        ? 'text-purple-400 bg-purple-400/10'
                                        : 'text-gray-400 hover:text-gray-300'
                                }`}
                                onClick={(e) => {
                                    if (item.comingSoon) {
                                        e.preventDefault();
                                        setShowComingSoon(true);
                                    }
                                }}
                            >
                                <div className="relative">
                                    <item.icon
                                        className={`w-6 h-6 transition-transform ${
                                            activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'
                                        }`}
                                    />
                                    {item.lockIcon && item.comingSoon && (
                                        <item.lockIcon
                                            className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 bg-gray-800 rounded-full p-0.5"
                                        />
                                    )}
                                </div>
                                <span className="text-xs font-medium">{item.label}</span>
                            </Link>
                        ))}
                    </div>
                    <div className="flex justify-center mt-3">
                        <div className="w-32 h-1 bg-white/20 rounded-full"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
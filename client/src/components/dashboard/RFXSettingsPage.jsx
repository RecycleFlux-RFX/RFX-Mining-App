import React, { useState, useEffect } from 'react'; // Added useEffect
import { Link, useLocation, useNavigate } from 'react-router-dom'; // Added useNavigate
import {
    Home, MapPin, Gamepad2, Wallet, Settings,
    User, Shield, Bell, Globe, Moon, Sun,
    Volume2, VolumeX, Eye, EyeOff, Smartphone,
    Lock, CheckCircle, XCircle, AlertTriangle,
    Mail, Phone, Camera, Edit3, LogOut,
    HelpCircle, FileText, MessageSquare, Star
} from 'lucide-react';

export default function RFXSettingsPage() {
    const location = useLocation();
    const navigate = useNavigate(); // Added for navigation
    const [activeTab, setActiveTab] = useState('settings');
    const [darkMode, setDarkMode] = useState(true);
    const [notifications, setNotifications] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [showBalance, setShowBalance] = useState(true);
    const [language, setLanguage] = useState('English');
    const [error, setError] = useState(null); // Added for error handling

    const BASE_URL = 'http://localhost:3000/user'; // Added for API calls

const navItems = [
    { icon: Home, label: 'Home', id: 'home', path: '/' },
    { icon: MapPin, label: 'Campaign', id: 'campaign', path: '/campaign' },
    { icon: Gamepad2, label: 'Games', id: 'games', path: '/games' },
    { icon: Users, label: 'Referrals', id: 'referrals', path: '/referrals' },
    { icon: Wallet, label: 'Wallet', id: 'wallet', path: '/wallet' },
    { icon: Settings, label: 'Settings', id: 'settings', path: '/settings' },
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

    // Set active tab based on current path
    useEffect(() => {
        const currentNavItem = navItems.find((item) => item.path === location.pathname);
        if (currentNavItem) {
            setActiveTab(currentNavItem.id);
        }
    }, [location.pathname]);

    // Redirect to login if no token
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.log('No auth token found, redirecting to login');
            setError('Please log in to access settings');
            navigate('/login');
        }
    }, [navigate]);

    // Fetch user data
    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.log('No auth token found, redirecting to login');
                setError('Please log in to access settings');
                navigate('/login');
                return;
            }

            console.log('Fetching user data, network stats, and referral link...');
            try {
                const headers = {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                };

                const [userResponse, statsResponse, referralResponse] = await Promise.all([
                    fetch(`${BASE_URL}/user`, {
                        method: 'GET',
                        headers,
                    }),
                    fetch(`${BASE_URL}/network-stats`, {
                        method: 'GET',
                        headers,
                    }),
                    fetch(`${BASE_URL}/referral-link`, {
                        method: 'GET',
                        headers,
                    }),
                ]);

                // Check response status for each request
                if (!userResponse.ok) {
                    const errorData = await userResponse.json();
                    throw new Error(errorData.message || 'Failed to fetch user data');
                }
                if (!statsResponse.ok) {
                    const errorData = await statsResponse.json();
                    throw new Error(errorData.message || 'Failed to fetch network stats');
                }
                if (!referralResponse.ok) {
                    const errorData = await referralResponse.json();
                    throw new Error(errorData.message || 'Failed to fetch referral link');
                }

                // Parse JSON responses
                const userDataResult = await userResponse.json();
                const statsDataResult = await statsResponse.json();
                const referralDataResult = await referralResponse.json();

                console.log('User data gotten:', userDataResult);
                console.log('Network stats gotten:', statsDataResult);
                console.log('Referral link gotten:', referralDataResult.referralLink);
            } catch (error) {
                console.error('Error fetching data:', error.message);
                setError(error.message || 'Failed to fetch data. Please try again.');
                if (error.message.includes('Authentication') || error.message.includes('Invalid token')) {
                    console.log('Authentication error, redirecting to login');
                    localStorage.removeItem('authToken'); // Clear invalid token
                    navigate('/login');
                }
            }
        };

        fetchData();
    }, [navigate]);

    return (
        <div className="w-full min-h-screen bg-gradient-to-br from-black via-gray-900 to-black overflow-hidden relative">
            {/* Animated Background */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-t from-green-500/10 via-transparent to-transparent"></div>
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

                {/* Floating Particles */}
                {[...Array(15)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-green-400 rounded-full animate-float opacity-50"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${10 + Math.random() * 10}s`
                        }}
                    ></div>
                ))}
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-24">
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

                {/* Profile Section */}
                <div className="relative group mb-8">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-600/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all"></div>
                    <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 border border-gray-700 overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-400/10 rounded-full blur-3xl transform translate-x-32 -translate-y-32"></div>

                        <div className="relative z-10">
                            <div className="flex items-center space-x-2 mb-6">
                                <User className="w-6 h-6 text-purple-400" />
                                <h2 className="text-xl font-bold text-white">Profile Information</h2>
                            </div>

                            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                                <div className="relative">
                                    <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-600 rounded-2xl flex items-center justify-center">
                                        <User className="w-10 h-10 text-black" />
                                    </div>
                                    <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center hover:bg-green-500 transition-all">
                                        <Camera className="w-3 h-3 text-black" />
                                    </button>
                                </div>

                                <div className="flex-1">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-gray-400 text-sm mb-1">Full Name</div>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-white font-semibold">{userProfile.name}</span>
                                                <button className="text-gray-400 hover:text-white">
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-gray-400 text-sm mb-1">Level</div>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-yellow-400 font-bold">Level {userProfile.level}</span>
                                                <Star className="w-4 h-4 text-yellow-400" />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-gray-400 text-sm mb-1">Email</div>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-white">{userProfile.email}</span>
                                                <button className="text-gray-400 hover:text-white">
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-gray-400 text-sm mb-1">Member Since</div>
                                            <span className="text-white">{userProfile.joinDate}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* KYC Section */}
                <div className="relative group mb-8">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-600/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all"></div>
                    <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 border border-gray-700 overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-green-400/10 rounded-full blur-3xl transform translate-x-32 -translate-y-32"></div>

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center space-x-3">
                                    <Shield className="w-6 h-6 text-green-400" />
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Identity Verification (KYC)</h2>
                                        <p className="text-gray-400 text-sm">Verify your identity to unlock all features</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 px-3 py-1 bg-green-400/20 rounded-full">
                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                    <span className="text-green-400 text-sm font-semibold">Verified</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="flex items-center space-x-3 p-4 bg-gray-800/50 rounded-xl">
                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                    <div>
                                        <div className="text-white font-semibold text-sm">Identity Document</div>
                                        <div className="text-gray-400 text-xs">Verified</div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3 p-4 bg-gray-800/50 rounded-xl">
                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                    <div>
                                        <div className="text-white font-semibold text-sm">Address Proof</div>
                                        <div className="text-gray-400 text-xs">Verified</div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3 p-4 bg-gray-800/50 rounded-xl">
                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                    <div>
                                        <div className="text-white font-semibold text-sm">Selfie Verification</div>
                                        <div className="text-gray-400 text-xs">Verified</div>
                                    </div>
                                </div>
                            </div>

                            <button
                                disabled
                                className="w-full bg-gray-600 text-gray-400 font-bold py-4 rounded-2xl text-lg cursor-not-allowed flex items-center justify-center space-x-2 opacity-50"
                            >
                                <Lock className="w-5 h-5" />
                                <span>KYC ALREADY COMPLETED</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Settings Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* App Preferences */}
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 border border-gray-700">
                        <div className="flex items-center space-x-3 mb-6">
                            <Smartphone className="w-6 h-6 text-blue-400" />
                            <h3 className="text-xl font-bold text-white">App Preferences</h3>
                        </div>

                        <div className="space-y-6">
                            {/* Dark Mode */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    {darkMode ? <Moon className="w-5 h-5 text-blue-400" /> : <Sun className="w-5 h-5 text-yellow-400" />}
                                    <div>
                                        <div className="text-white font-semibold">Dark Mode</div>
                                        <div className="text-gray-400 text-sm">Use dark theme</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDarkMode(!darkMode)}
                                    className={`relative w-12 h-6 rounded-full transition-all ${darkMode ? 'bg-green-400' : 'bg-gray-600'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${darkMode ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>

                            {/* Language */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <Globe className="w-5 h-5 text-green-400" />
                                    <div>
                                        <div className="text-white font-semibold">Language</div>
                                        <div className="text-gray-400 text-sm">App language</div>
                                    </div>
                                </div>
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-green-400"
                                >
                                    {languages.map((lang) => (
                                        <option key={lang} value={lang}>{lang}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Show Balance */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    {showBalance ? <Eye className="w-5 h-5 text-purple-400" /> : <EyeOff className="w-5 h-5 text-gray-400" />}
                                    <div>
                                        <div className="text-white font-semibold">Show Balance</div>
                                        <div className="text-gray-400 text-sm">Display wallet balance</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowBalance(!showBalance)}
                                    className={`relative w-12 h-6 rounded-full transition-all ${showBalance ? 'bg-green-400' : 'bg-gray-600'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${showBalance ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>

                            {/* Sound */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    {soundEnabled ? <Volume2 className="w-5 h-5 text-yellow-400" /> : <VolumeX className="w-5 h-5 text-gray-400" />}
                                    <div>
                                        <div className="text-white font-semibold">Sound Effects</div>
                                        <div className="text-gray-400 text-sm">Game and app sounds</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSoundEnabled(!soundEnabled)}
                                    className={`relative w-12 h-6 rounded-full transition-all ${soundEnabled ? 'bg-green-400' : 'bg-gray-600'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${soundEnabled ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Security & Privacy */}
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 border border-gray-700">
                        <div className="flex items-center space-x-3 mb-6">
                            <Lock className="w-6 h-6 text-red-400" />
                            <h3 className="text-xl font-bold text-white">Security & Privacy</h3>
                        </div>

                        <div className="space-y-6">
                            {/* Notifications */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <Bell className="w-5 h-5 text-blue-400" />
                                    <div>
                                        <div className="text-white font-semibold">Push Notifications</div>
                                        <div className="text-gray-400 text-sm">Receive updates and alerts</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setNotifications(!notifications)}
                                    className={`relative w-12 h-6 rounded-full transition-all ${notifications ? 'bg-green-400' : 'bg-gray-600'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifications ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>

                            {/* Biometric */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <Shield className="w-5 h-5 text-green-400" />
                                    <div>
                                        <div className="text-white font-semibold">Biometric Login</div>
                                        <div className="text-gray-400 text-sm">Use fingerprint or face ID</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setBiometricEnabled(!biometricEnabled)}
                                    className={`relative w-12 h-6 rounded-full transition-all ${biometricEnabled ? 'bg-green-400' : 'bg-gray-600'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${biometricEnabled ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>

                            {/* Change Password */}
                            <button className="w-full flex items-center justify-between p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800/70 transition-all group">
                                <div className="flex items-center space-x-3">
                                    <Lock className="w-5 h-5 text-orange-400" />
                                    <div className="text-left">
                                        <div className="text-white font-semibold">Change Password</div>
                                        <div className="text-gray-400 text-sm">Update your password</div>
                                    </div>
                                </div>
                                <div className="text-gray-400 group-hover:text-white transition-all">→</div>
                            </button>

                            {/* Two-Factor Authentication */}
                            <button className="w-full flex items-center justify-between p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800/70 transition-all group">
                                <div className="flex items-center space-x-3">
                                    <Shield className="w-5 h-5 text-purple-400" />
                                    <div className="text-left">
                                        <div className="text-white font-semibold">Two-Factor Authentication</div>
                                        <div className="text-gray-400 text-sm">Add extra security layer</div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-green-400 text-xs font-semibold">ENABLED</span>
                                    <div className="text-gray-400 group-hover:text-white transition-all">→</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Support & Legal */}
                <div className="mt-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 border border-gray-700">
                    <div className="flex items-center space-x-3 mb-6">
                        <HelpCircle className="w-6 h-6 text-yellow-400" />
                        <h3 className="text-xl font-bold text-white">Support & Legal</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { icon: MessageSquare, title: 'Help Center', desc: 'Get support', color: 'blue' },
                            { icon: FileText, title: 'Terms of Service', desc: 'Legal terms', color: 'purple' },
                            { icon: Shield, title: 'Privacy Policy', desc: 'Data protection', color: 'green' },
                            { icon: Star, title: 'Rate App', desc: 'Leave feedback', color: 'yellow' }
                        ].map((item, index) => (
                            <button key={index} className="p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800/70 transition-all group">
                                <div className="flex flex-col items-center space-y-2 text-center">
                                    <div className={`w-10 h-10 bg-gradient-to-br ${item.color === 'blue' ? 'from-blue-400 to-blue-600' :
                                        item.color === 'purple' ? 'from-purple-400 to-purple-600' :
                                            item.color === 'green' ? 'from-green-400 to-green-600' :
                                                'from-yellow-400 to-yellow-600'
                                        } rounded-lg flex items-center justify-center transform group-hover:rotate-12 transition-transform`}>
                                        <item.icon className="w-5 h-5 text-black" />
                                    </div>
                                    <div>
                                        <div className="text-white font-semibold text-sm">{item.title}</div>
                                        <div className="text-gray-400 text-xs">{item.desc}</div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Logout Button */}
                <div className="mt-8 text-center">
                    <button className="flex items-center space-x-2 px-6 py-3 bg-red-600/20 border border-red-600/50 text-red-400 rounded-xl hover:bg-red-600/30 transition-all mx-auto">
                        <LogOut className="w-5 h-5" />
                        <span className="font-semibold">Sign Out</span>
                    </button>
                </div>
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-lg border-t border-gray-800 px-4 py-3 z-20">
                <div className="max-w-lg mx-auto">
                    <div className="flex justify-around items-center">
                        {navItems.map((item) => (
                            <Link
                                key={item.id}
                                to={item.path}
                                className={`group flex flex-col items-center space-y-1 p-2 rounded-xl transition-all ${activeTab === item.id
                                    ? 'text-purple-400 bg-purple-400/10'
                                    : 'text-gray-400 hover:text-gray-300'
                                    }`}
                            >
                                <item.icon className={`w-6 h-6 transition-transform ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'
                                    }`} />
                                <span className="text-xs font-medium">{item.label}</span>
                            </Link>
                        ))}
                    </div>

                    {/* Home Indicator */}
                    <div className="flex justify-center mt-3">
                        <div className="w-32 h-1 bg-white/20 rounded-full"></div>
                    </div>
                </div>
            </div>

            <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        .animate-float {
          animation: float 10s ease-in-out infinite;
        }
        
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
        </div>
    );
}
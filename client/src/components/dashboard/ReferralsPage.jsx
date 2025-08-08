import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, Coins, Clock, Sparkles } from 'lucide-react';

export default function ReferralsPage() {
    const [referrals, setReferrals] = useState([]);
    const [stats, setStats] = useState({
        totalEarned: 0,
        activeReferrals: 0,
        potentialEarnings: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    const BASE_URL = 'http://localhost:3000'; // Or use process.env.REACT_APP_API_URL

    const fetchWithAuth = async (url, options = {}) => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('No authentication token found');
        }

        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...options.headers
        };

        // Ensure proper URL formatting
        const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
        
        const response = await fetch(fullUrl, { 
            ...options, 
            headers 
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Request failed with status ${response.status}`);
        }

        return await response.json();
    };

    useEffect(() => {
        const fetchReferrals = async () => {
            try {
                // Note the leading slash here
                const response = await fetchWithAuth('/user/referral-info');
                setReferrals(response.referrals);
                setStats({
                    totalEarned: response.referralEarnings,
                    activeReferrals: response.referrals.filter(r => r.earnings > 0).length,
                    potentialEarnings: response.referrals.reduce((sum, r) => sum + (r.earnings * 0.2), 0)
                });
                setIsLoading(false);
            } catch (error) {
                console.error('Failed to fetch referrals:', error);
                setIsLoading(false);
                // You might want to add user feedback here
            }
        };
        
        fetchReferrals();
    }, []);


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center mb-6">
                <Link to="/" className="mr-4 p-2 rounded-full hover:bg-gray-800">
                    <ArrowLeft className="w-5 h-5 text-gray-400" />
                </Link>
                <h1 className="text-2xl font-bold text-white">Your Referrals</h1>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700">
                    <div className="flex items-center space-x-3 mb-2">
                        <Users className="w-6 h-6 text-green-400" />
                        <h3 className="text-lg font-semibold text-white">Total Referrals</h3>
                    </div>
                    <div className="text-3xl font-bold text-white">{referrals.length}</div>
                </div>
                
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700">
                    <div className="flex items-center space-x-3 mb-2">
                        <Coins className="w-6 h-6 text-yellow-400" />
                        <h3 className="text-lg font-semibold text-white">Total Earned</h3>
                    </div>
                    <div className="text-3xl font-bold text-white">RFX {stats.totalEarned.toFixed(5)}</div>
                </div>
                
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700">
                    <div className="flex items-center space-x-3 mb-2">
                        <Sparkles className="w-6 h-6 text-purple-400" />
                        <h3 className="text-lg font-semibold text-white">Potential Earnings</h3>
                    </div>
                    <div className="text-3xl font-bold text-white">RFX {stats.potentialEarnings.toFixed(5)}</div>
                </div>
            </div>
            
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700">
                <h2 className="text-xl font-bold text-white mb-6">Referral History</h2>
                
                {referrals.length === 0 ? (
                    <div className="text-center py-8">
                        <Users className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                        <p className="text-gray-400">No referrals yet. Share your link to earn rewards!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {referrals.map((referral, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center text-white font-bold">
                                        {referral.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="text-white font-medium">{referral.username}</h4>
                                        <p className="text-gray-400 text-sm">
                                            Joined {new Date(referral.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-green-400 font-medium">
                                        RFX {(referral.earnings * 0.2).toFixed(5)}
                                    </div>
                                    <div className="text-gray-400 text-sm">
                                        from RFX {referral.earnings.toFixed(5)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="mt-8 bg-gradient-to-br from-green-900/20 to-green-800/20 rounded-2xl p-6 border border-green-700/50">
                <h3 className="text-lg font-bold text-white mb-4">How It Works</h3>
                <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-green-400/20 text-green-400 flex items-center justify-center flex-shrink-0 mt-1">
                            1
                        </div>
                        <div>
                            <h4 className="text-white font-medium">Share Your Link</h4>
                            <p className="text-gray-400 text-sm">
                                Share your unique referral link with friends and earn 20% of their earnings.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-green-400/20 text-green-400 flex items-center justify-center flex-shrink-0 mt-1">
                            2
                        </div>
                        <div>
                            <h4 className="text-white font-medium">They Sign Up</h4>
                            <p className="text-gray-400 text-sm">
                                Your friends sign up using your link and start using the app.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-green-400/20 text-green-400 flex items-center justify-center flex-shrink-0 mt-1">
                            3
                        </div>
                        <div>
                            <h4 className="text-white font-medium">Earn Together</h4>
                            <p className="text-gray-400 text-sm">
                                You earn 20% of all RFX tokens they earn through the app.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
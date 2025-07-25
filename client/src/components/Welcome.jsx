import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Recycle, Coins, Users, Leaf, Zap, Globe } from 'lucide-react';

export default function RecycleFluxWelcome() {
    const navigate = useNavigate();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % 3);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    const handleGetStarted = () => {
        navigate('/onboarding/1');
    };

    const features = [
        {
            icon: Recycle,
            title: "Recycle & Earn",
            description: "Turn your waste into crypto rewards through our innovative recycling ecosystem"
        },
        {
            icon: Coins,
            title: "Crypto Rewards",
            description: "Earn Bitcoin and other cryptocurrencies for every eco-friendly action you take"
        },
        {
            icon: Users,
            title: "Community Impact",
            description: "Join thousands of users making a real difference for our planet's future"
        }
    ];

    const stats = [
        { value: "1M+", label: "Items Recycled" },
        { value: "50K+", label: "Active Users" },
        { value: "₿ 100+", label: "Rewards Distributed" },
        { value: "25", label: "Countries" }
    ];

    const FeatureIcon = features[currentSlide].icon;

    return (
        <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-green-900 text-white overflow-hidden relative">
            {/* Animated Background */}
            <div className="absolute inset-0">
                <div className="absolute top-10 left-10 w-32 h-32 bg-green-400/10 rounded-full animate-pulse"></div>
                <div className="absolute top-40 right-20 w-20 h-20 bg-green-500/20 rounded-full animate-bounce delay-300"></div>
                <div className="absolute bottom-32 left-20 w-24 h-24 bg-green-600/15 rounded-full animate-pulse delay-700"></div>
                <div className="absolute bottom-20 right-16 w-16 h-16 bg-green-400/20 rounded-full animate-bounce delay-1000"></div>

                {/* Floating Particles */}
                {[...Array(15)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 bg-green-400/30 rounded-full animate-float"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${3 + Math.random() * 4}s`
                        }}
                    ></div>
                ))}
            </div>

            <div className="relative z-10 flex flex-col min-h-screen">
                {/* Header */}
                <header className="p-6 sm:p-8">
                    <div className={`flex items-center space-x-3 transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}`}>
                        <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/25">
                            <Recycle className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
                                RecycleFlux
                            </h1>
                            <p className="text-green-400/80 text-sm">Waste to Wealth Revolution</p>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 flex flex-col justify-center px-6 sm:px-8 py-8">
                    {/* Hero Section */}
                    <div className={`text-center mb-12 transition-all duration-1000 delay-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                        <div className="mb-8">
                            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
                                Transform Your
                                <span className="block bg-gradient-to-r from-green-400 via-green-500 to-emerald-400 bg-clip-text text-transparent">
                                    Waste into Wealth
                                </span>
                            </h2>
                            <p className="text-xl sm:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                                Join the sustainable future where every recycled item earns you cryptocurrency rewards
                            </p>
                        </div>

                        {/* Animated Icon Display */}
                        <div className="relative mb-12">
                            <div className="w-32 h-32 sm:w-40 sm:h-40 mx-auto bg-gradient-to-br from-green-400/20 to-green-600/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-green-400/30">
                                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
                                    <FeatureIcon className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                                </div>
                            </div>
                            <div className="mt-6">
                                <h3 className="text-2xl font-bold text-green-400 mb-2">{features[currentSlide].title}</h3>
                                <p className="text-gray-300 max-w-md mx-auto">{features[currentSlide].description}</p>
                            </div>
                        </div>

                        {/* Get Started Button */}
                        <div className={`transition-all duration-1000 delay-500 ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                            <button
                                onClick={handleGetStarted}
                                className="group bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold text-xl px-12 py-6 rounded-2xl shadow-2xl shadow-green-500/25 hover:shadow-green-400/30 transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center space-x-3 mx-auto"
                            >
                                <span>Get Started</span>
                                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <p className="text-gray-400 text-sm mt-4">Join thousands of eco-warriors earning crypto</p>
                        </div>
                    </div>

                    {/* Stats Section */}
                    <div className={`transition-all duration-1000 delay-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
                            {stats.map((stat, index) => (
                                <div key={index} className="text-center bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-green-500/20">
                                    <div className="text-2xl sm:text-3xl font-bold text-green-400 mb-1">{stat.value}</div>
                                    <div className="text-gray-400 text-sm">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>

                {/* Features Preview */}
                <section className={`px-6 sm:px-8 pb-8 transition-all duration-1000 delay-900 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                    <div className="max-w-6xl mx-auto">
                        <h3 className="text-2xl font-bold text-center mb-8 text-green-400">What You Can Do</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                {
                                    icon: Leaf,
                                    title: "Eco Games",
                                    description: "Play fun recycling games and earn rewards"
                                },
                                {
                                    icon: Zap,
                                    title: "Instant Rewards",
                                    description: "Get immediate crypto payouts for actions"
                                },
                                {
                                    icon: Globe,
                                    title: "Global Impact",
                                    description: "Track your environmental contribution"
                                }
                            ].map((feature, index) => {
                                const IconComponent = feature.icon;
                                return (
                                    <div key={index} className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-green-500/20 hover:border-green-400/40 transition-all hover:bg-white/10">
                                        <IconComponent className="w-8 h-8 text-green-400 mb-4" />
                                        <h4 className="text-lg font-semibold text-white mb-2">{feature.title}</h4>
                                        <p className="text-gray-300 text-sm">{feature.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="text-center p-6 text-gray-400 text-sm">
                    <p>© 2024 RecycleFlux. Making the world greener, one reward at a time.</p>
                </footer>
            </div>

            {/* Custom CSS for animations */}
            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(180deg); }
                }
                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}
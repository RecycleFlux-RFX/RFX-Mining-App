import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Recycle, Leaf, Zap, CheckCircle, ArrowRight, ChevronLeft, Sparkles, Coins, Globe } from 'lucide-react';

const Onboarding = () => {
    const [step, setStep] = useState(1);
    const navigate = useNavigate();

    const nextStep = () => {
        if (step < 3) {
            setStep(step + 1);
        } else {
            navigate('/dashboard');
        }
    };

    const prevStep = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    const steps = [
        {
            icon: Recycle,
            title: "Welcome to RecycleFlux",
            description: "Transform your recycling habits into crypto rewards and help save the planet",
            features: [
                { icon: Coins, text: "Earn crypto for recycling" },
                { icon: Leaf, text: "Reduce your carbon footprint" },
                { icon: Globe, text: "Join a global eco-community" }
            ],
            bgGradient: "from-emerald-900/50 to-green-900/30"
        },
        
{
  icon: Zap,
  title: "RFX Mining — How It Works",
  description: "Turn your daily recycling actions into RFX tokens with simple mining steps.",
  steps: [
    {
      number: 1,
      text: "Collect recyclables and bring them to RFX Smart Stations or upload proofs via the app."
    },
    {
      number: 2,
      text: "Start mining by completing daily tasks like sorting waste or answering quizzes."
    },
    {
      number: 3,
      text: "Watch your RFX token balance grow instantly — redeem or stack your earnings!"
    }
  ]
}
,
        {
            icon: Sparkles,
            title: "Ready to Make an Impact?",
            description: "Join thousands of eco-conscious users already mining rewards",
            stats: [
                { value: "500+", label: "Recycling Stations around the world" },
                { value: "600+", label: "Growing Community" },
                { value: "100M+", label: "Users to reach" }      ],
      
            bgGradient: "from-purple-900/50 to-violet-900/30"
        }
    ];

    const currentStep = steps[step - 1];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute top-2/3 right-1/3 w-56 h-56 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1500"></div>
            </div>

            <div className="w-full max-w-md bg-gray-800/50 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden relative border border-gray-700/50 transition-all duration-500 hover:border-gray-600/70">
                {/* Progress Bar */}
                <div className="h-1.5 bg-gray-700/50 relative">
                    <div
                        className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500 ease-out"
                        style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
                    ></div>
                    <div className="absolute top-0 left-0 right-0 flex justify-between px-4">
                        {steps.map((_, i) => (
                            <div 
                                key={i}
                                className={`w-3 h-3 rounded-full -mt-1 border-2 ${step > i ? 'bg-green-400 border-green-400' : step === i + 1 ? 'bg-transparent border-green-400' : 'bg-transparent border-gray-500'}`}
                            />
                        ))}
                    </div>
                </div>

                <div className={`p-8 transition-all duration-300 ${currentStep.bgGradient}`}>
                    {/* Navigation */}
                    <div className="flex justify-between items-center mb-6">
                        {step > 1 ? (
                            <button
                                onClick={prevStep}
                                className="flex items-center text-gray-400 hover:text-white transition-colors group"
                            >
                                <ChevronLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" />
                                <span className="text-sm">Back</span>
                            </button>
                        ) : (
                            <div></div> // Empty div for spacing
                        )}
                        <span className="text-sm text-gray-400">Step {step} of {steps.length}</span>
                    </div>

                    {/* Content */}
                    <div className="text-center space-y-8">
                        <div className="relative">
                            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg relative z-10 transform hover:rotate-12 transition-transform">
                                <currentStep.icon className="w-10 h-10 text-white" />
                            </div>
                            <div className="absolute -inset-4 bg-green-500/20 rounded-full blur-xl animate-pulse"></div>
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                                {currentStep.title}
                            </h2>
                            <p className="text-gray-300 text-lg">{currentStep.description}</p>
                        </div>

                        {/* Step-specific content */}
                        {step === 1 && (
                            <div className="space-y-4 mt-6">
                                {currentStep.features.map((feature, i) => (
                                    <div key={i} className="flex items-center space-x-3 p-3 bg-gray-700/50 rounded-xl backdrop-blur-sm">
                                        <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                                            <feature.icon className="w-5 h-5 text-green-400" />
                                        </div>
                                        <span className="text-gray-200">{feature.text}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4 mt-6">
                                {currentStep.steps.map((item, i) => (
                                    <div key={i} className="flex items-start space-x-4 p-4 bg-gray-700/30 rounded-xl backdrop-blur-sm border border-gray-600/50 hover:border-green-400/30 transition-colors">
                                        <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                            <span className="text-blue-400 font-bold">{item.number}</span>
                                        </div>
                                        <span className="text-gray-200 text-left">{item.text}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {step === 3 && (
                            <div className="grid grid-cols-3 gap-4 mt-6">
                                {currentStep.stats.map((stat, i) => (
                                    <div key={i} className="p-3 bg-gray-700/30 rounded-xl backdrop-blur-sm border border-gray-600/50 hover:border-purple-400/30 transition-colors">
                                        <div className="text-2xl font-bold text-white">{stat.value}</div>
                                        <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-10 space-y-3">
                        {step === steps.length ? (
                            <>
                                <button
                                    onClick={() => navigate('/signup')}
                                    className="w-full py-4 px-6 flex items-center justify-center space-x-2 rounded-xl font-bold text-white transition-all bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 transform hover:scale-[1.02] active:scale-95"
                                >
                                    <span>Get Started</span>
                                    <Sparkles className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="w-full py-3 px-6 bg-transparent text-green-400 hover:text-white font-medium rounded-xl transition-all border border-green-400/50 hover:border-green-400"
                                >
                                    I already have an account
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={nextStep}
                                className="w-full py-4 px-6 flex items-center justify-center space-x-2 rounded-xl font-bold text-white transition-all bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 transform hover:scale-[1.02] active:scale-95"
                            >
                                <span>Continue</span>
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
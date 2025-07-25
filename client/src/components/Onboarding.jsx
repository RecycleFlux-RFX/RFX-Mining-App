import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Recycle, CheckCircle, ArrowRight, ChevronLeft } from 'lucide-react';

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
        if (step !== null && step > 1) {
            setStep(step - 1);
        }
    };

    const steps = [
        {
            icon: Recycle,
            title: "Welcome to RecycleFlux",
            description: "Let's set up your account to start earning crypto rewards for recycling",
        },
        {
            icon: CheckCircle,
            title: "How It Works",
            description: "Learn how to recycle and earn rewards for your contributions",
        },
        {
            icon: CheckCircle,
            title: "You're All Set!",
            description: "Start recycling and earning rewards today. The planet thanks you!",
        }
    ];

    if (steps[step - 1] === undefined) {
        throw new Error(`Step ${step} is undefined`);
    }

    const IconComponent = steps[step - 1].icon;

    return (
        <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-green-900 text-white flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white/5 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden relative">
                {/* Progress Bar */}
                <div className="h-1 bg-gray-700">
                    <div
                        className="h-full bg-green-500 transition-all duration-300"
                        style={{ width: `${(step / 3) * 100}%` }}
                    ></div>
                </div>

                <div className="p-8">
                    {/* Back Button */}
                    {step > 1 && (
                        <button
                            onClick={prevStep}
                            className="absolute top-6 left-6 text-gray-400 hover:text-white transition-colors"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    )}

                    {/* Current Step Content */}
                    <div className="text-center space-y-6">
                        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                            {IconComponent && (
                                <IconComponent className="w-10 h-10 text-white" />
                            )}
                        </div>
                        <h2 className="text-3xl font-bold text-green-400">{steps[step - 1].title}</h2>
                        <p className="text-gray-300">{steps[step - 1].description}</p>
                    </div>

                    {/* Step 3 specific buttons */}
                    {step === 3 ? (
                        <div className="mt-8 space-y-4">
                            <button
                                onClick={() => navigate('/signup')}
                                className="w-full py-4 px-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold rounded-xl transition-all"
                            >
                                Sign Up
                            </button>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full py-4 px-6 bg-transparent border-2 border-green-500 hover:bg-green-900/30 text-green-400 font-bold rounded-xl transition-all"
                            >
                                Log In
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={nextStep}
                            className="mt-8 w-full py-4 px-6 flex items-center justify-center space-x-2 rounded-xl font-bold text-white transition-all bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500"
                        >
                            <span>Continue</span>
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
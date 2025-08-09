import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Recycle, Clock, Zap, Target } from 'lucide-react';
import axios from 'axios';

const TrashSortGame = () => {
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [timeLeft, setTimeLeft] = useState(3);
    const [currentItem, setCurrentItem] = useState(null);
    const [gameState, setGameState] = useState('menu');
    const [feedback, setFeedback] = useState(null);
    const [questionsAnswered, setQuestionsAnswered] = useState(0);
    const [correctAnswers, setCorrectAnswers] = useState(0);
    const [error, setError] = useState(null);
    const [showInstructions, setShowInstructions] = useState(false);
    const [rewardTiers, setRewardTiers] = useState([]);
    const [difficulty, setDifficulty] = useState(1);
    const BASE_URL = 'http://localhost:3000';
    const navigate = useNavigate();
    const gameId = '688d176754cb10bba40ace66';
    const itemIdCounter = useRef(0);
    const timerRef = useRef(null);

    const wasteItems = [
        { name: "Plastic Water Bottle", correct: "Plastic", emoji: "🥤" },
        { name: "Newspaper", correct: "Paper", emoji: "📰" },
        { name: "Aluminum Can", correct: "Metal", emoji: "🥫" },
        { name: "Banana Peel", correct: "Organic", emoji: "🍌" },
        { name: "Pizza Box (greasy)", correct: "Organic", emoji: "📦", hint: "Grease contaminates paper recycling" },
        { name: "Glass Jar", correct: "Glass", emoji: "🫙" },
        { name: "Apple Core", correct: "Organic", emoji: "🍎" },
        { name: "Plastic Bag", correct: "Plastic", emoji: "🛍️", hint: "Not accepted in most curbside recycling" },
        { name: "Coffee Grounds", correct: "Organic", emoji: "☕" },
        { name: "Cardboard Box", correct: "Paper", emoji: "📦" },
        { name: "Tin Can", correct: "Metal", emoji: "🥫" },
        { name: "Yogurt Container", correct: "Plastic", emoji: "🥛" },
        { name: "Lettuce Leaves", correct: "Organic", emoji: "🥬" },
        { name: "Magazine", correct: "Paper", emoji: "📖" },
        { name: "Steel Fork", correct: "Metal", emoji: "🍴" },
        { name: "Plastic Bottle Cap", correct: "Plastic", emoji: "🔴", hint: "Check local guidelines - sometimes separate" },
        { name: "Orange Peel", correct: "Organic", emoji: "🍊" },
        { name: "Cereal Box", correct: "Paper", emoji: "📦" },
        { name: "Soda Can", correct: "Metal", emoji: "🥤" },
        { name: "Food Scraps", correct: "Organic", emoji: "🍽️" },
        { name: "Battery", correct: "Hazardous", emoji: "🔋", hint: "Special disposal required" },
        { name: "Light Bulb", correct: "Hazardous", emoji: "💡", hint: "Contains hazardous materials" },
        { name: "Styrofoam", correct: "Landfill", emoji: "📦", hint: "Not typically recyclable" },
        { name: "Plastic Utensils", correct: "Landfill", emoji: "🍴", hint: "Too small and lightweight for most recycling" },
        { name: "Paper Coffee Cup", correct: "Landfill", emoji: "☕", hint: "Plastic lining makes it non-recyclable" },
    ];

    const binColors = {
        Plastic: "bg-blue-500 hover:bg-blue-600",
        Paper: "bg-green-500 hover:bg-green-600",
        Metal: "bg-gray-500 hover:bg-gray-600",
        Organic: "bg-amber-500 hover:bg-amber-600",
        Glass: "bg-teal-500 hover:bg-teal-600",
        Hazardous: "bg-red-500 hover:bg-red-600",
        Landfill: "bg-purple-500 hover:bg-purple-600"
    };

    const scoreRewards = [
        { threshold: 100, xp: 5, tokens: 0.0001 },
        { threshold: 200, xp: 10, tokens: 0.0002 },
        { threshold: 300, xp: 15, tokens: 0.0003 },
        { threshold: 400, xp: 20, tokens: 0.0004 },
        { threshold: 500, xp: 25, tokens: 0.0005 },
    ];

    const getRandomItem = useCallback(() => {
        let filteredItems = wasteItems;
        if (difficulty === 1) {
            filteredItems = wasteItems.filter(item => 
                ['Plastic', 'Paper', 'Metal', 'Organic', 'Glass'].includes(item.correct)
            );
        } else if (difficulty === 2) {
            filteredItems = wasteItems.filter(item => item.correct !== 'Hazardous');
        }
        return filteredItems[Math.floor(Math.random() * filteredItems.length)];
    }, [difficulty]);

    const getAccuracy = useMemo(
        () => (questionsAnswered > 0 ? Math.round((correctAnswers / questionsAnswered) * 100) : 0),
        [questionsAnswered, correctAnswers]
    );

    const calculateRewards = useCallback((finalScore) => {
        let earnedXp = 0;
        let earnedTokens = 0;
        const achievedTiers = [];

        for (const tier of scoreRewards) {
            if (finalScore >= tier.threshold) {
                earnedXp += tier.xp;
                earnedTokens += tier.tokens;
                achievedTiers.push({
                    threshold: tier.threshold,
                    xp: tier.xp,
                    tokens: tier.tokens,
                });
            }
        }

        const baseXp = Math.floor(finalScore / 15);
        earnedXp += baseXp;

        if (streak >= 7) {
            earnedXp += 5;
            achievedTiers.push({
                description: "7+ Streak Bonus",
                xp: 5,
                tokens: 0,
            });
        }

        if (getAccuracy >= 90) {
            earnedXp += 10;
            achievedTiers.push({
                description: "90%+ Accuracy Bonus",
                xp: 10,
                tokens: 0,
            });
        }

        return { xpEarned: earnedXp, tokensEarned: earnedTokens, achievedTiers };
    }, [streak, getAccuracy]);

    const startGame = async (selectedDifficulty = 1) => {
        try {
            setDifficulty(selectedDifficulty);
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('Please log in to play the game');
            }

            if (!/^[0-9a-fA-F]{24}$/.test(gameId)) {
                throw new Error('Invalid game ID format');
            }

            const response = await axios.post(
                `${BASE_URL}/games/start`,
                {
                    gameId,
                    title: 'EcoSort Master'
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    validateStatus: (status) => status < 500
                }
            );

            if (response.data.success === false) {
                throw new Error(response.data.message || 'Failed to start game');
            }

            setGameState('playing');
            setScore(0);
            setStreak(0);
            setTimeLeft(3);
            setCurrentItem(getRandomItem());
            setFeedback(null);
            setQuestionsAnswered(0);
            setCorrectAnswers(0);
            setRewardTiers([]);
            setShowInstructions(true);
            itemIdCounter.current = 0;
            setError(null);
        } catch (error) {
            console.error('Error starting game:', error);
            let errorMessage = error.response?.data?.message || error.message || 'Failed to start game';

            if (errorMessage.includes('authentication') || errorMessage.includes('token')) {
                errorMessage = 'Session expired. Please log in again.';
                localStorage.removeItem('authToken');
                navigate('/dashboard');
            } else if (errorMessage.includes('ObjectId') || errorMessage.includes('Cast to ObjectId')) {
                errorMessage = 'Game configuration error. Please try another game.';
            } else if (errorMessage.includes('locked')) {
                errorMessage = 'This game is currently unavailable.';
            } else if (errorMessage.includes('daily limit')) {
                errorMessage = 'You\'ve reached your daily play limit for this game.';
            }

            setError(errorMessage);
        }
    };

    const submitScore = useCallback(async () => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('Authentication missing');
            }

            const { xpEarned, tokensEarned, achievedTiers } = calculateRewards(score);
            const achievements = streak >= 7 ? ['High Streak'] : [];

            const response = await axios.post(
                `${BASE_URL}/games/complete`,
                {
                    gameId,
                    score,
                    xpEarned,
                    tokensEarned,
                    achievements,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );


            setRewardTiers(achievedTiers);
            setGameState('gameOver');
        } catch (error) {
            console.error('Error submitting score:', error);
            setError('Failed to submit score');
        }
    }, [score, streak, calculateRewards, gameId]);

    const nextQuestion = useCallback(() => {
        setCurrentItem(getRandomItem());
        const newTime = Math.max(2, 3 - Math.floor(questionsAnswered / 5));
        setTimeLeft(newTime);
        setFeedback(null);
    }, [getRandomItem, questionsAnswered]);

    const handleAnswer = (selectedBin) => {
        const isCorrect = selectedBin === currentItem.correct;
        const timeBonus = timeLeft > 2 ? 2 : 0;

        setQuestionsAnswered((prev) => prev + 1);

        if (isCorrect) {
            setCorrectAnswers((prev) => prev + 1);
            const newStreak = streak + 1;
            setStreak(newStreak);
            const basePoints = 10;
            const streakMultiplier = Math.max(1, newStreak);
            const points = basePoints * streakMultiplier + timeBonus;
            setScore((prev) => prev + points);
            setFeedback({
                type: 'correct',
                message: `Correct! +${points} points`,
                streak: newStreak,
                timeBonus: timeBonus > 0,
            });
        } else {
            setStreak(0);
            setScore((prev) => Math.max(0, prev - 10));
            setFeedback({
                type: 'wrong',
                message: currentItem.hint 
                    ? `Wrong! ${currentItem.hint}` 
                    : `Incorrect! It goes in ${currentItem.correct}`,
                streak: 0,
            });
        }

        setTimeout(() => {
            if (questionsAnswered + 1 >= 20) {
                submitScore();
            } else {
                nextQuestion();
            }
        }, 1500);
    };

    const handleTimeOut = useCallback(() => {
        if (gameState !== 'playing') return;
        setStreak(0);
        setQuestionsAnswered((prev) => prev + 1);
        setScore((prev) => Math.max(0, prev - 5));
        setFeedback({
            type: 'timeout',
            message: currentItem?.hint
                ? `Time's up! ${currentItem.hint}`
                : `Too slow! Correct answer: ${currentItem?.correct}`,
            streak: 0,
        });

        setTimeout(() => {
            if (questionsAnswered + 1 >= 20) {
                submitScore();
            } else {
                nextQuestion();
            }
        }, 1500);
    }, [currentItem, questionsAnswered, nextQuestion, submitScore, gameState]);

    useEffect(() => {
        if (gameState === 'playing' && timeLeft > 0 && !feedback) {
            timerRef.current = setTimeout(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
            return () => clearTimeout(timerRef.current);
        } else if (timeLeft === 0 && !feedback && gameState === 'playing') {
            handleTimeOut();
        }
    }, [timeLeft, gameState, feedback, handleTimeOut]);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    const getStreakMultiplier = () => Math.max(1, streak);

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-400 via-pink-500 to-purple-500 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md w-full">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/games')}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                    >
                        Back to Games
                    </button>
                </div>
            </div>
        );
    }

    if (gameState === 'menu') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-teal-500 to-blue-600 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="mb-6">
                        <Recycle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                        <h1 className="text-4xl font-bold text-gray-800 mb-2">EcoSort Master</h1>
                        <p className="text-gray-600">Sort waste into correct recycling categories!</p>
                    </div>

                    <div className="mb-8 space-y-3 text-left">
                        <div className="flex items-center space-x-3">
                            <Target className="w-5 h-5 text-emerald-500" />
                            <span className="text-sm">Sort 20 items correctly</span>
                        </div>
                        <div className="flex items-center space-x-3">
                            <Zap className="w-5 h-5 text-yellow-500" />
                            <span className="text-sm">Only 3 seconds per question</span>
                        </div>
                        <div className="flex items-center space-x-3">
                            <Clock className="w-5 h-5 text-red-500" />
                            <span className="text-sm">Build streaks for bonus points</span>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h3 className="font-bold mb-2">Select Difficulty:</h3>
                        <div className="flex justify-center space-x-4">
                            <button
                                onClick={() => startGame(1)}
                                className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg"
                            >
                                Easy
                            </button>
                            <button
                                onClick={() => startGame(2)}
                                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-lg"
                            >
                                Medium
                            </button>
                            <button
                                onClick={() => startGame(3)}
                                className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg"
                            >
                                Hard
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (gameState === 'gameOver') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="mb-6">
                        <Trash2 className="w-16 h-16 text-purple-500 mx-auto mb-4" />
                        <h1 className="text-4xl font-bold text-gray-800 mb-2">Game Over!</h1>
                    </div>

                    <div className="mb-8 space-y-4">
                        <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-4">
                            <div className="text-3xl font-bold text-purple-600">{score}</div>
                            <div className="text-sm text-gray-600">Final Score</div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-2xl font-bold text-gray-700">{correctAnswers}/20</div>
                                <div className="text-xs text-gray-500">Correct</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-2xl font-bold text-gray-700">{getAccuracy}%</div>
                                <div className="text-xs text-gray-500">Accuracy</div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
                            <h3 className="font-bold text-lg text-blue-800 mb-2">Rewards Earned</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-700">XP Earned:</span>
                                    <span className="font-bold text-blue-600">{rewardTiers.reduce((sum, tier) => sum + tier.xp, 0)} XP</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-700">Tokens Earned:</span>
                                    <span className="font-bold text-green-600">RFX {rewardTiers.reduce((sum, tier) => sum + tier.tokens, 0).toFixed(6)}</span>
                                </div>
                            </div>
                        </div>

                        {rewardTiers.length > 0 && (
                            <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-4">
                                <h3 className="font-bold text-lg text-green-800 mb-2">Achievements</h3>
                                <ul className="space-y-1 text-sm">
                                    {rewardTiers.map((tier, index) => (
                                        <li key={index} className="flex justify-between">
                                            <span>
                                                {tier.threshold ? `Score ${tier.threshold}+` : tier.description}
                                            </span>
                                            <span className="font-medium">
                                                +{tier.xp} XP{tier.tokens > 0 ? ` +RFX ${tier.tokens.toFixed(6)}` : ''}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-center space-x-4">
                        <button
                            onClick={() => startGame(difficulty)}
                            className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-4 px-8 rounded-full text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                        >
                            Play Again
                        </button>
                        <button
                            onClick={() => navigate('/games')}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-4 px-8 rounded-full text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                        >
                            Back to Games
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-4">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-4 mb-6">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-6">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-800">{score}</div>
                                <div className="text-xs text-gray-500">SCORE</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-orange-500">{streak}x</div>
                                <div className="text-xs text-gray-500">STREAK</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-500">{questionsAnswered}/20</div>
                                <div className="text-xs text-gray-500">PROGRESS</div>
                            </div>
                        </div>

                        <div className="text-center">
                            <div className={`text-4xl font-bold ${timeLeft <= 2 ? 'text-red-500 animate-pulse' : 'text-gray-700'}`}>
                                {timeLeft}
                            </div>
                            <div className="text-xs text-gray-500">SECONDS</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-2xl p-8 mb-6 text-center">
                    <div className="mb-6">
                        <div className="text-8xl mb-4">{currentItem?.emoji}</div>
                        <h2 className="text-3xl font-bold text-gray-800 mb-2">{currentItem?.name}</h2>
                        <p className="text-gray-600">Which bin does this belong in?</p>
                    </div>

                    {feedback && (
                        <div className={`mb-6 p-4 rounded-xl ${feedback.type === 'correct' ? 'bg-green-100 text-green-700' :
                            feedback.type === 'wrong' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                        }`}>
                            <div className="font-semibold">{feedback.message}</div>
                            {feedback.timeBonus && (
                                <div className="text-sm mt-1">⚡ Speed bonus: +2 points!</div>
                            )}
                        </div>
                    )}

                    {!feedback && (
                        <div className="grid grid-cols-2 gap-4">
                            { Object.keys(binColors).map((bin) => (
                                <button
                                    key={bin}
                                    onClick={() => handleAnswer(bin)}
                                    className={`${binColors[bin]} text-white font-bold py-6 px-4 rounded-2xl text-lg transition-all duration-200 transform hover:scale-105 shadow-lg`}
                                >
                                    <div className="flex flex-col items-center space-y-2">
                                        <Trash2 className="w-8 h-8" />
                                        <span>{bin}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {streak > 0 && (
                    <div className="bg-gradient-to-r from-orange-400 to-red-500 text-white rounded-xl p-4 text-center">
                        <div className="font-bold">
                            🔥 {streak} Streak! Next correct answer = {10 * getStreakMultiplier()} points
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrashSortGame;
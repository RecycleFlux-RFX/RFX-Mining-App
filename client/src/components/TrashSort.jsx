import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Recycle, Clock, Zap, Target } from 'lucide-react';

const TrashSortGame = () => {
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [timeLeft, setTimeLeft] = useState(5);
    const [currentItem, setCurrentItem] = useState(null);
    const [gameState, setGameState] = useState('menu'); // 'menu', 'playing', 'gameOver'
    const [feedback, setFeedback] = useState(null);
    const [questionsAnswered, setQuestionsAnswered] = useState(0);
    const [correctAnswers, setCorrectAnswers] = useState(0);

    const BASE_URL = 'http://localhost:3000/games';

    const wasteItems = [
        { name: "Plastic Water Bottle", correct: "Plastic", emoji: "🥤" },
        { name: "Newspaper", correct: "Paper", emoji: "📰" },
        { name: "Aluminum Can", correct: "Metal", emoji: "🥫" },
        { name: "Banana Peel", correct: "Organic", emoji: "🍌" },
        { name: "Pizza Box", correct: "Paper", emoji: "📦" },
        { name: "Glass Jar", correct: "Metal", emoji: "🫙" },
        { name: "Apple Core", correct: "Organic", emoji: "🍎" },
        { name: "Plastic Bag", correct: "Plastic", emoji: "🛍️" },
        { name: "Coffee Grounds", correct: "Organic", emoji: "☕" },
        { name: "Cardboard Box", correct: "Paper", emoji: "📦" },
        { name: "Tin Can", correct: "Metal", emoji: "🥫" },
        { name: "Yogurt Container", correct: "Plastic", emoji: "🥛" },
        { name: "Lettuce Leaves", correct: "Organic", emoji: "🥬" },
        { name: "Magazine", correct: "Paper", emoji: "📖" },
        { name: "Steel Fork", correct: "Metal", emoji: "🍴" },
        { name: "Plastic Bottle Cap", correct: "Plastic", emoji: "🔴" },
        { name: "Orange Peel", correct: "Organic", emoji: "🍊" },
        { name: "Cereal Box", correct: "Paper", emoji: "📦" },
        { name: "Soda Can", correct: "Metal", emoji: "🥤" },
        { name: "Food Scraps", correct: "Organic", emoji: "🍽️" }
    ];

    const binColors = {
        Plastic: "bg-blue-500 hover:bg-blue-600",
        Paper: "bg-green-500 hover:bg-green-600",
        Metal: "bg-gray-500 hover:bg-gray-600",
        Organic: "bg-amber-500 hover:bg-amber-600"
    };

    const getRandomItem = useCallback(() => {
        return wasteItems[Math.floor(Math.random() * wasteItems.length)];
    }, []);

    const startGame = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const gameid = "6880f8d80776f0154e27ce02"
            const response = await fetch(`${BASE_URL}/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    gameId: gameid, // Make sure this matches your game IDs
                    title: 'EcoSort Master' // This should match exactly
                })
            });

            if (!response.ok) {
                throw new Error('Failed to start game');
            }

            // Reset game state
            setScore(0);
            setStreak(0);
            setTimeLeft(5);
            setQuestionsAnswered(0);
            setCorrectAnswers(0);
            setCurrentItem(getRandomItem());
            setGameState('playing');
            setFeedback(null);
        } catch (error) {
            console.error('Error starting game:', error);
            setFeedback({ type: 'error', message: 'Failed to start game' });
        }
    };

    const submitScore = async () => {
        try {
            const token = localStorage.getItem('authToken');
            await axios.post(
                `${BASE_URL}/submit-score`,
                {
                    gameId: 1,
                    score,
                    gameSpecific: { streak, correctAnswers, questionsAnswered },
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (error) {
            console.error('Error submitting score:', error);
        }
    };

    const nextQuestion = useCallback(() => {
        setCurrentItem(getRandomItem());
        setTimeLeft(5);
        setFeedback(null);
    }, [getRandomItem]);

    const handleAnswer = (selectedBin) => {
        const isCorrect = selectedBin === currentItem.correct;
        const timeBonus = timeLeft > 3 ? 2 : 0;

        setQuestionsAnswered(prev => prev + 1);

        if (isCorrect) {
            setCorrectAnswers(prev => prev + 1);
            const newStreak = streak + 1;
            setStreak(newStreak);
            const basePoints = 10;
            const streakMultiplier = Math.max(1, newStreak);
            const points = (basePoints * streakMultiplier) + timeBonus;
            setScore(prev => prev + points);
            setFeedback({
                type: 'correct',
                message: `Correct! +${points} points`,
                streak: newStreak,
                timeBonus: timeBonus > 0,
            });
        } else {
            setStreak(0);
            setScore(prev => Math.max(0, prev - 5));
            setFeedback({
                type: 'wrong',
                message: `Wrong! The correct answer was ${currentItem.correct}`,
                streak: 0,
            });
        }

        setTimeout(() => {
            if (questionsAnswered + 1 >= 15) {
                setGameState('gameOver');
                submitScore();
            } else {
                nextQuestion();
            }
        }, 1500);
    };

    const handleTimeOut = useCallback(() => {
        setStreak(0);
        setQuestionsAnswered(prev => prev + 1);
        setFeedback({
            type: 'timeout',
            message: `Time's up! The correct answer was ${currentItem.correct}`,
            streak: 0,
        });

        setTimeout(() => {
            if (questionsAnswered + 1 >= 15) {
                setGameState('gameOver');
                submitScore();
            } else {
                nextQuestion();
            }
        }, 1500);
    }, [currentItem, questionsAnswered, nextQuestion]);

    useEffect(() => {
        if (gameState === 'playing' && timeLeft > 0 && !feedback) {
            const timer = setTimeout(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (timeLeft === 0 && !feedback && gameState === 'playing') {
            handleTimeOut();
        }
    }, [timeLeft, gameState, feedback, handleTimeOut]);

    const getStreakMultiplier = () => {
        return Math.max(1, streak);
    };

    const getAccuracy = () => {
        return questionsAnswered > 0 ? Math.round((correctAnswers / questionsAnswered) * 100) : 0;
    };




    if (gameState === 'menu') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-teal-500 to-blue-600 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="mb-6">
                        <Recycle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                        <h1 className="text-4xl font-bold text-gray-800 mb-2">Trash Sort Challenge</h1>
                        <p className="text-gray-600">Test your recycling knowledge!</p>
                    </div>

                    <div className="mb-8 space-y-3 text-left">
                        <div className="flex items-center space-x-3">
                            <Target className="w-5 h-5 text-emerald-500" />
                            <span className="text-sm">Sort 15 items correctly</span>
                        </div>
                        <div className="flex items-center space-x-3">
                            <Zap className="w-5 h-5 text-yellow-500" />
                            <span className="text-sm">Build streaks for bonus points</span>
                        </div>
                        <div className="flex items-center space-x-3">
                            <Clock className="w-5 h-5 text-red-500" />
                            <span className="text-sm">5 seconds per question</span>
                        </div>
                    </div>

                    <button
                        onClick={startGame}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-8 rounded-full text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                    >
                        Start Challenge
                    </button>
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
                                <div className="text-2xl font-bold text-gray-700">{correctAnswers}/15</div>
                                <div className="text-xs text-gray-500">Correct</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-2xl font-bold text-gray-700">{getAccuracy()}%</div>
                                <div className="text-xs text-gray-500">Accuracy</div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={startGame}
                        className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-4 px-8 rounded-full text-lg transition-all duration-200 transform hover:scale-105 shadow-lg mr-4"
                    >
                        Play Again
                    </button>

                    <button
                        onClick={() => setGameState('menu')}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-4 px-8 rounded-full text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                    >
                        Menu
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-4">
            <div className="max-w-4xl mx-auto">
                {/* Header Stats */}
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
                                <div className="text-2xl font-bold text-blue-500">{questionsAnswered}/15</div>
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

                {/* Current Item */}
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

                    {/* Bin Options */}
                    {!feedback && (
                        <div className="grid grid-cols-2 gap-4">
                            {Object.keys(binColors).map((bin) => (
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

                {/* Streak Info */}
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
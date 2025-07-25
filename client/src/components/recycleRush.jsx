import React, { useState, useEffect, useRef } from 'react';

const RecycleRush = () => {
    const [gameState, setGameState] = useState('menu'); // 'menu', 'playing', 'gameOver'
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [fallingItems, setFallingItems] = useState([]);
    const [feedback, setFeedback] = useState('');
    const [combo, setCombo] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [draggedItem, setDraggedItem] = useState(null);
    const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
    const [showInstructions, setShowInstructions] = useState(true);

    const gameAreaRef = useRef(null);
    const itemIdCounter = useRef(0);

    const wasteItems = [
        { name: 'Soda Can', type: 'Metal', emoji: '🥤' },
        { name: 'Banana Peel', type: 'Organic', emoji: '🍌' },
        { name: 'Cardboard Box', type: 'Paper', emoji: '📦' },
        { name: 'Plastic Bottle', type: 'Plastic', emoji: '🍼' },
        { name: 'Newspaper', type: 'Paper', emoji: '📰' },
        { name: 'Tin Can', type: 'Metal', emoji: '🥫' },
        { name: 'Apple Core', type: 'Organic', emoji: '🍎' },
        { name: 'Plastic Bag', type: 'Plastic', emoji: '🛍️' },
        { name: 'Milk Carton', type: 'Paper', emoji: '🥛' },
        { name: 'Metal Spoon', type: 'Metal', emoji: '🥄' },
        { name: 'Bread Crust', type: 'Organic', emoji: '🍞' },
        { name: 'Shampoo Bottle', type: 'Plastic', emoji: '🧴' },
        { name: 'Pizza Box', type: 'Paper', emoji: '🍕' },
        { name: 'Beer Can', type: 'Metal', emoji: '🍺' },
        { name: 'Orange Peel', type: 'Organic', emoji: '🍊' },
        { name: 'Yogurt Cup', type: 'Plastic', emoji: '🥛' },
    ];

    const bins = [
        { type: 'Plastic', color: 'bg-blue-500', emoji: '♻️', symbol: '🔵' },
        { type: 'Paper', color: 'bg-green-500', emoji: '📄', symbol: '🟢' },
        { type: 'Metal', color: 'bg-yellow-500', emoji: '🔩', symbol: '🟡' },
        { type: 'Organic', color: 'bg-orange-500', emoji: '🌱', symbol: '🟠' },
    ];

    const createFallingItem = () => {
        const randomItem = wasteItems[Math.floor(Math.random() * wasteItems.length)];
        return {
            ...randomItem,
            id: itemIdCounter.current++,
            x: Math.random() * 80 + 10, // Random x position (10% to 90%)
            y: 0, // Start at the top
            speed: Math.random() * 2 + 1, // Adjusted speed
        };
    };

    const startGame = () => {
        setGameState('playing');
        setScore(0);
        setTimeLeft(60);
        setCombo(0);
        setFallingItems([]);
        setFeedback('');
        setShowInstructions(true);
        itemIdCounter.current = 0;
    };

    const endGame = () => {
        setGameState('gameOver');
        if (score > highScore) {
            setHighScore(score);
        }
        setFallingItems([]);
    };

    const handleCorrectSort = (item) => {
        const basePoints = 10;
        const speedBonus = Math.max(0, Math.floor(timeLeft / 10));
        const comboBonus = combo * 2;
        const totalPoints = basePoints + speedBonus + comboBonus;

        setScore(prev => prev + totalPoints);
        setCombo(prev => prev + 1);
        setFeedback(`+${totalPoints} points! Combo: ${combo + 1}`);
        setFallingItems(prev => prev.filter(i => i.id !== item.id));

        setTimeout(() => setFeedback(''), 1000);
    };

    const handleIncorrectSort = (item) => {
        setScore(prev => Math.max(0, prev - 5));
        setCombo(0);
        setFeedback('Wrong bin! -5 points');
        setFallingItems(prev => prev.filter(i => i.id !== item.id));

        setTimeout(() => setFeedback(''), 1000);
    };

    const handleMissedItem = (item) => {
        setScore(prev => Math.max(0, prev - 3));
        setCombo(0);
        setFeedback('Missed item! -3 points');

        setTimeout(() => setFeedback(''), 800);
    };

    // Game loop - spawn items and update positions
    useEffect(() => {
        if (gameState !== 'playing') return;

        const gameLoop = setInterval(() => {
            setFallingItems(prev => {
                let newItems = [...prev];

                // Spawn new item
                if (Math.random() < 0.05 && newItems.length < 6) {
                    newItems.push(createFallingItem());
                }

                // Update positions and remove fallen items
                newItems = newItems.map(item => ({
                    ...item,
                    y: item.y + item.speed,
                })).filter(item => {
                    if (item.y > 85) { // Remove when near bottom (85% down)
                        handleMissedItem(item);
                        return false;
                    }
                    return true;
                });

                return newItems;
            });
        }, 50);

        return () => clearInterval(gameLoop);
    }, [gameState]);

    // Hide instructions after 5 seconds
    useEffect(() => {
        if (gameState === 'playing' && showInstructions) {
            const timer = setTimeout(() => setShowInstructions(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [gameState, showInstructions]);

    // Timer effect
    useEffect(() => {
        if (gameState === 'playing' && timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
            return () => clearTimeout(timer);
        } else if (timeLeft === 0 && gameState === 'playing') {
            endGame();
        }
    }, [gameState, timeLeft]);

    // Drag handlers
    const handleMouseDown = (e, item) => {
        e.preventDefault();
        setDraggedItem(item);
        const rect = gameAreaRef.current.getBoundingClientRect();
        setDragPosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    const handleMouseMove = (e) => {
        if (draggedItem && gameAreaRef.current) {
            const rect = gameAreaRef.current.getBoundingClientRect();
            setDragPosition({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            });
        }
    };

    const handleMouseUp = (e) => {
        if (!draggedItem) return;

        const bins = document.querySelectorAll('[data-bin-type]');
        let dropped = false;

        bins.forEach(bin => {
            const rect = bin.getBoundingClientRect();
            if (
                e.clientX >= rect.left &&
                e.clientX <= rect.right &&
                e.clientY >= rect.top &&
                e.clientY <= rect.bottom
            ) {
                const binType = bin.getAttribute('data-bin-type');
                if (binType === draggedItem.type) {
                    handleCorrectSort(draggedItem);
                } else {
                    handleIncorrectSort(draggedItem);
                }
                dropped = true;
            }
        });

        if (!dropped) {
            setFallingItems(prev => [...prev, draggedItem]);
        }

        setDraggedItem(null);
    };

    const handleTouchStart = (e, item) => {
        e.preventDefault();
        const touch = e.touches[0];
        setDraggedItem(item);
        const rect = gameAreaRef.current.getBoundingClientRect();
        setDragPosition({
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top,
        });
    };

    const handleTouchMove = (e) => {
        e.preventDefault();
        if (draggedItem && gameAreaRef.current) {
            const touch = e.touches[0];
            const rect = gameAreaRef.current.getBoundingClientRect();
            setDragPosition({
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top,
            });
        }
    };

    const handleTouchEnd = (e) => {
        e.preventDefault();
        if (draggedItem) {
            const touch = e.changedTouches[0];
            handleMouseUp(touch);
        }
    };

    // Add global event listeners
    useEffect(() => {
        const handleGlobalMouseMove = (e) => handleMouseMove(e);
        const handleGlobalMouseUp = (e) => handleMouseUp(e);
        const handleGlobalTouchMove = (e) => handleTouchMove(e);
        const handleGlobalTouchEnd = (e) => handleTouchEnd(e);

        document.addEventListener('mousemove', handleGlobalMouseMove);
        document.addEventListener('mouseup', handleGlobalMouseUp);
        document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
        document.addEventListener('touchend', handleGlobalTouchEnd);

        return () => {
            document.removeEventListener('mousemove', handleGlobalMouseMove);
            document.removeEventListener('mouseup', handleGlobalMouseUp);
            document.removeEventListener('touchmove', handleGlobalTouchMove);
            document.removeEventListener('touchend', handleGlobalTouchEnd);
        };
    }, [draggedItem]);

    if (gameState === 'menu') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md w-full">
                    <h1 className="text-4xl font-bold text-gray-800 mb-4">♻️ Recycle Rush</h1>
                    <p className="text-gray-600 mb-6">Catch falling waste items and drag them to the correct recycling bins!</p>
                    <div className="grid grid-cols-4 gap-2 mb-6">
                        {bins.map((bin) => (
                            <div key={bin.type} className={`${bin.color} rounded-lg p-2 text-white text-center`}>
                                <div className="text-2xl">{bin.symbol}</div>
                                <div className="text-xs">{bin.type}</div>
                            </div>
                        ))}
                    </div>
                    <div className="mb-6">
                        <p className="text-sm text-gray-500">High Score</p>
                        <p className="text-2xl font-bold text-green-600">{highScore}</p>
                    </div>
                    <button
                        onClick={startGame}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg text-xl transition-colors"
                    >
                        Start Game
                    </button>
                </div>
            </div>
        );
    }

    if (gameState === 'gameOver') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-400 to-purple-500 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md w-full">
                    <h1 className="text-4xl font-bold text-gray-800 mb-4">⏰ Time's Up!</h1>
                    <div className="mb-6">
                        <p className="text-lg text-gray-600">Final Score</p>
                        <p className="text-4xl font-bold text-purple-600 mb-2">{score}</p>
                        {score === highScore && score > 0 && (
                            <p className="text-green-600 font-bold">🎉 New High Score!</p>
                        )}
                    </div>
                    <div className="space-y-3">
                        <button
                            onClick={startGame}
                            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                        >
                            Play Again
                        </button>
                        <button
                            onClick={() => setGameState('menu')}
                            className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                        >
                            Main Menu
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-400 to-cyan-500 overflow-hidden">
            {/* Header */}
            <div className="bg-white shadow-lg p-4 flex justify-between items-center relative z-20">
                <div className="flex items-center space-x-6">
                    <div>
                        <p className="text-sm text-gray-500">Score</p>
                        <p className="text-2xl font-bold text-blue-600">{score}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Time</p>
                        <p className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-600' : 'text-green-600'}`}>
                            {timeLeft}s
                        </p>
                    </div>
                    {combo > 0 && (
                        <div>
                            <p className="text-sm text-gray-500">Combo</p>
                            <p className="text-2xl font-bold text-purple-600">{combo}</p>
                        </div>
                    )}
                </div>
                <button
                    onClick={() => setGameState('menu')}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                >
                    Menu
                </button>
            </div>

            {/* Feedback */}
            {feedback && (
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-30">
                    <p className="text-xl font-bold text-white bg-black bg-opacity-70 rounded-lg px-4 py-2 animate-pulse">
                        {feedback}
                    </p>
                </div>
            )}

            {/* Instructions */}
            {showInstructions && (
                <div className="fixed top-24 left-4 right-4 text-center z-20">
                    <p className="text-white text-sm font-semibold bg-black bg-opacity-40 rounded-lg px-3 py-1 inline-block">
                        Drag falling items to the correct bins at the bottom!
                    </p>
                </div>
            )}

            {/* Game Area */}
            <div
                ref={gameAreaRef}
                className="relative h-[70vh] overflow-hidden bg-transparent"
                style={{ userSelect: 'none' }}
            >
                {/* Falling Items */}
                {fallingItems.filter(item => draggedItem?.id !== item.id).map((item) => (
                    <div
                        key={item.id}
                        className="absolute bg-white rounded-xl shadow-lg p-3 cursor-grab transition-transform hover:scale-110 border-2 border-gray-300"
                        style={{
                            left: `${item.x}%`,
                            top: `${item.y}%`,
                            width: '80px',
                            height: '80px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transform: 'translateX(-50%)',
                            zIndex: 10,
                        }}
                        onMouseDown={(e) => handleMouseDown(e, item)}
                        onTouchStart={(e) => handleTouchStart(e, item)}
                    >
                        <div className="text-4xl text-center">{item.emoji}</div>
                    </div>
                ))}

                {/* Dragged Item */}
                {draggedItem && (
                    <div
                        className="absolute bg-white rounded-xl shadow-2xl p-3 cursor-grabbing border-2 border-gray-300 z-50"
                        style={{
                            left: `${dragPosition.x}px`,
                            top: `${dragPosition.y}px`,
                            width: '80px',
                            height: '80px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transform: 'translate(-50%, -50%) scale(1.25)',
                            pointerEvents: 'none',
                        }}
                    >
                        <div className="text-4xl text-center">{draggedItem.emoji}</div>
                    </div>
                )}
            </div>

            {/* Bottom Bins */}
            <div className="fixed bottom-0 left-0 right-0 bg-gray-800 p-4">
                <div className="grid grid-cols-4 gap-4 max-w-4xl mx-auto">
                    {bins.map((bin) => (
                        <div
                            key={bin.type}
                            data-bin-type={bin.type}
                            className={`${bin.color} rounded-xl shadow-lg p-4 text-center text-white transition-all hover:scale-105 hover:shadow-xl min-h-[100px] flex flex-col justify-center`}
                        >
                            <div className="text-4xl mb-1">{bin.symbol}</div>
                            <p className="text-sm font-bold">{bin.type}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RecycleRush;
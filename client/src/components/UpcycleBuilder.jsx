import React, { useState, useEffect, useCallback } from 'react';
import {
    Trash2, Trophy, Star, Clock, Gift, Recycle, Lightbulb, Award,
    Share2, Info, BookOpen, Heart, ThumbsUp, Eye, ChevronRight, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ========== CONSTANTS ==========
const MATERIALS = [
    { id: 1, name: 'Plastic Bottle', icon: '🍼', color: 'bg-blue-200', category: 'plastic' },
    { id: 2, name: 'Cardboard Box', icon: '📦', color: 'bg-amber-200', category: 'paper' },
    { id: 3, name: 'Tin Can', icon: '🥫', color: 'bg-gray-200', category: 'metal' },
    { id: 4, name: 'Old T-Shirt', icon: '👕', color: 'bg-green-200', category: 'fabric' },
    { id: 5, name: 'Newspaper', icon: '📰', color: 'bg-slate-200', category: 'paper' },
    { id: 6, name: 'Glass Jar', icon: '🫙', color: 'bg-emerald-200', category: 'glass' },
    { id: 7, name: 'Metal Scraps', icon: '🔩', color: 'bg-zinc-200', category: 'metal' },
    { id: 8, name: 'Fabric Scraps', icon: '🧵', color: 'bg-pink-200', category: 'fabric' },
    { id: 9, name: 'Sand', icon: '⏳', color: 'bg-yellow-200', category: 'natural' },
    { id: 10, name: 'Markers', icon: '🖍️', color: 'bg-purple-200', category: 'supplies' },
];

const RECIPES = {
    'Plastic Bottle + Old T-Shirt': {
        result: 'Self-Watering Planter',
        icon: '🪴',
        description: 'A clever planter that waters itself using fabric wicking!',
        impact: 'Saves 500g of plastic waste yearly',
        difficulty: 'Easy',
        category: 'Garden',
        tutorial: '1. Cut the bottle in half\n2. Insert fabric strips as wicks\n3. Add soil and plants'
    },
    'Cardboard Box + Markers': {
        result: 'Kids Playhouse',
        icon: '🏠',
        description: 'Colorful playhouse that sparks imagination',
        impact: 'Prevents 2kg cardboard from landfill',
        difficulty: 'Medium',
        category: 'Toys',
        tutorial: '1. Cut doors and windows\n2. Reinforce corners\n3. Let kids decorate'
    },
    'Glass Jar + Fabric Scraps': {
        result: 'Decorative Vase',
        icon: '🏺',
        description: 'Beautiful upcycled vase for flowers',
        impact: 'Gives glass new life',
        difficulty: 'Easy',
        category: 'Decor',
        tutorial: '1. Clean jar thoroughly\n2. Glue fabric around exterior\n3. Add decorative elements'
    }
};

const BADGES = [
    { id: 1, name: 'Novice Upcycler', icon: '🛠️', desc: 'Create your first item', earned: false },
    { id: 2, name: 'Eco Innovator', icon: '💡', desc: 'Discover 3 hidden recipes', earned: false },
    { id: 3, name: 'Community Star', icon: '⭐', desc: 'Get 10 votes on a creation', earned: false },
    { id: 4, name: 'Master Builder', icon: '🏗️', desc: 'Create 10 different items', earned: false }
];

// ========== COMPONENTS ==========
const Tooltip = ({ children, text }) => (
    <div className="relative group">
        {children}
        <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
            {text}
        </div>
    </div>
);

const Badge = ({ badge }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`p-3 rounded-xl flex items-center gap-3 ${badge.earned ? 'bg-gradient-to-r from-yellow-200 to-yellow-300' : 'bg-gray-100'} shadow-sm hover:shadow-md transition-shadow`}
    >
        <span className="text-2xl">{badge.icon}</span>
        <div>
            <div className={`font-semibold text-sm ${badge.earned ? 'text-gray-900' : 'text-gray-500'}`}>
                {badge.name}
            </div>
            <div className="text-xs text-gray-600">{badge.desc}</div>
        </div>
    </motion.div>
);

const MaterialCard = ({ material, onDragStart }) => (
    <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        draggable
        onDragStart={(e) => onDragStart(e, material)}
        className={`${material.color} p-4 rounded-xl cursor-grab hover:shadow-lg transition-all shadow-sm active:cursor-grabbing`}
        role="button"
        aria-label={`Drag ${material.name} to workbench`}
    >
        <Tooltip text={material.name}>
            <div className="text-3xl mb-2">{material.icon}</div>
            <div className="text-sm font-medium text-gray-800">{material.name}</div>
        </Tooltip>
    </motion.div>
);

const CreationCard = ({ creation, onSelect, onVote }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="border rounded-xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer bg-white"
        onClick={() => onSelect(creation)}
    >
        <div className="bg-gradient-to-br from-green-200 to-blue-200 h-36 flex items-center justify-center text-5xl">
            {creation.icon}
        </div>
        <div className="p-4">
            <h4 className="font-bold text-base mb-2">{creation.result}</h4>
            <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">{creation.category}</span>
                <Tooltip text="Vote for this creation">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onVote(creation.id);
                        }}
                        className="text-xs flex items-center gap-1 text-gray-600 hover:text-green-600 transition-colors"
                        aria-label={`Vote for ${creation.result}`}
                    >
                        <ThumbsUp className="w-4 h-4" /> {creation.votes}
                    </button>
                </Tooltip>
            </div>
        </div>
    </motion.div>
);

// ========== MAIN COMPONENT ==========
const UpcycleBuilder = () => {
    // Game state
    const [activeTab, setActiveTab] = useState('workshop');
    const [workbench, setWorkbench] = useState([]);
    const [creations, setCreations] = useState([]);
    const [discoveredRecipes, setDiscoveredRecipes] = useState([]);
    const [selectedCreation, setSelectedCreation] = useState(null);
    const [showTutorial, setShowTutorial] = useState(true);
    const [tutorialStep, setTutorialStep] = useState(0);
    const [isCrafting, setIsCrafting] = useState(false);

    // Player stats
    const [playerStats, setPlayerStats] = useState({
        level: 1,
        xp: 0,
        creationsCount: 0,
        votesReceived: 0,
        badges: BADGES
    });

    // Handle dragging materials
    const handleDragStart = useCallback((e, material) => {
        e.dataTransfer.setData('text/plain', JSON.stringify(material));
    }, []);

    // Handle dropping materials on workbench
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        const material = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (workbench.length < 5 && !workbench.some(item => item.id === material.id)) {
            setWorkbench(prev => [...prev, material]);
        }
    }, [workbench]);

    // Craft an item from workbench materials
    const craftItem = useCallback(async () => {
        if (workbench.length < 2) return;

        setIsCrafting(true);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate crafting animation

        const sortedNames = workbench.map(item => item.name).sort();
        const recipeKey = sortedNames.join(' + ');
        const recipe = RECIPES[recipeKey];

        if (recipe) {
            const newCreation = {
                id: Date.now(),
                ...recipe,
                materials: [...workbench],
                votes: 0,
                timestamp: new Date().toLocaleString()
            };

            setCreations(prev => [newCreation, ...prev]);
            setWorkbench([]);

            if (!discoveredRecipes.includes(recipeKey)) {
                setDiscoveredRecipes(prev => [...prev, recipeKey]);
            }

            setPlayerStats(prev => ({
                ...prev,
                creationsCount: prev.creationsCount + 1,
                xp: prev.xp + (recipe.difficulty === 'Easy' ? 10 : recipe.difficulty === 'Medium' ? 20 : 30)
            }));

            if (showTutorial && tutorialStep === 2) {
                setTutorialStep(3);
            }
        }
        setIsCrafting(false);
    }, [workbench, discoveredRecipes, showTutorial, tutorialStep]);

    // Vote for a creation
    const voteForCreation = useCallback((creationId) => {
        setCreations(prev =>
            prev.map(creation =>
                creation.id === creationId
                    ? { ...creation, votes: creation.votes + 1 }
                    : creation
            )
        );
    }, []);

    // Check for badge achievements
    useEffect(() => {
        const newBadges = [...playerStats.badges];
        let updated = false;

        if (playerStats.creationsCount >= 1 && !newBadges[0].earned) {
            newBadges[0].earned = true;
            updated = true;
        }

        if (discoveredRecipes.length >= 3 && !newBadges[1].earned) {
            newBadges[1].earned = true;
            updated = true;
        }

        if (updated) {
            setPlayerStats(prev => ({
                ...prev,
                badges: newBadges
            }));
        }
    }, [playerStats.creationsCount, discoveredRecipes.length, playerStats.badges]);

    // Level up calculation
    useEffect(() => {
        const newLevel = Math.floor(playerStats.xp / 100) + 1;
        if (newLevel > playerStats.level) {
            setPlayerStats(prev => ({ ...prev, level: newLevel }));
        }
    }, [playerStats.xp, playerStats.level]);

    // Tutorial steps
    const tutorialSteps = [
        {
            title: "Welcome to Upcycle Builder!",
            content: "Turn trash into treasure by combining materials to create useful items."
        },
        {
            title: "Your Inventory",
            content: "Drag materials from your inventory to the workbench."
        },
        {
            title: "Combine Materials",
            content: "Place at least 2 items on the workbench to discover recipes."
        },
        {
            title: "Create & Share",
            content: "Craft your creation and share it with the community!"
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-100 to-blue-100 p-6 font-sans">
            {/* Header */}
            <header className="max-w-6xl mx-auto mb-8 text-center">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-4xl font-extrabold text-green-900 mb-3 flex items-center justify-center gap-3"
                >
                    <Recycle className="w-10 h-10 text-green-700" />
                    Upcycle Builder
                </motion.h1>
                <p className="text-gray-700 text-lg">Create, Share, and Compete in Recycling Challenges</p>
            </header>

            {/* Tutorial Modal */}
            <AnimatePresence>
                {showTutorial && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold text-gray-900">{tutorialSteps[tutorialStep].title}</h3>
                                <button
                                    onClick={() => setShowTutorial(false)}
                                    className="text-gray-500 hover:text-gray-700 transition-colors"
                                    aria-label="Close tutorial"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <p className="text-gray-700 mb-8 text-base">{tutorialSteps[tutorialStep].content}</p>
                            <div className="flex justify-between items-center">
                                <div className="text-sm text-gray-600">
                                    Step {tutorialStep + 1} of {tutorialSteps.length}
                                </div>
                                <button
                                    onClick={() => tutorialStep < tutorialSteps.length - 1
                                        ? setTutorialStep(tutorialStep + 1)
                                        : setShowTutorial(false)}
                                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                                >
                                    {tutorialStep < tutorialSteps.length - 1 ? 'Next' : 'Get Started'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto">
                {/* Stats Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white rounded-2xl shadow-md p-6 mb-8 grid grid-cols-2 md:grid-cols-4 gap-6"
                >
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-700">{playerStats.creationsCount}</div>
                        <div className="text-sm text-gray-600">Creations</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-700">{discoveredRecipes.length}</div>
                        <div className="text-sm text-gray-600">Recipes</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-purple-700">{playerStats.badges.filter(b => b.earned).length}</div>
                        <div className="text-sm text-gray-600">Badges</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-orange-700">Lv.{playerStats.level}</div>
                        <div className="text-sm text-gray-600">Level</div>
                    </div>
                </motion.div>

                {/* Navigation Tabs */}
                <div className="flex border-b-2 border-gray-200 mb-8">
                    {[
                        { id: 'workshop', label: 'Workshop', icon: Lightbulb },
                        { id: 'gallery', label: 'Gallery', icon: Trophy },
                        { id: 'badges', label: 'Badges', icon: Award }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors text-lg ${activeTab === tab.id
                                ? 'border-b-4 border-green-600 text-green-700'
                                : 'text-gray-600 hover:text-gray-800'
                                }`}
                        >
                            <tab.icon className="w-5 h-5" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Workshop Tab */}
                {activeTab === 'workshop' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Inventory */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                            className="bg-white rounded-2xl shadow-md p-6"
                        >
                            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                <Trash2 className="w-5 h-5 text-gray-700" />
                                Material Inventory
                            </h3>
                            <div
                                className="grid grid-cols-2 sm:grid-cols-3 gap-4 overflow-y-auto max-h-[32rem]"
                                onDragOver={(e) => e.preventDefault()}
                            >
                                {MATERIALS.map(material => (
                                    <MaterialCard
                                        key={material.id}
                                        material={material}
                                        onDragStart={handleDragStart}
                                    />
                                ))}
                            </div>
                        </motion.div>

                        {/* Workbench */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="bg-white rounded-2xl shadow-md p-6"
                        >
                            <h3 className="font-semibold text-lg mb-4 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Lightbulb className="w-5 h-5 text-gray-700" />
                                    Workbench
                                </span>
                                <span className="text-sm text-gray-600">{workbench.length}/5 items</span>
                            </h3>
                            <div
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                                className={`border-2 border-dashed rounded-xl p-6 min-h-56 ${workbench.length > 0 ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50'
                                    } transition-colors`}
                            >
                                {workbench.length === 0 ? (
                                    <div className="text-center text-gray-600 h-full flex flex-col items-center justify-center">
                                        <div className="text-3xl mb-3">🛠️</div>
                                        <p className="text-sm">Drag materials here to start crafting</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {workbench.map(item => (
                                            <motion.div
                                                key={item.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                className="flex items-center justify-between bg-white p-3 rounded-lg border shadow-sm"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl">{item.icon}</span>
                                                    <span className="text-sm font-medium">{item.name}</span>
                                                </div>
                                                <Tooltip text="Remove item">
                                                    <button
                                                        onClick={() => setWorkbench(prev => prev.filter(i => i.id !== item.id))}
                                                        className="text-gray-500 hover:text-red-600 transition-colors"
                                                        aria-label={`Remove ${item.name} from workbench`}
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                </Tooltip>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={craftItem}
                                disabled={workbench.length < 2 || isCrafting}
                                className={`w-full mt-6 py-3 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center gap-2 ${workbench.length >= 2 && !isCrafting
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                <Recycle className="w-5 h-5" />
                                {isCrafting ? 'Crafting...' : 'Craft Item'}
                            </motion.button>
                        </motion.div>

                        {/* Recipe Book */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                            className="bg-white rounded-2xl shadow-md p-6"
                        >
                            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-gray-700" />
                                Recipe Book
                            </h3>
                            <div className="space-y-4 overflow-y-auto max-h-[32rem]">
                                {Object.entries(RECIPES).map(([key, recipe]) => {
                                    const isDiscovered = discoveredRecipes.includes(key);
                                    return (
                                        <motion.div
                                            key={key}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`p-4 rounded-lg border ${isDiscovered ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                                                } shadow-sm`}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-3xl">{isDiscovered ? recipe.icon : '❓'}</span>
                                                <div className="flex-1">
                                                    <div className="font-semibold text-base">{isDiscovered ? recipe.result : 'Unknown Recipe'}</div>
                                                    <div className="text-sm text-gray-600">
                                                        {isDiscovered ? key : 'Combine materials to discover'}
                                                    </div>
                                                </div>
                                            </div>
                                            {isDiscovered && (
                                                <div className="text-sm text-gray-700 mt-2">{recipe.description}</div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Gallery Tab */}
                {activeTab === 'gallery' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="space-y-6"
                    >
                        <div className="bg-white rounded-2xl shadow-md p-6">
                            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-gray-700" />
                                Community Gallery
                            </h3>
                            {creations.length === 0 ? (
                                <div className="text-center py-12 text-gray-600">
                                    <div className="text-5xl mb-3">🖼️</div>
                                    <p className="text-lg">No creations yet!</p>
                                    <p className="text-sm mt-2">Create items in the Workshop to see them here</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {creations.map(creation => (
                                        <CreationCard
                                            key={creation.id}
                                            creation={creation}
                                            onSelect={setSelectedCreation}
                                            onVote={voteForCreation}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Badges Tab */}
                {activeTab === 'badges' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-white rounded-2xl shadow-md p-6"
                    >
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <Award className="w-5 h-5 text-gray-700" />
                            Your Badges
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {playerStats.badges.map(badge => (
                                <Badge key={badge.id} badge={badge} />
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Creation Detail Modal */}
                <AnimatePresence>
                    {selectedCreation && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-6"
                        >
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                className="bg-white rounded-2xl max-w-lg w-full shadow-2xl"
                            >
                                <div className="relative">
                                    <div className="bg-gradient-to-r from-green-200 to-blue-200 h-48 flex items-center justify-center text-7xl">
                                        {selectedCreation.icon}
                                    </div>
                                    <button
                                        onClick={() => setSelectedCreation(null)}
                                        className="absolute top-4 right-4 bg-white p-2 rounded-full shadow hover:bg-gray-100 transition-colors"
                                        aria-label="Close creation details"
                                    >
                                        <X className="w-6 h-6 text-gray-600" />
                                    </button>
                                </div>

                                <div className="p-6">
                                    <h3 className="text-2xl font-bold mb-2 text-gray-900">{selectedCreation.result}</h3>
                                    <div className="flex items-center gap-3 text-sm text-gray-600 mb-6">
                                        <span>{selectedCreation.category}</span>
                                        <span>•</span>
                                        <span>{selectedCreation.difficulty}</span>
                                    </div>

                                    <p className="text-gray-700 mb-6 text-base">{selectedCreation.description}</p>

                                    <div className="mb-6">
                                        <h4 className="font-semibold text-base mb-3">Materials Used</h4>
                                        <div className="flex flex-wrap gap-3">
                                            {selectedCreation.materials.map((material, idx) => (
                                                <span key={idx} className="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-800">
                                                    {material.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <h4 className="font-semibold text-base mb-3">How To Make</h4>
                                        <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-line text-sm text-gray-700">
                                            {selectedCreation.tutorial}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <Tooltip text="Vote for this creation">
                                            <button
                                                onClick={() => voteForCreation(selectedCreation.id)}
                                                className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors"
                                                aria-label={`Vote for ${selectedCreation.result}`}
                                            >
                                                <ThumbsUp className="w-5 h-5" />
                                                <span>Vote ({selectedCreation.votes})</span>
                                            </button>
                                        </Tooltip>
                                        <Tooltip text="Share this creation">
                                            <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors">
                                                <Share2 className="w-5 h-5" />
                                                <span>Share</span>
                                            </button>
                                        </Tooltip>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Footer */}
            <footer className="max-w-6xl mx-auto mt-12 text-center text-sm text-gray-600">
                <p>Upcycle Builder - Turn Trash into Treasure ♻️</p>
                <button
                    onClick={() => setShowTutorial(true)}
                    className="mt-3 text-blue-600 hover:text-blue-800 transition-colors underline"
                >
                    Show Tutorial Again
                </button>
            </footer>
        </div>
    );
};

export default UpcycleBuilder;
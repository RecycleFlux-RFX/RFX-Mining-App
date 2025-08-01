import { useState } from 'react';

export default function TriviaInterface() {
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [showResult, setShowResult] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [showAnimation, setShowAnimation] = useState(false);
    const [isAnswerCorrect, setIsAnswerCorrect] = useState(false);

    const triviaQuestions = [
        {
            question: "What is the capital of Japan?",
            options: ["Seoul", "Tokyo", "Beijing", "Bangkok"],
            correctAnswer: 1,
            explanation: "Tokyo is the capital and largest city of Japan."
        },
        {
            question: "Which planet is known as the Red Planet?",
            options: ["Venus", "Jupiter", "Mars", "Saturn"],
            correctAnswer: 2,
            explanation: "Mars is called the Red Planet due to iron oxide (rust) on its surface."
        },
        {
            question: "Who painted the Mona Lisa?",
            options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo"],
            correctAnswer: 2,
            explanation: "Leonardo da Vinci painted the Mona Lisa between 1503-1519."
        },
        {
            question: "What is the largest mammal in the world?",
            options: ["African Elephant", "Blue Whale", "Giraffe", "Polar Bear"],
            correctAnswer: 1,
            explanation: "The Blue Whale is the largest animal that has ever lived on Earth."
        }
    ];

    const currentQuestionData = triviaQuestions[currentQuestion];

    const handleAnswerSelect = (optionIndex) => {
        if (!showResult) {
            setSelectedAnswer(optionIndex);
            const correct = optionIndex === currentQuestionData.correctAnswer;
            setIsAnswerCorrect(correct);
            setShowResult(true);
            setShowAnimation(true);

            // Auto advance to next question after animation
            setTimeout(() => {
                setShowAnimation(false);
                if (currentQuestion < triviaQuestions.length - 1) {
                    setTimeout(() => {
                        setCurrentQuestion(currentQuestion + 1);
                        setSelectedAnswer(null);
                        setShowResult(false);
                    }, 300);
                }
            }, 2000);
        }
    };

    const handleSubmit = () => {
        if (selectedAnswer !== null) {
            setShowResult(true);
        }
    };

    const handleNextQuestion = () => {
        if (currentQuestion < triviaQuestions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
            setSelectedAnswer(null);
            setShowResult(false);
        }
    };

    const handleRestart = () => {
        setCurrentQuestion(0);
        setSelectedAnswer(null);
        setShowResult(false);
        setShowAnimation(false);
        setIsAnswerCorrect(false);
    };

    const isCorrect = selectedAnswer === currentQuestionData.correctAnswer;
    const isLastQuestion = currentQuestion === triviaQuestions.length - 1;

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8">
                {/* Result Animation Overlay */}
                {showAnimation && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className={`animate-bounce ${isAnswerCorrect ? 'text-green-400' : 'text-red-400'}`}>
                            <div className="text-8xl mb-4 text-center">
                                {isAnswerCorrect ? '🎉' : '😞'}
                            </div>
                            <div className="text-3xl font-bold text-white text-center">
                                {isAnswerCorrect ? 'Correct!' : 'Wrong!'}
                            </div>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Trivia Challenge</h1>
                    <div className="flex justify-center items-center space-x-2 text-sm text-gray-600">
                        <span>Question {currentQuestion + 1} of {triviaQuestions.length}</span>
                        <div className="flex space-x-1">
                            {triviaQuestions.map((_, index) => (
                                <div
                                    key={index}
                                    className={`w-3 h-3 rounded-full ${index === currentQuestion
                                            ? 'bg-blue-600'
                                            : index < currentQuestion
                                                ? 'bg-green-500'
                                                : 'bg-gray-300'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Question */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 leading-relaxed">
                        {currentQuestionData.question}
                    </h2>
                </div>

                {/* Answer Options */}
                <div className="space-y-3 mb-8">
                    {currentQuestionData.options.map((option, index) => {
                        let buttonClass = "w-full p-4 text-left rounded-xl border-2 transition-all duration-200 font-medium";

                        if (!showResult) {
                            buttonClass += selectedAnswer === index
                                ? " border-blue-500 bg-blue-50 text-blue-700"
                                : " border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100 text-gray-700";
                        } else {
                            if (index === currentQuestionData.correctAnswer) {
                                buttonClass += " border-green-500 bg-green-100 text-green-800";
                            } else if (index === selectedAnswer && selectedAnswer !== currentQuestionData.correctAnswer) {
                                buttonClass += " border-red-500 bg-red-100 text-red-800";
                            } else {
                                buttonClass += " border-gray-200 bg-gray-50 text-gray-500";
                            }
                        }

                        return (
                            <button
                                key={index}
                                onClick={() => handleAnswerSelect(index)}
                                className={buttonClass}
                                disabled={showResult}
                            >
                                <div className="flex items-center">
                                    <span className="w-8 h-8 rounded-full bg-white border-2 border-current flex items-center justify-center mr-3 text-sm font-bold">
                                        {String.fromCharCode(65 + index)}
                                    </span>
                                    <span>{option}</span>
                                    {showResult && index === currentQuestionData.correctAnswer && (
                                        <span className="ml-auto text-green-600">✓</span>
                                    )}
                                    {showResult && index === selectedAnswer && selectedAnswer !== currentQuestionData.correctAnswer && (
                                        <span className="ml-auto text-red-600">✗</span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Result Section */}
                {showResult && (
                    <div className={`p-4 rounded-xl mb-6 ${isCorrect ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}`}>
                        <div className="flex items-center mb-2">
                            <span className={`text-2xl mr-2 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                {isCorrect ? '🎉' : '😔'}
                            </span>
                            <span className={`font-bold text-lg ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                                {isCorrect ? 'Correct!' : 'Incorrect!'}
                            </span>
                        </div>
                        <p className={`text-sm ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                            {currentQuestionData.explanation}
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-center space-x-4">
                    {isLastQuestion && showResult ? (
                        <button
                            onClick={handleRestart}
                            className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                            Play Again
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
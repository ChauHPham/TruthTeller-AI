import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Trophy, RotateCcw, CheckCircle, XCircle, Settings, BookOpen, Globe, Cpu, FlaskConical } from 'lucide-react';

const HalluciQuiz = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');
  const [showSettings, setShowSettings] = useState(false);

  // Quiz categories and their icons
  const categories = {
    science: { name: "Science", icon: FlaskConical, color: "from-green-500 to-emerald-500" },
    history: { name: "History", icon: BookOpen, color: "from-amber-500 to-orange-500" },
    geography: { name: "Geography", icon: Globe, color: "from-blue-500 to-cyan-500" },
    technology: { name: "Technology", icon: Cpu, color: "from-purple-500 to-pink-500" }
  };

  // Difficulty settings
  const difficultySettings = {
    easy: { timeLimit: 45, points: 10, label: "Easy" },
    medium: { timeLimit: 30, points: 20, label: "Medium" },
    hard: { timeLimit: 15, points: 30, label: "Hard" }
  };

  // Comprehensive quiz questions with categories, difficulty, and types
  const allQuestions = [
    // Science Questions
    {
      id: 1,
      category: "science",
      difficulty: "easy",
      type: "multiple-choice",
      question: "Which planet is known as the Red Planet?",
      options: ["Venus", "Mars", "Jupiter", "Saturn"],
      correct: 1,
      explanation: "Mars is called the Red Planet due to iron oxide on its surface."
    },
    {
      id: 2,
      category: "science",
      difficulty: "medium",
      type: "true-false",
      question: "The human body has 206 bones.",
      correct: true,
      explanation: "Yes, the adult human body has 206 bones, while babies are born with about 270 bones."
    },
    {
      id: 3,
      category: "science",
      difficulty: "hard",
      type: "multiple-choice",
      question: "What is the chemical symbol for gold?",
      options: ["Go", "Gd", "Au", "Ag"],
      correct: 2,
      explanation: "Au is the chemical symbol for gold, derived from the Latin word 'aurum'."
    },
    {
      id: 4,
      category: "science",
      difficulty: "easy",
      type: "true-false",
      question: "Water boils at 100°C at sea level.",
      correct: true,
      explanation: "Yes, water boils at 100°C (212°F) at standard atmospheric pressure (sea level)."
    },

    // History Questions
    {
      id: 5,
      category: "history",
      difficulty: "easy",
      type: "multiple-choice",
      question: "In which year did World War II end?",
      options: ["1944", "1945", "1946", "1947"],
      correct: 1,
      explanation: "World War II ended in 1945 with the surrender of Japan on September 2, 1945."
    },
    {
      id: 6,
      category: "history",
      difficulty: "medium",
      type: "true-false",
      question: "The Great Wall of China is visible from space with the naked eye.",
      correct: false,
      explanation: "This is a common myth. The Great Wall is not visible from space with the naked eye."
    },
    {
      id: 7,
      category: "history",
      difficulty: "hard",
      type: "multiple-choice",
      question: "Who was the first person to reach the South Pole?",
      options: ["Robert Falcon Scott", "Roald Amundsen", "Ernest Shackleton", "Edmund Hillary"],
      correct: 1,
      explanation: "Roald Amundsen was the first person to reach the South Pole on December 14, 1911."
    },

    // Geography Questions
    {
      id: 8,
      category: "geography",
      difficulty: "easy",
      type: "multiple-choice",
      question: "What is the capital of France?",
      options: ["London", "Berlin", "Paris", "Madrid"],
      correct: 2,
      explanation: "Paris is the capital and largest city of France."
    },
    {
      id: 9,
      category: "geography",
      difficulty: "medium",
      type: "true-false",
      question: "The Amazon River is the longest river in the world.",
      correct: false,
      explanation: "The Nile River is the longest river in the world at 6,650 km, while the Amazon is the second longest."
    },
    {
      id: 10,
      category: "geography",
      difficulty: "hard",
      type: "multiple-choice",
      question: "Which country has the most time zones?",
      options: ["Russia", "United States", "China", "Brazil"],
      correct: 0,
      explanation: "Russia spans 11 time zones, making it the country with the most time zones."
    },

    // Technology Questions
    {
      id: 11,
      category: "technology",
      difficulty: "easy",
      type: "true-false",
      question: "HTML stands for HyperText Markup Language.",
      correct: true,
      explanation: "Yes, HTML stands for HyperText Markup Language, the standard markup language for web pages."
    },
    {
      id: 12,
      category: "technology",
      difficulty: "medium",
      type: "multiple-choice",
      question: "What does CPU stand for?",
      options: ["Central Processing Unit", "Computer Processing Unit", "Central Program Unit", "Computer Program Unit"],
      correct: 0,
      explanation: "CPU stands for Central Processing Unit, the main processor of a computer."
    },
    {
      id: 13,
      category: "technology",
      difficulty: "hard",
      type: "true-false",
      question: "JavaScript and Java are the same programming language.",
      correct: false,
      explanation: "No, JavaScript and Java are completely different programming languages with different syntax and purposes."
    }
  ];

  // Filter questions based on selected category and difficulty
  const getFilteredQuestions = () => {
    let filtered = allQuestions;
    
    if (selectedCategory) {
      filtered = filtered.filter(q => q.category === selectedCategory);
    }
    
    if (selectedDifficulty) {
      filtered = filtered.filter(q => q.difficulty === selectedDifficulty);
    }
    
    return filtered;
  };

  const questions = getFilteredQuestions();

  // Timer effect
  useEffect(() => {
    if (quizStarted && !showResult && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !showResult) {
      handleAnswerSelect(null);
    }
  }, [timeLeft, quizStarted, showResult]);

  // Update timer when difficulty changes
  useEffect(() => {
    setTimeLeft(difficultySettings[selectedDifficulty].timeLimit);
  }, [selectedDifficulty]);

  const handleAnswerSelect = (answerIndex) => {
    setSelectedAnswer(answerIndex);
    const currentQ = questions[currentQuestion];
    let isCorrect = false;
    
    if (currentQ.type === 'true-false') {
      isCorrect = answerIndex === currentQ.correct;
    } else {
      isCorrect = answerIndex === currentQ.correct;
    }
    
    if (isCorrect) {
      setScore(score + difficultySettings[selectedDifficulty].points);
    }
    setShowResult(true);
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setTimeLeft(difficultySettings[selectedDifficulty].timeLimit);
    } else {
      // Quiz completed
      setShowResult(true);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setScore(0);
    setShowResult(false);
    setSelectedAnswer(null);
    setQuizStarted(false);
    setTimeLeft(difficultySettings[selectedDifficulty].timeLimit);
  };

  const startQuiz = () => {
    setQuizStarted(true);
    setTimeLeft(difficultySettings[selectedDifficulty].timeLimit);
  };

  const isQuizComplete = currentQuestion === questions.length - 1 && showResult;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mb-4"
            >
              <Brain className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">HalluciQuiz</h1>
            <p className="text-gray-600">Test your knowledge with AI-powered questions</p>
            
            {/* Settings Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSettings(!showSettings)}
              className="mt-4 inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </motion.button>
          </div>

          {/* Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 p-6 bg-gray-50 rounded-xl"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Quiz Settings</h3>
                
                {/* Category Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Select Category</label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(categories).map(([key, category]) => {
                      const IconComponent = category.icon;
                      return (
                        <motion.button
                          key={key}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            selectedCategory === key
                              ? `border-purple-500 bg-purple-50`
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className={`inline-flex items-center justify-center w-8 h-8 bg-gradient-to-r ${category.color} rounded-full mb-2`}>
                            <IconComponent className="w-4 h-4 text-white" />
                          </div>
                          <div className="text-sm font-medium text-gray-800">{category.name}</div>
                        </motion.button>
                      );
                    })}
                  </div>
                  {selectedCategory && (
                    <p className="mt-2 text-sm text-gray-600">
                      Selected: {categories[selectedCategory].name}
                    </p>
                  )}
                </div>

                {/* Difficulty Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Difficulty Level</label>
                  <div className="flex gap-3">
                    {Object.entries(difficultySettings).map(([key, difficulty]) => (
                      <motion.button
                        key={key}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedDifficulty(key)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          selectedDifficulty === key
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {difficulty.label}
                        <div className="text-xs opacity-75">
                          {difficulty.timeLimit}s • {difficulty.points}pts
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Quiz Info */}
                <div className="text-sm text-gray-600">
                  <p>Available questions: {questions.length}</p>
                  <p>Time per question: {difficultySettings[selectedDifficulty].timeLimit} seconds</p>
                  <p>Points per correct answer: {difficultySettings[selectedDifficulty].points}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {!quizStarted ? (
              <motion.div
                key="start"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="text-center"
              >
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-700 mb-2">
                    Ready to test your knowledge?
                  </h2>
                  <p className="text-gray-600">
                    {questions.length > 0 
                      ? `You'll have ${difficultySettings[selectedDifficulty].timeLimit} seconds per question. Good luck!`
                      : 'Please select a category and difficulty to start the quiz.'
                    }
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startQuiz}
                  disabled={questions.length === 0}
                  className={`px-8 py-3 rounded-lg font-semibold text-lg shadow-lg transition-all duration-200 ${
                    questions.length > 0
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:shadow-xl'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {questions.length > 0 ? 'Start Quiz' : 'No Questions Available'}
                </motion.button>
              </motion.div>
            ) : !isQuizComplete ? (
              <motion.div
                key="question"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      Question {currentQuestion + 1} of {questions.length}
                    </span>
                    <span className="text-sm font-medium text-gray-600">
                      Score: {score} points
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>

                {/* Question Type Badge */}
                <div className="text-center mb-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {questions[currentQuestion].type === 'true-false' ? 'True/False' : 'Multiple Choice'}
                  </span>
                </div>

                {/* Timer */}
                <div className="text-center mb-6">
                  <motion.div
                    key={timeLeft}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg ${
                      timeLeft <= 10 ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
                    }`}
                  >
                    {timeLeft}
                  </motion.div>
                </div>

                {/* Question */}
                <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
                  {questions[currentQuestion].question}
                </h2>

                {/* Options - Multiple Choice */}
                {questions[currentQuestion].type === 'multiple-choice' && (
                  <div className="space-y-3 mb-6">
                    {questions[currentQuestion].options.map((option, index) => (
                      <motion.button
                        key={index}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => !showResult && handleAnswerSelect(index)}
                        disabled={showResult}
                        className={`w-full p-4 rounded-lg text-left transition-all duration-200 ${
                          showResult
                            ? index === questions[currentQuestion].correct
                              ? 'bg-green-100 border-2 border-green-500 text-green-800'
                              : selectedAnswer === index
                              ? 'bg-red-100 border-2 border-red-500 text-red-800'
                              : 'bg-gray-100 text-gray-600'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center">
                          {showResult && index === questions[currentQuestion].correct && (
                            <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                          )}
                          {showResult && selectedAnswer === index && index !== questions[currentQuestion].correct && (
                            <XCircle className="w-5 h-5 text-red-500 mr-3" />
                          )}
                          <span className="font-medium">{option}</span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}

                {/* Options - True/False */}
                {questions[currentQuestion].type === 'true-false' && (
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {[true, false].map((value, index) => (
                      <motion.button
                        key={index}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => !showResult && handleAnswerSelect(value)}
                        disabled={showResult}
                        className={`p-6 rounded-lg text-center transition-all duration-200 ${
                          showResult
                            ? value === questions[currentQuestion].correct
                              ? 'bg-green-100 border-2 border-green-500 text-green-800'
                              : selectedAnswer === value
                              ? 'bg-red-100 border-2 border-red-500 text-red-800'
                              : 'bg-gray-100 text-gray-600'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200'
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          {showResult && value === questions[currentQuestion].correct && (
                            <CheckCircle className="w-6 h-6 text-green-500 mb-2" />
                          )}
                          {showResult && selectedAnswer === value && value !== questions[currentQuestion].correct && (
                            <XCircle className="w-6 h-6 text-red-500 mb-2" />
                          )}
                          <span className="text-2xl font-bold">
                            {value ? '✓' : '✗'}
                          </span>
                          <span className="text-lg font-medium mt-1">
                            {value ? 'True' : 'False'}
                          </span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}

                {/* Explanation */}
                {showResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"
                  >
                    <p className="text-blue-800">
                      <strong>Explanation:</strong> {questions[currentQuestion].explanation}
                    </p>
                  </motion.div>
                )}

                {/* Next Button */}
                {showResult && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={nextQuestion}
                    className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    {currentQuestion < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                  </motion.button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mb-6"
                >
                  <Trophy className="w-10 h-10 text-white" />
                </motion.div>
                
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Quiz Complete!</h2>
                <p className="text-lg text-gray-600 mb-6">
                  You earned <span className="font-bold text-purple-600">{score}</span> points out of{' '}
                  <span className="font-bold text-purple-600">{questions.length * difficultySettings[selectedDifficulty].points}</span> possible points
                </p>
                
                <div className="mb-6">
                  <div className="text-4xl font-bold text-gray-800 mb-2">
                    {Math.round((score / (questions.length * difficultySettings[selectedDifficulty].points)) * 100)}%
                  </div>
                  <p className="text-gray-600">
                    {score === questions.length * difficultySettings[selectedDifficulty].points
                      ? 'Perfect! You got everything right! 🎉'
                      : score >= (questions.length * difficultySettings[selectedDifficulty].points) * 0.8
                      ? 'Great job! You did really well! 👏'
                      : score >= (questions.length * difficultySettings[selectedDifficulty].points) * 0.6
                      ? 'Good effort! Keep learning! 💪'
                      : 'Keep studying and try again! 📚'}
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={resetQuiz}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 inline-flex items-center"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Try Again
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default HalluciQuiz;
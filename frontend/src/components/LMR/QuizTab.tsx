import React, { useState } from "react";
import { LMRQuiz } from "../../services/lmrApi";

interface QuizTabProps {
  quizData: LMRQuiz[];
  isLoading?: boolean;
}

const QuizTab: React.FC<QuizTabProps> = ({ quizData, isLoading }) => {
  const [currentQuiz, setCurrentQuiz] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, number>
  >({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  const handleAnswerSelect = (quizId: number, optionIndex: number) => {
    if (!showResults) {
      setSelectedAnswers({
        ...selectedAnswers,
        [quizId]: optionIndex,
      });
    }
  };

  const handleSubmit = () => {
    let correctCount = 0;
    quizData.forEach((quiz) => {
      if (selectedAnswers[quiz.id] === quiz.correctAnswer) {
        correctCount++;
      }
    });
    setScore(correctCount);
    setShowResults(true);
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setShowResults(false);
    setScore(0);
    setCurrentQuiz(0);
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center animate-pulse">
          <svg
            className="w-8 h-8 text-orange-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            ></path>
          </svg>
        </div>
        <p className="text-gray-600">Generating quiz...</p>
      </div>
    );
  }

  if (!quizData || quizData.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-orange-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            ></path>
          </svg>
        </div>
        <p className="text-gray-600">
          No quiz generated yet. Upload a document to get started.
        </p>
      </div>
    );
  }

  if (showResults) {
    const percentage = Math.round((score / quizData.length) * 100);
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border-2 border-orange-200 p-8 text-center">
          <div className="mb-6">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
              <span className="text-4xl font-bold text-orange-600">
                {percentage}%
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Quiz Complete!
            </h3>
            <p className="text-lg text-gray-600">
              You scored{" "}
              <span className="font-bold text-orange-600">{score}</span> out of{" "}
              <span className="font-bold">{quizData.length}</span>
            </p>
          </div>

          <div className="mb-6">
            <div className="flex justify-center gap-4 mb-4">
              <div className="bg-green-50 border-2 border-green-200 rounded-lg px-6 py-3">
                <p className="text-sm text-gray-600 mb-1">Correct</p>
                <p className="text-2xl font-bold text-green-600">{score}</p>
              </div>
              <div className="bg-red-50 border-2 border-red-200 rounded-lg px-6 py-3">
                <p className="text-sm text-gray-600 mb-1">Incorrect</p>
                <p className="text-2xl font-bold text-red-600">
                  {quizData.length - score}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-8 rounded-lg transition-all"
          >
            Try Again
          </button>
        </div>

        {/* Show correct answers */}
        <div className="mt-8 space-y-4">
          <h4 className="text-xl font-bold text-gray-800 mb-4">
            Review Answers
          </h4>
          {quizData.map((quiz) => {
            const userAnswer = selectedAnswers[quiz.id];
            const isCorrect = userAnswer === quiz.correctAnswer;

            return (
              <div
                key={quiz.id}
                className={`bg-white rounded-xl border-2 p-6 ${
                  isCorrect ? "border-green-200" : "border-red-200"
                }`}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCorrect ? "bg-green-100" : "bg-red-100"
                    }`}
                  >
                    {isCorrect ? (
                      <svg
                        className="w-5 h-5 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    )}
                  </div>
                  <h5 className="font-semibold text-gray-800">
                    {quiz.question}
                  </h5>
                </div>

                <div className="space-y-2 mb-4">
                  {quiz.options.map((option, index) => {
                    const isUserAnswer = userAnswer === index;
                    const isCorrectAnswer = index === quiz.correctAnswer;

                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border-2 ${
                          isCorrectAnswer
                            ? "bg-green-50 border-green-300"
                            : isUserAnswer
                            ? "bg-red-50 border-red-300"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <span className="font-medium">
                          {String.fromCharCode(65 + index)}.
                        </span>{" "}
                        {option}
                        {isCorrectAnswer && (
                          <span className="ml-2 text-green-600 font-semibold">
                            ✓ Correct
                          </span>
                        )}
                        {isUserAnswer && !isCorrectAnswer && (
                          <span className="ml-2 text-red-600 font-semibold">
                            ✗ Your answer
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-blue-800 mb-1">
                    Explanation:
                  </p>
                  <p className="text-sm text-blue-700">{quiz.explanation}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const quiz = quizData[currentQuiz];
  const progress = ((currentQuiz + 1) / quizData.length) * 100;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-700">
            Question {currentQuiz + 1} of {quizData.length}
          </span>
          <span className="text-sm font-semibold text-orange-600">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-orange-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Quiz card */}
      <div className="bg-white rounded-xl border-2 border-orange-200 p-6 sm:p-8">
        <div className="mb-4 flex items-center gap-3">
          <span
            className={`text-xs px-3 py-1.5 rounded-full font-semibold ${
              quiz.difficulty === "Easy"
                ? "bg-green-100 text-green-700 border border-green-200"
                : quiz.difficulty === "Medium"
                ? "bg-orange-100 text-orange-700 border border-orange-200"
                : "bg-red-100 text-red-700 border border-red-200"
            }`}
          >
            {quiz.difficulty}
          </span>
          <span className="text-xs bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full border border-orange-200 font-medium">
            {quiz.subject}
          </span>
        </div>

        <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-6">
          {quiz.question}
        </h3>

        <div className="space-y-3">
          {quiz.options.map((option, index) => {
            const isSelected = selectedAnswers[quiz.id] === index;

            return (
              <button
                key={index}
                onClick={() => handleAnswerSelect(quiz.id, index)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? "bg-orange-50 border-orange-400 shadow-md"
                    : "bg-white border-gray-200 hover:border-orange-300 hover:bg-orange-50"
                }`}
              >
                <span className="font-semibold text-gray-700">
                  {String.fromCharCode(65 + index)}.
                </span>{" "}
                <span className="text-gray-800">{option}</span>
              </button>
            );
          })}
        </div>

        {/* Navigation buttons */}
        <div className="mt-8 flex justify-between items-center">
          <button
            onClick={() => setCurrentQuiz(Math.max(0, currentQuiz - 1))}
            disabled={currentQuiz === 0}
            className="px-6 py-2.5 border-2 border-orange-200 text-orange-600 font-semibold rounded-lg hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            ← Previous
          </button>

          {currentQuiz === quizData.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={Object.keys(selectedAnswers).length !== quizData.length}
              className="px-8 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Submit Quiz
            </button>
          ) : (
            <button
              onClick={() =>
                setCurrentQuiz(Math.min(quizData.length - 1, currentQuiz + 1))
              }
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-all"
            >
              Next →
            </button>
          )}
        </div>
      </div>

      {/* Answer count indicator */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          Answered: {Object.keys(selectedAnswers).length} / {quizData.length}
        </p>
      </div>
    </div>
  );
};

export default QuizTab;

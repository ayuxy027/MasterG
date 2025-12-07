import React from "react";
import { LMRQuestion } from "../../services/lmrApi";

interface QuestionsTabProps {
  questions: LMRQuestion[];
  isLoading?: boolean;
}

const QuestionsTab: React.FC<QuestionsTabProps> = ({
  questions,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center animate-pulse">
          <svg
            className="w-8 h-8 text-orange-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0-3c-1.045 0-1.979.7-2.132 1.75m0 0c.211.578.813 1 1.5 1M12 11.5v-1m-5.5 3.5V13h2v2.5a1.5 1.5 0 11-3 0z"
            ></path>
          </svg>
        </div>
        <p className="text-gray-600">Generating questions...</p>
      </div>
    );
  }

  return (
    <div>
      {!questions || questions.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-orange-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0-3c-1.045 0-1.979.7-2.132 1.75m0 0c.211.578.813 1 1.5 1M12 11.5v-1m-5.5 3.5V13h2v2.5a1.5 1.5 0 11-3 0z"
              ></path>
            </svg>
          </div>
          <p className="text-gray-600">
            No questions generated yet. Switch to this tab to generate
            questions.
          </p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {questions.map((qa) => (
            <div
              key={qa.id}
              className="bg-white rounded-xl border-2 border-orange-200 hover:shadow-lg transition-all duration-300 overflow-hidden hover:border-orange-300"
            >
              <div className="p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {qa.id}
                    </span>
                    <h4 className="font-semibold text-gray-800 text-base sm:text-lg leading-relaxed">
                      {qa.question}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs px-3 py-1.5 rounded-full font-semibold whitespace-nowrap ${
                        qa.difficulty === "Easy"
                          ? "bg-green-100 text-green-700 border border-green-200"
                          : qa.difficulty === "Medium"
                          ? "bg-orange-100 text-orange-700 border border-orange-200"
                          : "bg-red-100 text-red-700 border border-red-200"
                      }`}
                    >
                      {qa.difficulty}
                    </span>
                    {qa.pageReference && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-200 font-medium">
                        Page {qa.pageReference}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mb-4">
                  <span className="inline-block bg-orange-50 text-orange-700 text-xs sm:text-sm px-3 py-1.5 rounded-full border border-orange-200 font-medium">
                    {qa.subject}
                  </span>
                </div>
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 p-4 sm:p-5 rounded-lg">
                  <div className="flex items-start gap-2.5">
                    <svg
                      className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="flex-1">
                      <span className="font-semibold text-orange-600 text-sm sm:text-base block mb-1">
                        Answer:
                      </span>
                      <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                        {qa.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuestionsTab;

import React from 'react';

interface QuestionAnswer {
  id: number;
  question: string;
  subject: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  answer: string;
}

interface QuestionsTabProps {
  language?: string;
  model?: string;
  tone?: string;
}

const QuestionsTab: React.FC<QuestionsTabProps> = () => {
  const mockQuestions: QuestionAnswer[] = [
    { 
      id: 1, 
      question: 'What is the process of photosynthesis?', 
      subject: 'Biology', 
      difficulty: 'Medium', 
      answer: 'Photosynthesis is the process by which green plants use sunlight, carbon dioxide, and water to synthesize food materials.' 
    },
    { 
      id: 2, 
      question: 'Solve for x: 2x + 5 = 15', 
      subject: 'Mathematics', 
      difficulty: 'Easy', 
      answer: 'Subtract 5 from both sides: 2x = 10, then divide by 2: x = 5.' 
    },
    { 
      id: 3, 
      question: 'When did India gain independence?', 
      subject: 'History', 
      difficulty: 'Easy', 
      answer: 'India gained independence on August 15, 1947.' 
    },
  ];

  return (
    <div>
      {mockQuestions.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0-3c-1.045 0-1.979.7-2.132 1.75m0 0c.211.578.813 1 1.5 1M12 11.5v-1m-5.5 3.5V13h2v2.5a1.5 1.5 0 11-3 0z"></path>
            </svg>
          </div>
          <p className="text-gray-600">No questions generated yet. Upload a document to get started.</p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {mockQuestions.map((qa) => (
            <div key={qa.id} className="bg-white rounded-xl border-2 border-orange-200 hover:shadow-lg transition-all duration-300 overflow-hidden hover:border-orange-300">
              <div className="p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                  <h4 className="font-semibold text-gray-800 text-base sm:text-lg leading-relaxed flex-1">{qa.question}</h4>
                  <span className={`text-xs px-3 py-1.5 rounded-full font-semibold whitespace-nowrap ${
                    qa.difficulty === 'Easy' ? 'bg-green-100 text-green-700 border border-green-200' :
                    qa.difficulty === 'Medium' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                    'bg-red-100 text-red-700 border border-red-200'
                  }`}>
                    {qa.difficulty}
                  </span>
                </div>
                <div className="mb-4">
                  <span className="inline-block bg-orange-50 text-orange-700 text-xs sm:text-sm px-3 py-1.5 rounded-full border border-orange-200 font-medium">
                    {qa.subject}
                  </span>
                </div>
                <div className="bg-orange-50 border-2 border-orange-200 p-4 sm:p-5 rounded-lg">
                  <div className="flex items-start gap-2.5">
                    <span className="font-semibold text-orange-600 text-sm sm:text-base flex-shrink-0">Answer:</span> 
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed">{qa.answer}</p>
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
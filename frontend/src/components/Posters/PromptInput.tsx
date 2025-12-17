import React from 'react';
import type { PosterCategory } from '../../types/poster';

interface PromptInputProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  selectedCategory: string;
  categories: PosterCategory[];
}

const PromptInput: React.FC<PromptInputProps> = ({ 
  prompt, 
  onPromptChange,
  onGenerate,
  isGenerating,
  selectedCategory,
  categories
}) => {
  // Get current category details
  const currentCategory = categories.find(c => c.id === selectedCategory);
  
  // Example prompts based on category
  const getExamplePrompts = () => {
    if (currentCategory && currentCategory.examples.length > 0) {
      return currentCategory.examples;
    }
    return [
      'Create a colorful diagram showing the water cycle',
      'Design a multiplication table poster for class 3',
      'Illustrate the solar system with planet names in Hindi'
    ];
  };

  const handleGenerate = () => {
    if (!prompt.trim() || isGenerating) return;
    onGenerate();
  };

  const handleExampleClick = (example: string) => {
    onPromptChange(example);
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 sm:p-6 shadow-xl border-2 border-orange-200/60">
      <div className="flex items-center gap-2 mb-4">
        <svg
          className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
        <h3 className="text-sm sm:text-base font-semibold text-gray-800">Describe Your Poster</h3>
      </div>
      
      <div className="mb-4">
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder={`Describe the educational poster you want... (e.g., "${getExamplePrompts()[0]}")`}
          className="w-full border border-gray-200 rounded-lg p-4 resize-none h-32 focus:ring-2 focus:ring-orange-200 focus:border-orange-300 bg-white text-gray-900 placeholder-gray-400 transition-all"
          maxLength={500}
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-500">{prompt.length}/500 characters</span>
        </div>
      </div>

      {/* Example Prompts */}
      <div className="mb-4">
        <p className="text-xs font-medium text-gray-600 mb-2">Try these examples:</p>
        <div className="flex flex-wrap gap-2">
          {getExamplePrompts().slice(0, 3).map((example, index) => (
            <button
              key={index}
              onClick={() => handleExampleClick(example)}
              className="text-xs px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full hover:bg-orange-100 transition-colors border border-orange-200"
            >
              {example.length > 50 ? example.substring(0, 50) + '...' : example}
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={!prompt.trim() || isGenerating}
        className={`w-full px-6 py-3 rounded-xl font-semibold text-base transition-all ${
          (!prompt.trim() || isGenerating)
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : 'bg-linear-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
        }`}
      >
        {isGenerating ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating Posters...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Generate Educational Posters
          </span>
        )}
      </button>
    </div>
  );
};

export default PromptInput;
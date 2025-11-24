import React, { useState } from 'react';

interface PromptInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
  selectedCategory: string;
  setNumImages?: (num: number) => void;  // Optional prop to set number of images in parent
}

const PromptInput: React.FC<PromptInputProps> = ({ 
  prompt, 
  setPrompt, 
  isGenerating, 
  setIsGenerating,
  selectedCategory,
  setNumImages: setParentNumImages
}) => {
  const [selectedModel, setSelectedModel] = useState('lora');
  const [numImages, setLocalNumImages] = useState(3);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageQuality, setImageQuality] = useState('medium');

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    
    // Update parent if function is provided
    if (setParentNumImages) {
      setParentNumImages(numImages);
    }
    
    setIsGenerating(true);
    
    // Simulate image generation
    setTimeout(() => {
      setIsGenerating(false);
    }, 3000);
  };

  const handleNumImagesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value);
    setLocalNumImages(value);
    // Update parent if function is provided
    if (setParentNumImages) {
      setParentNumImages(value);
    }
  };

  return (
    <div className="bg-white rounded-lg p-5 border border-gray-200">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Describe the educational image you want to generate</label>
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Create an educational poster for ${selectedCategory} in any Indian language...`}
            className="w-full border border-gray-300 rounded-lg p-3 resize-none h-24 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent"
          />
          <div className="absolute bottom-2 right-2">
            <span className="text-xs text-gray-500">{prompt.length}/500</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Model</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 bg-white"
          >
            <option value="lora">LoRA</option>
            <option value="qwen-vl">Qwen-VL</option>
            <option value="flux">Flux</option>
            <option value="llava">LLaVA</option>
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Number of Images</label>
          <select
            value={numImages}
            onChange={handleNumImagesChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 bg-white"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Aspect Ratio</label>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 bg-white"
          >
            <option value="1:1">1:1 (Square)</option>
            <option value="16:9">16:9 (Landscape)</option>
            <option value="9:16">9:16 (Portrait)</option>
            <option value="4:3">4:3 (Standard)</option>
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Quality</label>
          <select
            value={imageQuality}
            onChange={(e) => setImageQuality(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 bg-white"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          className={`px-4 py-2 rounded-lg font-medium text-sm ${
            (!prompt.trim() || isGenerating)
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-md'
          }`}
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white inline mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : (
            <>
              Generate Images
            </>
          )}
        </button>
        
        <div className="text-xs text-orange-700 bg-orange-50 px-3 py-1.5 rounded border border-orange-200 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
          </svg>
          <span>Grid output: {numImages} image{numImages > 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
};

export default PromptInput;
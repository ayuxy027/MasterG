import React, { useState } from 'react';

const PostersPage: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('science');
  const [numImages, setNumImages] = useState(3);
  const [selectedModel, setSelectedModel] = useState('lora');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageQuality, setImageQuality] = useState('medium');
  const [selectedLanguage, setSelectedLanguage] = useState('english');
  const [hasGenerated, setHasGenerated] = useState(false);

  const models = [
    { value: 'lora', label: 'LoRA' },
    { value: 'qwen-vl', label: 'Qwen-VL' },
    { value: 'flux', label: 'Flux' },
    { value: 'llava', label: 'LLaVA' }
  ];

  const languages = [
    { value: 'english', label: 'English' },
    { value: 'hindi', label: 'हिंदी' },
    { value: 'tamil', label: 'தமிழ்' },
    { value: 'telugu', label: 'తెలుగు' },
    { value: 'bengali', label: 'বাংলা' },
    { value: 'marathi', label: 'मराठी' },
    { value: 'gujarati', label: 'ગુજરાતી' },
    { value: 'kannada', label: 'ಕನ್ನಡ' }
  ];

  const categories = [
    {
      id: 'science', name: 'Science', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      )
    },
    {
      id: 'math', name: 'Mathematics', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'history', name: 'History', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'geography', name: 'Geography', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'literature', name: 'Literature', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      id: 'art', name: 'Art', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      )
    }
  ];

  const handleGenerate = () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setHasGenerated(false);

    // Simulate image generation
    setTimeout(() => {
      setIsGenerating(false);
      setHasGenerated(true);
    }, 3000);
  };

  const mockImages = Array.from({ length: numImages }, (_, index) => ({
    id: index + 1,
    url: `https://placehold.co/400x300/FF6B35/FFFFFF?text=Educational+Poster+${index + 1}`,
  }));

  const getGridClass = () => {
    if (numImages === 1) return 'grid-cols-1';
    if (numImages === 2) return 'grid-cols-1 md:grid-cols-2';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8">
        {/* Header Section */}
        <div className="mb-6 sm:mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-gray-800 mb-2 sm:mb-3">
            Generate <span className="text-orange-400">Educational Posters</span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
            AI-powered educational visuals for all 22+ Indian languages
          </p>
        </div>

        {/* Prompt Input Section */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 p-5 sm:p-6 md:p-8">
            <label className="flex items-center gap-2 text-sm sm:text-base font-semibold text-gray-800 mb-3">
              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
              Describe the educational poster you want to generate
            </label>
            <div className="relative mb-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={`Create an educational poster for ${categories.find(c => c.id === selectedCategory)?.name.toLowerCase()}...`}
                rows={4}
                maxLength={500}
                className="w-full px-4 py-3 bg-white border-2 border-orange-200 rounded-xl text-sm sm:text-base resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-700 transition-all"
              />
              <div className="absolute bottom-3 right-3">
                <span className={`text-xs ${prompt.length > 450 ? 'text-orange-500' : 'text-gray-500'}`}>
                  {prompt.length}/500
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Category Selector */}
          <div className="lg:col-span-2 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 p-4 sm:p-5">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-800 mb-3">
              <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
              </svg>
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${selectedCategory === category.id
                      ? 'bg-orange-400 text-white shadow-md'
                      : 'bg-white text-gray-700 border-2 border-orange-200 hover:bg-orange-50 hover:border-orange-300'
                    }`}
                >
                  <span className="flex-shrink-0">{category.icon}</span>
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Language Selector */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 p-4 sm:p-5">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-800 mb-2.5">
              <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path>
              </svg>
              Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border-2 border-orange-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-700 transition-all"
            >
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>{lang.label}</option>
              ))}
            </select>
          </div>

          {/* Number of Images */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 p-4 sm:p-5">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-800 mb-2.5">
              <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              Images
            </label>
            <select
              value={numImages}
              onChange={(e) => setNumImages(parseInt(e.target.value))}
              className="w-full px-3 py-2.5 bg-white border-2 border-orange-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-700 transition-all"
            >
              <option value={1}>1 image</option>
              <option value={2}>2 images</option>
              <option value={3}>3 images</option>
              <option value={4}>4 images</option>
            </select>
          </div>

          {/* Model Selector */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 p-4 sm:p-5">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-800 mb-2.5">
              <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
              </svg>
              Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border-2 border-orange-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-700 transition-all"
            >
              {models.map((model) => (
                <option key={model.value} value={model.value}>{model.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Additional Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Aspect Ratio */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 p-4 sm:p-5">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-800 mb-2.5">
              <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
              </svg>
              Aspect Ratio
            </label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border-2 border-orange-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-700 transition-all"
            >
              <option value="1:1">1:1 (Square)</option>
              <option value="16:9">16:9 (Landscape)</option>
              <option value="9:16">9:16 (Portrait)</option>
              <option value="4:3">4:3 (Standard)</option>
            </select>
          </div>

          {/* Quality */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 p-4 sm:p-5">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-800 mb-2.5">
              <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
              </svg>
              Quality
            </label>
            <select
              value={imageQuality}
              onChange={(e) => setImageQuality(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border-2 border-orange-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-700 transition-all"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        {/* Generate Button */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 p-5 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <span>Will generate {numImages} poster{numImages > 1 ? 's' : ''} in {aspectRatio} format</span>
              </div>
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className={`px-6 sm:px-8 py-3 sm:py-3.5 rounded-full font-semibold text-sm sm:text-base shadow-md transition-all transform w-full sm:w-auto ${!prompt.trim() || isGenerating
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-orange-400 text-white hover:bg-orange-500 hover:shadow-lg hover:scale-105'
                  }`}
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </span>
                ) : (
                  'Generate Posters'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 overflow-hidden">
          {isGenerating ? (
            <div className="p-12 sm:p-16 text-center">
              <div className="flex justify-center mb-6">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500"></div>
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-3">
                Generating your educational visuals...
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                Our AI is creating contextual images relevant to {categories.find(c => c.id === selectedCategory)?.name.toLowerCase()} in Indian educational context
              </p>
            </div>
          ) : hasGenerated ? (
            <div className="p-6 sm:p-8 md:p-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800">Generated Posters</h2>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                  <span className="px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-full">{categories.find(c => c.id === selectedCategory)?.name}</span>
                  <span className="px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-full">{languages.find(l => l.value === selectedLanguage)?.label}</span>
                </div>
              </div>

              <div className={`grid ${getGridClass()} gap-4 sm:gap-6 mb-8`}>
                {mockImages.map((image) => (
                  <div key={image.id} className="group relative overflow-hidden rounded-xl border-2 border-orange-200 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                    <div className="aspect-video bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                      <div className="text-center">
                        <svg className="w-12 h-12 sm:w-16 sm:h-16 text-orange-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <p className="text-xs sm:text-sm text-orange-600 font-medium">Poster {image.id}</p>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                      <div className="w-full">
                        <h4 className="text-white font-semibold text-sm sm:text-base mb-1">Educational Poster #{image.id}</h4>
                        <p className="text-orange-200 text-xs sm:text-sm mb-3">Click to download</p>
                        <button className="w-full px-4 py-2 bg-orange-400 text-white rounded-lg font-medium text-xs sm:text-sm hover:bg-orange-500 transition-all">
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 sm:py-20">
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-full bg-orange-100 flex items-center justify-center">
                <svg className="w-10 h-10 sm:w-12 sm:h-12 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-800 mb-3">
                <span className="text-orange-400">Enter Prompt</span> to Generate Posters
              </h3>
              <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto leading-relaxed">
                Fill in the details above and click "Generate Posters" to create your educational visuals.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostersPage;

import React, { useState } from 'react';

const WeavePage: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [numSlides, setNumSlides] = useState(5);
  const [presentationStyle, setPresentationStyle] = useState('academic');
  const [targetAudience, setTargetAudience] = useState('school');
  const [selectedLanguage, setSelectedLanguage] = useState('english');
  const [selectedModel, setSelectedModel] = useState('deepseek');
  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [customCriteria, setCustomCriteria] = useState<Array<{ id: string; label: string; value: string }>>([]);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsGenerating(true);
    // Simulate API call
    setTimeout(() => {
      setIsGenerating(false);
      setHasGenerated(true);
    }, 2000);
  };

  const addCustomCriteria = () => {
    const newId = `criteria-${Date.now()}`;
    setCustomCriteria([...customCriteria, { id: newId, label: '', value: '' }]);
  };

  const updateCustomCriteria = (id: string, field: 'label' | 'value', newValue: string) => {
    setCustomCriteria(customCriteria.map(criteria =>
      criteria.id === id ? { ...criteria, [field]: newValue } : criteria
    ));
  };

  const removeCustomCriteria = (id: string) => {
    setCustomCriteria(customCriteria.filter(criteria => criteria.id !== id));
  };

  const models = [
    { value: 'deepseek', label: 'DeepSeek R1' },
    { value: 'llama', label: 'Llama 4 Scout' },
    { value: 'qwen', label: 'Qwen 3 7b' },
    { value: 'kimi', label: 'Kimi K2 Instruct' }
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

  const presentationStyles = [
    { value: 'academic', label: 'Academic', description: 'Formal and educational tone' },
    { value: 'business', label: 'Business', description: 'Professional and corporate tone' },
    { value: 'storytelling', label: 'Storytelling', description: 'Narrative and engaging tone' },
    { value: 'technical', label: 'Technical', description: 'Detailed and precise tone' }
  ];

  const audiences = [
    { value: 'school', label: 'School', description: 'Elementary to high school' },
    { value: 'college', label: 'College', description: 'Undergraduate level' },
    { value: 'professional', label: 'Professional', description: 'Industry and corporate' },
    { value: 'training', label: 'Training', description: 'Workshops and seminars' }
  ];

  const templates = [
    {
      value: 'modern',
      label: 'Modern',
      description: 'Clean and minimalist',
      preview: 'bg-gradient-to-br from-orange-400 to-orange-600'
    },
    {
      value: 'classic',
      label: 'Classic',
      description: 'Traditional and formal',
      preview: 'bg-gradient-to-br from-blue-500 to-blue-700'
    },
    {
      value: 'creative',
      label: 'Creative',
      description: 'Bold and vibrant',
      preview: 'bg-gradient-to-br from-purple-500 to-pink-500'
    },
    {
      value: 'professional',
      label: 'Professional',
      description: 'Corporate and sleek',
      preview: 'bg-gradient-to-br from-gray-700 to-gray-900'
    },
    {
      value: 'educational',
      label: 'Educational',
      description: 'Friendly and engaging',
      preview: 'bg-gradient-to-br from-green-500 to-teal-600'
    },
    {
      value: 'minimal',
      label: 'Minimal',
      description: 'Simple and elegant',
      preview: 'bg-gradient-to-br from-slate-400 to-slate-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8">
        {/* Header Section */}
        <div className="mb-6 sm:mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-gray-800 mb-2 sm:mb-3">
            <span className="text-orange-400">Weave</span> Your Best-in-Class Presentation
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
            AI-powered personalized presentations for educators in 22+ Indian languages
          </p>
        </div>

        {/* Topic Input Section */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 p-5 sm:p-6 md:p-8">
            <label className="flex items-center gap-2 text-sm sm:text-base font-semibold text-gray-800 mb-3">
              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              Presentation Topic
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter your presentation topic or lesson outline..."
              rows={3}
              className="w-full px-4 py-3 bg-white border-2 border-orange-200 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-700 transition-all resize-none"
              required
            />
          </div>
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
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

          {/* Presentation Style */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 p-4 sm:p-5">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-800 mb-2.5">
              <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path>
              </svg>
              Style
            </label>
            <select
              value={presentationStyle}
              onChange={(e) => setPresentationStyle(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border-2 border-orange-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-700 transition-all"
            >
              {presentationStyles.map((style) => (
                <option key={style.value} value={style.value}>{style.label}</option>
              ))}
            </select>
          </div>

          {/* Target Audience */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 p-4 sm:p-5">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-800 mb-2.5">
              <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
              Audience
            </label>
            <select
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border-2 border-orange-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-700 transition-all"
            >
              {audiences.map((audience) => (
                <option key={audience.value} value={audience.value}>{audience.label}</option>
              ))}
            </select>
          </div>

          {/* Number of Slides */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 p-4 sm:p-5">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-800 mb-2.5">
              <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              Slides
            </label>
            <select
              value={numSlides}
              onChange={(e) => setNumSlides(parseInt(e.target.value))}
              className="w-full px-3 py-2.5 bg-white border-2 border-orange-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-700 transition-all"
            >
              {[5, 6, 7, 8, 9, 10].map(num => (
                <option key={num} value={num}>{num} slides</option>
              ))}
            </select>
          </div>
        </div>

        {/* Template Selection Section */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 p-5 sm:p-6 md:p-8">
            <div className="flex items-center gap-2 mb-4 sm:mb-5">
              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path>
              </svg>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Choose Template</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {templates.map((template) => (
                <button
                  key={template.value}
                  onClick={() => setSelectedTemplate(template.value)}
                  className={`relative p-4 sm:p-5 rounded-xl border-2 transition-all transform hover:scale-105 ${selectedTemplate === template.value
                    ? 'border-orange-400 bg-orange-50 shadow-lg'
                    : 'border-orange-200 bg-white hover:border-orange-300 hover:bg-orange-50/50'
                    }`}
                >
                  <div className={`w-full aspect-video rounded-lg mb-3 ${template.preview}`}></div>
                  <h3 className="font-semibold text-xs sm:text-sm text-gray-800 mb-1">{template.label}</h3>
                  <p className="text-[10px] sm:text-xs text-gray-600">{template.description}</p>
                  {selectedTemplate === template.value && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-orange-400 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Criteria Section */}
        {customCriteria.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 p-5 sm:p-6 md:p-8">
              <div className="flex items-center justify-between mb-4 sm:mb-5">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Custom Criteria</h2>
                </div>
                <button
                  onClick={addCustomCriteria}
                  className="px-4 py-2 bg-orange-100 text-orange-600 border-2 border-orange-200 rounded-lg font-semibold text-xs sm:text-sm hover:bg-orange-200 hover:border-orange-300 transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  Add More
                </button>
              </div>
              <div className="space-y-4">
                {customCriteria.map((criteria) => (
                  <div key={criteria.id} className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-4 bg-orange-50/50 border-2 border-orange-200 rounded-xl">
                    <div className="flex-1">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Criteria Label</label>
                      <input
                        type="text"
                        value={criteria.label}
                        onChange={(e) => updateCustomCriteria(criteria.id, 'label', e.target.value)}
                        placeholder="e.g., Focus Areas, Key Points, etc."
                        className="w-full px-3 py-2 bg-white border-2 border-orange-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-700 transition-all"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Value</label>
                      <input
                        type="text"
                        value={criteria.value}
                        onChange={(e) => updateCustomCriteria(criteria.id, 'value', e.target.value)}
                        placeholder="Enter value..."
                        className="w-full px-3 py-2 bg-white border-2 border-orange-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-700 transition-all"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={() => removeCustomCriteria(criteria.id)}
                        className="px-4 py-2 bg-red-100 text-red-600 border-2 border-red-200 rounded-lg font-semibold text-xs sm:text-sm hover:bg-red-200 hover:border-red-300 transition-all flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Add Custom Criteria Button */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={addCustomCriteria}
            className="w-full bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-dashed border-orange-300 p-5 sm:p-6 md:p-8 hover:border-orange-400 hover:bg-orange-50/50 transition-all group"
          >
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-orange-100 group-hover:bg-orange-200 flex items-center justify-center transition-all">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-orange-400 group-hover:text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
              </div>
              <div className="text-center">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-1">Add Custom Criteria</h3>
                <p className="text-xs sm:text-sm text-gray-600">Add specific requirements or preferences for your presentation</p>
              </div>
            </div>
          </button>
        </div>

        {/* AI Model and Generate Section */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 p-5 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
              <div className="flex-1">
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-800 mb-2.5">
                  <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                  </svg>
                  AI Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full sm:w-auto min-w-[200px] px-3 py-2.5 bg-white border-2 border-orange-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-700 transition-all"
                >
                  {models.map((model) => (
                    <option key={model.value} value={model.value}>{model.label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !topic.trim()}
                className={`px-6 sm:px-8 py-3 sm:py-3.5 rounded-full font-semibold text-sm sm:text-base shadow-md transition-all transform w-full sm:w-auto ${isGenerating || !topic.trim()
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
                  'Generate Presentation'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 overflow-hidden">
          <div className="p-6 sm:p-8 md:p-10">
            {!hasGenerated ? (
              <div className="text-center py-16 sm:py-20">
                <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-full bg-orange-100 flex items-center justify-center">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path>
                  </svg>
                </div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-800 mb-3">
                  <span className="text-orange-400">Enter Your Topic</span> to Generate Presentation
                </h3>
                <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto leading-relaxed">
                  Fill in the details above and click "Generate Presentation" to create your personalized slides.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path>
                    </svg>
                    <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800">Presentation Preview</h2>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                    <span className="px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-full">{languages.find(l => l.value === selectedLanguage)?.label}</span>
                    <span className="px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-full">{templates.find(t => t.value === selectedTemplate)?.label}</span>
                  </div>
                </div>

                {/* Slide Preview Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
                  {Array.from({ length: numSlides }).map((_, index) => (
                    <div key={index} className="bg-white rounded-xl border-2 border-orange-200 overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:border-orange-300">
                      <div className={`aspect-video ${templates.find(t => t.value === selectedTemplate)?.preview} flex items-center justify-center`}>
                        <div className="text-center">
                          <svg className="w-12 h-12 sm:w-16 sm:h-16 text-white/80 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path>
                          </svg>
                          <p className="text-xs sm:text-sm text-white/90 font-medium">Slide {index + 1}</p>
                        </div>
                      </div>
                      <div className="p-4 sm:p-5">
                        <h4 className="font-semibold text-gray-800 text-sm sm:text-base mb-2">Slide Title</h4>
                        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">Content will be generated here...</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                  <button className="px-5 sm:px-6 py-2.5 sm:py-3 bg-orange-400 text-white rounded-full font-semibold text-sm sm:text-base hover:bg-orange-500 transition-all shadow-md hover:shadow-lg hover:scale-105">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      Download PDF
                    </span>
                  </button>
                  <button className="px-5 sm:px-6 py-2.5 sm:py-3 bg-white text-orange-600 border-2 border-orange-200 rounded-full font-semibold text-sm sm:text-base hover:bg-orange-50 hover:border-orange-300 transition-all shadow-md hover:shadow-lg hover:scale-105">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                      </svg>
                      Export PPTX
                    </span>
                  </button>
                  <button className="px-5 sm:px-6 py-2.5 sm:py-3 bg-white text-orange-600 border-2 border-orange-200 rounded-full font-semibold text-sm sm:text-base hover:bg-orange-50 hover:border-orange-300 transition-all shadow-md hover:shadow-lg hover:scale-105">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                      </svg>
                      Edit Slides
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeavePage;

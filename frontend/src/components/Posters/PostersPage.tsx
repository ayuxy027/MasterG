import React, { useState, useEffect } from 'react';
import CategorySelector from './CategorySelector';
import PromptInput from './PromptInput';
import GenerationResults from './GenerationResults';
import { generatePosters, getCategories, getLanguages, PosterApiError } from '../../services/posterApi';
import type { PosterCategory, Language, GeneratedPoster } from '../../types/poster';

const PostersPage: React.FC = () => {
  // State
  const [categories, setCategories] = useState<PosterCategory[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('science');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [prompt, setPrompt] = useState('');
  const [count, setCount] = useState(4);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPosters, setGeneratedPosters] = useState<GeneratedPoster[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [enhancedPrompt, setEnhancedPrompt] = useState<string>('');

  // Load categories and languages on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [categoriesData, languagesData] = await Promise.all([
        getCategories(),
        getLanguages(),
      ]);
      setCategories(categoriesData);
      setLanguages(languagesData);
    } catch (err) {
      console.error('Failed to load initial data:', err);
      // Use fallback data
      setCategories([
        { id: 'science', name: 'Science', description: 'Scientific concepts', icon: '🔬', examples: [] },
        { id: 'mathematics', name: 'Mathematics', description: 'Math concepts', icon: '📐', examples: [] },
      ]);
      setLanguages([
        { code: 'en', name: 'English', native: 'English' },
        { code: 'hi', name: 'Hindi', native: 'हिंदी' },
      ]);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedPosters([]);
    setEnhancedPrompt('');

    try {
      const response = await generatePosters({
        query: prompt.trim(),
        category: selectedCategory,
        language: selectedLanguage,
        count,
        aspectRatio,
      });

      setGeneratedPosters(response.posters);
      if (response.posters.length > 0) {
        setEnhancedPrompt(response.posters[0].enhancedPrompt);
      }
    } catch (err) {
      if (err instanceof PosterApiError) {
        setError(err.message);
      } else {
        setError('Failed to generate posters. Please try again.');
      }
      console.error('Generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (poster: GeneratedPoster, index: number) => {
    const link = document.createElement('a');
    link.href = `data:${poster.mimeType};base64,${poster.imageBase64}`;
    link.download = `educational-poster-${selectedCategory}-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    generatedPosters.forEach((poster, index) => {
      setTimeout(() => handleDownload(poster, index), index * 500);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 mb-3">
            <span className="text-orange-400">AI-Powered</span> Educational Posters
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-3xl mx-auto">
            Generate culturally relevant, multilingual educational posters for Indian classrooms
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Category Selector */}
            <CategorySelector
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />

            {/* Language Selector */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-xl border-2 border-orange-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Language</h3>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full px-4 py-2 border-2 border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.name}>
                    {lang.native} ({lang.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Settings */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-xl border-2 border-orange-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Settings</h3>
              
              {/* Number of Images */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Posters: {count}
                </label>
                <input
                  type="range"
                  min="1"
                  max="4"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                </div>
              </div>

              {/* Aspect Ratio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aspect Ratio
                </label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as any)}
                  className="w-full px-4 py-2 border-2 border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                >
                  <option value="1:1">Square (1:1)</option>
                  <option value="16:9">Landscape (16:9)</option>
                  <option value="9:16">Portrait (9:16)</option>
                  <option value="4:3">Standard (4:3)</option>
                  <option value="3:4">Portrait (3:4)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right Panel - Input & Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Prompt Input */}
            <PromptInput
              prompt={prompt}
              onPromptChange={setPrompt}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              selectedCategory={selectedCategory}
              categories={categories}
            />

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-medium text-red-800">Generation Failed</p>
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Prompt Display */}
            {enhancedPrompt && !isGenerating && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-medium text-blue-800 mb-1">AI-Enhanced Prompt</p>
                    <p className="text-sm text-blue-700">{enhancedPrompt}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Generation Results */}
            <GenerationResults
              posters={generatedPosters}
              isGenerating={isGenerating}
              count={count}
              onDownload={handleDownload}
              onDownloadAll={handleDownloadAll}
            />
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-gradient-to-r from-orange-100 to-orange-50 rounded-2xl p-6 border-2 border-orange-200">
          <div className="flex items-start gap-4">
            <svg className="w-8 h-8 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">About Educational Posters</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>✨ AI-powered image generation using Google Imagen 3.0</li>
                <li>🎨 Culturally sensitive and educationally appropriate content</li>
                <li>🌏 Support for 10+ Indian languages with text integration</li>
                <li>📚 Category-specific optimization for different subjects</li>
                <li>💾 High-resolution PNG downloads for classroom use</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostersPage;

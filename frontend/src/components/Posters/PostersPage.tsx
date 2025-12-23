import React, { useState, useEffect } from "react";
import CategorySelector from "./CategorySelector";
import PromptInput from "./PromptInput";
import GenerationResults from "./GenerationResults";
import {
  generatePosters,
  getCategories,
  getLanguages,
  PosterApiError,
} from "../../services/posterApi";
import type {
  PosterCategory,
  Language,
  GeneratedPoster,
} from "../../types/poster";

// LocalStorage key for storing posters
const POSTERS_STORAGE_KEY = "masterji_generated_posters";

// Extended poster type with metadata for storage
interface StoredPoster extends GeneratedPoster {
  id: string;
  query: string;
  category: string;
  language: string;
  aspectRatio: string;
  createdAt: string;
}

// Helper functions for localStorage
const savePostersToStorage = (posters: StoredPoster[]): void => {
  try {
    // Limit to last 20 posters to avoid localStorage quota issues
    const postersToSave = posters.slice(-20);
    localStorage.setItem(POSTERS_STORAGE_KEY, JSON.stringify(postersToSave));
  } catch (error) {
    console.warn("Failed to save posters to localStorage:", error);
  }
};

const loadPostersFromStorage = (): StoredPoster[] => {
  try {
    const stored = localStorage.getItem(POSTERS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn("Failed to load posters from localStorage:", error);
  }
  return [];
};

const clearPostersFromStorage = (): void => {
  try {
    localStorage.removeItem(POSTERS_STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to clear posters from localStorage:", error);
  }
};

const PostersPage: React.FC = () => {
  // State
  const [categories, setCategories] = useState<PosterCategory[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("science");
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(1);
  const [aspectRatio, setAspectRatio] = useState<
    "1:1" | "16:9" | "9:16" | "4:3" | "3:4"
  >("1:1");

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPosters, setGeneratedPosters] = useState<GeneratedPoster[]>(
    []
  );
  const [storedPosters, setStoredPosters] = useState<StoredPoster[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [enhancedPrompt, setEnhancedPrompt] = useState<string>("");

  // Load categories, languages, and stored posters on mount
  useEffect(() => {
    loadInitialData();
    // Load stored posters from localStorage
    const stored = loadPostersFromStorage();
    setStoredPosters(stored);
    // Also set the most recent generation as current if available
    if (stored.length > 0) {
      // Get the most recent batch (same createdAt timestamp)
      const latestTimestamp = stored[stored.length - 1].createdAt;
      const latestBatch = stored.filter(p => p.createdAt === latestTimestamp);
      setGeneratedPosters(latestBatch);
      if (latestBatch.length > 0) {
        setEnhancedPrompt(latestBatch[0].enhancedPrompt);
      }
    }
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
      console.error("Failed to load initial data:", err);
      // Use fallback data
      setCategories([
        {
          id: "science",
          name: "Science",
          description: "Scientific concepts",
          icon: "🔬",
          examples: [],
        },
        {
          id: "mathematics",
          name: "Mathematics",
          description: "Math concepts",
          icon: "📐",
          examples: [],
        },
      ]);
      setLanguages([
        { code: "en", name: "English", native: "English" },
        { code: "hi", name: "Hindi", native: "हिंदी" },
      ]);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedPosters([]);
    setEnhancedPrompt("");

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

      // Save to localStorage with metadata
      const timestamp = new Date().toISOString();
      const newStoredPosters: StoredPoster[] = response.posters.map((poster, index) => ({
        ...poster,
        id: `${Date.now()}-${index}`,
        query: prompt.trim(),
        category: selectedCategory,
        language: selectedLanguage,
        aspectRatio,
        createdAt: timestamp,
      }));

      const updatedStoredPosters = [...storedPosters, ...newStoredPosters];
      setStoredPosters(updatedStoredPosters);
      savePostersToStorage(updatedStoredPosters);
    } catch (err) {
      if (err instanceof PosterApiError) {
        setError(err.message);
      } else {
        setError("Failed to generate posters. Please try again.");
      }
      console.error("Generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Clear poster history
  const handleClearHistory = () => {
    clearPostersFromStorage();
    setStoredPosters([]);
    setGeneratedPosters([]);
    setEnhancedPrompt("");
  };

  const handleDownload = (poster: GeneratedPoster, index: number) => {
    const link = document.createElement("a");
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
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-gray-800 mb-2 sm:mb-3">
            <span className="text-orange-400">Posters</span> that Standout
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
            Generate culturally relevant, multilingual educational posters for
            Indian classrooms
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
                    d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                  />
                </svg>
                <h3 className="text-sm sm:text-base font-semibold text-gray-800">
                  Language
                </h3>
              </div>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-300 bg-white text-gray-900 transition-all"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.name}>
                    {lang.native} ({lang.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Settings */}
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
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <h3 className="text-sm sm:text-base font-semibold text-gray-800">
                  Settings
                </h3>
              </div>

              {/* Number of Images */}
              <div className="mb-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
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
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  Aspect Ratio
                </label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as any)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-300 bg-white text-gray-900 transition-all"
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
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="font-semibold text-red-800 text-xs sm:text-sm">Error</p>
                  <p className="text-xs sm:text-sm text-red-700">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  <svg
                    className="w-5 h-5"
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
                </button>
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
      </div>
    </div>
  );
};

export default PostersPage;

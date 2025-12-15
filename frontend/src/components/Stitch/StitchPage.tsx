import React, { useState, useEffect, useRef } from "react";
import { stitchAPI, StitchApiError } from "../../services/stitchApi";

// Supported Indian languages
const INDIAN_LANGUAGES = [
  { code: "hi", name: "Hindi", native: "हिंदी" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", native: "മലയാളം" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "ur", name: "Urdu", native: "اردو" },
  { code: "or", name: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "as", name: "Assamese", native: "অসমীয়া" },
  { code: "en", name: "English", native: "English" },
];

const GRADE_LEVELS = [
  { value: "3", label: "Class 3" },
  { value: "8", label: "Class 8" },
  { value: "12", label: "Class 12" },
  { value: "custom", label: "Custom" },
];

const SUBJECTS = [
  { value: "mathematics", label: "Mathematics" },
  { value: "science", label: "Science" },
  { value: "social", label: "Social Studies" },
  { value: "language", label: "Language" },
];

const CURRICULUMS = [
  { value: "ncert", label: "NCERT" },
  { value: "cbse", label: "CBSE" },
  { value: "state", label: "State Board" },
];

interface ContentPreviewProps {
  content: string;
}

const ContentPreview: React.FC<ContentPreviewProps> = ({ content }) => {
  if (!content) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 bg-gray-50 rounded-lg">
        <div className="text-center">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-sm font-medium">Generated content will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6 bg-white">
      <div className="prose max-w-none">
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <pre className="whitespace-pre-wrap text-xs font-mono text-gray-800 leading-relaxed">
            {content}
          </pre>
        </div>
        <div className="mt-4 text-xs text-gray-500 italic">
          Note: This is plain generated content from the offline LLM.
        </div>
      </div>
    </div>
  );
};

const StitchPage: React.FC = () => {
  const [selectedLanguage, setSelectedLanguage] = useState("hi");
  const [selectedGrade, setSelectedGrade] = useState("8");
  const [selectedSubject, setSelectedSubject] = useState("mathematics");
  const [selectedCurriculum, setSelectedCurriculum] = useState("ncert");
  const [topic, setTopic] = useState("");
  const [culturalContext, setCulturalContext] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [generatedContent, setGeneratedContent] = useState("");
  const [targetLanguageForTranslation, setTargetLanguageForTranslation] =
    useState("hi");
  const [thinkingText, setThinkingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<{
    connected: boolean;
    checking: boolean;
  }>({ connected: false, checking: true });

  // Check Ollama status on mount
  useEffect(() => {
    checkOllamaStatus();
  }, []);

  const checkOllamaStatus = async () => {
    setOllamaStatus({ connected: false, checking: true });
    try {
      const status = await stitchAPI.checkStatus();
      setOllamaStatus({ connected: status.connected, checking: false });
    } catch (err) {
      setOllamaStatus({ connected: false, checking: false });
      console.error("Failed to check Ollama status:", err);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic");
      return;
    }

    // Abort any existing generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsGenerating(true);
    setError(null);
    setThinkingText("");
    setGeneratedContent("");

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL
        ? `${import.meta.env.VITE_API_URL}/api`
        : "http://localhost:5001/api";

      const response = await fetch(`${API_BASE_URL}/stitch/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          topic: topic.trim(),
          language: selectedLanguage,
          grade: selectedGrade,
          subject: selectedSubject,
          curriculum: selectedCurriculum,
          culturalContext,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body for streaming");
      }

      let buffer = "";
      let accumulatedThinking = "";
      let accumulatedResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === "thinking") {
                accumulatedThinking += parsed.content;
                setThinkingText(accumulatedThinking);
              } else if (parsed.type === "response") {
                accumulatedResponse += parsed.content;
                // Update content in real-time as response comes in
                setGeneratedContent(accumulatedResponse);
              } else if (parsed.type === "complete") {
                // Final result - use provided content or accumulated response
                setGeneratedContent(parsed.content || accumulatedResponse);
                if (parsed.thinkingText) {
                  setThinkingText(parsed.thinkingText);
                }
              } else if (parsed.type === "error") {
                throw new Error(parsed.error);
              }
            } catch (e) {
              // Skip invalid JSON
              continue;
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Generation stopped.");
      } else {
        const errorMessage =
          err instanceof StitchApiError
            ? err.message
            : err instanceof Error
            ? err.message
            : "Failed to generate content. Please try again.";
        setError(errorMessage);
      }
    } finally {
      abortControllerRef.current = null;
      setIsGenerating(false);
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsGenerating(false);
      setThinkingText("Generation stopped.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            <span className="text-orange-500">Stitch</span> - Offline Content Generator
          </h1>
          <p className="text-gray-600 text-lg">
            Generate curriculum-aligned educational content in 22+ Indian languages using
            offline LLM (Ollama + DeepSeek)
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Configuration */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <svg
                  className="w-6 h-6 text-orange-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <h2 className="text-xl font-semibold text-gray-900">Configuration</h2>
              </div>

              <div className="space-y-5">
                {/* Language */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900"
                  >
                    {INDIAN_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name} ({lang.native})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Grade Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grade Level
                  </label>
                  <select
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900"
                  >
                    {GRADE_LEVELS.map((grade) => (
                      <option key={grade.value} value={grade.value}>
                        {grade.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {SUBJECTS.map((subject) => (
                      <button
                        key={subject.value}
                        onClick={() => setSelectedSubject(subject.value)}
                        className={`px-4 py-2.5 rounded-lg border-2 transition-all font-medium text-sm ${
                          selectedSubject === subject.value
                            ? "border-orange-500 bg-orange-50 text-orange-700"
                            : "border-gray-200 hover:border-gray-300 text-gray-700 bg-white"
                        }`}
                      >
                        {subject.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Curriculum */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Curriculum
                  </label>
                  <select
                    value={selectedCurriculum}
                    onChange={(e) => setSelectedCurriculum(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900"
                  >
                    {CURRICULUMS.map((curriculum) => (
                      <option key={curriculum.value} value={curriculum.value}>
                        {curriculum.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Topic */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Topic / Lesson Title
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Photosynthesis, Quadratic Equations"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900 placeholder-gray-400"
                  />
                </div>

                {/* Cultural Context */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="culturalContext"
                    checked={culturalContext}
                    onChange={(e) => setCulturalContext(e.target.checked)}
                    className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <label
                    htmlFor="culturalContext"
                    className="ml-2 text-sm text-gray-700 cursor-pointer"
                  >
                    Include cultural context
                  </label>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !topic.trim()}
                  className="w-full bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-all shadow-md hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {isGenerating ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Generating...
                    </span>
                  ) : (
                    "Generate Content"
                  )}
                </button>
                {isGenerating && (
                  <button
                    onClick={handleStopGeneration}
                    className="w-full mt-3 bg-gray-100 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-all border border-gray-300"
                  >
                    Stop Generating
                  </button>
                )}

                {/* Error Display */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Ollama Status */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Ollama Status</span>
                {ollamaStatus.checking ? (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                    Checking...
                  </span>
                ) : ollamaStatus.connected ? (
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                    Connected
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                    Not Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-2">
                {ollamaStatus.connected
                  ? "Offline LLM is ready"
                  : "Connect to Ollama for offline LLM"}
              </p>
              <button
                onClick={checkOllamaStatus}
                className="text-xs text-orange-600 hover:text-orange-700 font-medium"
              >
                Refresh Status
              </button>
            </div>
          </div>

          {/* Right Panel - Thinking & Preview */}
          <div className="lg:col-span-2 space-y-4">
            {/* Thinking Text */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-64 flex flex-col">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
                <svg
                  className="w-5 h-5 text-orange-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900">Thinking Process</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {!thinkingText && !isGenerating ? (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <p className="text-sm">AI thinking process will appear here during generation</p>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-mono bg-gray-50 p-4 rounded-lg border border-gray-200">
                      {thinkingText || (isGenerating ? "Thinking..." : "")}
                      {isGenerating && (
                        <span className="inline-block w-2 h-4 bg-orange-500 ml-1 animate-pulse" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Content Preview */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-96 flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-orange-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900">Content Preview</h3>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600">Translate to</label>
                  <select
                    value={targetLanguageForTranslation}
                    onChange={(e) =>
                      setTargetLanguageForTranslation(e.target.value)
                    }
                    className="text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white text-gray-800"
                  >
                    {INDIAN_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!generatedContent.trim() || isTranslating}
                    onClick={async () => {
                      setIsTranslating(true);
                      setError(null);
                      console.log("🔄 Starting translation...");
                      try {
                        const resp = await stitchAPI.translateContent({
                          text: generatedContent,
                          sourceLanguage: selectedLanguage,
                          targetLanguage: targetLanguageForTranslation,
                        });
                        console.log("✅ Translation response:", resp);
                        if (resp.success && resp.translated) {
                          setGeneratedContent(resp.translated);
                          setError(null);
                          console.log("✅ Translation successful!");
                        } else {
                          const errorMsg = resp.error || "Translation failed. Please try again.";
                          setError(errorMsg);
                          console.error("❌ Translation failed:", errorMsg);
                        }
                      } catch (err) {
                        const msg =
                          err instanceof StitchApiError
                            ? err.message
                            : err instanceof Error
                            ? err.message
                            : "Translation failed. Please try again.";
                        setError(msg);
                        console.error("❌ Translation error:", err);
                      } finally {
                        setIsTranslating(false);
                      }
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-orange-100 text-orange-700 font-medium hover:bg-orange-200 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isTranslating ? (
                      <>
                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Translating...
                      </>
                    ) : (
                      "Translate"
                    )}
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <ContentPreview content={generatedContent} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StitchPage;

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { stitchAPI, StitchApiError } from "../../services/stitchApi";

// All 22 scheduled Indian languages + English (from language service)
const ALL_LANGUAGES = [
  { code: "en", name: "English", native: "English" },
  { code: "hi", name: "Hindi", native: "हिंदी" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", native: "മലയാളം" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "ur", name: "Urdu", native: "اردو" },
  { code: "or", name: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "as", name: "Assamese", native: "অসমীয়া" },
  { code: "ks", name: "Kashmiri", native: "कॉशुर" },
  { code: "kok", name: "Konkani", native: "कोंकणी" },
  { code: "mai", name: "Maithili", native: "मैथिली" },
  { code: "mni", name: "Manipuri", native: "ꯃꯅꯤꯄꯨꯔꯤ" },
  { code: "ne", name: "Nepali", native: "नेपाली" },
  { code: "sa", name: "Sanskrit", native: "संस्कृत" },
  { code: "sd", name: "Sindhi", native: "سنڌي" },
  { code: "sat", name: "Santali", native: "ᱥᱟᱱᱛᱟᱲᱤ" },
  { code: "brx", name: "Bodo", native: "बर'" },
  { code: "doi", name: "Dogri", native: "डोगरी" },
];

const GRADE_LEVELS = [
  { value: "3", label: "Class 3" },
  { value: "8", label: "Class 8" },
  { value: "12", label: "Class 12" },
  { value: "custom", label: "Custom" },
];

const CORE_SUBJECTS = [
  { value: "mathematics", label: "Mathematics" },
  { value: "science", label: "Science" },
  { value: "social", label: "Social Studies" },
];

interface ContentPreviewProps {
  content: string;
}

// Error boundary component for markdown rendering
class MarkdownErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Markdown rendering error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Safe markdown renderer component with content validation
const SafeMarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  // Validate and sanitize content
  if (!content || typeof content !== 'string') {
    return null;
  }

  // Ensure content is a valid string (handle edge cases)
  const safeContent = String(content).trim();
  if (!safeContent) {
    return null;
  }

  try {
    return (
      <ReactMarkdown
        className="markdown-content"
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children, ...props }) => <h1 {...props} className="text-3xl font-bold mb-4 mt-6 text-gray-900">{children}</h1>,
          h2: ({ children, ...props }) => <h2 {...props} className="text-2xl font-semibold mb-3 mt-5 text-gray-900">{children}</h2>,
          h3: ({ children, ...props }) => <h3 {...props} className="text-xl font-semibold mb-2 mt-4 text-gray-900">{children}</h3>,
          h4: ({ children, ...props }) => <h4 {...props} className="text-lg font-semibold mb-2 mt-3 text-gray-800">{children}</h4>,
          p: ({ children, ...props }) => <p {...props} className="mb-4 leading-relaxed text-gray-700">{children}</p>,
          ul: ({ children, ...props }) => <ul {...props} className="list-disc list-inside mb-4 space-y-2 ml-4 text-gray-700">{children}</ul>,
          ol: ({ children, ...props }) => <ol {...props} className="list-decimal list-inside mb-4 space-y-2 ml-4 text-gray-700">{children}</ol>,
          li: ({ children, ...props }) => <li {...props} className="ml-2">{children}</li>,
          strong: ({ children, ...props }) => <strong {...props} className="font-semibold text-gray-900">{children}</strong>,
          em: ({ children, ...props }) => <em {...props} className="italic text-gray-800">{children}</em>,
          code: ({ children, className: codeClassName, ...props }) => {
            const isInline = !codeClassName;
            return isInline ? (
              <code {...props} className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">{children}</code>
            ) : (
              <code {...props} className={codeClassName} style={{ display: 'block', backgroundColor: '#f3f4f6', padding: '1rem', borderRadius: '0.5rem', overflowX: 'auto', marginBottom: '1rem', fontSize: '0.875rem', fontFamily: 'monospace' }}>{children}</code>
            );
          },
          pre: ({ children, ...props }) => <pre {...props} className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4 text-sm font-mono">{children}</pre>,
          blockquote: ({ children, ...props }) => <blockquote {...props} className="border-l-4 border-orange-300 pl-4 italic my-4 text-gray-600">{children}</blockquote>,
          hr: ({ ...props }) => <hr {...props} className="my-6 border-gray-300" />,
        }}
      >
        {safeContent}
      </ReactMarkdown>
    );
  } catch (error) {
    console.error("Error rendering markdown:", error);
    return null; // Will trigger fallback in error boundary
  }
};

// OPTIMIZATION: Memoize ContentPreview to prevent unnecessary re-renders
const ContentPreview: React.FC<ContentPreviewProps & { isMarkdown?: boolean }> = React.memo(({ content, isMarkdown = false }) => {
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

  // Fallback component for when markdown fails
  const fallbackContent = (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <pre className="whitespace-pre-wrap text-sm font-sans text-gray-800 leading-relaxed">
        {content}
      </pre>
    </div>
  );

  return (
    <div className="h-full overflow-auto p-6 bg-white">
      <div className="prose max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:text-gray-700">
        {isMarkdown ? (
          <MarkdownErrorBoundary fallback={fallbackContent}>
            <SafeMarkdownRenderer content={content} />
          </MarkdownErrorBoundary>
        ) : (
          fallbackContent
        )}
      </div>
    </div>
  );
});

const StitchPage: React.FC = () => {
  const [selectedGrade, setSelectedGrade] = useState("8");
  const [customGrade, setCustomGrade] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("mathematics");
  const [customSubject, setCustomSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [generatedContent, setGeneratedContent] = useState("");
  const [englishContent, setEnglishContent] = useState(""); // Store original English content
  const [translatedContent, setTranslatedContent] = useState<Record<string, string>>({}); // Store translations by language code
  const [translatingLanguages, setTranslatingLanguages] = useState<Set<string>>(new Set()); // Track languages currently being translated
  const [targetLanguageForTranslation, setTargetLanguageForTranslation] = useState("hi");
  const [activeTab, setActiveTab] = useState<"english" | string>("english"); // Active tab: "english" or language code
  const [thinkingText, setThinkingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState<Record<string, boolean>>({}); // Track translation status per language
  const [ollamaStatus, setOllamaStatus] = useState<{
    connected: boolean;
    checking: boolean;
  }>({ connected: false, checking: true });

  // Check Ollama status on mount
  useEffect(() => {
    checkOllamaStatus();
    
    // Cleanup: Cancel content generation on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
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

    // Validate custom grade if selected
    if (selectedGrade === "custom" && !customGrade.trim()) {
      setError("Please enter a custom grade level");
      return;
    }

    // Validate custom subject if selected
    if (selectedSubject === "custom" && !customSubject.trim()) {
      setError("Please enter a custom subject name");
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
    setEnglishContent("");
    setTranslatedContent({});
    setActiveTab("english");

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL
        ? `${import.meta.env.VITE_API_URL}/api`
        : "http://localhost:5001/api";

      // Use custom grade if selected, otherwise use selectedGrade
      const finalGrade = selectedGrade === "custom" ? customGrade.trim() : selectedGrade;
      // Use custom subject if selected, otherwise use selectedSubject
      const finalSubject = selectedSubject === "custom" ? customSubject.trim() : selectedSubject;

      const response = await fetch(`${API_BASE_URL}/stitch/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          topic: topic.trim(),
          grade: finalGrade,
          subject: finalSubject,
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
                setGeneratedContent(accumulatedResponse);
                setEnglishContent(accumulatedResponse); // Store English version
              } else if (parsed.type === "complete") {
                const finalContent = parsed.content || accumulatedResponse;
                setGeneratedContent(finalContent);
                setEnglishContent(finalContent); // Store English version
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

  const handleTranslate = async (targetLang: string) => {
    if (!englishContent.trim()) {
      setError("No content to translate");
      return;
    }

    // Input validation: Only warn for extremely long texts, don't block
    // Let the system handle it - it's designed to work with any length
    if (englishContent.length > 100000) {
      // Just warn, don't block - system can handle it
      console.warn("Very long content detected. Translation may take longer.");
    }

    // Check if already translated
    if (translatedContent[targetLang] && !translatingLanguages.has(targetLang)) {
      setActiveTab(targetLang);
      return;
    }

    // UX IMPROVEMENT: Create tab immediately with skeleton UI
    setTranslatingLanguages(prev => new Set(prev).add(targetLang));
    setActiveTab(targetLang); // Switch to the new tab immediately
    setIsTranslating(prev => ({ ...prev, [targetLang]: true }));
    setError(null);

    try {
      // Use simple non-streaming translation (reliable and correct)
      const resp = await stitchAPI.translateContent({
        text: englishContent,
        sourceLanguage: "en",
        targetLanguage: targetLang,
      });

      if (resp.success && resp.translated) {
        setTranslatedContent(prev => ({ ...prev, [targetLang]: resp.translated! }));
        setActiveTab(targetLang);
        setError(null);
      } else {
        const errorMsg = resp.error || "Translation failed. Please try again.";
        setError(errorMsg);
      }

      // Translation complete
      setTranslatingLanguages(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetLang);
        return newSet;
      });
    } catch (err) {
      const msg =
        err instanceof StitchApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Translation failed. Please try again.";
      setError(msg);
      
      // Remove from translating set on error
      setTranslatingLanguages(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetLang);
        return newSet;
      });
      
      // Remove empty translation on error
      setTranslatedContent(prev => {
        const newPrev = { ...prev };
        delete newPrev[targetLang];
        return newPrev;
      });
    } finally {
      setIsTranslating(prev => ({ ...prev, [targetLang]: false }));
    }
  };

  // OPTIMIZATION: Memoize language name lookup
  const getLanguageName = useCallback((code: string) => {
    const lang = ALL_LANGUAGES.find(l => l.code === code);
    return lang ? `${lang.name} (${lang.native})` : code;
  }, []);

  // OPTIMIZATION: Memoize available tabs list
  const availableTabs = useMemo(() => {
    return Array.from(new Set([...Object.keys(translatedContent), ...Array.from(translatingLanguages)]));
  }, [translatedContent, translatingLanguages]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-gray-800 mb-2 sm:mb-3">
            <span className="text-orange-400">Stitch</span> Offline Content
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
            Generate comprehensive, curriculum-aligned educational content offline using DeepSeek R1
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Configuration */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400"
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
                <h2 className="text-sm sm:text-base font-semibold text-gray-800">Configuration</h2>
              </div>

              <div className="space-y-6">
                {/* Grade Level */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Grade Level
                  </label>
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      {GRADE_LEVELS.filter(grade => grade.value !== "custom").map((grade) => (
                        <button
                          key={grade.value}
                          onClick={() => {
                            setSelectedGrade(grade.value);
                            setCustomGrade("");
                          }}
                          className={`px-3 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
                            selectedGrade === grade.value && selectedGrade !== "custom"
                              ? "border-orange-300 bg-orange-50 text-orange-700 ring-1 ring-orange-200 ring-opacity-50"
                              : "border-gray-200 hover:border-gray-250 text-gray-700 bg-white hover:bg-gray-50"
                          }`}
                        >
                          {grade.label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedGrade("custom");
                        setCustomGrade("");
                      }}
                      className={`w-full px-3 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
                        selectedGrade === "custom"
                          ? "border-orange-300 bg-orange-50 text-orange-700 ring-1 ring-orange-200 ring-opacity-50"
                          : "border-gray-200 hover:border-gray-250 text-gray-700 bg-white"
                      }`}
                    >
                      Custom
                    </button>
                    {selectedGrade === "custom" && (
                      <input
                        type="text"
                        value={customGrade}
                        onChange={(e) => setCustomGrade(e.target.value)}
                        placeholder="Enter grade level..."
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-300 bg-white text-gray-900 placeholder-gray-400 transition-all"
                      />
                    )}
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => {
                      setSelectedSubject(e.target.value);
                      if (e.target.value !== "custom") {
                        setCustomSubject("");
                      }
                    }}
                    className={`w-full px-4 py-2.5 border rounded-lg bg-white text-gray-900 transition-all ${
                      selectedSubject && selectedSubject !== ""
                        ? "border-orange-300 ring-1 ring-orange-200 ring-opacity-50"
                        : "border-gray-200 focus:border-orange-300"
                    } focus:ring-2 focus:ring-orange-200 focus:ring-opacity-50 focus:border-orange-300`}
                  >
                    {CORE_SUBJECTS.map((subject) => (
                      <option key={subject.value} value={subject.value}>
                        {subject.label}
                      </option>
                    ))}
                    <option value="custom">Custom</option>
                  </select>
                  {selectedSubject === "custom" && (
                    <input
                      type="text"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      placeholder="Enter subject name..."
                      className="w-full mt-2 px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-300 bg-white text-gray-900 placeholder-gray-400 transition-all"
                    />
                  )}
                </div>

                {/* Topic */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Topic / Lesson Title
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Photosynthesis, Quadratic Equations"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-300 bg-white text-gray-900 placeholder-gray-400 transition-all"
                  />
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !topic.trim() || (selectedGrade === "custom" && !customGrade.trim()) || (selectedSubject === "custom" && !customSubject.trim())}
                  className="w-full bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 active:bg-orange-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:bg-gray-300"
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
                    className="w-full mt-3 bg-gray-100 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 active:bg-gray-300 transition-all duration-200 border border-gray-300 shadow-sm hover:shadow"
                  >
                    Stop Generating
                  </button>
                )}

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
              </div>
            </div>

            {/* Ollama Status */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm font-semibold text-gray-800">Ollama Status</span>
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
                <h3 className="text-sm sm:text-base font-semibold text-gray-800">Thinking Process</h3>
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

            {/* Content Preview with Tabs */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 h-96 flex flex-col">
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b-2 border-orange-200/60">
                <div className="flex items-center gap-2 sm:gap-3">
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400"
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
                  <h3 className="text-sm sm:text-base font-semibold text-gray-800">Content Preview</h3>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={targetLanguageForTranslation}
                    onChange={(e) => setTargetLanguageForTranslation(e.target.value)}
                    className="text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white text-gray-800"
                  >
                    {ALL_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!englishContent.trim() || isTranslating[targetLanguageForTranslation]}
                    onClick={() => handleTranslate(targetLanguageForTranslation)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-orange-100 text-orange-700 font-medium hover:bg-orange-200 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isTranslating[targetLanguageForTranslation] ? (
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

              {/* Tabs */}
              {englishContent && (
                <div className="flex border-b-2 border-orange-200/60 px-4 sm:px-6 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab("english")}
                    className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === "english"
                        ? "border-orange-400 text-orange-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-orange-200"
                    }`}
                  >
                    English
                  </button>
                  {/* Show all languages that are either translated or currently translating */}
                  {availableTabs.map((langCode) => (
                    <button
                      key={langCode}
                      onClick={() => setActiveTab(langCode)}
                      className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                        activeTab === langCode
                          ? "border-orange-400 text-orange-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-orange-200"
                      }`}
                    >
                      {getLanguageName(langCode)}
                      {translatingLanguages.has(langCode) && (
                        <svg
                          className="animate-spin h-3 w-3 text-orange-500"
                          xmlns="http://www.w3.org/2000/svg"
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
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Tab Content */}
              <div className="flex-1 overflow-hidden">
                {activeTab === "english" ? (
                  <ContentPreview content={englishContent} isMarkdown={true} />
                ) : translatingLanguages.has(activeTab) ? (
                  // UX IMPROVEMENT: Show skeleton/loading UI while translating
                  <div className="h-full overflow-auto p-6 bg-white">
                    <div className="space-y-4">
                      {/* Skeleton loading animation */}
                      <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className="animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-full"></div>
                            <div className="h-4 bg-gray-200 rounded w-5/6 mt-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-4/6 mt-2"></div>
                          </div>
                        ))}
                      </div>
                      {/* Loading indicator */}
                      <div className="flex items-center justify-center gap-2 text-orange-500 mt-4">
                        <svg
                          className="animate-spin h-5 w-5"
                          xmlns="http://www.w3.org/2000/svg"
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
                        <span className="text-sm font-medium">Translating...</span>
                      </div>
                    </div>
                  </div>
                ) : translatedContent[activeTab] ? (
                  <ContentPreview content={translatedContent[activeTab]} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <p className="text-sm">No translation available for this language yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StitchPage;

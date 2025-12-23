import React, { useState, useEffect, useRef, useMemo, useCallback, Component, ErrorInfo, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { stitchAPI, StitchApiError, StitchSessionListItem } from "../../services/stitchApi";
import StitchSessionSidebar from "./StitchSessionSidebar";

// User ID and Session ID utilities (same as chat)
const generateUserId = (): string => {
  const stored = localStorage.getItem("masterji_userId");
  if (stored) return stored;
  const newUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  localStorage.setItem("masterji_userId", newUserId);
  return newUserId;
};

const getUserId = (): string => generateUserId();

const generateSessionId = (): string => {
  return `stitch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// All 22 scheduled Indian languages + English (from language service)
// Sorted alphabetically by name
const ALL_LANGUAGES = [
  { code: "as", name: "Assamese", native: "অসমীয়া" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "bho", name: "Bhojpuri", native: "भोजपुरी" },
  { code: "brx", name: "Bodo", native: "बर'" },
  { code: "en", name: "English", native: "English" },
  { code: "doi", name: "Dogri", native: "डोगरी" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "hi", name: "Hindi", native: "हिंदी" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ks", name: "Kashmiri", native: "कॉशुर" },
  { code: "kok", name: "Konkani", native: "कोंकणी" },
  { code: "mai", name: "Maithili", native: "मैथिली" },
  { code: "ml", name: "Malayalam", native: "മലയാളം" },
  { code: "mni", name: "Manipuri", native: "ꯃꯅꯤꯄꯨꯔꯤ" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "ne", name: "Nepali", native: "नेपाली" },
  { code: "or", name: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "sa", name: "Sanskrit", native: "संस्कृत" },
  { code: "sat", name: "Santali", native: "ᱥᱟᱱᱛᱟᱲᱤ" },
  { code: "sd", name: "Sindhi", native: "سنڌي" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "ur", name: "Urdu", native: "اردو" },
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

// Error Boundary for StitchPage
class StitchErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("StitchPage error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border-2 border-red-200 p-8 max-w-md w-full">
            <div className="text-center">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
              <p className="text-gray-600 mb-4">
                An error occurred in the Stitch feature. Please refresh the page to try again.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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

// Safe markdown renderer component with minimal, professional styling
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
      <div className="markdown-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Minimal, professional heading styles
            h1: ({ children, ...props }) => (
              <h1 {...props} className="text-2xl font-semibold text-gray-900 mb-3 mt-6 first:mt-0">
                {children}
              </h1>
            ),
            h2: ({ children, ...props }) => (
              <h2 {...props} className="text-xl font-semibold text-gray-900 mb-2.5 mt-5">
                {children}
              </h2>
            ),
            h3: ({ children, ...props }) => (
              <h3 {...props} className="text-lg font-semibold text-gray-800 mb-2 mt-4">
                {children}
              </h3>
            ),
            h4: ({ children, ...props }) => (
              <h4 {...props} className="text-base font-semibold text-gray-800 mb-2 mt-3">
                {children}
              </h4>
            ),
            // Clean paragraph styling
            p: ({ children, ...props }) => (
              <p {...props} className="text-gray-700 leading-7 mb-4">
                {children}
              </p>
            ),
            // Clean list styling
            ul: ({ children, ...props }) => (
              <ul {...props} className="list-disc list-outside mb-4 ml-6 space-y-1.5 text-gray-700">
                {children}
              </ul>
            ),
            ol: ({ children, ...props }) => (
              <ol {...props} className="list-decimal list-outside mb-4 ml-6 space-y-1.5 text-gray-700">
                {children}
              </ol>
            ),
            li: ({ children, ...props }) => (
              <li {...props} className="leading-7">
                {children}
              </li>
            ),
            // Emphasis
            strong: ({ children, ...props }) => (
              <strong {...props} className="font-semibold text-gray-900">
                {children}
              </strong>
            ),
            em: ({ children, ...props }) => (
              <em {...props} className="italic text-gray-800">
                {children}
              </em>
            ),
            // Code blocks
            code: ({ children, className: codeClassName, ...props }) => {
              const isInline = !codeClassName;
              if (isInline) {
                return (
                  <code {...props} className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">
                    {children}
                  </code>
                );
              }
              return (
                <code {...props} className={codeClassName}>
                  <pre className="bg-gray-50 border border-gray-200 rounded-md p-3 overflow-x-auto text-sm font-mono text-gray-800 my-3">
                    {children}
                  </pre>
                </code>
              );
            },
            pre: ({ children, ...props }) => (
              <pre {...props} className="bg-gray-50 border border-gray-200 rounded-md p-3 overflow-x-auto text-sm font-mono text-gray-800 my-3">
                {children}
              </pre>
            ),
            // Blockquote
            blockquote: ({ children, ...props }) => (
              <blockquote {...props} className="border-l-4 border-gray-300 pl-4 my-4 text-gray-600 italic">
                {children}
              </blockquote>
            ),
            // Horizontal rule
            hr: ({ ...props }) => (
              <hr {...props} className="my-6 border-0 border-t border-gray-200" />
            ),
          }}
        >
          {safeContent}
        </ReactMarkdown>
      </div>
    );
  } catch (error) {
    console.error("Error rendering markdown:", error);
    throw error; // Let error boundary handle it
  }
};

// Toast Notification Component
interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

const ToastNotification: React.FC<{ toast: Toast; onClose: () => void }> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = toast.type === "success" ? "bg-green-500" : toast.type === "error" ? "bg-red-500" : "bg-blue-500";
  const icon = toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ";

  return (
    <div className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] animate-slideIn`}>
      <span className="text-xl font-bold">{icon}</span>
      <span className="flex-1 text-sm font-medium">{toast.message}</span>
      <button onClick={onClose} className="text-white hover:text-gray-200">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

// ContentPreview component - NOT memoized to ensure re-renders when isMarkdown changes
const ContentPreview: React.FC<ContentPreviewProps & { isMarkdown?: boolean }> = ({ content, isMarkdown = false }) => {
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
    <div className="h-full overflow-auto bg-white">
      {isMarkdown ? (
        <MarkdownErrorBoundary fallback={fallbackContent}>
          <div className="p-6">
            <SafeMarkdownRenderer content={content} />
          </div>
        </MarkdownErrorBoundary>
      ) : (
        <div className="p-6">
          {fallbackContent}
        </div>
      )}
    </div>
  );
};

const StitchPage: React.FC = () => {
  // User & Session Management
  const [userId] = useState(() => getUserId());
  // Always start with a fresh session on page load/hot reload
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    // Always generate a new session ID on mount (don't load last session)
    const newSessionId = generateSessionId();
    // Store the new session ID in localStorage so we can track it
    localStorage.setItem("masterji_stitch_sessionId", newSessionId);
    return newSessionId;
  });
  const [sessions, setSessions] = useState<StitchSessionListItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  // Track that initial mount always creates a fresh session (don't load from backend)
  const initialMountRef = useRef(true);

  const [selectedGrade, setSelectedGrade] = useState("8");
  const [customGrade, setCustomGrade] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("mathematics");
  const [customSubject, setCustomSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [englishContent, setEnglishContent] = useState(""); // Store original English content
  const [translatedContent, setTranslatedContent] = useState<Record<string, string>>({}); // Store translations by language code
  const [translatingLanguages, setTranslatingLanguages] = useState<Set<string>>(new Set()); // Track languages currently being translated
  const [targetLanguageForTranslation, setTargetLanguageForTranslation] = useState("hi");
  const [markdownEnabled, setMarkdownEnabled] = useState(false); // Toggle for markdown rendering in English tab ONLY (ONLY after generation completes, never during streaming)
  const [activeTab, setActiveTab] = useState<"english" | string>("english"); // Active tab: "english" or language code
  const [thinkingText, setThinkingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState<Record<string, boolean>>({}); // Track translation status per language
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: "success" | "error" | "info" }>>([]);
  const contentPreviewRef = useRef<HTMLDivElement>(null); // Ref for auto-scroll
  const [ollamaStatus, setOllamaStatus] = useState<{
    connected: boolean;
    checking: boolean;
  }>({ connected: false, checking: true });
  const [nllbStatus, setNllbStatus] = useState<{
    connected: boolean;
    enabled: boolean;
    checking: boolean;
    error?: string;
  }>({ connected: false, enabled: false, checking: true });

  // OPTIMIZATION: Memoize language name lookup (define early to avoid hoisting issues)
  const getLanguageName = useCallback((code: string) => {
    const lang = ALL_LANGUAGES.find(l => l.code === code);
    return lang ? `${lang.name} (${lang.native})` : code;
  }, []);

  // Toast notification helpers
  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Copy to clipboard
  const handleCopy = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      showToast("Copied to clipboard!", "success");
    } catch (err) {
      showToast("Failed to copy to clipboard", "error");
    }
  }, [showToast]);

  // Download as file
  const handleDownload = useCallback((content: string, filename: string) => {
    try {
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}-content-${new Date().toISOString().split("T")[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("File downloaded successfully!", "success");
    } catch (err) {
      showToast("Failed to download file", "error");
    }
  }, [showToast]);

  // Clear all content
  const handleClear = useCallback(() => {
    setEnglishContent("");
    setTranslatedContent({});
    setThinkingText("");
    setActiveTab("english");
    setMarkdownEnabled(false);
    setError(null);
    showToast("Content cleared", "info");
  }, [showToast]);

  // Word and character count
  const getWordCount = useCallback((text: string): number => {
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
  }, []);

  const getCharacterCount = useCallback((text: string): number => {
    return text.length;
  }, []);

  // Get active content for stats
  const getActiveContent = useCallback((): string => {
    return activeTab === "english" ? englishContent : translatedContent[activeTab] || "";
  }, [activeTab, englishContent, translatedContent]);

  // Reset markdown toggle when switching away from English tab
  useEffect(() => {
    if (activeTab !== "english") {
      setMarkdownEnabled(false);
    }
  }, [activeTab]);

  // Auto-scroll to content when generation completes
  useEffect(() => {
    if (!isGenerating && englishContent && contentPreviewRef.current) {
      setTimeout(() => {
        contentPreviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, [isGenerating, englishContent]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + C to copy active tab content
      if ((e.metaKey || e.ctrlKey) && e.key === "c" && !e.shiftKey && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        const activeContent = activeTab === "english" ? englishContent : translatedContent[activeTab];
        if (activeContent) {
          e.preventDefault();
          handleCopy(activeContent);
        }
      }
      // Cmd/Ctrl + S to download active tab content
      if ((e.metaKey || e.ctrlKey) && e.key === "s" && !e.shiftKey && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        const activeContent = activeTab === "english" ? englishContent : translatedContent[activeTab];
        if (activeContent) {
          e.preventDefault();
          handleDownload(activeContent, activeTab === "english" ? "english" : getLanguageName(activeTab));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, englishContent, translatedContent, handleCopy, handleDownload, getLanguageName]);

  // Handle translation
  const handleTranslate = async (targetLang: string) => {
    if (!englishContent.trim()) {
      setError("No content to translate");
      return;
    }

    // Input validation: Only warn for extremely long texts, don't block
    if (englishContent.length > 100000) {
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
        showToast(`Translation to ${getLanguageName(targetLang)} completed!`, "success");
      } else {
        const errorMsg = resp.error || "Translation failed. Please try again.";
        setError(errorMsg);
        showToast(`Translation failed: ${errorMsg}`, "error");
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
      showToast(`Translation failed: ${msg}`, "error");

      // Remove from translating set on error
      setTranslatingLanguages(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetLang);
        return newSet;
      });
      setIsTranslating(prev => {
        const newPrev = { ...prev };
        delete newPrev[targetLang];
        return newPrev;
      });

      // If translation failed and no content was set, remove the tab
      if (!translatedContent[targetLang]) {
        setTranslatedContent(prev => {
          const newPrev = { ...prev };
          delete newPrev[targetLang];
          return newPrev;
        });
        // If the active tab was the one that failed, switch to English
        if (activeTab === targetLang) {
          setActiveTab("english");
        }
      }
    } finally {
      setIsTranslating(prev => {
        const newPrev = { ...prev };
        delete newPrev[targetLang];
        return newPrev;
      });
    }
  };

  // Bulk translate to all languages
  const handleBulkTranslate = useCallback(async () => {
    if (!englishContent.trim()) {
      showToast("No content to translate", "error");
      return;
    }

    const languagesToTranslate = ALL_LANGUAGES.filter((lang) => lang.code !== "en" && !translatedContent[lang.code] && !translatingLanguages.has(lang.code));

    if (languagesToTranslate.length === 0) {
      showToast("All languages already translated!", "info");
      return;
    }

    showToast(`Starting translation to ${languagesToTranslate.length} languages...`, "info");

    for (const lang of languagesToTranslate) {
      await handleTranslate(lang.code);
      // Small delay between translations to avoid overwhelming the system
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    showToast("Bulk translation completed!", "success");
  }, [englishContent, translatedContent, translatingLanguages, showToast, handleTranslate]);

  // Load all sessions
  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const sessionsList = await stitchAPI.getAllSessions(userId);
      const sortedSessions = sessionsList.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setSessions(sortedSessions);
    } catch (error) {
      console.error("Failed to load sessions:", error);
      if (error instanceof StitchApiError) {
        // Graceful degradation - backend might not have MongoDB
        setSessions([]);
      }
    } finally {
      setSessionsLoading(false);
    }
  }, [userId]);

  // Load session data - ONLY thinking and results (English + all languages), NOT inputs
  const loadSessionData = useCallback(async (sessionId: string) => {
    if (!sessionId || !userId) {
      return;
    }

    try {
      const session = await stitchAPI.getSessionDetails(userId, sessionId);

      if (!session) {
        return;
      }

      // ONLY load thinking and results - NOT inputs (topic, grade, subject, etc.)
      if (session.thinkingText) {
        setThinkingText(session.thinkingText);
      }
      if (session.englishContent) {
        setEnglishContent(session.englishContent);
      }
      if (session.translatedContent && Object.keys(session.translatedContent).length > 0) {
        setTranslatedContent(session.translatedContent);
      }
      if (session.markdownEnabled !== undefined) {
        setMarkdownEnabled(session.markdownEnabled);
      }

      showToast("Session loaded", "success");
    } catch (error) {
      console.error("Failed to load session:", error);
      // Start fresh if session doesn't exist - don't show error toast
      if (error instanceof StitchApiError) {
        // Only log, don't show toast for 404s
        if (!error.message.includes("404") && !error.message.includes("not found")) {
          showToast("Failed to load session", "error");
        }
      }
    }
  }, [userId, showToast]);

  // Auto-save session
  const autoSaveSession = useCallback(async () => {
    if (!currentSessionId) return;

    try {
      await stitchAPI.saveSession(userId, currentSessionId, {
        topic,
        grade: selectedGrade,
        subject: selectedSubject,
        customGrade: customGrade || undefined,
        customSubject: customSubject || undefined,
        englishContent,
        thinkingText: thinkingText || undefined,
        translatedContent,
        markdownEnabled,
      });
    } catch (error) {
      console.error("Failed to auto-save session:", error);
      // Don't show error toast for auto-save failures
    }
  }, [userId, currentSessionId, topic, selectedGrade, selectedSubject, customGrade, customSubject, englishContent, thinkingText, translatedContent, markdownEnabled]);

  // Manual save session
  const handleSaveSession = useCallback(async () => {
    if (!currentSessionId) {
      // Create new session if none exists
      const newSessionId = generateSessionId();
      setCurrentSessionId(newSessionId);
      // Wait a bit for state to update, then save
      setTimeout(async () => {
        try {
          await stitchAPI.saveSession(userId, newSessionId, {
            topic,
            grade: selectedGrade,
            subject: selectedSubject,
            customGrade: customGrade || undefined,
            customSubject: customSubject || undefined,
            englishContent,
            thinkingText: thinkingText || undefined,
            translatedContent,
            markdownEnabled,
          });
          showToast("Session saved successfully!", "success");
          // Reload sessions list to show the new one
          loadSessions();
        } catch (error) {
          console.error("Failed to save session:", error);
          showToast("Failed to save session", "error");
        }
      }, 100);
      return;
    }

    try {
      await stitchAPI.saveSession(userId, currentSessionId, {
        topic,
        grade: selectedGrade,
        subject: selectedSubject,
        customGrade: customGrade || undefined,
        customSubject: customSubject || undefined,
        englishContent,
        thinkingText: thinkingText || undefined,
        translatedContent,
        markdownEnabled,
      });
      showToast("Session saved successfully!", "success");
      // Reload sessions list to update the UI
      loadSessions();
    } catch (error) {
      console.error("Failed to save session:", error);
      showToast("Failed to save session", "error");
    }
  }, [userId, currentSessionId, topic, selectedGrade, selectedSubject, customGrade, customSubject, englishContent, thinkingText, translatedContent, markdownEnabled, showToast, loadSessions]);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, [userId, loadSessions]);

  // Track previous sessionId to avoid reloading same session
  const previousSessionIdRef = useRef<string | null>(null);
  // Track if a session is newly created (don't try to load it from backend)
  const isNewSessionRef = useRef<boolean>(false);

  // Load session data when sessionId changes (but not on initial mount since we always start fresh)
  // Skip loading if it's a newly created session or initial mount
  useEffect(() => {
    if (currentSessionId && currentSessionId !== previousSessionIdRef.current) {
      localStorage.setItem("masterji_stitch_sessionId", currentSessionId);
      previousSessionIdRef.current = currentSessionId;

      // Skip loading on initial mount (always start fresh) or if it's a newly created session
      if (initialMountRef.current) {
        // Reset the initial mount flag after first render
        initialMountRef.current = false;
      } else if (!isNewSessionRef.current) {
        // Only load if it's not a newly created session and not initial mount
        loadSessionData(currentSessionId);
      } else {
        // Reset the flag after skipping the load
        isNewSessionRef.current = false;
      }
    }
  }, [currentSessionId, loadSessionData]);

  // Auto-save session when content changes (debounced)
  // Use ref to avoid including autoSaveSession in dependencies (prevents infinite loops)
  const autoSaveSessionRef = useRef(autoSaveSession);
  useEffect(() => {
    autoSaveSessionRef.current = autoSaveSession;
  }, [autoSaveSession]);

  useEffect(() => {
    if (!currentSessionId || (!englishContent && Object.keys(translatedContent).length === 0)) {
      return;
    }

    const timeoutId = setTimeout(() => {
      autoSaveSessionRef.current();
    }, 2000); // Debounce by 2 seconds

    return () => clearTimeout(timeoutId);
  }, [englishContent, translatedContent, topic, selectedGrade, selectedSubject, customGrade, customSubject, markdownEnabled, currentSessionId]);

  // Check Ollama and NLLB status on mount
  useEffect(() => {
    checkOllamaStatus();
    checkNLLBStatus();

    // Cleanup: Cancel content generation on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Create new session
  const handleNewSession = useCallback(() => {
    const newSessionId = generateSessionId();

    // Mark as new session so we don't try to load it from backend
    isNewSessionRef.current = true;
    setCurrentSessionId(newSessionId);

    // Clear current content
    setTopic("");
    setSelectedGrade("8");
    setCustomGrade("");
    setSelectedSubject("mathematics");
    setCustomSubject("");
    setEnglishContent("");
    setThinkingText("");
    setTranslatedContent({});
    setMarkdownEnabled(false);
    setActiveTab("english");
    setError(null);

    showToast("New session created", "info");
  }, [showToast]);

  // Select existing session
  const handleSessionSelect = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
  }, []);

  // Delete session
  const handleDeleteSession = useCallback(async (sessionId: string) => {
    try {
      await stitchAPI.deleteSession(userId, sessionId);
      setSessions(prev => prev.filter(s => s.sessionId !== sessionId));

      // If deleted session was current, create new one
      if (currentSessionId === sessionId) {
        handleNewSession();
      }

      showToast("Session deleted", "success");
    } catch (error) {
      console.error("Failed to delete session:", error);
      showToast("Failed to delete session", "error");
    }
  }, [userId, currentSessionId, handleNewSession, showToast]);

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

  const checkNLLBStatus = async () => {
    setNllbStatus(prev => ({ ...prev, checking: true }));
    try {
      const status = await stitchAPI.checkNLLBStatus();
      setNllbStatus({
        connected: status.connected,
        enabled: status.enabled,
        checking: false,
        error: status.error,
      });
    } catch (err) {
      setNllbStatus({
        connected: false,
        enabled: true,
        checking: false,
        error: err instanceof Error ? err.message : "Service unavailable",
      });
      console.error("Failed to check NLLB status:", err);
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

    // Ensure we have a sessionId
    if (!currentSessionId) {
      const newSessionId = generateSessionId();
      setCurrentSessionId(newSessionId);
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
                setEnglishContent(accumulatedResponse); // Store English version
              } else if (parsed.type === "complete") {
                const finalContent = parsed.content || accumulatedResponse;
                setEnglishContent(finalContent); // Store English version
                // Reset markdown toggle to false when new content is generated
                setMarkdownEnabled(false); // Always start with plain text view after generation
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

  // OPTIMIZATION: Memoize available tabs list
  const availableTabs = useMemo(() => {
    return Array.from(new Set([...Object.keys(translatedContent), ...Array.from(translatingLanguages)]));
  }, [translatedContent, translatingLanguages]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <ToastNotification
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex overflow-hidden max-w-[1920px] w-full mx-auto">
        {/* Main Content */}
        <div className="flex-1 overflow-auto">
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
                              className={`px-3 py-2 rounded-lg border-2 transition-all font-medium text-sm ${selectedGrade === grade.value && selectedGrade !== "custom"
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
                          className={`w-full px-3 py-2 rounded-lg border-2 transition-all font-medium text-sm ${selectedGrade === "custom"
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
                        className={`w-full px-4 py-2.5 border rounded-lg bg-white text-gray-900 transition-all ${selectedSubject && selectedSubject !== ""
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

                {/* Service Status - Combined */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm sm:text-base font-semibold text-gray-800">Service Status</h2>
                    <button
                      onClick={() => {
                        checkOllamaStatus();
                        checkNLLBStatus();
                      }}
                      className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                    >
                      Refresh All
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* Ollama Status */}
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-700">Ollama (DeepSeek R1)</span>
                      </div>
                      {ollamaStatus.checking ? (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                          Checking...
                        </span>
                      ) : ollamaStatus.connected ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                          Connected
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                          Not Connected
                        </span>
                      )}
                    </div>

                    {/* NLLB Status */}
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-700">NLLB-200</span>
                      </div>
                      {nllbStatus.checking ? (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                          Checking...
                        </span>
                      ) : !nllbStatus.enabled ? (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                          Not Enabled
                        </span>
                      ) : nllbStatus.connected ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                          Connected
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                          Not Connected
                        </span>
                      )}
                    </div>
                  </div>
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
                <div ref={contentPreviewRef} className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 h-96 flex flex-col">
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
                      {/* Word/Character Count */}
                      {getActiveContent() && (
                        <div className="text-xs text-gray-500 ml-2">
                          {getWordCount(getActiveContent())} words • {getCharacterCount(getActiveContent())} chars
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Save Button - Simple Orange */}
                      <button
                        onClick={handleSaveSession}
                        disabled={!currentSessionId && !englishContent && !topic}
                        className="px-3 py-1.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 active:bg-orange-700 transition-all duration-200 shadow-sm hover:shadow disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:bg-gray-300 flex items-center justify-center gap-1.5 text-xs sm:text-sm"
                        title="Save session to database"
                      >
                        <svg
                          className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="hidden sm:inline">Save</span>
                      </button>
                      {/* Quick Actions Bar */}
                      {getActiveContent() && (
                        <div className="flex items-center gap-1 mr-2 border-r border-orange-200 pr-2">
                          <button
                            onClick={() => handleCopy(getActiveContent())}
                            className="p-1.5 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                            title="Copy to clipboard (Cmd/Ctrl+C)"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDownload(getActiveContent(), activeTab === "english" ? "english" : getLanguageName(activeTab))}
                            className="p-1.5 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                            title="Download as file (Cmd/Ctrl+S)"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                          <button
                            onClick={handleClear}
                            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Clear all content"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                      {/* Bulk Translate Button */}
                      {englishContent && Object.keys(translatedContent).length < ALL_LANGUAGES.length - 1 && (
                        <button
                          onClick={handleBulkTranslate}
                          disabled={isGenerating || Object.values(isTranslating).some(v => v)}
                          className="text-xs px-2 py-1.5 rounded-lg bg-blue-100 text-blue-700 font-medium hover:bg-blue-200 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center gap-1.5"
                          title="Translate to all languages"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                          </svg>
                          Bulk
                        </button>
                      )}
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
                    <div className="flex border-b-2 border-orange-200/60 px-4 sm:px-6 overflow-x-auto items-center">
                      <button
                        onClick={() => setActiveTab("english")}
                        className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === "english"
                          ? "border-orange-400 text-orange-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-orange-200"
                          }`}
                      >
                        English
                      </button>
                      {/* Markdown Toggle - Only show when English tab is active AND generation is complete */}
                      {activeTab === "english" && !isGenerating && englishContent && (
                        <div className="ml-4 flex items-center gap-2 border-l border-orange-200 pl-4">
                          <span className="text-xs text-gray-600 font-medium">Markdown:</span>
                          <button
                            onClick={() => setMarkdownEnabled(!markdownEnabled)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${markdownEnabled ? "bg-orange-500" : "bg-gray-300"
                              }`}
                            role="switch"
                            aria-checked={markdownEnabled}
                            aria-label="Toggle markdown rendering (only available after generation completes)"
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${markdownEnabled ? "translate-x-6" : "translate-x-1"
                                }`}
                            />
                          </button>
                          <span className="text-xs text-gray-500 font-medium">
                            {markdownEnabled ? "On" : "Off"}
                          </span>
                        </div>
                      )}
                      {/* Show all languages that are either translated or currently translating */}
                      {availableTabs.map((langCode) => (
                        <button
                          key={langCode}
                          onClick={() => setActiveTab(langCode)}
                          className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === langCode
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
                      // Only allow markdown rendering after generation completes (not during streaming)
                      // During generation (isGenerating), always show plain text
                      <ContentPreview
                        content={englishContent}
                        isMarkdown={markdownEnabled && !isGenerating && activeTab === "english"}
                      />
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
                            <span className="text-sm font-medium">
                              Translating to {getLanguageName(activeTab)}...
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : translatedContent[activeTab] ? (
                      // Translated content always shows as plain text (no markdown rendering - markdown toggle is English-only)
                      <ContentPreview content={translatedContent[activeTab]} isMarkdown={false} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <p className="text-sm">No translation available for this language yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Session History - Horizontal Layout Below Content Preview and Ollama Status */}
              <div className="mt-6">
                <StitchSessionSidebar
                  sessions={sessions}
                  currentSessionId={currentSessionId}
                  onSessionSelect={handleSessionSelect}
                  onNewSession={handleNewSession}
                  onDeleteSession={handleDeleteSession}
                  isLoading={sessionsLoading}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrap StitchPage with Error Boundary
const StitchPageWithErrorBoundary: React.FC = () => {
  return (
    <StitchErrorBoundary>
      <StitchPage />
    </StitchErrorBoundary>
  );
};

export default StitchPageWithErrorBoundary;

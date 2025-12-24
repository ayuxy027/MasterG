import React, { useState } from "react";
import MaterialsTab from "./MaterialsTab";
import QuestionsTab from "./QuestionsTab";
import QuizTab from "./QuizTab";
import RecallNotesTab from "./RecallNotesTab";
import LMRHistoryComponent from "./LMRHistory";
import LMRApi, {
  LMRSummary,
  LMRQuestion,
  LMRQuiz,
  LMRRecallNote,
} from "../../services/lmrApi";

const LMRPage: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileId, setFileId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [selectedTone, setSelectedTone] = useState("professional");
  const [activeView, setActiveView] = useState<
    "summary" | "questions" | "quiz" | "notes"
  >("summary");

  // Content states
  const [summary, setSummary] = useState<LMRSummary | null>(null);
  const [questions, setQuestions] = useState<LMRQuestion[]>([]);
  const [quiz, setQuiz] = useState<LMRQuiz[]>([]);
  const [recallNotes, setRecallNotes] = useState<LMRRecallNote[]>([]);

  // Loading states
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  const [error, setError] = useState<string>("");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError("");
      setUploadedFile(file);
      setIsProcessing(true);

      // 🔄 CRITICAL: Clear all previous content when uploading a NEW document
      // This prevents stale data from the previous document from persisting
      setSummary(null);
      setQuestions([]);
      setQuiz([]);
      setRecallNotes([]);
      setFileId(""); // Clear old fileId immediately

      // Upload document to backend
      const response = await LMRApi.uploadDocument(
        file,
        "lmr-user",
        "lmr-session"
      );
      setFileId(response.fileId);

      setIsProcessing(false);

      // Show success notification
      console.log("✅ Document uploaded successfully:", response);

      // Trigger history refresh
      setHistoryRefreshKey((prev) => prev + 1);

      // Auto-generate summary using selected language and tone
      setActiveView("summary");
      setLoadingSummary(true);
      try {
        const summaryData = await LMRApi.generateSummary(
          response.fileId,
          selectedLanguage,
          selectedTone
        );
        setSummary(summaryData);
        console.log(`✅ Summary generated in ${selectedLanguage}`);
      } catch (summaryError) {
        console.error("Failed to auto-generate summary:", summaryError);
        setError(
          "Document uploaded but failed to generate summary. Please try again."
        );
      }
      setLoadingSummary(false);
    } catch (err) {
      setIsProcessing(false);
      setError(
        err instanceof Error ? err.message : "Failed to upload document"
      );
      console.error("Upload error:", err);
    }
  };

  const loadContent = async (
    type: "summary" | "questions" | "quiz" | "notes"
  ) => {
    if (!fileId) return;

    try {
      setError("");

      switch (type) {
        case "summary":
          if (!summary) {
            setLoadingSummary(true);
            const summaryData = await LMRApi.generateSummary(
              fileId,
              selectedLanguage,
              selectedTone
            );
            setSummary(summaryData);
            setLoadingSummary(false);
          }
          break;

        case "questions":
          if (questions.length === 0) {
            setLoadingQuestions(true);
            const questionsData = await LMRApi.generateQuestions(
              fileId,
              selectedLanguage,
              10
            );
            setQuestions(questionsData);
            setLoadingQuestions(false);
          }
          break;

        case "quiz":
          if (quiz.length === 0) {
            setLoadingQuiz(true);
            const quizData = await LMRApi.generateQuiz(
              fileId,
              selectedLanguage,
              10
            );
            setQuiz(quizData);
            setLoadingQuiz(false);
          }
          break;

        case "notes":
          if (recallNotes.length === 0) {
            setLoadingNotes(true);
            const notesData = await LMRApi.generateRecallNotes(
              fileId,
              selectedLanguage
            );
            setRecallNotes(notesData);
            setLoadingNotes(false);
          }
          break;
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to generate ${type}`
      );
      console.error(`${type} generation error:`, err);

      // Reset loading states
      setLoadingSummary(false);
      setLoadingQuestions(false);
      setLoadingQuiz(false);
      setLoadingNotes(false);
    }
  };

  const handleViewChange = (
    view: "summary" | "questions" | "quiz" | "notes"
  ) => {
    setActiveView(view);

    // Load content when switching views
    if (fileId) {
      loadContent(view);
    }
  };

  const handleSelectHistory = async (fId: string, fName: string) => {
    setFileId(fId);
    setUploadedFile(new File([], fName));
    setSummary(null);
    setQuestions([]);
    setQuiz([]);
    setRecallNotes([]);
    setActiveView("summary");

    // Auto-load summary
    try {
      setLoadingSummary(true);
      const summaryData = await LMRApi.generateSummary(
        fId,
        selectedLanguage,
        selectedTone
      );
      setSummary(summaryData);
    } catch (err) {
      console.error("Failed to load summary:", err);
    } finally {
      setLoadingSummary(false);
    }
  };
  // Translation state
  const [isTranslating, setIsTranslating] = useState(false);
  const [currentDisplayLanguage, setCurrentDisplayLanguage] = useState("en");

  /**
   * Translate all generated content to the selected language using NLLB
   */
  const handleTranslate = async () => {
    if (!fileId || selectedLanguage === currentDisplayLanguage) return;

    // Check if we have any content to translate
    const hasAnyContent = summary || questions.length > 0 || quiz.length > 0 || recallNotes.length > 0;
    if (!hasAnyContent) {
      setError("Generate content first before translating");
      return;
    }

    try {
      setIsTranslating(true);
      setError("");

      // If switching to English, regenerate content in English (original)
      if (selectedLanguage === "en") {
        // Reload content in English
        setCurrentDisplayLanguage("en");
        setSummary(null);
        setQuestions([]);
        setQuiz([]);
        setRecallNotes([]);
        // Load summary again
        setLoadingSummary(true);
        const summaryData = await LMRApi.generateSummary(fileId, "en", selectedTone);
        setSummary(summaryData);
        setLoadingSummary(false);
        setCurrentDisplayLanguage("en");
      } else {
        // Translate using NLLB
        console.log(`🌐 Translating to ${selectedLanguage}...`);

        const translated = await LMRApi.translateContent(
          {
            summary: summary || undefined,
            questions: questions.length > 0 ? questions : undefined,
            quiz: quiz.length > 0 ? quiz : undefined,
            recallNotes: recallNotes.length > 0 ? recallNotes : undefined,
          },
          selectedLanguage
        );

        // Update all content with translations
        if (translated.summary) setSummary(translated.summary);
        if (translated.questions) setQuestions(translated.questions);
        if (translated.quiz) setQuiz(translated.quiz);
        if (translated.recallNotes) setRecallNotes(translated.recallNotes);

        setCurrentDisplayLanguage(selectedLanguage);
      }

      console.log(`✅ Content now displayed in ${selectedLanguage}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed");
      console.error("Translation error:", err);
    } finally {
      setIsTranslating(false);
    }
  };

  // Expanded language list with Indian languages (NLLB supported)
  const languages = [
    { value: "en", label: "English" },
    { value: "hi", label: "हिंदी (Hindi)" },
    { value: "mr", label: "मराठी (Marathi)" },
    { value: "gu", label: "ગુજરાતી (Gujarati)" },
    { value: "bn", label: "বাংলা (Bengali)" },
    { value: "ta", label: "தமிழ் (Tamil)" },
    { value: "te", label: "తెలుగు (Telugu)" },
    { value: "kn", label: "ಕನ್ನಡ (Kannada)" },
    { value: "ml", label: "മലയാളം (Malayalam)" },
    { value: "pa", label: "ਪੰਜਾਬੀ (Punjabi)" },
    { value: "ur", label: "اردو (Urdu)" },
    { value: "or", label: "ଓଡ଼ିଆ (Odia)" },
    { value: "as", label: "অসমীয়া (Assamese)" },
    { value: "ne", label: "नेपाली (Nepali)" },
  ];

  const tones = [
    {
      value: "professional",
      label: "Professional",
      description: "Formal and academic tone",
    },
    {
      value: "friendly",
      label: "Friendly",
      description: "Casual and approachable tone",
    },
    {
      value: "conversational",
      label: "Conversational",
      description: "Natural and engaging tone",
    },
    {
      value: "concise",
      label: "Concise",
      description: "Brief and to-the-point tone",
    },
  ];

  const views = [
    {
      id: "summary",
      label: "Summary",
      icon: (
        <svg
          className="w-4 h-4 sm:w-5 sm:h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          ></path>
        </svg>
      ),
    },
    {
      id: "questions",
      label: "Questions",
      icon: (
        <svg
          className="w-4 h-4 sm:w-5 sm:h-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
        >
          <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" x2="12.01" y1="17" y2="17" />
        </svg>
      ),
    },
    {
      id: "quiz",
      label: "Quiz",
      icon: (
        <svg
          className="w-4 h-4 sm:w-5 sm:h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          ></path>
        </svg>
      ),
    },
    {
      id: "notes",
      label: "Recall Notes",
      icon: (
        <svg
          className="w-4 h-4 sm:w-5 sm:h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          ></path>
        </svg>
      ),
    },
  ];

  const hasContent = uploadedFile && !isProcessing;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-gray-800 mb-2 sm:mb-3">
            <span className="text-orange-400">LMR</span> for Revisions
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
            AI-powered quick revision notes and questions for last-minute exam
            preparation
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
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
              <p className="font-semibold text-red-800">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError("")}
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

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-stretch">
          {/* Sidebar */}
          <aside className="lg:w-80 xl:w-96 flex-shrink-0">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 p-5 sm:p-6 sticky top-24 space-y-6">
              {/* History */}
              <LMRHistoryComponent
                key={historyRefreshKey}
                userId="lmr-user"
                sessionId="lmr-session"
                onSelectFile={handleSelectHistory}
              />

              {/* Upload Section */}
              <div
                className={hasContent ? "opacity-50 pointer-events-none" : ""}
              >
                <div className="flex items-center gap-2 mb-3">
                  <svg
                    className="w-4 h-4 text-orange-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    ></path>
                  </svg>
                  <h2 className="text-sm sm:text-base font-semibold text-gray-800">
                    Upload Document
                  </h2>
                </div>
                <div
                  className={`border-2 border-dashed rounded-xl p-5 sm:p-6 text-center transition-all ${uploadedFile
                    ? "border-orange-400 bg-orange-50"
                    : "border-orange-200 hover:border-orange-400 hover:bg-orange-50"
                    } ${hasContent
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                    }`}
                  onClick={() =>
                    !hasContent &&
                    document.getElementById("file-upload")?.click()
                  }
                >
                  {!uploadedFile ? (
                    <>
                      <svg
                        className="w-12 h-12 sm:w-14 sm:h-14 text-orange-400 mx-auto mb-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        ></path>
                      </svg>
                      <p className="text-sm text-gray-700 font-medium mb-1">
                        Click to upload
                      </p>
                      <p className="text-xs text-gray-500">
                        PDF, DOC, DOCX supported
                      </p>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-12 h-12 sm:w-14 sm:h-14 text-orange-500 mx-auto mb-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                      </svg>
                      <p className="text-sm text-gray-800 font-medium break-words mb-1">
                        {uploadedFile.name}
                      </p>
                      <p className="text-xs text-orange-600 font-medium">
                        Uploaded successfully
                      </p>
                    </>
                  )}

                  {isProcessing && (
                    <div className="mt-4">
                      <div className="w-full bg-orange-200 rounded-full h-2.5">
                        <div className="bg-orange-500 h-full rounded-full animate-pulse w-3/4 transition-all"></div>
                      </div>
                      <p className="text-xs text-orange-600 mt-2 font-medium">
                        Processing document...
                      </p>
                    </div>
                  )}
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={hasContent}
                />
              </div>

              {/* Language Selector */}
              <div>
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-800 mb-2.5">
                  <svg
                    className="w-4 h-4 text-orange-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                    ></path>
                  </svg>
                  Language {hasContent && <span className="text-xs text-orange-500">(Translate)</span>}
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border-2 border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-700 transition-all"
                >
                  {languages.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
                {/* Translate Button - shows when content exists and language differs */}
                {hasContent && selectedLanguage !== currentDisplayLanguage && (
                  <button
                    onClick={handleTranslate}
                    disabled={isTranslating}
                    className="mt-2 w-full px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
                  >
                    {isTranslating ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Translating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path>
                        </svg>
                        Translate to {languages.find(l => l.value === selectedLanguage)?.label.split(' ')[0]}
                      </>
                    )}
                  </button>
                )}
                {currentDisplayLanguage !== "en" && (
                  <p className="text-xs text-green-600 mt-1">
                    Currently showing: {languages.find(l => l.value === currentDisplayLanguage)?.label}
                  </p>
                )}
              </div>

              {/* Tone Selector */}
              <div>
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-800 mb-2.5">
                  <svg
                    className="w-4 h-4 text-orange-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                    ></path>
                  </svg>
                  Tone
                </label>
                <select
                  value={selectedTone}
                  onChange={(e) => setSelectedTone(e.target.value)}
                  disabled={hasContent}
                  className="w-full px-3 py-2.5 bg-white border-2 border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {tones.map((tone) => (
                    <option key={tone.value} value={tone.value}>
                      {tone.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1.5 ml-1">
                  {tones.find((t) => t.value === selectedTone)?.description}
                </p>
              </div>

              {/* Status */}
              {hasContent && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                    <div className="flex-1">
                      <p className="text-xs sm:text-sm text-gray-700 font-medium">
                        Content generated
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5">
                        {
                          languages.find((l) => l.value === selectedLanguage)
                            ?.label
                        }{" "}
                        • {tones.find((t) => t.value === selectedTone)?.label}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0 flex flex-col">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 overflow-hidden flex-1 flex flex-col">
              {/* Navigation */}
              <div className="bg-orange-100 border-b-2 border-orange-200 p-3 sm:p-4 md:p-5">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 md:gap-3">
                  {views.map((view) => {
                    const isDisabled = !hasContent;
                    return (
                      <button
                        key={view.id}
                        onClick={() =>
                          !isDisabled && handleViewChange(view.id as any)
                        }
                        disabled={isDisabled}
                        className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 rounded-full transition-all font-semibold text-xs sm:text-sm md:text-base shadow-md transform whitespace-nowrap flex-shrink-0 ${isDisabled
                          ? "bg-gray-100 text-gray-400 border-2 border-gray-200 cursor-not-allowed"
                          : activeView === view.id
                            ? "bg-orange-400 text-white hover:bg-orange-500 shadow-lg hover:scale-105"
                            : "bg-white text-orange-600 border-2 border-orange-200 hover:bg-orange-50 hover:border-orange-300 hover:scale-105"
                          }`}
                      >
                        {view.icon}
                        <span className="hidden sm:inline">{view.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content Display */}
              <div className="p-6 sm:p-8 md:p-10 min-h-[500px]">
                {!hasContent ? (
                  <div className="text-center py-16 sm:py-20">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-full bg-orange-100 flex items-center justify-center">
                      <svg
                        className="w-10 h-10 sm:w-12 sm:h-12 text-orange-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        ></path>
                      </svg>
                    </div>
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-800 mb-3">
                      <span className="text-orange-400">Upload Document</span>{" "}
                      to Get Started
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto">
                      Upload your study materials to generate AI-powered
                      revision notes, questions, and quizzes.
                    </p>
                  </div>
                ) : (
                  <>
                    {activeView === "summary" && (
                      <MaterialsTab
                        summary={summary}
                        isLoading={loadingSummary}
                      />
                    )}
                    {activeView === "questions" && (
                      <QuestionsTab
                        questions={questions}
                        isLoading={loadingQuestions}
                      />
                    )}
                    {activeView === "quiz" && (
                      <QuizTab quizData={quiz} isLoading={loadingQuiz} />
                    )}
                    {activeView === "notes" && (
                      <RecallNotesTab
                        recallNotes={recallNotes}
                        isLoading={loadingNotes}
                      />
                    )}
                    {activeView === "pdf" && (
                      <div className="text-center py-12">
                        <div className="mb-6">
                          <svg
                            className="w-20 h-20 mx-auto text-orange-400 mb-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            ></path>
                          </svg>
                          <h3 className="text-2xl font-bold text-gray-800 mb-2">
                            Download Complete PDF
                          </h3>
                          <p className="text-gray-600 mb-6">
                            Get all generated content in a beautifully formatted
                            PDF
                          </p>
                        </div>
                        <button
                          onClick={handleDownloadPDF}
                          disabled={downloadingPDF}
                          className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold text-lg flex items-center gap-3 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {downloadingPDF ? (
                            <>
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
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Generating PDF...
                            </>
                          ) : (
                            <>
                              <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                ></path>
                              </svg>
                              Download PDF
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default LMRPage;

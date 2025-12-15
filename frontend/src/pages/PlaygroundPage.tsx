import React, { useState, useEffect } from "react";
import { stitchAPI, StitchApiError } from "../services/stitchApi";

interface ServiceStatus {
  name: string;
  status: "checking" | "connected" | "disconnected" | "error";
  details?: string;
  lastChecked?: Date;
}

const PlaygroundPage: React.FC = () => {
  const [ollamaStatus, setOllamaStatus] = useState<ServiceStatus>({
    name: "Ollama (DeepSeek R1)",
    status: "checking",
  });
  const [indicTrans2Status, setIndicTrans2Status] = useState<ServiceStatus>({
    name: "IndicTrans2",
    status: "checking",
  });

  // Test states
  const [ollamaPrompt, setOllamaPrompt] = useState("Explain photosynthesis in simple terms.");
  const [ollamaResponse, setOllamaResponse] = useState("");
  const [ollamaLoading, setOllamaLoading] = useState(false);
  const [ollamaError, setOllamaError] = useState<string | null>(null);

  const [translationText, setTranslationText] = useState("Hello world, how are you?");
  const [translationSource, setTranslationSource] = useState("en");
  const [translationTarget, setTranslationTarget] = useState("hi");
  const [translationResult, setTranslationResult] = useState("");
  const [translationLoading, setTranslationLoading] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  // Check service statuses
  useEffect(() => {
    checkOllamaStatus();
    checkIndicTrans2Status();
    // Refresh status every 10 seconds
    const interval = setInterval(() => {
      checkOllamaStatus();
      checkIndicTrans2Status();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkOllamaStatus = async () => {
    try {
      const status = await stitchAPI.checkStatus();
      setOllamaStatus({
        name: "Ollama (DeepSeek R1)",
        status: status.connected ? "connected" : "disconnected",
        details: status.connected
          ? `${status.models?.length || 0} model(s) available`
          : "Not connected",
        lastChecked: new Date(),
      });
    } catch (err) {
      setOllamaStatus({
        name: "Ollama (DeepSeek R1)",
        status: "error",
        details: err instanceof Error ? err.message : "Connection failed",
        lastChecked: new Date(),
      });
    }
  };

  const checkIndicTrans2Status = async () => {
    // Test with a simple translation (very short to be fast)
    try {
      const testResult = await stitchAPI.translateContent({
        text: "hi",
        sourceLanguage: "en",
        targetLanguage: "hi",
      });
      setIndicTrans2Status({
        name: "IndicTrans2",
        status: testResult.success ? "connected" : "error",
        details: testResult.success 
          ? "Model loaded and ready" 
          : testResult.error || "Service error",
        lastChecked: new Date(),
      });
    } catch (err) {
      setIndicTrans2Status({
        name: "IndicTrans2",
        status: "error",
        details: err instanceof Error ? err.message : "Service unavailable",
        lastChecked: new Date(),
      });
    }
  };

  const testOllama = async () => {
    setOllamaLoading(true);
    setOllamaError(null);
    setOllamaResponse("");
    try {
      const result = await stitchAPI.generateContent({
        topic: ollamaPrompt,
        language: "en",
        grade: "8",
        subject: "science",
        curriculum: "ncert",
        culturalContext: false,
      });
      if (result.success && result.content) {
        setOllamaResponse(result.content);
      } else {
        setOllamaError(result.error || "Generation failed");
      }
    } catch (err) {
      setOllamaError(
        err instanceof StitchApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to generate content"
      );
    } finally {
      setOllamaLoading(false);
    }
  };

  const testTranslation = async () => {
    setTranslationLoading(true);
    setTranslationError(null);
    setTranslationResult("");
    try {
      const result = await stitchAPI.translateContent({
        text: translationText,
        sourceLanguage: translationSource,
        targetLanguage: translationTarget,
      });
      if (result.success && result.translated) {
        setTranslationResult(result.translated);
      } else {
        setTranslationError(result.error || "Translation failed");
      }
    } catch (err) {
      setTranslationError(
        err instanceof StitchApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Translation failed"
      );
    } finally {
      setTranslationLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-green-100 text-green-700 border-green-300";
      case "disconnected":
        return "bg-red-100 text-red-700 border-red-300";
      case "error":
        return "bg-red-100 text-red-700 border-red-300";
      case "checking":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return "✓";
      case "disconnected":
        return "✗";
      case "error":
        return "⚠";
      case "checking":
        return "⟳";
      default:
        return "?";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Service Playground</h1>
        <p className="text-gray-600 mb-6">Test and debug Ollama and IndicTrans2 services</p>

        {/* Service Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Ollama Status */}
          <div className={`border-2 rounded-lg p-4 ${getStatusColor(ollamaStatus.status)}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg">{ollamaStatus.name}</h3>
              <span className="text-2xl">{getStatusIcon(ollamaStatus.status)}</span>
            </div>
            <p className="text-sm opacity-80">{ollamaStatus.details || "Checking..."}</p>
            {ollamaStatus.lastChecked && (
              <p className="text-xs mt-2 opacity-60">
                Last checked: {ollamaStatus.lastChecked.toLocaleTimeString()}
              </p>
            )}
            <button
              onClick={checkOllamaStatus}
              className="mt-3 text-xs px-3 py-1 bg-white bg-opacity-50 rounded hover:bg-opacity-70"
            >
              Refresh
            </button>
          </div>

          {/* IndicTrans2 Status */}
          <div className={`border-2 rounded-lg p-4 ${getStatusColor(indicTrans2Status.status)}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg">{indicTrans2Status.name}</h3>
              <span className="text-2xl">{getStatusIcon(indicTrans2Status.status)}</span>
            </div>
            <p className="text-sm opacity-80">{indicTrans2Status.details || "Checking..."}</p>
            {indicTrans2Status.lastChecked && (
              <p className="text-xs mt-2 opacity-60">
                Last checked: {indicTrans2Status.lastChecked.toLocaleTimeString()}
              </p>
            )}
            <button
              onClick={checkIndicTrans2Status}
              className="mt-3 text-xs px-3 py-1 bg-white bg-opacity-50 rounded hover:bg-opacity-70"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Test Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ollama Test */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Test Ollama (LLM)</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prompt
                </label>
                <textarea
                  value={ollamaPrompt}
                  onChange={(e) => setOllamaPrompt(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                  rows={3}
                  placeholder="Enter your prompt..."
                />
              </div>
              <button
                onClick={testOllama}
                disabled={ollamaLoading || !ollamaPrompt.trim()}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {ollamaLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  "Generate"
                )}
              </button>
              {ollamaError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {ollamaError}
                </div>
              )}
              {ollamaResponse && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Response
                  </label>
                  <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 text-sm whitespace-pre-wrap max-h-96 overflow-auto">
                    {ollamaResponse}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Translation Test */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Test IndicTrans2 (Translation)</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source Language
                </label>
                <select
                  value={translationSource}
                  onChange={(e) => setTranslationSource(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="bn">Bengali</option>
                  <option value="ta">Tamil</option>
                  <option value="te">Telugu</option>
                  <option value="kn">Kannada</option>
                  <option value="ml">Malayalam</option>
                  <option value="mr">Marathi</option>
                  <option value="gu">Gujarati</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Language
                </label>
                <select
                  value={translationTarget}
                  onChange={(e) => setTranslationTarget(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                >
                  <option value="hi">Hindi</option>
                  <option value="en">English</option>
                  <option value="bn">Bengali</option>
                  <option value="ta">Tamil</option>
                  <option value="te">Telugu</option>
                  <option value="kn">Kannada</option>
                  <option value="ml">Malayalam</option>
                  <option value="mr">Marathi</option>
                  <option value="gu">Gujarati</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Text to Translate
                </label>
                <textarea
                  value={translationText}
                  onChange={(e) => setTranslationText(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                  rows={4}
                  placeholder="Enter text to translate..."
                />
              </div>
              <button
                onClick={testTranslation}
                disabled={translationLoading || !translationText.trim()}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {translationLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Translating...
                  </>
                ) : (
                  "Translate"
                )}
              </button>
              {translationError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {translationError}
                </div>
              )}
              {translationResult && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Translation
                  </label>
                  <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 text-sm whitespace-pre-wrap max-h-96 overflow-auto">
                    {translationResult}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaygroundPage;


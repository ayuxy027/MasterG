import React, { useState, useEffect, useCallback } from "react";
import ChatInterface from "./ChatInterface";
import SessionSidebar from "./SessionSidebar";
import ResourcesPanel from "./ResourcesPanel";
import PlanDashboard from "./PlanMode/PlanDashboard";
import ConfirmModal from "../ui/ConfirmModal";
import Navbar from "../Navbar";
import Banner from "../../../Banner";
import {
  getUserId,
  generateSessionId,
  getAllSessions,
  getSessionDetails,
  deleteSession,
  generateChatName,
  updateChatName,
  updateSessionSettings,
  ChatApiError,
} from "../../services/chatApi";
import type { MessageUI, SessionListItem } from "../../types/chat";
import { INDIAN_LANGUAGES, GRADE_LEVELS } from "../../constants/appConstants";

type TabType = "chat" | "resources" | "plan";

const AIChatPage: React.FC = () => {
  // User & Session Management
  const [userId] = useState(() => getUserId());
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [bannerVisible, setBannerVisible] = useState(true);

  // Chat State
  const [messages, setMessages] = useState<MessageUI[]>([]);
  const [pendingStudyPrompt, setPendingStudyPrompt] = useState<string | null>(null);

  // Global Settings
  const [selectedLanguage, setSelectedLanguage] = useState("hi");
  const [selectedGrade, setSelectedGrade] = useState("12");

  // UI State
  const [activeTab, setActiveTab] = useState<TabType>("chat");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    sessionId: string | null;
    sessionName: string;
  }>({ isOpen: false, sessionId: null, sessionName: "" });

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, [userId]);

  // Load session messages when session changes
  useEffect(() => {
    if (currentSessionId) {
      loadSessionMessages(currentSessionId);
    }
  }, [currentSessionId]);

  // Handle banner fade on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setBannerVisible(scrollY < 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const sessionsList = await getAllSessions(userId);
      const sortedSessions = sessionsList.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setSessions(sortedSessions);

      // Auto-select first session if available and none selected
      if (sortedSessions.length > 0 && !currentSessionId) {
        setCurrentSessionId(sortedSessions[0].sessionId);
      }
    } catch (error) {
      console.error("Failed to load sessions:", error);
      if (error instanceof ChatApiError) {
        // Graceful degradation - backend might not have MongoDB
        setSessions([]);
      }
    } finally {
      setSessionsLoading(false);
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const sessionDetails = await getSessionDetails(userId, sessionId);
      const uiMessages: MessageUI[] = sessionDetails.messages.map(
        (msg, idx) => ({
          id: `${sessionId}-${idx}`,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          sources: msg.sources,
          metadata: msg.metadata,
          translatedContent: msg.translatedContent,
          translatedLanguage: msg.translatedLanguage,
        })
      );
      setMessages(uiMessages);

      // Load session settings if available
      if (sessionDetails.language) setSelectedLanguage(sessionDetails.language);
      if (sessionDetails.grade) setSelectedGrade(sessionDetails.grade);

    } catch (error) {
      console.error("Failed to load session messages:", error);
      // Start fresh if session doesn't exist
      setMessages([]);
    }
  };

  const handleNewSession = useCallback(() => {
    const newSessionId = generateSessionId();

    // Create a new session entry and add it to the top of the list immediately
    const newSession: SessionListItem = {
      sessionId: newSessionId,
      chatName: undefined, // Will be auto-generated after first message
      messageCount: 0,
      lastMessage: "New conversation",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add to sessions list at the top for immediate visibility
    setSessions((prev) => [newSession, ...prev]);

    setCurrentSessionId(newSessionId);
    setMessages([]);
    setActiveTab("chat");
  }, []);

  const handleSessionSelect = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setActiveTab("chat");
  };

  const handleDeleteClick = (sessionId: string, sessionName: string) => {
    setConfirmModal({ isOpen: true, sessionId, sessionName });
  };

  const handleConfirmDelete = async () => {
    if (!confirmModal.sessionId) return;

    try {
      await deleteSession(userId, confirmModal.sessionId);
      const remainingSessions = sessions.filter((s) => s.sessionId !== confirmModal.sessionId);
      setSessions(remainingSessions);

      // If deleted session was active
      if (currentSessionId === confirmModal.sessionId) {
        if (remainingSessions.length > 0) {
          // Select the first remaining session
          setCurrentSessionId(remainingSessions[0].sessionId);
        } else {
          // No sessions left, clear the current session
          setCurrentSessionId(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  };

  const handleRenameSession = async (sessionId: string, newName: string) => {
    // Update UI immediately
    setSessions((prev) =>
      prev.map((s) =>
        s.sessionId === sessionId ? { ...s, chatName: newName } : s
      )
    );

    // Save to database
    try {
      await updateChatName(userId, sessionId, newName);
    } catch (error) {
      console.error("Failed to save chat name:", error);
      // Revert on error (optional)
    }
  };

  const handleSessionUpdate = useCallback(async (firstUserMessage?: string) => {
    // Reload sessions to get updated data
    await loadSessions();

    // Auto-generate chat name for new sessions after first user message
    if (firstUserMessage && currentSessionId) {
      try {
        const chatName = await generateChatName(firstUserMessage);

        // Update UI
        setSessions((prev) =>
          prev.map((s) =>
            s.sessionId === currentSessionId && !s.chatName ? { ...s, chatName } : s
          )
        );

        // Save to database
        await updateChatName(userId, currentSessionId, chatName);
      } catch (error) {
        console.error("Failed to generate/save chat name:", error);
      }
    }
  }, [userId, currentSessionId]);



  return (
    <div className="flex flex-col overflow-hidden bg-gradient-to-br from-orange-50 via-white to-orange-50/30" style={{ height: '100dvh' }}>
      {/* Banner at the top - fades on scroll */}
      <Banner isVisible={bannerVisible} />
      {/* Fixed Navbar - Renders the fixed navbar */}
      <div className="fixed top-[40px] sm:top-[44px] left-0 right-0 z-50">
        <Navbar />
      </div>

      {/* Header Section */}
      <div className="flex-shrink-0 px-4 sm:px-6 md:px-8 py-2 sm:py-3 border-b-2 border-orange-100 bg-white/50 backdrop-blur-sm max-w-[1920px] w-full mx-auto mt-[100px] sm:mt-[104px]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-gray-800">
              <span className="text-orange-400">RAG-Powered</span> AI Chat
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
              Multilingual support • Multi-document RAG • 3-Layer Intelligence
            </p>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-3">
            <div className="flex gap-2 bg-white/80 backdrop-blur-md rounded-lg p-1 border-2 border-orange-100">
              <button
                onClick={() => setActiveTab("chat")}
                className={`px-3 sm:px-4 md:px-5 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${activeTab === "chat"
                  ? "bg-orange-400 text-white shadow-md"
                  : "text-gray-600 hover:bg-orange-50"
                  }`}
              >
                Chat
              </button>
              <button
                onClick={() => setActiveTab("resources")}
                className={`px-3 sm:px-4 md:px-5 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${activeTab === "resources"
                  ? "bg-orange-400 text-white shadow-md"
                  : "text-gray-600 hover:bg-orange-50"
                  }`}
              >
                Resources
              </button>
            </div>

            {/* Plan Button - Separate from tabs */}
            <button
              onClick={() => setActiveTab("plan")}
              className={`px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${activeTab === "plan"
                ? "bg-orange-500 text-white shadow-md"
                : "bg-white/80 text-gray-700 border-2 border-orange-200 hover:bg-orange-50 hover:border-orange-300"
                }`}
            >
              <span>📋</span>
              Plan
            </button>
          </div>

          {/* Global Settings Dropdowns (Right Side) */}
          <div className="flex items-center gap-3 ml-4">
            {/* Language Selector */}
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md rounded-lg p-1 border border-orange-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 pl-2">Lang:</span>
              <select
                value={selectedLanguage}
                onChange={async (e) => {
                  const newLang = e.target.value;
                  setSelectedLanguage(newLang);
                  if (currentSessionId) {
                    try {
                      await updateSessionSettings(userId, currentSessionId, { language: newLang });
                    } catch (err) {
                      console.error("Failed to save language setting", err);
                    }
                  }
                }}
                className="bg-transparent text-xs sm:text-sm font-bold text-orange-600 focus:outline-none cursor-pointer py-1 pr-1 max-w-[100px]"
              >
                {INDIAN_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>

            {/* Grade Selector */}
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md rounded-lg p-1 border border-orange-200 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 pl-2">Grade:</span>
              <select
                value={selectedGrade}
                onChange={async (e) => {
                  const newGrade = e.target.value;
                  setSelectedGrade(newGrade);
                  if (currentSessionId) {
                    try {
                      await updateSessionSettings(userId, currentSessionId, { grade: newGrade });
                    } catch (err) {
                      console.error("Failed to save grade setting", err);
                    }
                  }
                }}
                className="bg-transparent text-xs sm:text-sm font-bold text-orange-600 focus:outline-none cursor-pointer py-1 pr-1"
              >
                {GRADE_LEVELS.map(g => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - flex-1 with min-h-0 to prevent overflow */}
      <div className="flex-1 min-h-0 flex overflow-hidden max-w-[1920px] w-full mx-auto">
        {/* Session Sidebar */}
        {!sidebarCollapsed && (
          <SessionSidebar
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSessionSelect={handleSessionSelect}
            onNewSession={handleNewSession}
            onDeleteSession={handleDeleteClick}
            onRenameSession={handleRenameSession}
            isLoading={sessionsLoading}
          />
        )}

        {/* Sidebar Toggle Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="w-6 bg-white/80 hover:bg-orange-50 border-r-2 border-orange-100 flex items-center justify-center transition-colors"
          title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
        >
          <svg
            className={`w-4 h-4 text-gray-600 transition-transform ${sidebarCollapsed ? "rotate-180" : ""
              }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "chat" && currentSessionId ? (
            <ChatInterface
              userId={userId}
              sessionId={currentSessionId}
              messages={messages}
              setMessages={setMessages}
              onSessionUpdate={handleSessionUpdate}
              initialPrompt={pendingStudyPrompt}
              onInitialPromptConsumed={() => setPendingStudyPrompt(null)}
              selectedLanguage={selectedLanguage}
            />
          ) : activeTab === "resources" && currentSessionId ? (
            <ResourcesPanel userId={userId} sessionId={currentSessionId} />
          ) : activeTab === "plan" && currentSessionId ? (
            <PlanDashboard
              userId={userId}
              sessionId={currentSessionId}
              onSwitchToStudy={(prompt) => {
                setPendingStudyPrompt(prompt);
                setActiveTab("chat");
              }}
              selectedGrade={selectedGrade}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <p>No active session</p>
                <button
                  onClick={handleNewSession}
                  className="mt-4 px-6 py-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 transition-colors"
                >
                  Start New Chat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() =>
          setConfirmModal({ isOpen: false, sessionId: null, sessionName: "" })
        }
        onConfirm={handleConfirmDelete}
        title="Delete Chat Session?"
        message={`Are you sure you want to delete "${confirmModal.sessionName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default AIChatPage;

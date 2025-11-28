import React, { useState, useEffect } from 'react';
import ChatInterface from './ChatInterface';
import SessionSidebar from './SessionSidebar';
import ResourcesPanel from './ResourcesPanel';
import {
  getUserId,
  generateSessionId,
  getAllSessions,
  getSessionDetails,
  deleteSession,
  ChatApiError,
} from '../../services/chatApi';
import type { MessageUI, SessionListItem } from '../../types/chat';

type TabType = 'chat' | 'resources';

const AIChatPage: React.FC = () => {
  // User & Session Management
  const [userId] = useState(() => getUserId());
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // Chat State
  const [messages, setMessages] = useState<MessageUI[]>([]);
  const [currentMode, setCurrentMode] = useState<'study' | 'plan' | 'ideation'>('study');
  
  // UI State
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const sessionsList = await getAllSessions(userId);
      setSessions(sessionsList.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ));
    } catch (error) {
      console.error('Failed to load sessions:', error);
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
      const uiMessages: MessageUI[] = sessionDetails.messages.map((msg, idx) => ({
        id: `${sessionId}-${idx}`,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        sources: msg.sources,
        metadata: msg.metadata,
      }));
      setMessages(uiMessages);
    } catch (error) {
      console.error('Failed to load session messages:', error);
      // Start fresh if session doesn't exist
      setMessages([]);
    }
  };

  const handleNewSession = () => {
    const newSessionId = generateSessionId();
    setCurrentSessionId(newSessionId);
    setMessages([]);
    setActiveTab('chat');
  };

  const handleSessionSelect = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setActiveTab('chat');
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(userId, sessionId);
      setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
      
      // If deleted session was active, create new session
      if (currentSessionId === sessionId) {
        handleNewSession();
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Failed to delete session. Please try again.');
    }
  };

  const handleSessionUpdate = () => {
    // Reload sessions to get updated message counts
    loadSessions();
  };

  // Initialize with a new session if no sessions exist
  useEffect(() => {
    if (!sessionsLoading && sessions.length === 0 && !currentSessionId) {
      handleNewSession();
    }
  }, [sessionsLoading, sessions.length, currentSessionId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30">
      <div className="max-w-[1920px] mx-auto h-screen flex flex-col">
        {/* Header Section */}
        <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-b-2 border-orange-100 bg-white/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-gray-800">
                <span className="text-orange-400">RAG-Powered</span> AI Chat
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-1">
                Multilingual support • Multi-document RAG • 3-Layer Intelligence
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-white/80 backdrop-blur-md rounded-lg p-1 border-2 border-orange-100">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'chat'
                    ? 'bg-orange-400 text-white shadow-md'
                    : 'text-gray-600 hover:bg-orange-50'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setActiveTab('resources')}
                className={`px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'resources'
                    ? 'bg-orange-400 text-white shadow-md'
                    : 'text-gray-600 hover:bg-orange-50'
                }`}
              >
                Resources
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Session Sidebar */}
          {!sidebarCollapsed && (
            <SessionSidebar
              sessions={sessions}
              currentSessionId={currentSessionId}
              onSessionSelect={handleSessionSelect}
              onNewSession={handleNewSession}
              onDeleteSession={handleDeleteSession}
              isLoading={sessionsLoading}
            />
          )}

          {/* Sidebar Toggle Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-6 bg-white/80 hover:bg-orange-50 border-r-2 border-orange-100 flex items-center justify-center transition-colors"
            title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          >
            <svg
              className={`w-4 h-4 text-gray-600 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'chat' && currentSessionId ? (
              <ChatInterface
                userId={userId}
                sessionId={currentSessionId}
                currentMode={currentMode}
                setCurrentMode={setCurrentMode}
                messages={messages}
                setMessages={setMessages}
                onSessionUpdate={handleSessionUpdate}
              />
            ) : activeTab === 'resources' && currentSessionId ? (
              <ResourcesPanel
                userId={userId}
                sessionId={currentSessionId}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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
      </div>
    </div>
  );
};

export default AIChatPage;
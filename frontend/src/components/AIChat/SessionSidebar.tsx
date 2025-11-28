import React from 'react';
import type { SessionListItem } from '../../types/chat';

interface SessionSidebarProps {
  sessions: SessionListItem[];
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  isLoading: boolean;
}

const SessionSidebar: React.FC<SessionSidebarProps> = ({
  sessions,
  currentSessionId,
  onSessionSelect,
  onNewSession,
  onDeleteSession,
  isLoading,
}) => {
  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="w-64 bg-white/80 backdrop-blur-md border-r-2 border-orange-100 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b-2 border-orange-100">
        <button
          onClick={onNewSession}
          className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white px-4 py-2.5 rounded-lg font-medium hover:from-orange-500 hover:to-orange-600 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-2 text-sm">Loading sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">No chat sessions yet</p>
            <p className="text-xs mt-1">Start a new conversation</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {sessions.map((session) => (
              <div
                key={session.sessionId}
                className={`group relative p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                  currentSessionId === session.sessionId
                    ? 'bg-orange-50 border-2 border-orange-300'
                    : 'hover:bg-gray-50 border-2 border-transparent'
                }`}
                onClick={() => onSessionSelect(session.sessionId)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {truncateText(session.lastMessage || 'New conversation', 30)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-500">
                        {formatTimestamp(session.updatedAt)}
                      </p>
                      <span className="text-xs text-gray-400">•</span>
                      <p className="text-xs text-gray-500">
                        {session.messageCount} {session.messageCount === 1 ? 'message' : 'messages'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Delete button - shows on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Delete this chat session?')) {
                        onDeleteSession(session.sessionId);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                    title="Delete session"
                  >
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t-2 border-orange-100 bg-orange-50/50">
        <div className="text-xs text-gray-600 text-center">
          <p className="font-medium">MasterJi Chat</p>
          <p className="text-gray-500 mt-0.5">RAG-Powered AI Assistant</p>
        </div>
      </div>
    </div>
  );
};

export default SessionSidebar;

import React from "react";
import type { StitchSessionListItem } from "../../services/stitchApi";

interface StitchSessionSidebarProps {
  sessions: StitchSessionListItem[];
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  isLoading: boolean;
}

const StitchSessionSidebar: React.FC<StitchSessionSidebarProps> = ({
  sessions,
  currentSessionId,
  onSessionSelect,
  onNewSession,
  onDeleteSession,
  isLoading,
}) => {
  const formatTimestamp = (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - dateObj.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return dateObj.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;

    return dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getSessionDisplayName = (session: StitchSessionListItem): string => {
    if (session.sessionName) return session.sessionName;
    if (session.topic) {
      return session.topic.length > 25 ? session.topic.substring(0, 25) + "..." : session.topic;
    }
    return "Untitled Session";
  };

  return (
    <div className="w-56 bg-white/80 backdrop-blur-md border-r-2 border-orange-100 h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b-2 border-orange-100">
        <button
          onClick={onNewSession}
          className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white px-3 py-2 rounded-lg font-medium hover:from-orange-500 hover:to-orange-600 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Session
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-2 space-y-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-16 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p className="text-xs">No previous sessions</p>
            <p className="text-xs mt-1 text-gray-400">Create content to see it here</p>
          </div>
        ) : (
          <div className="p-1.5 space-y-0.5">
            {sessions.map((session) => (
              <div
                key={session.sessionId}
                className={`group relative p-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
                  currentSessionId === session.sessionId
                    ? "bg-orange-50 border-2 border-orange-300"
                    : "hover:bg-gray-50 border-2 border-transparent"
                }`}
                onClick={() => onSessionSelect(session.sessionId)}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">
                      {getSessionDisplayName(session)}
                    </p>
                    <span className="text-xs text-gray-400 block mt-0.5">
                      {formatTimestamp(session.updatedAt)}
                    </span>
                    {session.translationCount > 0 && (
                      <span className="text-xs text-orange-500 font-medium block mt-0.5">
                        {session.translationCount} lang
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.sessionId);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all flex-shrink-0"
                    title="Delete session"
                  >
                    <svg
                      className="w-3.5 h-3.5 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StitchSessionSidebar;


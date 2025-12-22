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
      return session.topic.length > 30 ? session.topic.substring(0, 30) + "..." : session.topic;
    }
    return "Untitled Session";
  };

  return (
    <div className="w-full bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
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
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-sm sm:text-base font-semibold text-gray-800">Session History</h2>
          {sessions.length > 0 && (
            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
              {sessions.length}
            </span>
          )}
        </div>
        <button
          onClick={onNewSession}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-lg font-medium hover:from-orange-500 hover:to-orange-600 transition-all duration-200 shadow-md hover:shadow-lg text-xs sm:text-sm"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span className="hidden sm:inline">New Session</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* Horizontal Scrollable Sessions */}
      <div className="overflow-x-auto -mx-2 px-2">
        <div className="flex gap-3 sm:gap-4 min-w-max pb-2">
          {isLoading ? (
            // Loading skeletons
            <>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-48 sm:w-56 bg-gray-100 rounded-xl p-4 animate-pulse"
                >
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </>
          ) : sessions.length === 0 ? (
            // Empty state
            <div className="flex-shrink-0 w-full sm:w-auto flex items-center justify-center py-8 px-6 text-center">
              <div className="max-w-xs">
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-gray-500 font-medium">No previous sessions</p>
                <p className="text-xs text-gray-400 mt-1">Create content to see it here</p>
              </div>
            </div>
          ) : (
            // Session cards
            sessions.map((session) => (
              <div
                key={session.sessionId}
                className={`group flex-shrink-0 w-48 sm:w-56 bg-gradient-to-br ${
                  currentSessionId === session.sessionId
                    ? "from-orange-50 to-orange-100 border-2 border-orange-300 shadow-md"
                    : "from-white to-gray-50 border-2 border-gray-200 hover:border-orange-200"
                } rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-lg relative`}
                onClick={() => onSessionSelect(session.sessionId)}
              >
                {/* Active indicator */}
                {currentSessionId === session.sessionId && (
                  <div className="absolute top-2 right-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  </div>
                )}

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.sessionId);
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 rounded-lg transition-all z-10"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>

                {/* Session content */}
                <div className="pr-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1.5 line-clamp-2">
                    {getSessionDisplayName(session)}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>{formatTimestamp(session.updatedAt)}</span>
                  </div>

                  {/* Session stats */}
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200">
                    {session.hasContent && (
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <svg
                          className="w-3.5 h-3.5 text-green-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>Content</span>
                      </div>
                    )}
                    {session.translationCount > 0 && (
                      <div className="flex items-center gap-1 text-xs text-orange-600 font-medium">
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                          />
                        </svg>
                        <span>{session.translationCount} lang</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default StitchSessionSidebar;

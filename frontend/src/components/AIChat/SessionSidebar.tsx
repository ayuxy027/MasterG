import React, { useState, useRef, useEffect } from "react";
import type { SessionListItem } from "../../types/chat";
import { SessionSkeleton } from "../ui/Skeleton";

interface SessionSidebarProps {
  sessions: SessionListItem[];
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string, sessionName: string) => void;
  onRenameSession: (sessionId: string, newName: string) => void;
  isLoading: boolean;
}

const SessionSidebar: React.FC<SessionSidebarProps> = ({
  sessions,
  currentSessionId,
  onSessionSelect,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  isLoading,
}) => {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingSessionId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingSessionId]);

  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const handleDeleteClick = (e: React.MouseEvent, sessionId: string, sessionName: string) => {
    e.stopPropagation();
    onDeleteSession(sessionId, sessionName);
  };

  const startEditing = (e: React.MouseEvent, sessionId: string, currentName: string) => {
    e.stopPropagation();
    setEditingSessionId(sessionId);
    setEditingName(currentName);
  };

  const saveRename = (sessionId: string) => {
    if (editingName.trim() && editingName.trim() !== "") {
      onRenameSession(sessionId, editingName.trim());
    }
    setEditingSessionId(null);
    setEditingName("");
  };

  const cancelEditing = () => {
    setEditingSessionId(null);
    setEditingName("");
  };

  const truncateText = (text: string, maxLength: number): string => {
    if (!text) return "New Chat";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const getSessionName = (session: SessionListItem): string => {
    if (session.chatName) return session.chatName;
    if (session.lastMessage && session.lastMessage !== "New conversation") {
      return truncateText(session.lastMessage, 25);
    }
    return "New Chat";
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
          New Chat
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-2 space-y-1">
            {[1, 2, 3].map((i) => (
              <SessionSkeleton key={i} />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <svg
              className="w-10 h-10 mx-auto mb-2 text-gray-300"
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
            <p className="text-xs">No chats yet</p>
            <p className="text-xs mt-1 text-gray-400">Start a new conversation</p>
          </div>
        ) : (
          <div className="p-1.5 space-y-0.5">
            {sessions.map((session) => (
              <div
                key={session.sessionId}
                className={`group relative p-2.5 rounded-lg cursor-pointer transition-all duration-200 ${currentSessionId === session.sessionId
                  ? "bg-orange-50 border-2 border-orange-300"
                  : "hover:bg-gray-50 border-2 border-transparent"
                  }`}
                onClick={() => onSessionSelect(session.sessionId)}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="flex-1 min-w-0">
                    {editingSessionId === session.sessionId ? (
                      <input
                        ref={inputRef}
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => saveRename(session.sessionId)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            saveRename(session.sessionId);
                          }
                          if (e.key === "Escape") {
                            e.preventDefault();
                            cancelEditing();
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-xs font-semibold text-gray-900 bg-white border-2 border-orange-400 rounded px-1.5 py-0.5 focus:outline-none"
                      />
                    ) : (
                      <p className="text-xs font-semibold text-gray-900 truncate">
                        {getSessionName(session)}
                      </p>
                    )}
                    <span className="text-xs text-gray-400 block mt-0.5">
                      {formatTimestamp(session.updatedAt)}
                    </span>
                  </div>

                  {/* Action buttons - same size, inline */}
                  {editingSessionId !== session.sessionId && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Edit button */}
                      <button
                        onClick={(e) =>
                          startEditing(
                            e,
                            session.sessionId,
                            getSessionName(session)
                          )
                        }
                        className="p-1 hover:bg-orange-100 rounded transition-colors flex-shrink-0"
                        title="Rename chat"
                      >
                        <svg
                          className="w-3.5 h-3.5 text-gray-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </button>

                      {/* Delete button */}
                      <button
                        onClick={(e) =>
                          handleDeleteClick(
                            e,
                            session.sessionId,
                            getSessionName(session)
                          )
                        }
                        className="p-1 hover:bg-red-100 rounded transition-colors flex-shrink-0"
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
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer - Compact */}
      <div className="p-2 border-t-2 border-orange-100 bg-orange-50/50 space-y-2">
        <a
          href="https://github.com/ayuxy027/MasterG"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-full h-8 text-orange-600 hover:text-orange-700 hover:bg-orange-100 rounded-lg transition-all"
          title="View on GitHub"
        >
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
        </a>
        <div className="text-xs text-gray-500 text-center">
          <p className="font-medium text-orange-600">MasterJi</p>
        </div>
      </div>
    </div>
  );
};

export default SessionSidebar;

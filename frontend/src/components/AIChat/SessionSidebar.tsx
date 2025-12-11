import React, { useState } from "react";
import type { SessionListItem } from "../../types/chat";
import { SessionSkeleton } from "../ui/Skeleton";

interface SessionSidebarProps {
  sessions: SessionListItem[];
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
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
    if (days < 7) return `${days} days ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const handleDeleteClick = (sessionId: string, sessionName: string) => {
    onDeleteSession(sessionId); // Call parent handler directly
  };

  const startEditing = (sessionId: string, currentName: string) => {
    e.stopPropagation();
    setEditingSessionId(sessionId);
    setEditingName(currentName);
  };

  const saveRename = (sessionId: string) => {
    if (editingName.trim()) {
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
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <div className="w-64 bg-white/80 backdrop-blur-md border-r-2 border-orange-100 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b-2 border-orange-100">
        <button
          onClick={onNewSession}
          className="w-full bg-gradient-to-r from-orange-400 to-orange-500 text-white px-4 py-2.5 rounded-lg font-medium hover:from-orange-500 hover:to-orange-600 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
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
              className="w-12 h-12 mx-auto mb-2 text-gray-300"
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
                    ? "bg-orange-50 border-2 border-orange-300"
                    : "hover:bg-gray-50 border-2 border-transparent"
                }`}
                onClick={() => onSessionSelect(session.sessionId)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {editingSessionId === session.sessionId ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => saveRename(session.sessionId)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRename(session.sessionId);
                          if (e.key === "Escape") cancelEditing();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="w-full text-sm font-semibold text-gray-900 bg-white border-2 border-orange-400 rounded px-2 py-1 focus:outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-1 mb-1">
                        <p className="text-sm font-semibold text-gray-900 truncate flex-1">
                          {session.chatName ||
                            truncateText(
                              session.lastMessage || "New conversation",
                              30
                            )}
                        </p>
                        <button
                          onClick={(e) =>
                            startEditing(
                              session.sessionId,
                              session.chatName ||
                                session.lastMessage.substring(0, 30),
                              e
                            )
                          }
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-orange-100 rounded transition-opacity"
                          title="Rename chat"
                        >
                          <svg
                            className="w-3 h-3 text-gray-600"
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
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(session.updatedAt)}
                      </span>
                      <span className="text-xs text-gray-300">•</span>
                      <span className="text-xs text-gray-500">
                        {session.messageCount} msg
                      </span>
                    </div>
                  </div>

                  {/* Delete button - shows on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(
                        session.sessionId,
                        session.chatName || session.lastMessage.substring(0, 30)
                      );
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-100 rounded-lg"
                    title="Delete session"
                  >
                    <svg
                      className="w-4 h-4 text-red-500"
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

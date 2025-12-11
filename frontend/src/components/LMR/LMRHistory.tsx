import React, { useEffect, useState } from "react";
import LMRApi, { LMRHistory } from "../../services/lmrApi";

interface LMRHistoryProps {
  userId?: string;
  sessionId?: string;
  onSelectFile?: (fileId: string, fileName: string) => void;
  disabled?: boolean;
}

const LMRHistoryComponent: React.FC<LMRHistoryProps> = ({
  userId,
  sessionId,
  onSelectFile,
  disabled = false,
}) => {
  const [history, setHistory] = useState<LMRHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [userId, sessionId]);

  const loadHistory = async () => {
    if (!userId && !sessionId) return;

    try {
      setIsLoading(true);
      setError("");
      const data = await LMRApi.getHistory(userId, sessionId, 10);
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
      console.error("History load error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this history entry?")) return;

    try {
      setDeletingId(id);
      await LMRApi.deleteHistory(id);
      setHistory((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete history");
      console.error("Delete history error:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border-2 border-orange-200 p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <svg
            className="w-4 h-4 text-orange-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Recent PDFs
        </h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-gray-100 rounded-lg h-16"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border-2 border-orange-200 p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">
          Recent PDFs
        </h3>
        <p className="text-xs text-red-600">{error}</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-xl border-2 border-orange-200 p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <svg
            className="w-4 h-4 text-orange-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Recent PDFs
        </h3>
        <p className="text-xs text-gray-500">
          No history yet. Upload a PDF to get started!
        </p>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-xl border-2 border-orange-200 p-4 ${
        disabled ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <svg
          className="w-4 h-4 text-orange-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Recent PDFs
      </h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {history.map((item) => (
          <div key={item._id} className="relative group">
            <button
              onClick={() => onSelectFile?.(item.fileId, item.fileName)}
              disabled={disabled}
              className="w-full text-left p-3 rounded-lg border border-orange-100 hover:border-orange-300 hover:bg-orange-50 transition-all group-hover:pr-12"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate group-hover:text-orange-600">
                    {item.fileName}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {formatDate(item.createdAt)}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {item.hasSummary && (
                    <div
                      className="w-1.5 h-1.5 bg-green-500 rounded-full"
                      title="Has summary"
                    ></div>
                  )}
                  {item.hasQuestions && (
                    <div
                      className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                      title="Has questions"
                    ></div>
                  )}
                  {item.hasQuiz && (
                    <div
                      className="w-1.5 h-1.5 bg-purple-500 rounded-full"
                      title="Has quiz"
                    ></div>
                  )}
                  {item.hasRecallNotes && (
                    <div
                      className="w-1.5 h-1.5 bg-orange-500 rounded-full"
                      title="Has recall notes"
                    ></div>
                  )}
                </div>
              </div>
            </button>
            <button
              onClick={(e) => handleDelete(item._id, e)}
              disabled={disabled || deletingId === item._id}
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-md bg-red-500 hover:bg-red-600 text-white transition-all disabled:opacity-50"
              title="Delete"
            >
              {deletingId === item._id ? (
                <svg
                  className="w-3 h-3 animate-spin"
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
              ) : (
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LMRHistoryComponent;

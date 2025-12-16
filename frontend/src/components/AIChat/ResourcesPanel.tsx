import React, { useState, useEffect } from "react";
import { getSessionDocuments, deleteFile } from "../../services/chatApi";
import type { FileListItem } from "../../types/chat";
import ConfirmModal from "../ui/ConfirmModal";
import DocumentPreviewModal from "../ui/DocumentPreviewModal";
import { ResourceSkeleton } from "../ui/Skeleton";

interface ResourcesPanelProps {
  userId: string;
  sessionId: string;
}

const ResourcesPanel: React.FC<ResourcesPanelProps> = ({
  userId,
  sessionId,
}) => {
  const [files, setFiles] = useState<FileListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    fileId: string | null;
    fileName: string;
  }>({ isOpen: false, fileId: null, fileName: "" });
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    fileId: string;
    fileName: string;
  }>({ isOpen: false, fileId: "", fileName: "" });
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  useEffect(() => {
    loadFiles();
  }, [sessionId]);

  const loadFiles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filesList = await getSessionDocuments(userId, sessionId);
      setFiles(filesList);
    } catch (err) {
      console.error("Failed to load files:", err);
      setError("Failed to load resources");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (fileId: string, fileName: string) => {
    setConfirmModal({ isOpen: true, fileId, fileName });
  };

  const handleConfirmDelete = async () => {
    if (!confirmModal.fileId) return;

    setDeletingFileId(confirmModal.fileId);
    try {
      await deleteFile(userId, sessionId, confirmModal.fileId);
      setFiles((prev) => prev.filter((f) => f.fileId !== confirmModal.fileId));
    } catch (err) {
      console.error("Failed to delete file:", err);
      setError("Failed to delete file");
    } finally {
      setDeletingFileId(null);
    }
  };

  const getFileIcon = (fileName: string): string => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const icons: Record<string, string> = {
      pdf: "📄",
      txt: "📝",
      doc: "📃",
      docx: "📃",
      ppt: "📊",
      pptx: "📊",
      jpg: "🖼️",
      jpeg: "🖼️",
      png: "🖼️",
      gif: "🖼️",
      webp: "🖼️",
    };
    return icons[ext || ""] || "📎";
  };

  const handlePreviewClick = (file: FileListItem) => {
    setPreviewModal({
      isOpen: true,
      fileId: file.fileId,
      fileName: file.fileName,
    });
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-white to-orange-50/30">
        <div className="p-6 border-b-2 border-orange-100 bg-white/50">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Session Resources
          </h2>
          <p className="text-sm text-gray-600">
            Documents uploaded in this chat session
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <ResourceSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-b from-white to-orange-50/30">
        <div className="text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={loadFiles}
            className="mt-4 px-4 py-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white to-orange-50/30 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b-2 border-orange-100 bg-white/50">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Session Resources
        </h2>
        <p className="text-sm text-gray-600">
          Documents uploaded in this chat session
        </p>
      </div>

      {/* Files List */}
      <div className="flex-1 overflow-y-auto p-6">
        {files.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="w-20 h-20 mx-auto mb-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            <p className="text-gray-500 font-medium mb-2">No resources yet</p>
            <p className="text-sm text-gray-400">
              Upload documents in the chat to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((file) => (
              <div
                key={file.fileId}
                className="bg-white/80 backdrop-blur-md rounded-xl p-4 border-2 border-orange-100 hover:border-orange-300 hover:shadow-lg transition-all duration-200"
              >
                {/* File Icon & Name */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="text-3xl flex-shrink-0">
                    {getFileIcon(file.fileName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-medium text-gray-800 truncate"
                      title={file.fileName}
                    >
                      {file.fileName}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {file.pageCount} {file.pageCount === 1 ? "page" : "pages"}
                    </p>
                  </div>
                </div>

                {/* File Metadata */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs">
                    <svg
                      className="w-4 h-4 text-gray-400"
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
                    <span className="text-gray-600 capitalize">
                      {file.language}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <svg
                      className="w-4 h-4 text-gray-400"
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
                    <span className="text-gray-600">
                      {new Date(file.uploadedAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {/* View Button */}
                  <button
                    className="flex-1 px-3 py-2 rounded-lg transition-colors text-sm font-medium border flex items-center justify-center bg-orange-50 text-orange-600 hover:bg-orange-100 border-orange-200"
                    onClick={() => handlePreviewClick(file)}
                    title="Preview file"
                  >
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    View
                  </button>

                  {/* Delete Button */}
                  <button
                    className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium border flex items-center justify-center ${deletingFileId === file.fileId
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                      : "bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                      }`}
                    onClick={() =>
                      handleDeleteClick(file.fileId, file.fileName)
                    }
                    disabled={deletingFileId === file.fileId}
                    title="Delete file"
                  >
                    {deletingFileId === file.fileId ? (
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {files.length > 0 && (
        <div className="p-4 border-t-2 border-orange-100 bg-orange-50/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {files.length} {files.length === 1 ? "document" : "documents"}{" "}
              uploaded
            </span>
            <span className="text-gray-600">
              {files.reduce((sum, f) => sum + f.pageCount, 0)} total pages
            </span>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() =>
          setConfirmModal({ isOpen: false, fileId: null, fileName: "" })
        }
        onConfirm={handleConfirmDelete}
        title="Delete Document?"
        message={`Are you sure you want to delete "${confirmModal.fileName}"? This will remove all associated chunks from the vector database.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={previewModal.isOpen}
        onClose={() =>
          setPreviewModal({ isOpen: false, fileId: "", fileName: "" })
        }
        fileId={previewModal.fileId}
        fileName={previewModal.fileName}
        userId={userId}
        sessionId={sessionId}
      />
    </div>
  );
};

export default ResourcesPanel;

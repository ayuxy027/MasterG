import React, { useState, useEffect } from "react";
import { ViewerRouter, getViewerTypeFromExtension, type ViewerType } from "../viewers";

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  fileId: string;
  userId: string;
  sessionId: string;
  mimeType?: string;
}

// API_BASE_URL should NOT include /api suffix (consistent with chatApi.ts)
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  fileName,
  fileId,
  userId,
  sessionId,
  mimeType,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [textContent, setTextContent] = useState<string | undefined>();

  // Build file URL - note: /api prefix is added here
  const fileUrl = `${API_BASE_URL}/api/files/${fileId}?userId=${encodeURIComponent(userId)}&sessionId=${encodeURIComponent(sessionId)}`;

  // Debug log
  console.log(`📄 Preview URL: ${fileUrl}`);

  // Determine viewer type
  const viewerType: ViewerType = mimeType
    ? getViewerTypeFromMime(mimeType)
    : getViewerTypeFromExtension(fileName);

  // For text files, fetch content separately
  useEffect(() => {
    if (isOpen && viewerType === 'text') {
      fetchTextContent();
    }
  }, [isOpen, viewerType]);

  const fetchTextContent = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/files/${fileId}/content?userId=${encodeURIComponent(userId)}&sessionId=${encodeURIComponent(sessionId)}`);
      if (response.ok) {
        const data = await response.json();
        setTextContent(data.content);
      }
    } catch (error) {
      console.error('Failed to fetch text content:', error);
    }
  };

  const getFileIcon = () => {
    const icons: Record<ViewerType, React.ReactNode> = {
      pdf: (
        <svg className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zm-3 9c0 1.66-1.34 3-3 3v-6C8.66 10 10 11.34 10 13zm3-3h2.5c.83 0 1.5.67 1.5 1.5v1c0 .83-.67 1.5-1.5 1.5H13v2h-1v-6h3.5zm0 3h1.5v-1H13v1z" />
        </svg>
      ),
      text: (
        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      docx: (
        <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM7 15h2l.5 2.5L10 15h2l-1.5 5h-2L7 15z" />
        </svg>
      ),
      ppt: (
        <svg className="w-6 h-6 text-orange-600" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM9 15v-4h2c1.1 0 2 .9 2 2s-.9 2-2 2H9zm2-2v1h-1v-2h1v1z" />
        </svg>
      ),
      image: (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      unknown: (
        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    };
    return icons[viewerType];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div
        className={`bg-white rounded-2xl shadow-2xl flex flex-col animate-scaleIn transition-all duration-300 ${isFullscreen ? 'w-full h-full' : 'w-full max-w-6xl h-[90vh]'
          }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-orange-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              {getFileIcon()}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 truncate max-w-md" title={fileName}>
                {fileName}
              </h3>
              <p className="text-xs text-gray-500 capitalize">{viewerType} Document</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Download Button */}
            <a
              href={fileUrl}
              download={fileName}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Download"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative">
          <ViewerRouter
            url={fileUrl}
            fileName={fileName}
            fileType={viewerType}
            textContent={textContent}
          />
        </div>

        {/* Footer */}
        <div className="p-3 border-t-2 border-orange-100 bg-orange-50/50">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>File ID: {fileId.substring(0, 16)}...</span>
            <span className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${viewerType !== 'unknown' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              {viewerType !== 'unknown' ? 'Preview Available' : 'Download Only'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to get viewer type from MIME
function getViewerTypeFromMime(mimeType: string): ViewerType {
  const mimeMap: Record<string, ViewerType> = {
    'application/pdf': 'pdf',
    'text/plain': 'text',
    'application/msword': 'docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'ppt',
    'image/jpeg': 'image',
    'image/jpg': 'image',
    'image/png': 'image',
    'image/gif': 'image',
    'image/webp': 'image',
  };
  return mimeMap[mimeType] || 'unknown';
}

export default DocumentPreviewModal;

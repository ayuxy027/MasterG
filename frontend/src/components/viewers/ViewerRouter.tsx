import React from 'react';
import PDFViewer from './PDFViewer';
import TextViewer from './TextViewer';
import ImageViewer from './ImageViewer';
import DocViewer from './DocViewer';

export type ViewerType = 'pdf' | 'text' | 'docx' | 'ppt' | 'image' | 'unknown';

interface ViewerRouterProps {
    url: string;
    fileName: string;
    fileType: ViewerType;
    textContent?: string;
}

/**
 * Get viewer type from MIME type
 */
export const getViewerType = (mimeType: string): ViewerType => {
    const mimeMap: Record<string, ViewerType> = {
        'application/pdf': 'pdf',
        'text/plain': 'text',
        'application/msword': 'docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/vnd.ms-powerpoint': 'ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'ppt',
        // Image types
        'image/jpeg': 'image',
        'image/jpg': 'image',
        'image/png': 'image',
        'image/gif': 'image',
        'image/webp': 'image',
        'image/bmp': 'image',
        'image/svg+xml': 'image',
        'image/tiff': 'image',
        'image/x-icon': 'image',
        'image/avif': 'image',
        'image/heic': 'image',
        'image/heif': 'image',
    };
    return mimeMap[mimeType] || 'unknown';
};

/**
 * Get viewer type from file extension
 */
export const getViewerTypeFromExtension = (fileName: string): ViewerType => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const extMap: Record<string, ViewerType> = {
        'pdf': 'pdf',
        'txt': 'text',
        'doc': 'docx',
        'docx': 'docx',
        'ppt': 'ppt',
        'pptx': 'ppt',
        // Image extensions
        'jpg': 'image',
        'jpeg': 'image',
        'jfif': 'image',  // JPEG File Interchange Format
        'jpe': 'image',
        'png': 'image',
        'gif': 'image',
        'webp': 'image',
        'bmp': 'image',
        'svg': 'image',
        'ico': 'image',
        'tiff': 'image',
        'tif': 'image',
        'avif': 'image',
        'heic': 'image',
        'heif': 'image',
    };
    return extMap[ext || ''] || 'unknown';
};

/**
 * Viewer Router Component
 * Routes to the appropriate viewer based on file type
 */
const ViewerRouter: React.FC<ViewerRouterProps> = ({ url, fileName, fileType, textContent }) => {
    switch (fileType) {
        case 'pdf':
            return <PDFViewer url={url} fileName={fileName} />;

        case 'text':
            return <TextViewer url={url} fileName={fileName} content={textContent} />;

        case 'image':
            return <ImageViewer url={url} fileName={fileName} />;

        case 'docx':
            return <DocViewer url={url} fileName={fileName} />;

        case 'ppt':
            return <DocViewer url={url} fileName={fileName} />;

        case 'unknown':
        default:
            return (
                <div className="h-full flex items-center justify-center bg-gray-100">
                    <div className="text-center p-8">
                        <div className="w-20 h-20 mx-auto mb-6 bg-gray-200 rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                            Preview Not Available
                        </h3>
                        <p className="text-gray-600 mb-4">
                            This file type cannot be previewed in the browser.
                        </p>
                        <a
                            href={url}
                            download={fileName}
                            className="inline-flex items-center gap-2 px-6 py-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download File
                        </a>
                    </div>
                </div>
            );
    }
};

export default ViewerRouter;

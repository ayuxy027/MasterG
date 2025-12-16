import React, { useState, useEffect, useRef } from 'react';

// Import PDFViewer for displaying converted PPT previews
import PDFViewer from './PDFViewer';

interface DocViewerProps {
    url: string;
    fileName: string;
}

/**
 * Document Viewer Component
 * - DOCX: Uses docx-preview library for native rendering
 * - PPT/PPTX: 
 *   1. Tries to load converted PDF preview (if LibreOffice was available)
 *   2. Falls back to extracted text preview
 * - DOC: Falls back to download option
 */
const DocViewer: React.FC<DocViewerProps> = ({ url, fileName }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [textContent, setTextContent] = useState<string | null>(null);
    const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const ext = fileName.toLowerCase().split('.').pop() || '';

    useEffect(() => {
        if (ext === 'docx') {
            renderDocx();
        } else if (ext === 'pptx' || ext === 'ppt') {
            // Try PDF preview first, then fall back to text
            tryPdfPreview();
        } else if (ext === 'doc') {
            setIsLoading(false);
            setError('Legacy .doc format requires Microsoft Word. Please download the file.');
        } else {
            setIsLoading(false);
        }
    }, [url, ext]);

    /**
     * Try to load converted PDF preview for PPT files
     */
    const tryPdfPreview = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Build preview URL: /api/files/{fileId}/preview?...
            const urlParts = url.split('?');
            const baseUrl = urlParts[0];
            const queryParams = urlParts[1] || '';
            const previewUrl = `${baseUrl}/preview?${queryParams}`;

            console.log('🔍 Checking for PDF preview:', previewUrl);

            // Check if preview PDF exists
            const response = await fetch(previewUrl, { method: 'HEAD' });

            if (response.ok) {
                console.log('✅ PDF preview available');
                setPreviewPdfUrl(previewUrl);
                setIsLoading(false);
                return;
            }

            // No PDF preview, fall back to text content
            console.log('⚠️ No PDF preview, falling back to text');
            await fetchTextContent();

        } catch (err: any) {
            console.error('Preview check error:', err);
            // Fall back to text content
            await fetchTextContent();
        }
    };

    const renderDocx = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch document');

            const blob = await response.blob();

            try {
                const docxPreview = await import('docx-preview');

                if (containerRef.current) {
                    containerRef.current.innerHTML = '';
                    await docxPreview.renderAsync(blob, containerRef.current, undefined, {
                        className: 'docx-preview',
                        inWrapper: true,
                        ignoreWidth: false,
                        ignoreHeight: false,
                        ignoreFonts: false,
                        breakPages: true,
                        debug: false,
                    });
                }
                setIsLoading(false);
            } catch (importError: any) {
                console.error('docx-preview not available:', importError);
                await fetchTextContent();
            }
        } catch (err: any) {
            console.error('DOCX render error:', err);
            setError(err.message || 'Failed to render document');
            setIsLoading(false);
        }
    };

    const fetchTextContent = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const urlParts = url.split('?');
            const baseUrl = urlParts[0];
            const queryParams = urlParts[1] || '';
            const textContentUrl = `${baseUrl}/text?${queryParams}`;

            console.log('Fetching text content from:', textContentUrl);

            const response = await fetch(textContentUrl);

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.content) {
                    setTextContent(data.content);
                    setIsLoading(false);
                    return;
                }
            }

            setError('Preview not available for this document type. Please download to view.');
            setIsLoading(false);
        } catch (err: any) {
            console.error('Text content fetch error:', err);
            setError('Could not load document preview');
            setIsLoading(false);
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading {ext.toUpperCase()} document...</p>
                    <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
                </div>
            </div>
        );
    }

    // PDF Preview available (converted from PPT)
    if (previewPdfUrl) {
        return (
            <div className="h-full">
                {/* PDF Viewer - no header since modal provides one */}
                <PDFViewer url={previewPdfUrl} fileName={`${fileName}.pdf`} />
            </div>
        );
    }

    // Error state with download option
    if (error) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center p-6 max-w-md">
                    <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <p className="text-gray-700 font-medium mb-2">{error}</p>
                    <a
                        href={url}
                        download={fileName}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-orange-400 text-white rounded-lg hover:bg-orange-500 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download {fileName}
                    </a>
                </div>
            </div>
        );
    }

    // PPT/Text content view (fallback when no PDF preview)
    if (textContent) {
        return (
            <div className="h-full flex flex-col bg-white overflow-auto">
                {/* Content - no header since modal provides one */}
                <div className="flex-1 p-6 bg-gray-50">
                    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8">
                        <div className="prose prose-lg max-w-none">
                            {textContent.split('\n\n').map((paragraph, idx) => (
                                <p key={idx} className="text-gray-700 mb-4 whitespace-pre-wrap leading-relaxed">
                                    {paragraph}
                                </p>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // DOCX rendered view
    return (
        <div className="h-full flex flex-col bg-white overflow-hidden">
            {/* DOCX Preview Container - no header since modal provides one */}
            <div
                ref={containerRef}
                className="flex-1 overflow-auto p-4 docx-container"
                style={{ backgroundColor: '#f5f5f5' }}
            />

            {/* Styles for docx-preview */}
            <style>{`
                .docx-container .docx-wrapper {
                    background: white;
                    padding: 30px;
                    margin: 0 auto;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    max-width: 900px;
                }
                .docx-container section.docx {
                    margin-bottom: 20px;
                }
            `}</style>
        </div>
    );
};

export default DocViewer;

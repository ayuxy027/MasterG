import React, { useState, useEffect, useRef } from 'react';

interface PDFViewerProps {
    url: string;
    fileName: string;
}

/**
 * PDF Viewer Component
 * Uses object/embed tags for better PDF rendering
 * Falls back to iframe if object fails
 */
const PDFViewer: React.FC<PDFViewerProps> = ({ url, fileName }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [useIframe, setUseIframe] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Set a timeout to detect if PDF fails to load
    useEffect(() => {
        setIsLoading(true);
        setError(null);

        // Give the PDF 5 seconds to load before showing content
        timeoutRef.current = setTimeout(() => {
            setIsLoading(false);
        }, 3000);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [url]);

    const handleLoad = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsLoading(false);
    };

    const handleError = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        if (!useIframe) {
            // Try iframe as fallback
            setUseIframe(true);
            setIsLoading(true);
        } else {
            setIsLoading(false);
            setError('Failed to load PDF. Try downloading it instead.');
        }
    };

    // Create PDF URL with proper type hint
    const pdfUrl = url.includes('?') ? url : `${url}#toolbar=1&navpanes=1`;

    return (
        <div className="h-full flex flex-col bg-gray-100" ref={containerRef}>
            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50/90 z-10">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading PDF...</p>
                        <p className="text-sm text-gray-500 mt-2">This may take a moment for large files</p>
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                    <div className="text-center p-6">
                        <svg className="w-16 h-16 mx-auto mb-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-gray-700 font-medium mb-2">{error}</p>
                        <a
                            href={url}
                            download={fileName}
                            className="inline-flex items-center gap-2 px-6 py-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download PDF
                        </a>
                    </div>
                </div>
            )}

            {/* PDF Viewer - try object first, then iframe */}
            {!useIframe ? (
                <object
                    data={pdfUrl}
                    type="application/pdf"
                    className="w-full h-full"
                    onLoad={handleLoad}
                    onError={handleError}
                >
                    {/* Fallback for browsers that don't support object */}
                    <embed
                        src={pdfUrl}
                        type="application/pdf"
                        className="w-full h-full"
                    />
                </object>
            ) : (
                <iframe
                    src={pdfUrl}
                    className="w-full h-full border-0"
                    title={fileName}
                    onLoad={handleLoad}
                    onError={handleError}
                />
            )}
        </div>
    );
};

export default PDFViewer;

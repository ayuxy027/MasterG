import React, { useState, useEffect } from 'react';

interface TextViewerProps {
    url: string;
    content?: string;
    fileName: string;
}

/**
 * Text Viewer Component
 * Displays plain text files with line numbers (light theme)
 */
const TextViewer: React.FC<TextViewerProps> = ({ url, content: initialContent, fileName }) => {
    const [content, setContent] = useState<string>(initialContent || '');
    const [isLoading, setIsLoading] = useState(!initialContent);
    const [error, setError] = useState<string | null>(null);
    const [showLineNumbers, setShowLineNumbers] = useState(true);

    useEffect(() => {
        if (!initialContent && url) {
            fetchContent();
        }
    }, [url, initialContent]);

    const fetchContent = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to load file');
            const text = await response.text();
            setContent(text);
        } catch (err: any) {
            setError(err.message || 'Failed to load content');
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(content);
    };

    const lines = content.split('\n');

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading file...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-red-600 font-medium">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-200">
                <div className="flex items-center gap-4">
                    <span className="text-gray-700 text-sm font-medium truncate max-w-xs" title={fileName}>{fileName}</span>
                    <span className="text-gray-400 text-sm">|</span>
                    <span className="text-gray-500 text-sm">{lines.length} lines</span>
                    <button
                        onClick={() => setShowLineNumbers(!showLineNumbers)}
                        className={`text-xs px-2 py-1 rounded ${showLineNumbers ? 'bg-orange-400 text-white' : 'bg-gray-200 text-gray-600'}`}
                    >
                        Line Numbers
                    </button>
                </div>
                <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-sm"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto bg-gray-50">
                <pre className="p-4 text-sm font-mono text-gray-700 leading-relaxed">
                    {showLineNumbers ? (
                        <table className="w-full">
                            <tbody>
                                {lines.map((line, idx) => (
                                    <tr key={idx} className="hover:bg-gray-100">
                                        <td className="text-right text-gray-400 pr-4 select-none w-12 align-top border-r border-gray-200">
                                            {idx + 1}
                                        </td>
                                        <td className="pl-4 whitespace-pre-wrap break-all">{line || ' '}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        content
                    )}
                </pre>
            </div>
        </div>
    );
};

export default TextViewer;

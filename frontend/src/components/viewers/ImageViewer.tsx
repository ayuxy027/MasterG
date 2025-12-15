import React, { useState } from 'react';

interface ImageViewerProps {
    url: string;
    fileName: string;
}

/**
 * Image Viewer Component
 * Displays images with zoom and pan functionality
 */
const ImageViewer: React.FC<ImageViewerProps> = ({ url, fileName }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 5));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.25));
    const handleReset = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setScale(prev => Math.min(Math.max(prev + delta, 0.25), 5));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    if (error) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-red-600 font-medium">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-gray-800">
            {/* Toolbar */}
            <div className="flex items-center justify-center gap-2 p-3 bg-gray-900 border-b border-gray-700">
                <button
                    onClick={handleZoomOut}
                    className="p-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                    title="Zoom Out"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                </button>

                <span className="px-3 py-1 bg-gray-700 text-white rounded text-sm min-w-[80px] text-center">
                    {Math.round(scale * 100)}%
                </span>

                <button
                    onClick={handleZoomIn}
                    className="p-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                    title="Zoom In"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>

                <button
                    onClick={handleReset}
                    className="p-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors ml-2"
                    title="Reset"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {/* Image Container */}
            <div
                className="flex-1 overflow-hidden flex items-center justify-center bg-checkered cursor-grab active:cursor-grabbing"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800/80 z-10">
                        <div className="w-12 h-12 border-4 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                <img
                    src={url}
                    alt={fileName}
                    className="max-w-none transition-transform duration-100"
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    }}
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                        setIsLoading(false);
                        setError('Failed to load image');
                    }}
                    draggable={false}
                />
            </div>

            {/* Hint */}
            <div className="p-2 bg-gray-900 text-center text-gray-500 text-xs">
                Scroll to zoom • Drag to pan
            </div>

            <style>{`
        .bg-checkered {
          background-image: 
            linear-gradient(45deg, #374151 25%, transparent 25%),
            linear-gradient(-45deg, #374151 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #374151 75%),
            linear-gradient(-45deg, transparent 75%, #374151 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
          background-color: #1f2937;
        }
      `}</style>
        </div>
    );
};

export default ImageViewer;

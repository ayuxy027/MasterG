import React from 'react';

interface DottedBackgroundProps {
    className?: string;
    offsetX?: number;
    offsetY?: number;
}

const DottedBackground: React.FC<DottedBackgroundProps> = ({ className = '', offsetX = 0, offsetY = 0 }) => {
    // Dotted background stays FIXED - does not zoom with canvas
    // Only pans to follow the viewport movement
    return (
        <div
            className={`fixed inset-0 pointer-events-none ${className}`}
            style={{
                backgroundImage: 'radial-gradient(circle, #F97316 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                backgroundPosition: `${offsetX % 20}px ${offsetY % 20}px`,
                backgroundRepeat: 'repeat',
                opacity: 0.15,
                zIndex: 0,
            }}
        />
    );
};

export default DottedBackground;


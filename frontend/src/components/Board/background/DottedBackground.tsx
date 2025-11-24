import React from 'react';

interface DottedBackgroundProps {
    className?: string;
    offsetX?: number;
    offsetY?: number;
    zoom?: number;
}

const DottedBackground: React.FC<DottedBackgroundProps> = ({ className = '', offsetX = 0, offsetY = 0, zoom = 1 }) => {
    return (
        <div
            className={`fixed inset-0 pointer-events-none ${className}`}
            style={{
                backgroundImage: `
          radial-gradient(circle, #F97316 1px, transparent 1px)
        `,
                backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
                backgroundPosition: `${offsetX}px ${offsetY}px`,
                backgroundRepeat: 'repeat',
                opacity: 0.15,
                zIndex: 0,
                willChange: 'transform'
            }}
        />
    );
};

export default DottedBackground;


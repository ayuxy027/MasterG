import { Tool } from './types';
import { Eraser } from 'lucide-react';

export const EraserTool: Tool = {
    id: 'eraser',
    name: 'Eraser',
    cursor: Eraser,
    getStrokeWidth: (baseWidth: number) => {
        const cursorSize = Math.max(20, baseWidth * 2);
        return cursorSize; // Use the full cursor size as stroke width for complete coverage
    },
    getStrokeStyle: () => 'rgba(0,0,0,1)',
    getCompositeOperation: () => 'destination-out' as GlobalCompositeOperation,
    getAlpha: () => 1
};


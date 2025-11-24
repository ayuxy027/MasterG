import { Tool } from './types';
import { Pen } from 'lucide-react';

export const PenTool: Tool = {
    id: 'pen',
    name: 'Pen',
    cursor: Pen,
    getStrokeWidth: (baseWidth: number) => Math.max(1, baseWidth * 0.6),
    getStrokeStyle: (color: string) => color,
    getCompositeOperation: () => 'source-over' as GlobalCompositeOperation,
    getAlpha: () => 0.85
};

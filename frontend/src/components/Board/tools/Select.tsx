import { Tool } from './types';
import { MousePointer2 } from 'lucide-react';

export const SelectTool: Tool = {
    id: 'select',
    name: 'Select',
    cursor: MousePointer2,
    getStrokeWidth: () => 0, // Not used for select
    getStrokeStyle: () => '', // Not used for select
    getCompositeOperation: () => 'source-over' as GlobalCompositeOperation, // Not used for select
    getAlpha: () => 1 // Not used for select
};


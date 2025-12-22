import { Tool } from './types';
import { LuWrench } from 'react-icons/lu';

export const OperateTool: Tool = {
    id: 'operate',
    name: 'Operate',
    cursor: LuWrench,
    getStrokeWidth: () => 0, // Not used for operate
    getStrokeStyle: () => '', // Not used for operate
    getCompositeOperation: () => 'source-over' as GlobalCompositeOperation, // Not used for operate
    getAlpha: () => 1 // Not used for operate
};


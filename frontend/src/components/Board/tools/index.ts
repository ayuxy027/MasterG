export * from './types';
export * from './Pencil';
export * from './Eraser';
export * from './Select';

import { PenTool } from './Pencil';
import { EraserTool } from './Eraser';
import { SelectTool } from './Select';
import { Tool } from './types';

export const tools: Tool[] = [
  PenTool,
  EraserTool,
  SelectTool
];

export const getToolById = (id: string): Tool | undefined => {
  return tools.find(tool => tool.id === id);
};


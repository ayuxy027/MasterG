export interface Point {
  x: number;
  y: number;
}

export interface DrawingPath {
  points: Point[];
  color: string;
  strokeWidth: number;
  tool: string;
}

export interface ToolProps {
  currentColor: string;
  strokeWidth: number;
  isDrawing: boolean;
  currentPath: Point[];
  onPathUpdate: (path: Point[]) => void;
  onPathComplete: (path: DrawingPath) => void;
  getMousePos: (e: React.MouseEvent<HTMLCanvasElement>) => Point;
}

export interface Tool {
  id: string;
  name: string;
  cursor?: string | React.ComponentType<{ className?: string }>;
  getStrokeWidth: (baseWidth: number) => number;
  getStrokeStyle: (color: string) => string;
  getCompositeOperation: () => GlobalCompositeOperation;
  getAlpha: () => number;
}


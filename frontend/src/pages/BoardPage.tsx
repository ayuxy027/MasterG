import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { DottedBackground, CanvasToolbar, CanvasDock } from '../components/Board';

interface Point {
  x: number;
  y: number;
}

interface DrawingPath {
  points: Point[];
  color: string;
  strokeWidth: number;
  tool: string;
}

interface StickyNote {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  width: number;
  height: number;
}

interface TextBox {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  enableMarkdown?: boolean;
}

interface BoardPageProps {
  sidebarOpen: boolean;
}

const BoardPage: React.FC<BoardPageProps> = ({ sidebarOpen }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // State management
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [drawingPaths, setDrawingPaths] = useState<DrawingPath[]>([]);
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [currentTool, setCurrentTool] = useState('pen');
  const [currentColor, setCurrentColor] = useState('#F97316'); // Orange theme
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [activeToolbarOption, setActiveToolbarOption] = useState('summarise');

  // Query input state
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Canvas view state (for unlimited scrolling)
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);

  // Navbar state
  const [isNavbarExpanded, setIsNavbarExpanded] = useState(false);

  // Selection/dragging state for strokes
  const [isDraggingStroke, setIsDraggingStroke] = useState(false);
  const [dragStrokeIndex, setDragStrokeIndex] = useState<number | null>(null);
  const [dragStartPoint, setDragStartPoint] = useState<Point | null>(null);
  const [originalStrokePoints, setOriginalStrokePoints] = useState<Point[] | null>(null);

  // Calculate word count
  const getWordCount = (text: string): number => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  // Calculate adaptive TextBox size
  const calculateTextBoxSize = (text: string) => {
    const wordCount = getWordCount(text);
    const charCount = text.length;

    // Base dimensions
    let width = 350;
    let height = 200;

    // Adjust based on content length
    if (wordCount > 50 || charCount > 300) {
      width = 500;
      height = 300;
    } else if (wordCount > 30 || charCount > 200) {
      width = 450;
      height = 250;
    } else if (wordCount > 20 || charCount > 150) {
      width = 400;
      height = 220;
    } else if (wordCount > 10 || charCount > 100) {
      width = 380;
      height = 200;
    }

    // Ensure minimum size
    width = Math.max(width, 300);
    height = Math.max(height, 150);

    return { width, height };
  };

  // Define redrawCanvas before any usage to avoid TDZ
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transform for zoom and pan
    ctx.save();
    ctx.translate(viewOffset.x, viewOffset.y);
    ctx.scale(zoom, zoom);

    // Redraw all paths
    drawingPaths.forEach(path => {
      if (path.points.length < 2) return;

      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Apply tool-specific styles
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.strokeWidth;
      ctx.globalAlpha = 1;

      ctx.moveTo(path.points[0].x, path.points[0].y);
      path.points.forEach(point => {
        ctx.lineTo(point.x, point.y);
      });

      ctx.stroke();
    });

    ctx.restore();
  }, [drawingPaths, viewOffset, zoom]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      redrawCanvas();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, [redrawCanvas]);

  // Redraw when paths change
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - viewOffset.x) / zoom;
    const y = (e.clientY - rect.top - viewOffset.y) / zoom;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getMousePos(e);

    // Select mode: try to pick a stroke to move
    if (currentTool === 'select') {
      for (let i = drawingPaths.length - 1; i >= 0; i--) {
        if (hitTestPath(point, drawingPaths[i])) {
          setIsDraggingStroke(true);
          setDragStrokeIndex(i);
          setDragStartPoint(point);
          setOriginalStrokePoints(drawingPaths[i].points.map(p => ({ x: p.x, y: p.y })));
          redrawCanvas();
          return;
        }
      }
      return;
    }

    if (currentTool === 'sticky-note') {
      // Add sticky note
      const newNote: StickyNote = {
        id: Date.now().toString(),
        x: point.x,
        y: point.y,
        text: '',
        color: '#FFEDD5', // Orange-100 theme
        width: 250,
        height: 180
      };
      setStickyNotes(prev => [...prev, newNote]);
      // Switch back to pen tool after placing a sticky note
      setCurrentTool('pen');
      return;
    }

    if (currentTool === 'text') {
      // Add text box
      const newTextBox: TextBox = {
        id: Date.now().toString(),
        x: point.x,
        y: point.y,
        text: '',
        color: 'transparent', // Default transparent color
        width: 280,
        height: 120,
        fontSize: 16,
        fontFamily: 'Inter',
        isBold: false,
        isItalic: false,
        isUnderline: false
      };
      setTextBoxes(prev => [...prev, newTextBox]);
      // Switch back to pen tool after placing a text box
      setCurrentTool('pen');
      return;
    }

    if (['pen', 'pencil', 'eraser'].includes(currentTool)) {
      setIsDrawing(true);
      setCurrentPath([point]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Handle panning with middle mouse button or shift + click
    if (isPanning) {
      const deltaX = e.movementX;
      const deltaY = e.movementY;
      setViewOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      return;
    }

    // Dragging a stroke in select mode
    if (currentTool === 'select' && isDraggingStroke && dragStrokeIndex !== null && dragStartPoint && originalStrokePoints) {
      const point = getMousePos(e);
      const deltaX = point.x - dragStartPoint.x;
      const deltaY = point.y - dragStartPoint.y;
      const updatedPoints = originalStrokePoints.map(p => ({ x: p.x + deltaX, y: p.y + deltaY }));
      setDrawingPaths(prev => 
        prev.map((path, idx) => 
          idx === dragStrokeIndex ? { ...path, points: updatedPoints } : path
        )
      );
      redrawCanvas(); // Redraw after moving the stroke
      return;
    }

    if (!isDrawing || !['pen', 'pencil', 'eraser'].includes(currentTool)) return;

    const point = getMousePos(e);
    setCurrentPath(prev => [...prev, point]);

    // Draw current stroke
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.translate(viewOffset.x, viewOffset.y);
    ctx.scale(zoom, zoom);

    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Apply tool-specific styles for live drawing
    ctx.globalCompositeOperation = currentTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = currentTool === 'eraser' ? '#FFFFFF' : currentColor;
    ctx.lineWidth = strokeWidth;
    ctx.globalAlpha = 1;

    if (currentPath.length > 0) {
      const lastPoint = currentPath[currentPath.length - 1];
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }

    ctx.restore();
  };

  const handleMouseUp = () => {
    // End panning
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    // End stroke dragging if any
    if (isDraggingStroke) {
      setIsDraggingStroke(false);
      setDragStrokeIndex(null);
      setDragStartPoint(null);
      setOriginalStrokePoints(null);
      return;
    }

    if (!isDrawing) return;

    setIsDrawing(false);

    if (currentPath.length > 1) {
      const newPath: DrawingPath = {
        points: [...currentPath],
        color: currentColor,
        strokeWidth: strokeWidth,
        tool: currentTool
      };

      setDrawingPaths(prev => [...prev, newPath]);
    }

    setCurrentPath([]);
    redrawCanvas(); // Redraw after adding the new path
  };

  const handleToolChange = (tool: string) => {
    setCurrentTool(tool);
  };

  const handleColorChange = (color: string) => {
    setCurrentColor(color);
  };

  const handleStrokeWidthChange = (width: number) => {
    setStrokeWidth(width);
  };

  const handleUndo = () => {
    if (drawingPaths.length > 0) {
      setDrawingPaths(prev => prev.slice(0, -1));
      redrawCanvas();
    }
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear the canvas?')) {
      setDrawingPaths([]);
      setStickyNotes([]);
      setTextBoxes([]);
      redrawCanvas();
    }
  };

  const handleStickyNoteUpdate = (id: string, updates: Partial<StickyNote>) => {
    setStickyNotes(prev => prev.map(note =>
      note.id === id ? { ...note, ...updates } : note
    ));
  };

  const handleStickyNoteDelete = (id: string) => {
    setStickyNotes(prev => prev.filter(note => note.id !== id));
  };

  const handleTextBoxUpdate = (id: string, updates: Partial<TextBox>) => {
    setTextBoxes(prev => prev.map(textBox =>
      textBox.id === id ? { ...textBox, ...updates } : textBox
    ));
  };

  const handleTextBoxDelete = (id: string) => {
    setTextBoxes(prev => prev.filter(textBox => textBox.id !== id));
  };

  const handleToolbarOptionChange = (option: string) => {
    setActiveToolbarOption(option);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-b from-orange-50 via-white to-orange-50">
      {/* Fixed Dotted Background - never zooms */}
      <DottedBackground />

      {/* Minimized Navbar */}
      <div className="absolute top-4 left-2 z-50">
        <button
          onClick={() => setIsNavbarExpanded(!isNavbarExpanded)}
          className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-orange-600 transition-colors"
        >
          {isNavbarExpanded ? 'M' : '☰'}
        </button>
      </div>
      
      {/* Expanded Navbar */}
      {isNavbarExpanded && (
        <div className="absolute top-4 left-4 z-50 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-orange-200 p-4 w-64">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-orange-800">Tools</h3>
            <button
              onClick={() => setIsNavbarExpanded(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { id: 'select', name: 'Select' },
              { id: 'pen', name: 'Pen' },
              { id: 'pencil', name: 'Pencil' },
              { id: 'eraser', name: 'Eraser' },
              { id: 'text', name: 'Text' },
              { id: 'sticky-note', name: 'Note' },
            ].map(tool => (
              <button
                key={tool.id}
                onClick={() => handleToolChange(tool.id)}
                className={`p-3 rounded-lg flex flex-col items-center gap-1 text-sm ${
                  currentTool === tool.id ? 'bg-orange-100 text-orange-700' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="font-medium">{tool.name}</span>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Color</label>
              <input
                type="color"
                value={currentColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="w-full h-8"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Size: {strokeWidth}</label>
              <input
                type="range"
                min="1"
                max="20"
                value={strokeWidth}
                onChange={(e) => handleStrokeWidthChange(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleUndo}
                className="flex-1 p-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 flex items-center justify-center gap-1"
              >
                ↶ Undo
              </button>
              <button
                onClick={handleClear}
                className="flex-1 p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center justify-center gap-1"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back Button */}
      <div className="absolute top-4 right-4 z-40">
        <button
          onClick={() => navigate('/')}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-orange-600 transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          <span>Exit</span>
        </button>
      </div>

      {/* Query Input Section */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40">
        <form onSubmit={(e) => e.preventDefault()} className="flex items-center gap-2">
          <div className="relative">
            <div className="rounded-2xl bg-transparent">
              <div className="rounded-2xl px-4 py-3 backdrop-blur-3xl bg-white/90 shadow-lg border border-orange-200">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type your query to generate cards..."
                  className="w-96 px-4 py-2 bg-transparent border-none outline-none text-orange-900 placeholder-orange-400"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !query.trim()}
                  className="ml-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  {isLoading ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Canvas Toolbar */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-30">
        <CanvasToolbar
          activeOption={activeToolbarOption}
          onOptionChange={handleToolbarOptionChange}
        />
      </div>

      {/* Canvas Container with transform */}
      <div
        ref={containerRef}
        className="absolute inset-0 z-10"
        style={{
          transform: `translate(${viewOffset.x}px, ${viewOffset.y}px) scale(${zoom})`,
          transformOrigin: '0 0'
        }}
      >
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 ${currentTool === 'select' ? 'cursor-pointer' : 'cursor-crosshair'}`}
          style={{
            top: '80px',
            bottom: '80px',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {/* Sticky Notes - transformed with canvas */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          transform: `translate(${viewOffset.x}px, ${viewOffset.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          pointerEvents: currentTool === 'select' ? 'auto' : 'none'
        }}
      >
        {stickyNotes.map(note => (
          <div key={note.id} style={{ pointerEvents: 'auto' }}>
            <div 
              style={{
                position: 'absolute',
                left: note.x,
                top: note.y,
                width: note.width,
                height: note.height,
                backgroundColor: note.color,
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: '8px',
                padding: '12px',
                zIndex: 20,
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              }}
            >
              <textarea
                value={note.text}
                onChange={(e) => handleStickyNoteUpdate(note.id, { text: e.target.value })}
                placeholder="Write your note here..."
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '14px',
                  fontFamily: 'Inter',
                  fontWeight: 'normal',
                }}
              />
              <button
                onClick={() => handleStickyNoteDelete(note.id)}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: '#888',
                }}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Text Boxes - transformed with canvas */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          transform: `translate(${viewOffset.x}px, ${viewOffset.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          pointerEvents: currentTool === 'select' ? 'auto' : 'none'
        }}
      >
        {textBoxes.map(textBox => (
          <div key={textBox.id} style={{ pointerEvents: 'auto' }}>
            <div
              style={{
                position: 'absolute',
                left: textBox.x,
                top: textBox.y,
                width: textBox.width,
                height: textBox.height,
                backgroundColor: textBox.color,
                border: textBox.color === 'transparent' ? '1px dashed rgba(0,0,0,0.3)' : '1px solid rgba(0,0,0,0.1)',
                borderRadius: '8px',
                padding: '12px',
                zIndex: 20,
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              }}
            >
              <textarea
                value={textBox.text}
                onChange={(e) => handleTextBoxUpdate(textBox.id, { text: e.target.value })}
                placeholder="Add text here..."
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  backgroundColor: 'transparent',
                  fontSize: `${textBox.fontSize}px`,
                  fontFamily: textBox.fontFamily,
                  fontWeight: textBox.isBold ? 'bold' : 'normal',
                  fontStyle: textBox.isItalic ? 'italic' : 'normal',
                }}
              />
              <button
                onClick={() => handleTextBoxDelete(textBox.id)}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(255, 255, 255, 0.8)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Canvas Dock */}
      <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 z-40 transition-[margin] duration-300 ${sidebarOpen ? 'ml-[80px]' : 'ml-[10px]'}`}>
        <div className="relative">
          {/* Outer gradient border for premium matte ring */}
          <div className="rounded-2xl bg-transparent">
            {/* Inner frosted glass panel */}
            <div className="rounded-2xl backdrop-blur-3xl bg-white/90 border border-orange-200 shadow-sm">
              <div className="flex items-center justify-between gap-8 px-6 py-4">
                {/* Left Section - Primary Tools */}
                <div className="flex items-center gap-2">
                  {[
                    { id: 'select', name: 'Select' },
                    { id: 'pen', name: 'Pen' },
                    { id: 'pencil', name: 'Pencil' },
                    { id: 'eraser', name: 'Eraser' },
                    { id: 'text', name: 'Text' },
                    { id: 'sticky-note', name: 'Note' },
                  ].map(tool => (
                    <button
                      key={tool.id}
                      onClick={() => handleToolChange(tool.id)}
                      className={`group flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 ${
                        currentTool === tool.id 
                          ? 'bg-black/10 text-black shadow-[0_8px_24px_rgba(0,0,0,0.10)]' 
                          : 'text-black hover:bg-black/5'
                      }`}
                      title={tool.name}
                      style={{ transform: currentTool === tool.id ? 'translateY(-1px)' : 'translateY(0px)' }}
                    >
                      <span className="text-xs font-medium opacity-80">{tool.name}</span>
                    </button>
                  ))}
                </div>

                {/* Center Section - Color and Size */}
                <div className="flex items-center gap-6">
                  {/* Color Picker */}
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎨</span>
                    <input
                      type="color"
                      value={currentColor}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                    />
                  </div>

                  {/* Stroke Width */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-black font-medium">Size</span>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={strokeWidth}
                      onChange={(e) => handleStrokeWidthChange(Number(e.target.value))}
                      className="w-24 accent-black"
                    />
                    <span className="text-sm text-black w-6 font-semibold tabular-nums">{strokeWidth}</span>
                  </div>
                </div>

                {/* Right Section - Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleUndo}
                    className="flex items-center gap-2 px-3 py-2 text-black hover:bg-black/5 rounded-xl transition-all duration-300"
                    title="Undo"
                  >
                    ↶
                    <span className="text-sm font-medium">Undo</span>
                  </button>
                  <button
                    onClick={handleClear}
                    className="flex items-center gap-2 px-3 py-2 text-black hover:bg-black/5 rounded-xl transition-all duration-300"
                    title="Clear Canvas"
                  >
                    🗑
                    <span className="text-sm font-medium">Clear</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoardPage;

// Helper for hit testing paths
function hitTestPath(point: Point, path: DrawingPath): boolean {
  const tolerance = Math.max(8, path.strokeWidth + 6);
  for (let i = 0; i < path.points.length - 1; i++) {
    const distance = distancePointToSegment(point, path.points[i], path.points[i + 1]);
    if (distance <= tolerance) {
      return true;
    }
  }
  return false;
}

// Helper to calculate distance from point to line segment
function distancePointToSegment(p: Point, v: Point, w: Point): number {
  const l2 = (w.x - v.x) * (w.x - v.x) + (w.y - v.y) * (w.y - v.y);
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  const proj = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
  return Math.hypot(p.x - proj.x, p.y - proj.y);
}
import React, { useState, useRef } from 'react';
import { LuSettings } from 'react-icons/lu';
import MarkdownRenderer from '../../ui/MarkdownRenderer';

interface StickyNoteProps {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  width: number;
  height: number;
  enableMarkdown?: boolean;
  selectionMode?: boolean;
  ruled?: boolean;
  fontSize?: number;
  fontFamily?: string;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  zoom?: number;
  onUpdate: (id: string, updates: Partial<StickyNoteProps>) => void;
  onDelete: (id: string) => void;
}

const StickyNote: React.FC<StickyNoteProps> = ({
  id,
  x,
  y,
  text,
  color,
  width,
  height,
  enableMarkdown = false,
  selectionMode = false,
  ruled = false,
  fontSize = 14,
  fontFamily = 'Inter',
  isBold = false,
  isItalic = false,
  isUnderline = false,
  zoom = 1,
  onUpdate,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const noteRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Simple color options
  const colors = [
    '#FFE4B5', // peach
    '#FFB6C1', // light pink
    '#F0E68C', // khaki
    '#98FB98', // pale green
    '#87CEEB', // sky blue
    '#DDA0DD', // plum
    '#F5DEB3', // wheat
    '#E6E6FA', // lavender
  ];

  // Simple drag handling (with zoom support)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!selectionMode) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setStartPos({ x, y });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    // Account for zoom when calculating delta
    const deltaX = (e.clientX - dragStart.x) / zoom;
    const deltaY = (e.clientY - dragStart.y) / zoom;
    onUpdate(id, { x: startPos.x + deltaX, y: startPos.y + deltaY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Simple resize handling
  const handleResizeStart = (e: React.MouseEvent) => {
    if (!selectionMode) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing) return;
    const rect = noteRef.current?.getBoundingClientRect();
    if (!rect) return;
    const newWidth = Math.max(150, e.clientX - rect.left);
    const newHeight = Math.max(100, e.clientY - rect.top);
    onUpdate(id, { width: newWidth, height: newHeight });
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
  };

  // Simple text editing
  const handleClick = () => {
    if (selectionMode) return;
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(id, { text: e.target.value });
  };

  const handleTextBlur = () => setIsEditing(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setIsEditing(false);
  };

  // Simple settings
  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSettings(!showSettings);
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (noteRef.current && !noteRef.current.contains(e.target as Node)) {
      setShowSettings(false);
    }
  };

  // Simple event listeners
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart.x, dragStart.y, id, onUpdate]);

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, id, onUpdate]);

  React.useEffect(() => {
    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSettings]);

  return (
    <div
      ref={noteRef}
      className={`absolute select-none ${selectionMode ? 'cursor-move' : ''}`}
      style={{ left: x, top: y, width, height, zIndex: 20 }}
      onMouseDown={handleMouseDown}
    >
      {/* Settings Button */}
      {selectionMode && (
        <button
          className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full shadow-md border border-gray-200 flex items-center justify-center hover:bg-gray-50 z-30"
          onClick={handleSettingsClick}
          title="Settings"
        >
          <LuSettings size={12} className="text-gray-600" />
        </button>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div 
          className="absolute top-8 right-0 bg-white rounded-md shadow-lg p-3 border border-gray-200 min-w-[180px]" 
          style={{ zIndex: 99999 }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-3">
            {/* Color Picker */}
            <div>
              <label className="block text-xs text-gray-700 mb-1">Color</label>
              <div className="grid grid-cols-4 gap-1">
                {colors.map((colorOption) => (
                  <button
                    key={colorOption}
                    className={`w-6 h-6 rounded-full border ${color === colorOption ? 'border-gray-700' : 'border-gray-200'}`}
                    style={{ backgroundColor: colorOption }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdate(id, { color: colorOption });
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    title={colorOption}
                  />
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-xs text-gray-700 mb-1">Text Size</label>
              <select
                value={fontSize}
                onChange={(e) => {
                  e.stopPropagation();
                  onUpdate(id, { fontSize: Number(e.target.value) });
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                style={{ zIndex: 999999 }}
              >
                {[12, 14, 16, 18, 20, 24].map((size) => (
                  <option key={size} value={size}>{size}px</option>
                ))}
              </select>
            </div>

            {/* Ruled Lines Toggle */}
            <div>
              <label className="flex items-center justify-between text-xs text-gray-700 mb-1">
                <span>Ruled Lines</span>
                <button
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${ruled ? 'bg-orange-500' : 'bg-gray-300'
                    }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate(id, { ruled: !ruled });
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  title={ruled ? 'Disable ruled lines' : 'Enable ruled lines'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${ruled ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                  />
                </button>
              </label>
            </div>

            {/* Delete */}
            <button
              className="w-full text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Delete this note?')) {
                  onDelete(id);
                }
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div
        className="relative h-full cursor-text rounded-lg overflow-hidden"
        style={{
          backgroundColor: color,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          padding: ruled ? '16px 16px 16px 16px' : '16px',
          backgroundImage: ruled
            ? `repeating-linear-gradient(
                to bottom,
                transparent 0px,
                transparent ${Math.max(fontSize * 1.5, 21)}px,
                rgba(0, 0, 0, 0.08) ${Math.max(fontSize * 1.5, 21)}px,
                rgba(0, 0, 0, 0.08) ${Math.max(fontSize * 1.5, 21) + 1}px
              )`
            : 'none',
          backgroundPosition: ruled ? '0 16px' : '0 0'
        }}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onBlur={handleTextBlur}
            onKeyDown={handleKeyDown}
            className="w-full h-full bg-transparent border-none outline-none resize-none"
            style={{
              fontFamily: enableMarkdown ? 'monospace' : fontFamily,
              fontSize: `${fontSize}px`,
              lineHeight: ruled ? `${Math.max(fontSize * 1.5, 21)}px` : '1.5',
              color: '#2c3e50',
              fontWeight: isBold ? 'bold' : 'normal',
              fontStyle: isItalic ? 'italic' : 'normal',
              textDecoration: isUnderline ? 'underline' : 'none',
              margin: 0,
              padding: 0
            }}
            placeholder={enableMarkdown ? "Enter markdown text here..." : "Enter note here..."}
          />
        ) : (
          <div className="w-full h-full">
            {enableMarkdown ? (
              <div style={{ lineHeight: ruled ? `${Math.max(fontSize * 1.5, 21)}px` : '1.5' }}>
                <MarkdownRenderer
                  content={text || 'Enter Text or Generate with AI...'}
                  fontFamily={fontFamily}
                  fontSize={fontSize}
                  isBold={isBold}
                  isItalic={isItalic}
                  isUnderline={isUnderline}
                  color={text ? '#2c3e50' : 'rgba(44,62,80,0.35)'}
                />
              </div>
            ) : (
              <div
                style={{
                  fontFamily: fontFamily,
                  fontSize: `${fontSize}px`,
                  lineHeight: ruled ? `${Math.max(fontSize * 1.5, 21)}px` : '1.5',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: '#2c3e50',
                  fontWeight: isBold ? 'bold' : 'normal',
                  fontStyle: isItalic ? 'italic' : 'normal',
                  textDecoration: isUnderline ? 'underline' : 'none',
                  margin: 0,
                  padding: 0
                }}
              >
                {text || <span style={{ color: 'rgba(44,62,80,0.35)' }}>Enter Text or Generate with AI...</span>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resize Handle */}
      {selectionMode && (
        <div
          className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize"
          onMouseDown={handleResizeStart}
        >
          <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-gray-600 rounded-br-sm bg-white/60" />
        </div>
      )}
    </div>
  );
};

export default StickyNote;


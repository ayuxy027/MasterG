import React, { useState, useRef, useCallback } from 'react';
import { LuSettings } from 'react-icons/lu';
import TextSettings from './TextSettings';
import MarkdownRenderer from '../../ui/MarkdownRenderer';

interface TextBoxProps {
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
  selectionMode?: boolean;
  onUpdate: (id: string, updates: Partial<TextBoxProps>) => void;
  onDelete: (id: string) => void;
}

const TextBox: React.FC<TextBoxProps> = ({
  id,
  x,
  y,
  text,
  color,
  width,
  height,
  fontSize,
  fontFamily,
  isBold,
  isItalic,
  isUnderline,
  enableMarkdown = false,
  selectionMode = false,
  onUpdate,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const textBoxRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);



  // Simple drag handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!selectionMode) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - x, y: e.clientY - y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    onUpdate(id, { x: newX, y: newY });
  }, [dragStart.x, dragStart.y, id, isDragging, onUpdate]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Simple resize handling
  const handleResizeStart = (e: React.MouseEvent) => {
    if (!selectionMode) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  };

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const rect = textBoxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const newWidth = Math.max(200, e.clientX - rect.left);
    const newHeight = Math.max(100, e.clientY - rect.top);
    onUpdate(id, { width: newWidth, height: newHeight });
  }, [id, isResizing, onUpdate]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

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

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (textBoxRef.current && !textBoxRef.current.contains(e.target as Node)) {
      setShowSettings(false);
    }
  }, []);

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
  }, [handleMouseMove, handleMouseUp, isDragging]);

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [handleResizeEnd, handleResizeMove, isResizing]);

  React.useEffect(() => {
    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);

      // Prevent canvas interference with dropdowns
      const handleSelectEvents = (e: Event) => {
        e.stopPropagation();
      };

      const selects = document.querySelectorAll('select');
      selects.forEach(select => {
        select.addEventListener('mousedown', handleSelectEvents);
        select.addEventListener('click', handleSelectEvents);
      });

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        selects.forEach(select => {
          select.removeEventListener('mousedown', handleSelectEvents);
          select.removeEventListener('click', handleSelectEvents);
        });
      };
    }
  }, [handleClickOutside, showSettings]);

  return (
    <div
      ref={textBoxRef}
      className={`absolute select-none ${selectionMode ? 'cursor-move' : ''}`}
      style={{ left: x, top: y, width, height, zIndex: 20 }}
      onMouseDown={handleMouseDown}
    >
      {/* Settings Button */}
      {selectionMode && (
        <button
          className="absolute -top-3 -right-3 w-7 h-7 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 hover:shadow-xl transition-all duration-200 z-30"
          onClick={handleSettingsClick}
          title="Settings"
        >
          <LuSettings size={14} className="text-gray-600" />
        </button>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <TextSettings
          id={id}
          fontFamily={fontFamily}
          fontSize={fontSize}
          isBold={isBold}
          isItalic={isItalic}
          isUnderline={isUnderline}
          color={color}
          enableMarkdown={enableMarkdown}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      )}

      {/* Content */}
      <div
        className="relative p-6 h-full cursor-text rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
        style={{
          backgroundColor: color === 'transparent' ? 'rgba(255,255,255,0.95)' : color,
          border: color === 'transparent' ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(0,0,0,0.05)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)'
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
              lineHeight: '1.6',
              color: '#1a202c',
              fontWeight: isBold ? 'bold' : 'normal',
              fontStyle: isItalic ? 'italic' : 'normal',
              textDecoration: isUnderline ? 'underline' : 'none',
              letterSpacing: '0.01em'
            }}
            placeholder={enableMarkdown ? "Enter markdown text here..." : "Enter text here..."}
          />
        ) : (
          <div className="w-full h-full">
            {enableMarkdown ? (
              <MarkdownRenderer
                content={text || 'Enter Text or Generate with AI...'}
                fontFamily={fontFamily}
                fontSize={fontSize}
                isBold={isBold}
                isItalic={isItalic}
                isUnderline={isUnderline}
                color={text ? '#2c3e50' : 'rgba(44,62,80,0.35)'}
              />
            ) : (
              <div
                style={{
                  fontFamily,
                  fontSize: `${fontSize}px`,
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: '#1a202c',
                  fontWeight: isBold ? 'bold' : 'normal',
                  fontStyle: isItalic ? 'italic' : 'normal',
                  textDecoration: isUnderline ? 'underline' : 'none',
                  letterSpacing: '0.01em'
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
          <div className="absolute bottom-1 right-1 w-4 h-4 border-r-2 border-b-2 border-gray-500 rounded-br-sm bg-white/80 shadow-sm" />
        </div>
      )}
    </div>
  );
};

export default TextBox;


import React, { useRef, useState, useCallback } from 'react';
import { X, GripVertical } from 'lucide-react';

interface CardProps {
  id: string;
  title: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isSelected: boolean;
  zoom?: number;
  onSelect: (id: string, isMultiSelect: boolean) => void;
  onMove: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
}

const Card: React.FC<CardProps> = ({
  id,
  title,
  content,
  x,
  y,
  width,
  height,
  isSelected,
  zoom = 1,
  onSelect,
  onMove,
  onDelete,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, cardX: 0, cardY: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();

    // Handle selection
    onSelect(id, e.shiftKey || e.ctrlKey || e.metaKey);

    // Start dragging
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, cardX: x, cardY: y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [id, x, y, onSelect]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;

    // Account for zoom when calculating delta
    const deltaX = (e.clientX - dragStartRef.current.x) / zoom;
    const deltaY = (e.clientY - dragStartRef.current.y) / zoom;
    onMove(id, dragStartRef.current.cardX + deltaX, dragStartRef.current.cardY + deltaY);
  }, [isDragging, id, onMove, zoom]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(id);
  }, [id, onDelete]);

  return (
    <div
      ref={cardRef}
      className={`absolute pointer-events-auto select-none ${isSelected
          ? 'ring-2 ring-orange-500 ring-offset-2'
          : 'hover:ring-2 hover:ring-orange-300'
        } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: x,
        top: y,
        width,
        minHeight: height,
        transform: isDragging ? 'scale(1.02)' : 'scale(1)',
        transition: isDragging ? 'none' : 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className={`bg-white rounded-xl shadow-lg border ${isSelected ? 'border-orange-400' : 'border-gray-200'
        } overflow-hidden h-full flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-orange-50 to-orange-100/50 border-b border-orange-100">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-orange-400" />
            <h3 className="font-semibold text-sm text-gray-800 truncate max-w-[180px]">
              {title}
            </h3>
          </div>
          <button
            onClick={handleDelete}
            className="p-1 hover:bg-red-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-3 overflow-auto">
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">✓</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Card;


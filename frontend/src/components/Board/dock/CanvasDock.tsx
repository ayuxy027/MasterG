import React, { useMemo, useRef, useState, useEffect } from 'react';
import { HiOutlineCursorClick } from 'react-icons/hi';
import { LuPencil, LuPalette, LuRotateCcw, LuRotateCw, LuTrash2, LuEraser, LuChevronDown, LuSparkles } from 'react-icons/lu';
import { MdOutlineEventNote } from 'react-icons/md';
import { IoText } from 'react-icons/io5';
import { Bot, X, List, Target, GitBranch, Layers } from 'lucide-react';

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

interface PrimaryTool {
  id: string;
  icon: IconComponent;
  label: string;
  shortcut?: string;
}

type OverflowTool =
  | {
      id: string;
      icon: IconComponent;
      label: string;
      action: 'query' | 'toolbar';
    }
  | {
      id: string;
      icon: IconComponent;
      label: string;
    };

interface CanvasDockProps {
  currentTool: string;
  currentColor: string;
  strokeWidth: number;
  onToolChange: (tool: string) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  sidebarOpen?: boolean;
  query?: string;
  setQuery?: (query: string) => void;
  onQuerySubmit?: (e: React.FormEvent) => void;
  isLoading?: boolean;
  activeToolbarOption?: string;
  onToolbarOptionChange?: (option: string) => void;
}

const CanvasDock: React.FC<CanvasDockProps> = ({
  currentTool,
  currentColor,
  strokeWidth,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onUndo,
  onRedo,
  onClear,
  canUndo = false,
  canRedo = false,
  sidebarOpen = true,
  query = '',
  setQuery,
  onQuerySubmit,
  isLoading = false,
  activeToolbarOption = 'summarise',
  onToolbarOptionChange
}) => {
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const [isQueryPanelOpen, setIsQueryPanelOpen] = useState(false);
  const [isToolbarOpen, setIsToolbarOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement | null>(null);
  const queryPanelRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const colorInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (overflowRef.current && !overflowRef.current.contains(target)) {
        setIsOverflowOpen(false);
      }
      if (queryPanelRef.current && !queryPanelRef.current.contains(target)) {
        setIsQueryPanelOpen(false);
      }
      if (toolbarRef.current && !toolbarRef.current.contains(target)) {
        setIsToolbarOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const primaryTools: PrimaryTool[] = useMemo(
    () => [
      { id: 'select', icon: HiOutlineCursorClick, label: 'Select', shortcut: '5' },
      { id: 'pen', icon: LuPencil, label: 'Pen', shortcut: '1' },
      { id: 'eraser', icon: LuEraser, label: 'Eraser', shortcut: '2' },
      { id: 'sticky-note', icon: MdOutlineEventNote, label: 'Note', shortcut: '3' },
      { id: 'text', icon: IoText, label: 'Text', shortcut: '4' }
    ],
    []
  );

  const overflowTools: OverflowTool[] = useMemo(
    () => [
      { id: 'query', icon: Bot, label: 'Generate', action: 'query' },
      { id: 'toolbar', icon: LuSparkles, label: 'Modes', action: 'toolbar' }
    ],
    []
  );

  const toolbarOptions = useMemo(
    () => [
      { id: 'summarise', label: 'Summarise', icon: List },
      { id: 'action-points', label: 'Action points', icon: Target },
      { id: 'timeline', label: 'Timeline', icon: GitBranch },
      { id: 'breakdown', label: 'Breakdown', icon: Layers }
    ],
    []
  );

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-[margin] duration-500 ease-out ${sidebarOpen ? 'ml-[80px]' : 'ml-[10px]'}`}>
      <div className="relative">
        {/* Outer gradient border for premium matte ring */}
        <div className="rounded-2xl bg-gradient-to-br from-orange-100/50 to-orange-50/30 p-[2px] shadow-xl border border-orange-200/60">
          {/* Inner frosted glass panel */}
          <div
            className="rounded-2xl px-6 py-4 backdrop-blur-xl bg-white/90 shadow-lg"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Left Section - Primary Tools */}
              <div className="flex items-center gap-2 flex-wrap">
                {primaryTools.map((tool) => {
                  const IconComponent = tool.icon as React.ComponentType<{ size?: number; className?: string }>;
                  const isActive = currentTool === tool.id;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => onToolChange(tool.id)}
                      className={`group flex items-center justify-center rounded-full p-2 transition-all duration-300 focus:outline-none ${
                        isActive 
                          ? 'bg-orange-500 text-white shadow-[0_8px_24px_rgba(249,115,22,0.35)]' 
                          : 'text-orange-500 hover:bg-orange-50'
                      }`}
                      title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
                    >
                      <IconComponent size={18} />
                    </button>
                  );
                })}

                {/* Overflow tools */}
                <div className="relative" ref={overflowRef}>
                  <button
                    onClick={() => setIsOverflowOpen((v) => !v)}
                    className={`flex items-center justify-center rounded-full p-2 transition-all duration-300 ${
                      isOverflowOpen 
                        ? 'bg-orange-500 text-white shadow-md' 
                        : 'text-orange-500 hover:bg-orange-50'
                    }`}
                    title="More tools"
                  >
                    <LuChevronDown size={16} className={isOverflowOpen ? 'rotate-180 transition-transform' : ''} />
                  </button>

                  {isOverflowOpen && (
                    <div
                      className="absolute bottom-12 left-0 min-w-[160px] rounded-xl p-2 backdrop-blur-xl bg-white/95 shadow-xl border border-orange-200/60"
                      ref={overflowRef}
                    >
                      <div className="grid grid-cols-3 gap-2">
                        {overflowTools.map((tool) => {
                          const Icon = tool.icon as React.ComponentType<{ size?: number; className?: string }>;
                          const isActive = currentTool === tool.id;
                          return (
                            <button
                              key={tool.id}
                              onClick={() => {
                                if ('action' in tool && tool.action === 'query') {
                                  setIsQueryPanelOpen(true);
                                  setIsOverflowOpen(false);
                                } else if ('action' in tool && tool.action === 'toolbar') {
                                  setIsToolbarOpen(true);
                                  setIsOverflowOpen(false);
                                } else {
                                  onToolChange(tool.id);
                                  setIsOverflowOpen(false);
                                }
                              }}
                              className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all ${
                                isActive 
                                  ? 'bg-orange-400 text-white shadow-md' 
                                  : 'text-orange-500 hover:bg-orange-50'
                              }`}
                              title={tool.label}
                            >
                              <Icon size={18} />
                              <span className="text-[10px] leading-none">{tool.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Query Panel */}
                  {isQueryPanelOpen && (
                    <div
                      ref={queryPanelRef}
                      className="absolute bottom-12 left-0 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-orange-200/60 p-4 z-[60]"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Bot size={20} className="text-orange-500" />
                          <h3 className="text-sm font-semibold text-gray-800">Generate Cards</h3>
                        </div>
                        <button
                          onClick={() => setIsQueryPanelOpen(false)}
                          className="text-gray-500 hover:text-gray-700 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                          title="Close"
                        >
                          <X size={18} />
                        </button>
                      </div>
                      
                      <form onSubmit={onQuerySubmit} className="space-y-3">
                        <textarea
                          value={query}
                          onChange={(e) => setQuery?.(e.target.value)}
                          placeholder="Type your query to generate cards..."
                          className="w-full px-3 py-2 bg-white border-2 border-orange-200 rounded-lg outline-none text-gray-800 placeholder-gray-400 resize-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all"
                          rows={4}
                          disabled={isLoading}
                        />
                        <button
                          type="submit"
                          disabled={isLoading || !query.trim()}
                          className="w-full px-4 py-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                        >
                          {isLoading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Generating...</span>
                            </>
                          ) : (
                            <>
                              <Bot size={16} />
                              <span>Generate</span>
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Toolbar Panel */}
                  {isToolbarOpen && (
                    <div
                      ref={toolbarRef}
                      className="absolute bottom-12 left-0 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-orange-200/60 p-3 z-[60]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-800">Content Modes</h3>
                        <button
                          onClick={() => setIsToolbarOpen(false)}
                          className="text-gray-500 hover:text-gray-700 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                          title="Close"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        {toolbarOptions.map((option) => {
                          const IconComponent = option.icon;
                          const isActive = activeToolbarOption === option.id;
                          return (
                            <button
                              key={option.id}
                              onClick={() => {
                                onToolbarOptionChange?.(option.id);
                                setIsToolbarOpen(false);
                              }}
                              className={`group flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 ease-out focus:outline-none ${
                                isActive
                                  ? 'bg-orange-400 text-white shadow-[0_8px_24px_rgba(249,115,22,0.25)]'
                                  : 'text-orange-500 hover:bg-orange-50'
                              }`}
                              style={{ transform: isActive ? 'translateY(-1px)' : 'translateY(0px)' }}
                            >
                              <IconComponent size={14} />
                              <span className="text-xs font-medium">{option.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Center Section - Color and Size */}
              <div className="flex flex-wrap items-center gap-6">
                {/* Color Picker */}
                <div className="flex items-center gap-2">
                  <LuPalette size={18} className="text-orange-500" />
                  <button
                    type="button"
                    aria-label="Pick color"
                    onClick={() => colorInputRef.current?.click()}
                    className="w-[24px] h-[24px] rounded-full border-2 border-orange-300 cursor-pointer shadow-sm hover:shadow-md transition-all hover:scale-110"
                    style={{ backgroundColor: currentColor }}
                  />
                  <input
                    ref={colorInputRef}
                    type="color"
                    value={currentColor}
                    onChange={(e) => onColorChange(e.target.value)}
                    className="sr-only"
                  />
                </div>

                {/* Stroke Width */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-orange-500 font-medium">Size</span>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={strokeWidth}
                    onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
                    className="w-24 accent-orange-500 cursor-pointer"
                  />
                  <span className="text-sm text-orange-500 w-6 font-semibold tabular-nums">{strokeWidth}</span>
                </div>
              </div>

              {/* Right Section - Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onUndo}
                  disabled={!canUndo}
                  className={`p-2 rounded-full transition-all duration-200 ${
                    canUndo ? 'text-orange-500 hover:bg-orange-50' : 'text-orange-300 cursor-not-allowed opacity-60'
                  }`}
                  title="Undo (Ctrl+Z / Delete)"
                >
                  <LuRotateCcw size={18} />
                </button>
                <button
                  onClick={onRedo}
                  disabled={!canRedo}
                  className={`p-2 rounded-full transition-all duration-200 ${
                    canRedo ? 'text-orange-500 hover:bg-orange-50' : 'text-orange-300 cursor-not-allowed opacity-60'
                  }`}
                  title="Redo (Ctrl+Shift+Z / Ctrl+Y)"
                >
                  <LuRotateCw size={18} />
                </button>
                <button
                  onClick={onClear}
                  className="p-2 rounded-full text-orange-500 hover:bg-orange-50 transition-all duration-200"
                  title="Clear Canvas"
                >
                  <LuTrash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CanvasDock;


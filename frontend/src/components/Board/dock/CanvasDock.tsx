import React, { useMemo, useRef, useState, useEffect } from 'react';
import { HiOutlineCursorClick } from 'react-icons/hi';
import { LuPencil, LuPalette, LuRotateCcw, LuTrash2, LuEraser, LuWrench, LuSave, LuFolderOpen, LuClock, LuFileText } from 'react-icons/lu';
import { MdOutlineEventNote } from 'react-icons/md';
import { Bot, X, ZoomIn, ZoomOut, Maximize2, Trash2, Clock } from 'lucide-react';
import { BoardSession, boardSessionApi } from '../../../services/boardApi';

interface CanvasDockProps {
  currentTool: string;
  currentColor: string;
  strokeWidth: number;
  onToolChange: (tool: string) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onUndo: () => void;
  onClear: () => void;
  sidebarOpen?: boolean;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  onZoomReset?: () => void;
  onGenerateCards?: (prompt: string, count: number) => void;
  onSaveBoard?: () => void;
  onNewBoard?: () => void;
  onLoadBoard?: (sessionId: string) => void;
  onDeleteBoard?: (sessionId: string) => void;
  isGenerating?: boolean;
  isSaving?: boolean;
  lastSaved?: Date | null;
  userId?: string;
  currentSessionId?: string | null;
}

const CanvasDock: React.FC<CanvasDockProps> = ({
  currentTool,
  currentColor,
  strokeWidth,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onUndo,
  onClear,
  sidebarOpen = true,
  zoom = 1,
  onZoomChange,
  onZoomReset,
  onGenerateCards,
  onSaveBoard,
  onNewBoard,
  onLoadBoard,
  onDeleteBoard,
  isGenerating = false,
  isSaving = false,
  lastSaved = null,
  userId = '',
  currentSessionId = null,
}) => {
  const [isGeneratePanelOpen, setIsGeneratePanelOpen] = useState(false);
  const [isSessionsPanelOpen, setIsSessionsPanelOpen] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [cardCount, setCardCount] = useState(3);
  const [sessions, setSessions] = useState<BoardSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const generatePanelRef = useRef<HTMLDivElement | null>(null);
  const sessionsPanelRef = useRef<HTMLDivElement | null>(null);
  const colorInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (generatePanelRef.current && !generatePanelRef.current.contains(target)) {
        setIsGeneratePanelOpen(false);
      }
      if (sessionsPanelRef.current && !sessionsPanelRef.current.contains(target)) {
        setIsSessionsPanelOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch sessions when panel opens
  useEffect(() => {
    const fetchSessions = async () => {
      if (!isSessionsPanelOpen || !userId) return;
      setIsLoadingSessions(true);
      try {
        const fetchedSessions = await boardSessionApi.getAllSessions(userId);
        setSessions(fetchedSessions);
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
        setSessions([]);
      } finally {
        setIsLoadingSessions(false);
      }
    };
    fetchSessions();
  }, [isSessionsPanelOpen, userId]);

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this board session?')) return;
    try {
      await boardSessionApi.deleteSession(userId, sessionId);
      setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
      onDeleteBoard?.(sessionId);
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const handleLoadSession = (sessionId: string) => {
    onLoadBoard?.(sessionId);
    setIsSessionsPanelOpen(false);
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generatePrompt.trim() || isGenerating) return;
    await onGenerateCards?.(generatePrompt, cardCount);
    setGeneratePrompt('');
    setIsGeneratePanelOpen(false);
  };

  const primaryTools = useMemo(
    () => [
      { id: 'select', icon: HiOutlineCursorClick, label: 'Select' },
      { id: 'pen', icon: LuPencil, label: 'Pen' },
      { id: 'eraser', icon: LuEraser, label: 'Eraser' },
      { id: 'sticky-note', icon: MdOutlineEventNote, label: 'Note' },
      { id: 'operate', icon: LuWrench, label: 'Operate' },
    ],
    []
  );

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${sidebarOpen ? 'ml-20' : 'ml-2.5'}`}>
      <div className="rounded-2xl bg-white/95 backdrop-blur-xl shadow-xl border border-orange-200/60 px-4 py-3">
        <div className="flex items-center gap-6">
          {/* Tools */}
          <div className="flex items-center gap-1">
            {primaryTools.map((tool) => {
              const IconComponent = tool.icon as React.ComponentType<{ size?: number; className?: string }>;
              const isActive = currentTool === tool.id;
              const isAIFeature = tool.id === 'operate'; // AI features use purple
              return (
                <button
                  key={tool.id}
                  onClick={() => onToolChange(tool.id)}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${isActive
                    ? isAIFeature
                      ? 'bg-purple-500 text-white shadow-lg'
                      : 'bg-orange-500 text-white shadow-lg'
                    : isAIFeature
                      ? 'text-purple-600 hover:bg-purple-50'
                      : 'text-orange-600 hover:bg-orange-50'
                    }`}
                  title={tool.label}
                >
                  <IconComponent size={18} />
                  <span className="text-xs font-medium">{tool.label}</span>
                </button>
              );
            })}

            {/* Generate Button */}
            <div className="relative" ref={generatePanelRef}>
              <button
                onClick={() => setIsGeneratePanelOpen(!isGeneratePanelOpen)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${isGeneratePanelOpen
                  ? 'bg-purple-500 text-white shadow-lg'
                  : 'text-purple-600 hover:bg-purple-50'
                  }`}
                title="Generate AI Cards"
              >
                <Bot size={18} />
                <span className="text-xs font-medium">Generate</span>
              </button>

              {/* Generate Panel */}
              {isGeneratePanelOpen && (
                <div className="absolute bottom-14 left-0 w-80 bg-white rounded-xl shadow-xl border border-orange-200 p-4 z-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Bot size={20} className="text-purple-500" />
                      <h3 className="font-semibold text-gray-800">Generate Cards</h3>
                    </div>
                    <button
                      onClick={() => setIsGeneratePanelOpen(false)}
                      className="p-1 hover:bg-gray-100 rounded-lg"
                    >
                      <X size={16} className="text-gray-500" />
                    </button>
                  </div>

                  <form onSubmit={handleGenerate} className="space-y-3">
                    <textarea
                      value={generatePrompt}
                      onChange={(e) => setGeneratePrompt(e.target.value)}
                      placeholder="What would you like to learn about?"
                      className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg resize-none focus:border-orange-400 focus:outline-none"
                      rows={3}
                      disabled={isGenerating}
                    />
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Cards:</label>
                      <select
                        value={cardCount}
                        onChange={(e) => setCardCount(Number(e.target.value))}
                        className="px-2 py-1 border border-gray-200 rounded-lg text-sm"
                        disabled={isGenerating}
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={isGenerating || !generatePrompt.trim()}
                      className="w-full py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Bot size={16} />
                          Generate
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-orange-200" />

          {/* Color & Size */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <LuPalette size={16} className="text-orange-500" />
              <button
                onClick={() => colorInputRef.current?.click()}
                className="w-6 h-6 rounded-full border-2 border-orange-300 shadow-sm hover:scale-110 transition-transform"
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
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max="20"
                value={strokeWidth}
                onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
                className="w-20 accent-orange-500"
              />
              <span className="text-sm text-orange-600 font-medium w-5">{strokeWidth}</span>
            </div>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onZoomChange?.(Math.max(0.25, zoom - 0.1))}
              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-sm text-orange-600 font-medium w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => onZoomChange?.(Math.min(3, zoom + 0.1))}
              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={onZoomReset}
              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
              title="Reset View"
            >
              <Maximize2 size={16} />
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-orange-200" />

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={onUndo}
              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
              title="Undo"
            >
              <LuRotateCcw size={16} />
            </button>
            <button
              onClick={onClear}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Clear All"
            >
              <LuTrash2 size={16} />
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-orange-200" />

          {/* Save/Load */}
          <div className="flex items-center gap-1 relative" ref={sessionsPanelRef}>
            <button
              onClick={onSaveBoard}
              disabled={isSaving}
              className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-colors ${isSaving
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-green-600 hover:bg-green-50'
                }`}
              title={isSaving ? 'Saving...' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Save Board'}
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <LuSave size={16} />
              )}
              <span className="text-xs font-medium">Save</span>
            </button>
            <button
              onClick={() => setIsSessionsPanelOpen(!isSessionsPanelOpen)}
              className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-colors ${isSessionsPanelOpen
                ? 'bg-blue-500 text-white shadow-lg'
                : 'text-blue-600 hover:bg-blue-50'
                }`}
              title="Recent Boards"
            >
              <LuClock size={16} />
              <span className="text-xs font-medium">Recent</span>
            </button>
            <button
              onClick={onNewBoard}
              className="flex flex-col items-center gap-1 px-2 py-1 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
              title="New Board"
            >
              <LuFolderOpen size={16} />
              <span className="text-xs font-medium">New</span>
            </button>

            {/* Recent Sessions Panel */}
            {isSessionsPanelOpen && (
              <div className="absolute bottom-14 right-0 w-80 bg-white rounded-xl shadow-xl border border-blue-200 overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100/50">
                  <div className="flex items-center gap-2">
                    <Clock size={18} className="text-blue-500" />
                    <h3 className="font-semibold text-gray-800">Recent Boards</h3>
                  </div>
                  <button
                    onClick={() => setIsSessionsPanelOpen(false)}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={16} className="text-gray-500" />
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto">
                  {isLoadingSessions ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                      <LuFileText size={32} className="mb-2" />
                      <p className="text-sm">No saved boards yet</p>
                      <p className="text-xs">Your boards will appear here</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {sessions.map((session) => (
                        <div
                          key={session.sessionId}
                          onClick={() => handleLoadSession(session.sessionId)}
                          className={`flex items-center justify-between px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors ${currentSessionId === session.sessionId ? 'bg-blue-100' : ''
                            }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-800 truncate">
                                {session.sessionName || `Board ${session.sessionId.slice(-8)}`}
                              </span>
                              {currentSessionId === session.sessionId && (
                                <span className="px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded">Current</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {formatTimeAgo(session.updatedAt)}
                              </span>
                              <span>{session.stickyNoteCount} notes</span>
                              <span>{session.drawingPathCount} strokes</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleDeleteSession(session.sessionId, e)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete board"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {sessions.length > 0 && (
                  <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
                    <p className="text-xs text-gray-500 text-center">
                      {sessions.length} saved board{sessions.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CanvasDock;
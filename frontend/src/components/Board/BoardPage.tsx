import React, { useRef, useState, useEffect, useCallback } from 'react';
import { FileText, ListChecks, Brain, BookOpen } from 'lucide-react';
import { DottedBackground, CanvasDock, StickyNote } from './index';
import { getToolById, Point, DrawingPath } from './tools';
import Card from './Card';
import MinimizedNavbar from './MinimizedNavbar';
import { generateCards, performCardAction, checkOllamaStatus, CardData, CardAction, OllamaStatus } from '../../services/boardApi';

// ============================================================================
// TYPES
// ============================================================================

interface CardState extends CardData {
  x: number;
  y: number;
  width: number;
  height: number;
  isSelected: boolean;
}

interface StickyNoteState {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  width: number;
  height: number;
  enableMarkdown?: boolean;
  ruled?: boolean;
  fontSize?: number;
  fontFamily?: string;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const BoardPage: React.FC = () => {
  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  // Drawing refs (avoid state for performance - no race conditions)
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef<Point[]>([]);
  const lastPointRef = useRef<Point | null>(null);

  // View state
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Store view state in refs for performance during animations
  const viewOffsetRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);

  // Tool state
  const [currentTool, setCurrentTool] = useState<string>('pen');
  const [currentColor, setCurrentColor] = useState('#F97316');
  const [strokeWidth, setStrokeWidth] = useState(3);

  // Drawing paths (stored after completion)
  const [drawingPaths, setDrawingPaths] = useState<DrawingPath[]>([]);

  // Cards and sticky notes
  const [cards, setCards] = useState<CardState[]>([]);
  const [stickyNotes, setStickyNotes] = useState<StickyNoteState[]>([]);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [selectedStickyNoteIds, setSelectedStickyNoteIds] = useState<Set<string>>(new Set());

  // AI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>({ connected: false });
  const [thinkingText, setThinkingText] = useState("");
  const [showThinkingModal, setShowThinkingModal] = useState(false);

  // Navbar
  const [isNavbarExpanded, setIsNavbarExpanded] = useState(false);

  // Space key for panning
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Track streaming action card IDs for real-time updates
  const streamingActionCardIdsRef = useRef<Set<string>>(new Set());
  const resultCardIdRef = useRef<string | null>(null);

  // ============================================================================
  // OLLAMA STATUS CHECK
  // ============================================================================

  useEffect(() => {
    // Initial check
    checkOllamaStatus().then(setOllamaStatus);

    // Poll every 10 seconds
    const interval = setInterval(() => {
      checkOllamaStatus().then(setOllamaStatus);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // ============================================================================
  // CANVAS COORDINATE HELPERS
  // ============================================================================

  const screenToCanvas = useCallback((clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - viewOffset.x) / zoom,
      y: (clientY - rect.top - viewOffset.y) / zoom,
    };
  }, [viewOffset, zoom]);

  // ============================================================================
  // CANVAS REDRAW
  // ============================================================================

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(viewOffset.x, viewOffset.y);
    ctx.scale(zoom, zoom);

    // Draw all completed paths
    drawingPaths.forEach(path => {
      if (path.points.length < 2) return;
      const tool = getToolById(path.tool);
      if (!tool) return;

      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = tool.getCompositeOperation();
      ctx.strokeStyle = tool.getStrokeStyle(path.color);
      ctx.lineWidth = tool.getStrokeWidth(path.strokeWidth);
      ctx.globalAlpha = tool.getAlpha();

      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length - 1; i++) {
        const curr = path.points[i];
        const next = path.points[i + 1];
        const midX = (curr.x + next.x) / 2;
        const midY = (curr.y + next.y) / 2;
        ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
      }
      ctx.lineTo(path.points[path.points.length - 1].x, path.points[path.points.length - 1].y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    });

    ctx.restore();
  }, [drawingPaths, viewOffset, zoom]);

  // Keep refs in sync with state for performance
  useEffect(() => {
    viewOffsetRef.current = viewOffset;
  }, [viewOffset]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // ============================================================================
  // CANVAS RESIZE & REDRAW
  // ============================================================================

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      redrawCanvas();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawCanvas]);

  // Single efficient redraw effect
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      redrawCanvas();
    });
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [drawingPaths, viewOffset, zoom, redrawCanvas]);

  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        // Check if user is typing in an input/textarea - don't interfere
        const activeElement = document.activeElement;
        const isTyping = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          (activeElement instanceof HTMLElement && activeElement.isContentEditable)
        );

        // Only enable panning if not typing
        if (!isTyping) {
          setIsSpacePressed(true);
          e.preventDefault();
        }
      }
      if (e.key === 'Escape') {
        setCurrentTool('select');
        setSelectedCardIds(new Set());
      }
      // Tool shortcuts - only if not typing in input/textarea
      const activeElement = document.activeElement;
      const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement instanceof HTMLElement && activeElement.isContentEditable)
      );

      if (!isTyping) {
        const toolMap: Record<string, string> = { '1': 'select', '2': 'pen', '3': 'eraser', '4': 'sticky-note' };
        if (toolMap[e.key] && !e.ctrlKey && !e.metaKey) {
          setCurrentTool(toolMap[e.key]);
          e.preventDefault();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // ============================================================================
  // ZOOM (Mouse wheel)
  // ============================================================================

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(prev => Math.max(0.25, Math.min(3, prev + delta)));
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  // ============================================================================
  // DRAWING HANDLERS (Using refs to avoid race conditions)
  // ============================================================================

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Pan with space or middle button
    if (isSpacePressed || e.button === 1) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - viewOffset.x, y: e.clientY - viewOffset.y };
      canvas.setPointerCapture(e.pointerId);
      return;
    }

    // Select tool - just pan
    if (currentTool === 'select') {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - viewOffset.x, y: e.clientY - viewOffset.y };
      canvas.setPointerCapture(e.pointerId);
      return;
    }

    // Sticky note placement
    if (currentTool === 'sticky-note') {
      const point = screenToCanvas(e.clientX, e.clientY);
      const newNote: StickyNoteState = {
        id: `note-${Date.now()}`,
        x: point.x,
        y: point.y,
        text: '',
        color: '#FFE4B5',
        width: 200,
        height: 150,
        enableMarkdown: false,
        ruled: false,
        fontSize: 14,
        fontFamily: 'Inter',
        isBold: false,
        isItalic: false,
        isUnderline: false,
      };
      setStickyNotes(prev => [...prev, newNote]);
      return;
    }

    // Drawing (pen/eraser)
    if (currentTool === 'pen' || currentTool === 'eraser') {
      const point = screenToCanvas(e.clientX, e.clientY);
      isDrawingRef.current = true;
      currentPathRef.current = [point];
      lastPointRef.current = point;
      canvas.setPointerCapture(e.pointerId);
    }
  }, [currentTool, isSpacePressed, viewOffset, screenToCanvas]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    // Handle panning
    if (isPanning) {
      setViewOffset({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }

    // Handle drawing
    if (!isDrawingRef.current) return;
    if (currentTool !== 'pen' && currentTool !== 'eraser') return;

    const point = screenToCanvas(e.clientX, e.clientY);
    const lastPoint = lastPointRef.current;

    // Add to path
    currentPathRef.current.push(point);
    lastPointRef.current = point;

    // Live draw on canvas
    const canvas = canvasRef.current;
    if (!canvas || !lastPoint) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tool = getToolById(currentTool);
    if (!tool) return;

    ctx.save();
    ctx.translate(viewOffset.x, viewOffset.y);
    ctx.scale(zoom, zoom);
    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = tool.getCompositeOperation();
    ctx.strokeStyle = tool.getStrokeStyle(currentColor);
    ctx.lineWidth = tool.getStrokeWidth(strokeWidth);
    ctx.globalAlpha = tool.getAlpha();

    // Smooth curve
    const midX = (lastPoint.x + point.x) / 2;
    const midY = (lastPoint.y + point.y) / 2;
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midX, midY);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }, [isPanning, currentTool, currentColor, strokeWidth, viewOffset, zoom, screenToCanvas]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) canvas.releasePointerCapture(e.pointerId);

    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isDrawingRef.current && currentPathRef.current.length > 1) {
      const newPath: DrawingPath = {
        points: [...currentPathRef.current],
        color: currentColor,
        strokeWidth,
        tool: currentTool,
      };
      setDrawingPaths(prev => [...prev, newPath]);
    }

    isDrawingRef.current = false;
    currentPathRef.current = [];
    lastPointRef.current = null;
  }, [isPanning, currentColor, strokeWidth, currentTool]);

  // ============================================================================
  // AI CARD GENERATION
  // ============================================================================

  const handleGenerateCards = useCallback(async (prompt: string, count: number = 3) => {
    if (isGenerating) return;
    setIsGenerating(true);
    setThinkingText("");
    setShowThinkingModal(true);

    // Clear previous AI-generated sticky notes
    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;
    const canvasCenterX = (screenCenterX - viewOffset.x) / zoom;
    const canvasCenterY = (screenCenterY - viewOffset.y) / zoom;
    const noteWidth = 250;
    const noteHeight = 200;
    const spacing = 30;

    // Convert cards to sticky notes
    const updateStickyNotesFromCards = (cardsToUpdate: CardData[]) => {
      const totalWidth = cardsToUpdate.length * noteWidth + (cardsToUpdate.length - 1) * spacing;
      const startX = canvasCenterX - totalWidth / 2;

      setStickyNotes(prev => {
        // Remove old streaming sticky notes (track by a prefix in ID)
        const filtered = prev.filter(note => !note.id.startsWith('ai-generated-'));

        // Create/update sticky notes from cards
        const updatedNotes = cardsToUpdate.map((card, index) => {
          const noteId = `ai-generated-${card.id}`;
          const existingNote = filtered.find(n => n.id === noteId);

          if (existingNote) {
            // Update existing note
            return {
              ...existingNote,
              text: `${card.title}\n\n${card.content}`,
              x: startX + index * (noteWidth + spacing),
              y: canvasCenterY - noteHeight / 2,
            };
          } else {
            // Create new sticky note
            return {
              id: noteId,
              x: startX + index * (noteWidth + spacing),
              y: canvasCenterY - noteHeight / 2,
              text: `${card.title}\n\n${card.content}`,
              color: '#FFE4B5', // Default peach color
              width: noteWidth,
              height: noteHeight,
              enableMarkdown: false,
              ruled: false,
              fontSize: 14,
              fontFamily: 'Inter',
              isBold: false,
              isItalic: false,
              isUnderline: false,
            };
          }
        });

        return [...filtered, ...updatedNotes];
      });
    };

    try {
      const newCards = await generateCards(
        prompt,
        count,
        (thinking) => {
          setThinkingText(thinking);
        },
        (streamingCards) => {
          // Real-time sticky note updates as they stream in
          updateStickyNotesFromCards(streamingCards);
        }
      );

      // Final update with complete sticky notes
      updateStickyNotesFromCards(newCards);
    } catch (error) {
      console.error('Failed to generate cards:', error);
    } finally {
      setIsGenerating(false);
      // Keep thinking modal open briefly, then auto-close after 2 seconds
      setTimeout(() => {
        setShowThinkingModal(false);
        setThinkingText("");
      }, 2000);
    }
  }, [isGenerating, viewOffset, zoom]);

  // ============================================================================
  // AI CARD ACTIONS (Summarize, Explain, Quiz, Key Points)
  // ============================================================================

  const handleCardAction = useCallback(async (action: CardAction) => {
    // Use sticky notes if selected, otherwise fall back to cards
    const selectedIds = selectedStickyNoteIds.size > 0 ? selectedStickyNoteIds : selectedCardIds;
    if (selectedIds.size === 0 || isPerformingAction) return;
    if (selectedIds.size > 4) {
      alert('Maximum 4 items can be selected for AI actions');
      return;
    }

    setIsPerformingAction(true);
    setThinkingText("");
    setShowThinkingModal(true);

    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;
    const canvasCenterX = (screenCenterX - viewOffset.x) / zoom;
    const canvasCenterY = (screenCenterY - viewOffset.y) / zoom;
    const noteWidth = 250;
    const noteHeight = 200;
    const spacing = 30;

    // Convert action cards to sticky notes
    const updateActionStickyNotes = (cardsToUpdate: CardData[]) => {
      const totalWidth = cardsToUpdate.length * noteWidth + (cardsToUpdate.length - 1) * spacing;
      const startX = canvasCenterX - totalWidth / 2;

      setStickyNotes(prev => {
        // Remove old streaming action sticky notes
        const filtered = prev.filter(note => !note.id.startsWith(`ai-action-${action}-`));

        // Create/update sticky notes from cards
        const updatedNotes = cardsToUpdate.map((card, index) => {
          const noteId = `ai-action-${action}-${card.id}`;
          const existingNote = filtered.find(n => n.id === noteId);
          const noteText = `${card.title}\n\n${card.content}`;

          if (existingNote) {
            return {
              ...existingNote,
              text: noteText,
              x: startX + index * (noteWidth + spacing),
              y: canvasCenterY + 200,
            };
          } else {
            streamingActionCardIdsRef.current.add(card.id);
            return {
              id: noteId,
              x: startX + index * (noteWidth + spacing),
              y: canvasCenterY + 200,
              text: noteText,
              color: '#FFE4B5',
              width: noteWidth,
              height: noteHeight,
              enableMarkdown: false,
              ruled: false,
              fontSize: 14,
              fontFamily: 'Inter',
              isBold: false,
              isItalic: false,
              isUnderline: false,
            };
          }
        });

        return [...filtered, ...updatedNotes];
      });
    };

    // Convert text results to sticky notes
    const updateActionResult = (content: string) => {
      const resultNoteId = resultCardIdRef.current || `ai-action-result-${action}-${Date.now()}`;
      resultCardIdRef.current = resultNoteId;

      setStickyNotes(prev => {
        const existing = prev.find(n => n.id === resultNoteId);
        if (existing) {
          return prev.map(n =>
            n.id === resultNoteId
              ? { ...n, text: content }
              : n
          );
        } else {
          return [...prev, {
            id: resultNoteId,
            x: canvasCenterX - 160,
            y: canvasCenterY + 150,
            text: content,
            color: '#FFE4B5',
            width: 320,
            height: action === 'actionPoints' ? 280 : 220,
            enableMarkdown: false,
            ruled: false,
            fontSize: 14,
            fontFamily: 'Inter',
            isBold: false,
            isItalic: false,
            isUnderline: false,
          }];
        }
      });
    };

    try {
      // Get content from sticky notes or cards
      let contents: string[] = [];
      if (selectedStickyNoteIds.size > 0) {
        const selectedNotes = stickyNotes.filter(n => selectedStickyNoteIds.has(n.id));
        contents = selectedNotes.map(n => n.text);
      } else {
        const selectedCards = cards.filter(c => selectedCardIds.has(c.id));
        contents = selectedCards.map(c => c.content);
      }

      const result = await performCardAction(action, contents, (partialData) => {
        if (partialData.type === "card" && partialData.cards) {
          // Real-time sticky note updates for mindMap/flashcards
          updateActionStickyNotes(partialData.cards);
        } else if (partialData.type === "partial" && partialData.content) {
          // Real-time text updates for summarize/actionPoints
          updateActionResult(partialData.content);
        }
      });

      if (!result.success) {
        console.error('Action failed:', result.message);
        return;
      }

      // Final update with complete results
      if (result.cards && result.cards.length > 0) {
        updateActionStickyNotes(result.cards);
      } else if (result.result) {
        updateActionResult(result.result);
      }

      setSelectedStickyNoteIds(new Set());
      setSelectedCardIds(new Set());
    } catch (error) {
      console.error('Failed to perform card action:', error);
    } finally {
      setIsPerformingAction(false);
      streamingActionCardIdsRef.current.clear();
      resultCardIdRef.current = null;
      // Keep thinking modal open briefly, then auto-close after 2 seconds
      setTimeout(() => {
        setShowThinkingModal(false);
        setThinkingText("");
      }, 2000);
    }
  }, [selectedStickyNoteIds, selectedCardIds, stickyNotes, cards, isPerformingAction, viewOffset, zoom]);

  // ============================================================================
  // CARD SELECTION
  // ============================================================================

  const handleCardSelect = useCallback((cardId: string, isMultiSelect: boolean) => {
    setSelectedCardIds(prev => {
      const newSet = new Set(prev);
      if (isMultiSelect) {
        if (newSet.has(cardId)) {
          newSet.delete(cardId);
        } else if (newSet.size < 4) {
          newSet.add(cardId);
        }
      } else {
        if (newSet.has(cardId) && newSet.size === 1) {
          newSet.clear();
        } else {
          newSet.clear();
          newSet.add(cardId);
        }
      }
      return newSet;
    });
  }, []);

  const handleCardMove = useCallback((cardId: string, x: number, y: number) => {
    setCards(prev => prev.map(card =>
      card.id === cardId ? { ...card, x, y } : card
    ));
  }, []);

  const handleCardDelete = useCallback((cardId: string) => {
    setCards(prev => prev.filter(card => card.id !== cardId));
    setSelectedCardIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(cardId);
      return newSet;
    });
  }, []);

  // ============================================================================
  // STICKY NOTE HANDLERS
  // ============================================================================

  const handleStickyNoteUpdate = useCallback((id: string, updates: Partial<StickyNoteState>) => {
    setStickyNotes(prev => prev.map(note =>
      note.id === id ? { ...note, ...updates } : note
    ));
  }, []);

  const handleStickyNoteDelete = useCallback((id: string) => {
    setStickyNotes(prev => prev.filter(note => note.id !== id));
    setSelectedStickyNoteIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  const handleStickyNoteSelect = useCallback((noteId: string, isMultiSelect: boolean) => {
    setSelectedStickyNoteIds(prev => {
      const newSet = new Set(prev);
      if (isMultiSelect) {
        if (newSet.has(noteId)) {
          newSet.delete(noteId);
        } else if (newSet.size < 4) {
          newSet.add(noteId);
        }
      } else {
        if (newSet.has(noteId) && newSet.size === 1) {
          newSet.clear();
        } else {
          newSet.clear();
          newSet.add(noteId);
        }
      }
      return newSet;
    });
  }, []);

  // ============================================================================
  // TOOLBAR HANDLERS
  // ============================================================================

  const handleToolChange = useCallback((tool: string) => {
    setCurrentTool(tool);
    if (tool !== 'select') {
      setSelectedCardIds(new Set());
    }
  }, []);

  const handleColorChange = useCallback((color: string) => {
    setCurrentColor(color);
  }, []);

  const handleStrokeWidthChange = useCallback((width: number) => {
    setStrokeWidth(width);
  }, []);

  const handleUndo = useCallback(() => {
    setDrawingPaths(prev => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    if (window.confirm('Clear all content?')) {
      setDrawingPaths([]);
      setCards([]);
      setStickyNotes([]);
      setSelectedCardIds(new Set());
    }
  }, []);

  // ============================================================================
  // CURSOR STYLE
  // ============================================================================

  const getCursorStyle = useCallback(() => {
    if (isPanning || isSpacePressed) return 'grabbing';
    if (currentTool === 'select') return 'default';
    if (currentTool === 'pen' || currentTool === 'eraser') return 'crosshair';
    if (currentTool === 'sticky-note') return 'cell';
    return 'default';
  }, [isPanning, isSpacePressed, currentTool]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-orange-50 via-white to-orange-50/30">
      {/* Background - fixed dot grid, only pans */}
      <DottedBackground offsetX={viewOffset.x} offsetY={viewOffset.y} />

      {/* Navbar */}
      <MinimizedNavbar
        isExpanded={isNavbarExpanded}
        onToggle={() => setIsNavbarExpanded(!isNavbarExpanded)}
      />

      {/* Ollama Status Chip - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <div className="relative">
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm border transition-all cursor-pointer ${ollamaStatus.connected
              ? 'bg-green-50/90 border-green-300 text-green-700'
              : 'bg-red-50/90 border-red-300 text-red-700'
              }`}
            onClick={() => showThinkingModal && setShowThinkingModal(!showThinkingModal)}
          >
            <div className={`w-2 h-2 rounded-full animate-pulse ${ollamaStatus.connected ? 'bg-green-500' : 'bg-red-500'
              }`} />
            <span className="text-xs font-medium">
              {ollamaStatus.connected ? `Ollama: ${ollamaStatus.model || 'Connected'}` : 'Ollama: Offline'}
            </span>
            {isGenerating && (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </div>

          {/* Thinking Modal */}
          {showThinkingModal && (isGenerating || thinkingText) && (
            <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-orange-200 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-orange-100/50">
                <svg
                  className="w-5 h-5 text-orange-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <h3 className="text-sm font-semibold text-gray-800">Thinking Process</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowThinkingModal(false);
                  }}
                  className="ml-auto p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto p-4">
                {!thinkingText && isGenerating ? (
                  <div className="flex items-center justify-center h-32 text-gray-400">
                    <p className="text-sm">AI thinking process will appear here...</p>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-mono bg-gray-50 p-4 rounded-lg border border-gray-200">
                      {thinkingText || (isGenerating ? "Thinking..." : "")}
                      {isGenerating && (
                        <span className="inline-block w-2 h-4 bg-orange-500 ml-1 animate-pulse" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Panning indicator */}
      {(isSpacePressed || isPanning) && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="bg-orange-500/90 text-white px-4 py-2 rounded-full shadow-lg">
            Panning...
          </div>
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-10"
        style={{ cursor: getCursorStyle(), touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />

      {/* Cards Layer */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          transform: `translate(${viewOffset.x}px, ${viewOffset.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {cards.map(card => (
          <Card
            key={card.id}
            id={card.id}
            title={card.title}
            content={card.content}
            x={card.x}
            y={card.y}
            width={card.width}
            height={card.height}
            isSelected={selectedCardIds.has(card.id)}
            zoom={zoom}
            onSelect={handleCardSelect}
            onMove={handleCardMove}
            onDelete={handleCardDelete}
          />
        ))}
      </div>

      {/* Sticky Notes Layer */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          transform: `translate(${viewOffset.x}px, ${viewOffset.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {stickyNotes.map(note => (
          <div key={note.id} style={{ pointerEvents: 'auto' }}>
            <StickyNote
              id={note.id}
              x={note.x}
              y={note.y}
              text={note.text}
              color={note.color}
              width={note.width}
              height={note.height}
              enableMarkdown={note.enableMarkdown}
              ruled={note.ruled}
              fontSize={note.fontSize}
              fontFamily={note.fontFamily}
              isBold={note.isBold}
              isItalic={note.isItalic}
              isUnderline={note.isUnderline}
              zoom={zoom}
              selectionMode={currentTool === 'select'}
              isSelected={selectedStickyNoteIds.has(note.id)}
              onSelect={handleStickyNoteSelect}
              onUpdate={handleStickyNoteUpdate}
              onDelete={handleStickyNoteDelete}
            />
          </div>
        ))}
      </div>

      {/* AI Actions Panel (when sticky notes or cards selected) */}
      {(selectedStickyNoteIds.size > 0 || selectedCardIds.size > 0) && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-white rounded-xl shadow-xl border border-orange-200 p-4 flex items-center gap-3">
          {isPerformingAction ? (
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-orange-600 font-medium">Generating AI response...</span>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1 pr-3 border-r border-gray-200">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Selected</span>
                <span className="text-lg font-bold text-orange-600">
                  {selectedStickyNoteIds.size + selectedCardIds.size} / 4
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCardAction('summarize')}
                  className="flex flex-col items-center gap-1 px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-xs font-medium transition-all hover:scale-105"
                  title="Generate a concise summary"
                >
                  <FileText className="w-5 h-5" />
                  <span>Summarize</span>
                </button>

                <button
                  onClick={() => handleCardAction('actionPoints')}
                  className="flex flex-col items-center gap-1 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-medium transition-all hover:scale-105"
                  title="Extract actionable bullet points"
                >
                  <ListChecks className="w-5 h-5" />
                  <span>Action Points</span>
                </button>

                <button
                  onClick={() => handleCardAction('mindMap')}
                  className="flex flex-col items-center gap-1 px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-xs font-medium transition-all hover:scale-105"
                  title="Generate concept cards as mind map"
                >
                  <Brain className="w-5 h-5" />
                  <span>Mind Map</span>
                </button>

                <button
                  onClick={() => handleCardAction('flashcards')}
                  className="flex flex-col items-center gap-1 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-medium transition-all hover:scale-105"
                  title="Create Q&A flashcards for studying"
                >
                  <BookOpen className="w-5 h-5" />
                  <span>Flashcards</span>
                </button>
              </div>

              <button
                onClick={() => {
                  setSelectedStickyNoteIds(new Set());
                  setSelectedCardIds(new Set());
                }}
                className="ml-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-medium transition-colors"
                title="Clear selection"
              >
                Clear
              </button>
            </>
          )}
        </div>
      )}

      {/* Dock */}
      <CanvasDock
        currentTool={currentTool}
        currentColor={currentColor}
        strokeWidth={strokeWidth}
        onToolChange={handleToolChange}
        onColorChange={handleColorChange}
        onStrokeWidthChange={handleStrokeWidthChange}
        onUndo={handleUndo}
        onClear={handleClear}
        sidebarOpen={!isNavbarExpanded}
        zoom={zoom}
        onCardAction={handleCardAction}
        hasSelection={selectedStickyNoteIds.size > 0 || selectedCardIds.size > 0}
        onZoomChange={setZoom}
        onZoomReset={() => { setZoom(1); setViewOffset({ x: 0, y: 0 }); }}
        onGenerateCards={handleGenerateCards}
        isGenerating={isGenerating}
      />
    </div>
  );
};

export default BoardPage;
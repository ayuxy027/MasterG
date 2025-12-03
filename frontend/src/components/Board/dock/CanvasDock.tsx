import React, { useMemo, useRef, useState, useEffect } from "react"
import { HiOutlineCursorClick } from "react-icons/hi"
import {
  LuPencil,
  LuPalette,
  LuRotateCcw,
  LuRotateCw,
  LuTrash2,
  LuEraser,
  LuChevronDown,
  LuSparkles,
  LuZoomIn,
  LuZoomOut,
  LuDownload,
} from "react-icons/lu"
import { MdOutlineEventNote } from "react-icons/md"
import { IoText } from "react-icons/io5"
import {
  Bot,
  X,
  List,
  Target,
  GitBranch,
  Layers,
  Trash2,
  CircleDot,
} from "lucide-react"

export type EraserMode = "pixel" | "element"

interface CanvasDockProps {
  currentTool: string
  currentColor: string
  strokeWidth: number
  eraserMode?: EraserMode
  onToolChange: (tool: string) => void
  onColorChange: (color: string) => void
  onStrokeWidthChange: (width: number) => void
  onEraserModeChange?: (mode: EraserMode) => void
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
  onExport?: () => void
  sidebarOpen?: boolean
  query?: string
  setQuery?: (query: string) => void
  onQuerySubmit?: (e: React.FormEvent) => void
  isLoading?: boolean
  activeToolbarOption?: string
  onToolbarOptionChange?: (option: string) => void
  zoom?: number
  onZoomChange?: (zoom: number) => void
  onZoomReset?: () => void
  canUndo?: boolean
  canRedo?: boolean
  onDockHover?: (isHovering: boolean) => void
}

const CanvasDock: React.FC<CanvasDockProps> = ({
  currentTool,
  currentColor,
  strokeWidth,
  eraserMode = "pixel",
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onEraserModeChange,
  onUndo,
  onRedo,
  onClear,
  onExport,
  sidebarOpen = true,
  query = "",
  setQuery,
  onQuerySubmit,
  isLoading = false,
  activeToolbarOption = "summarise",
  onToolbarOptionChange,
  zoom = 1,
  onZoomChange,
  onZoomReset,
  canUndo = true,
  canRedo = false,
  onDockHover,
}) => {
  const [isOverflowOpen, setIsOverflowOpen] = useState(false)
  const [isQueryPanelOpen, setIsQueryPanelOpen] = useState(false)
  const [isToolbarOpen, setIsToolbarOpen] = useState(false)
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false)
  const overflowRef = useRef<HTMLDivElement | null>(null)
  const queryPanelRef = useRef<HTMLDivElement | null>(null)
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const colorInputRef = useRef<HTMLInputElement | null>(null)
  const colorPickerRef = useRef<HTMLDivElement | null>(null)

  // Classic ink colors that work well on white background
  const defaultColors = [
    "#1A1A1A", // Rich Black
    "#374151", // Charcoal Gray
    "#1E40AF", // Deep Blue
    "#047857", // Forest Green
    "#B91C1C", // Crimson Red
    "#7C3AED", // Royal Purple
  ]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (overflowRef.current && !overflowRef.current.contains(target)) {
        setIsOverflowOpen(false)
      }
      if (queryPanelRef.current && !queryPanelRef.current.contains(target)) {
        setIsQueryPanelOpen(false)
      }
      if (toolbarRef.current && !toolbarRef.current.contains(target)) {
        setIsToolbarOpen(false)
      }
      if (colorPickerRef.current && !colorPickerRef.current.contains(target)) {
        setIsColorPickerOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const primaryTools = useMemo(
    () => [
      { id: "select", icon: HiOutlineCursorClick, label: "Select" },
      { id: "pen", icon: LuPencil, label: "Pen" },
      { id: "eraser", icon: LuEraser, label: "Eraser" },
      { id: "sticky-note", icon: MdOutlineEventNote, label: "Note" },
      { id: "text", icon: IoText, label: "Text" },
    ],
    []
  )

  const overflowTools = useMemo(
    () => [
      { id: "query", icon: Bot, label: "Generate", action: "query" },
      { id: "toolbar", icon: LuSparkles, label: "Modes", action: "toolbar" },
    ],
    []
  )

  const toolbarOptions = useMemo(
    () => [
      { id: "summarise", label: "Summarise", icon: List },
      { id: "action-points", label: "Action points", icon: Target },
      { id: "timeline", label: "Timeline", icon: GitBranch },
      { id: "breakdown", label: "Breakdown", icon: Layers },
    ],
    []
  )

  return (
    <div
      className="fixed bottom-8 sm:bottom-10 left-1/2 -translate-x-1/2 z-50 w-auto max-w-[95vw]"
      style={{ cursor: "default" }}
      onMouseEnter={() => onDockHover?.(true)}
      onMouseLeave={() => onDockHover?.(false)}
    >
      <div className="relative">
        {/* Outer gradient border for premium matte ring */}
        <div className="rounded-2xl bg-linear-to-br from-orange-100/50 to-orange-50/30 p-0.5 shadow-xl border border-orange-200/60 overflow-visible">
          {/* Inner frosted glass panel */}
          <div
            className="rounded-2xl px-3 sm:px-6 py-3 sm:py-4 backdrop-blur-xl bg-white/90 shadow-lg overflow-visible"
            style={{ cursor: "default" }}
          >
            <div className="flex items-center justify-between gap-4 sm:gap-8">
              {/* Left Section - Primary Tools */}
              <div className="flex items-center gap-1 sm:gap-2">
                {primaryTools.map((tool) => {
                  const IconComponent = tool.icon as React.ComponentType<{
                    size?: number
                    className?: string
                  }>
                  const isActive = currentTool === tool.id
                  const isEraser = tool.id === "eraser"

                  return (
                    <div key={tool.id} className="relative">
                      <button
                        onClick={() => onToolChange(tool.id)}
                        style={{
                          cursor: "pointer",
                          transform: isActive
                            ? "translateY(-2px)"
                            : "translateY(0px)",
                        }}
                        className={`group flex flex-col items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-all duration-300 ease-out focus:outline-none ${
                          isActive
                            ? "bg-orange-400 text-white shadow-[0_8px_24px_rgba(249,115,22,0.25)]"
                            : "text-orange-500 hover:bg-orange-50"
                        }`}
                        title={tool.label}
                      >
                        <IconComponent size={18} />
                        <span
                          className={`text-[10px] sm:text-[11px] leading-none font-medium ${
                            isActive ? "text-white" : "opacity-80"
                          }`}
                        >
                          {tool.label}
                        </span>
                      </button>

                      {/* Eraser Mode Dropdown - Only show when eraser is active */}
                      {isEraser && isActive && onEraserModeChange && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-xl shadow-xl border border-orange-200/60 p-2 min-w-[140px] z-100">
                          <div className="text-[10px] uppercase text-gray-400 font-semibold mb-1.5 px-2">
                            Eraser Mode
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onEraserModeChange("pixel")
                            }}
                            style={{ cursor: "pointer" }}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                              eraserMode === "pixel"
                                ? "bg-orange-100 text-orange-600"
                                : "text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            <CircleDot size={14} />
                            <span>Pixel Erase</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onEraserModeChange("element")
                            }}
                            style={{ cursor: "pointer" }}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                              eraserMode === "element"
                                ? "bg-orange-100 text-orange-600"
                                : "text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            <Trash2 size={14} />
                            <span>Element Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Overflow tools */}
                <div className="relative" ref={overflowRef}>
                  <button
                    onClick={() => setIsOverflowOpen((v) => !v)}
                    className={`ml-0.5 sm:ml-1 flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-all duration-300 ${
                      isOverflowOpen
                        ? "bg-orange-400 text-white shadow-md"
                        : "text-orange-500 hover:bg-orange-50"
                    }`}
                    title="More tools"
                  >
                    <LuChevronDown
                      size={16}
                      className={
                        isOverflowOpen ? "rotate-180 transition-transform" : ""
                      }
                    />
                    <span className="text-[10px] sm:text-[11px] font-medium opacity-80">
                      More
                    </span>
                  </button>

                  {isOverflowOpen && (
                    <div className="absolute bottom-full mb-2 left-0 min-w-40 rounded-xl p-2 backdrop-blur-xl bg-white/95 shadow-xl border border-orange-200/60 z-100">
                      <div className="grid grid-cols-3 gap-2">
                        {overflowTools.map((tool) => {
                          const Icon = tool.icon as React.ComponentType<{
                            size?: number
                            className?: string
                          }>
                          const isActive = currentTool === tool.id
                          const isAction = (tool as any).action

                          return (
                            <button
                              key={tool.id}
                              onClick={() => {
                                if (isAction === "query") {
                                  setIsQueryPanelOpen(true)
                                  setIsOverflowOpen(false)
                                } else if (isAction === "toolbar") {
                                  setIsToolbarOpen(true)
                                  setIsOverflowOpen(false)
                                } else {
                                  onToolChange(tool.id)
                                  setIsOverflowOpen(false)
                                }
                              }}
                              className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all ${
                                isActive
                                  ? "bg-orange-400 text-white shadow-md"
                                  : "text-orange-500 hover:bg-orange-50"
                              }`}
                              title={tool.label}
                            >
                              <Icon size={18} />
                              <span className="text-[10px] leading-none">
                                {tool.label}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Query Panel */}
                  {isQueryPanelOpen && (
                    <div
                      ref={queryPanelRef}
                      className="absolute bottom-full mb-2 left-0 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-orange-200/60 p-4 z-100"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Bot size={20} className="text-orange-500" />
                          <h3 className="text-sm font-semibold text-gray-800">
                            Generate Cards
                          </h3>
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
                      className="absolute bottom-full mb-2 left-0 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-orange-200/60 p-3 z-100"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-800">
                          Content Modes
                        </h3>
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
                          const IconComponent = option.icon
                          const isActive = activeToolbarOption === option.id
                          return (
                            <button
                              key={option.id}
                              onClick={() => {
                                onToolbarOptionChange?.(option.id)
                                setIsToolbarOpen(false)
                              }}
                              className={`group flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 ease-out focus:outline-none ${
                                isActive
                                  ? "bg-orange-400 text-white shadow-[0_8px_24px_rgba(249,115,22,0.25)]"
                                  : "text-orange-500 hover:bg-orange-50"
                              }`}
                              style={{
                                transform: isActive
                                  ? "translateY(-1px)"
                                  : "translateY(0px)",
                              }}
                            >
                              <IconComponent size={14} />
                              <span className="text-xs font-medium">
                                {option.label}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Center Section - Color and Size */}
              <div className="flex items-center gap-3 sm:gap-6">
                {/* Color Picker Button */}
                <div className="relative" ref={colorPickerRef}>
                  <button
                    type="button"
                    onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                    className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl hover:bg-orange-50 transition-all"
                    style={{ cursor: "pointer" }}
                  >
                    <LuPalette size={18} className="text-orange-500" />
                    <div
                      className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-orange-300 shadow-sm"
                      style={{ backgroundColor: currentColor }}
                    />
                  </button>

                  {/* Color Picker Popup */}
                  {isColorPickerOpen && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-white rounded-xl shadow-xl border border-orange-200/60 p-4 min-w-[200px] z-100">
                      <div className="text-xs uppercase text-gray-400 font-semibold mb-3 tracking-wide">
                        Ink Colors
                      </div>

                      {/* Color Grid */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {defaultColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            aria-label={`Select color ${color}`}
                            onClick={() => {
                              onColorChange(color)
                              setIsColorPickerOpen(false)
                            }}
                            style={{
                              backgroundColor: color,
                              cursor: "pointer",
                            }}
                            className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-105 ${
                              currentColor.toUpperCase() === color.toUpperCase()
                                ? "border-orange-400 ring-2 ring-offset-2 ring-orange-300"
                                : "border-transparent hover:border-gray-300"
                            }`}
                          />
                        ))}
                      </div>

                      {/* Divider */}
                      <div className="border-t border-gray-200 my-3"></div>

                      {/* Custom Color */}
                      <button
                        type="button"
                        onClick={() => colorInputRef.current?.click()}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-600"
                        style={{ cursor: "pointer" }}
                      >
                        <div
                          className="w-6 h-6 rounded-md border border-gray-300"
                          style={{
                            background: `conic-gradient(red, yellow, lime, aqua, blue, magenta, red)`,
                          }}
                        />
                        <span>Custom Color...</span>
                      </button>
                      <input
                        ref={colorInputRef}
                        type="color"
                        value={currentColor}
                        onChange={(e) => {
                          onColorChange(e.target.value)
                          setIsColorPickerOpen(false)
                        }}
                        className="sr-only"
                      />
                    </div>
                  )}
                </div>

                {/* Stroke Width */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-xs sm:text-sm text-orange-500 font-medium hidden sm:inline">
                    Size
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={strokeWidth}
                    onChange={(e) =>
                      onStrokeWidthChange(Number(e.target.value))
                    }
                    className="w-16 sm:w-24 accent-orange-500 cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm text-orange-500 w-5 sm:w-6 font-semibold tabular-nums">
                    {strokeWidth}
                  </span>
                </div>

                {/* Zoom Controls */}
                <div className="hidden md:flex items-center gap-2 border-l border-orange-200 pl-4 ml-2">
                  <button
                    onClick={() => onZoomChange?.(Math.max(0.25, zoom - 0.1))}
                    className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                    title="Zoom Out"
                  >
                    <LuZoomOut size={16} />
                  </button>
                  <button
                    onClick={onZoomReset}
                    className="text-sm text-orange-500 font-medium min-w-12 text-center hover:bg-orange-50 px-2 py-1 rounded-lg transition-all"
                    title="Reset Zoom"
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <button
                    onClick={() => onZoomChange?.(Math.min(3, zoom + 0.1))}
                    className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                    title="Zoom In"
                  >
                    <LuZoomIn size={16} />
                  </button>
                </div>
              </div>

              {/* Right Section - Actions */}
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={onUndo}
                  disabled={!canUndo}
                  className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-all duration-300 ${
                    canUndo
                      ? "text-orange-500 hover:bg-orange-50 hover:scale-105"
                      : "text-orange-300 cursor-not-allowed"
                  }`}
                  title="Undo (Ctrl+Z)"
                >
                  <LuRotateCcw size={16} />
                  <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                    Undo
                  </span>
                </button>
                <button
                  onClick={onRedo}
                  disabled={!canRedo}
                  className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-all duration-300 ${
                    canRedo
                      ? "text-orange-500 hover:bg-orange-50 hover:scale-105"
                      : "text-orange-300 cursor-not-allowed"
                  }`}
                  title="Redo (Ctrl+Shift+Z)"
                >
                  <LuRotateCw size={16} />
                  <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                    Redo
                  </span>
                </button>
                <button
                  onClick={onClear}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-orange-500 hover:bg-orange-50 rounded-xl transition-all duration-300 hover:scale-105"
                  title="Clear Canvas"
                >
                  <LuTrash2 size={16} />
                  <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                    Clear
                  </span>
                </button>
                <div className="border-l border-orange-200 h-5 sm:h-6 mx-0.5 sm:mx-1 hidden sm:block" />
                <button
                  onClick={onExport}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-orange-500 hover:bg-orange-50 rounded-xl transition-all duration-300 hover:scale-105"
                  title="Export as PNG"
                >
                  <LuDownload size={16} />
                  <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                    Export
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CanvasDock

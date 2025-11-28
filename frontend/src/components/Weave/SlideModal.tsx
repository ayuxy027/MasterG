import React from "react"
import { Slide } from "../../types/presentation"

interface SlideModalProps {
  slide: Slide
  totalSlides: number
  currentIndex: number
  templateStyle: string
  isOpen: boolean
  onClose: () => void
  onPrevious: () => void
  onNext: () => void
}

/**
 * Full-screen slide modal for detailed view
 * Shows the slide image with all content details
 */
const SlideModal: React.FC<SlideModalProps> = ({
  slide,
  totalSlides,
  currentIndex,
  templateStyle,
  isOpen,
  onClose,
  onPrevious,
  onNext,
}) => {
  if (!isOpen) return null

  // Template-based gradient backgrounds
  const templateGradients: Record<string, string> = {
    modern: "from-orange-400 to-orange-600",
    classic: "from-blue-500 to-blue-700",
    creative: "from-purple-500 to-pink-500",
    professional: "from-gray-700 to-gray-900",
    educational: "from-green-500 to-teal-600",
    minimal: "from-slate-400 to-slate-600",
  }

  const gradient = templateGradients[templateStyle] || templateGradients.modern

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") onPrevious()
      if (e.key === "ArrowRight") onNext()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose, onPrevious, onNext])

  // Format content into bullet points
  const contentBullets = slide.content
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
        >
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Navigation buttons */}
        <button
          onClick={onPrevious}
          disabled={currentIndex === 0}
          className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full transition-all ${
            currentIndex === 0
              ? "bg-white/5 text-white/30 cursor-not-allowed"
              : "bg-white/10 hover:bg-white/20 text-white"
          }`}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <button
          onClick={onNext}
          disabled={currentIndex === totalSlides - 1}
          className={`absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full transition-all ${
            currentIndex === totalSlides - 1
              ? "bg-white/5 text-white/30 cursor-not-allowed"
              : "bg-white/10 hover:bg-white/20 text-white"
          }`}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>

        {/* Slide content */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Slide header with gradient */}
          <div className={`bg-gradient-to-r ${gradient} p-1`}>
            <div className="bg-white rounded-t-xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-500">
                  Slide {currentIndex + 1} of {totalSlides}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 bg-orange-100 text-orange-600 rounded-full">
                    {templateStyle}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Slide image/preview */}
            <div
              className={`aspect-video lg:aspect-auto lg:min-h-[400px] bg-gradient-to-br ${gradient} relative`}
            >
              {slide.imageUrl ? (
                <img
                  src={slide.imageUrl}
                  alt={slide.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                /* Fallback styled preview */
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-white">
                  <h2 className="text-3xl font-bold mb-6 text-center">
                    {slide.title}
                  </h2>
                  <div className="space-y-3 w-full max-w-md">
                    {contentBullets.slice(0, 5).map((bullet, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="w-2 h-2 bg-white/80 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-white/90 text-lg">{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Slide details */}
            <div className="p-6 lg:p-8 overflow-y-auto max-h-[60vh] lg:max-h-[500px]">
              {/* Title */}
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                {slide.title}
              </h3>

              {/* Content */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Content
                </h4>
                <div className="space-y-2">
                  {contentBullets.map((bullet, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="w-2 h-2 bg-orange-400 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-gray-700">{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Speaker notes */}
              {slide.speakerNotes && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                      />
                    </svg>
                    Speaker Notes
                  </h4>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {slide.speakerNotes}
                  </p>
                </div>
              )}

              {/* Image prompt info */}
              {slide.imagePrompt && (
                <div className="mt-4 text-xs text-gray-400">
                  <span className="font-medium">Image prompt:</span>{" "}
                  {slide.imagePrompt}
                </div>
              )}
            </div>
          </div>

          {/* Slide navigation dots */}
          <div className="flex items-center justify-center gap-2 py-4 bg-gray-50 border-t border-gray-100">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  // Navigate to specific slide
                  const diff = i - currentIndex
                  if (diff > 0) {
                    for (let j = 0; j < diff; j++) onNext()
                  } else {
                    for (let j = 0; j < Math.abs(diff); j++) onPrevious()
                  }
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentIndex
                    ? "w-6 bg-orange-400"
                    : "bg-gray-300 hover:bg-gray-400"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 text-white/60 text-xs">
          <span className="flex items-center gap-1">
            <kbd className="px-2 py-1 bg-white/10 rounded">←</kbd>
            <span>Previous</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-2 py-1 bg-white/10 rounded">→</kbd>
            <span>Next</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-2 py-1 bg-white/10 rounded">Esc</kbd>
            <span>Close</span>
          </span>
        </div>
      </div>
    </div>
  )
}

export default SlideModal

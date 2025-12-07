import React, { useState } from "react"
import { Slide } from "../../types/presentation"

interface SlidePreviewProps {
  slide: Slide
  index: number
  templateStyle: string
  onExpand?: () => void
}

/**
 * Individual slide preview component
 * Displays the generated slide image with hover details
 */
const SlidePreview: React.FC<SlidePreviewProps> = ({
  slide,
  index,
  templateStyle,
  onExpand,
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

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

  const hasValidImage = slide.imageUrl && !imageError

  return (
    <div
      className="group bg-white rounded-xl border-2 border-orange-200 overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:border-orange-300 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onExpand}
    >
      {/* Slide Image Preview */}
      <div className="relative aspect-video overflow-hidden">
        {hasValidImage ? (
          <>
            {/* Actual generated slide image */}
            <img
              src={slide.imageUrl}
              alt={`Slide ${index + 1}: ${slide.title}`}
              className={`w-full h-full object-cover transition-all duration-300 ${
                isHovered ? "scale-105" : "scale-100"
              } ${imageLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
            {/* Loading skeleton */}
            {!imageLoaded && (
              <div
                className={`absolute inset-0 bg-gradient-to-br ${gradient} animate-pulse flex items-center justify-center`}
              >
                <svg
                  className="w-12 h-12 text-white/60 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            )}
          </>
        ) : (
          /* Fallback gradient background with slide info */
          <div
            className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center p-4`}
          >
            {/* Slide number badge */}
            <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
              <span className="text-white text-xs font-semibold">
                {index + 1}
              </span>
            </div>

            {/* Title preview */}
            <div className="text-center">
              <h4 className="text-white font-bold text-lg mb-2 line-clamp-2 px-4">
                {slide.title}
              </h4>
              <div className="w-16 h-0.5 bg-white/40 mx-auto rounded-full" />
            </div>

            {/* Content preview bullets */}
            <div className="mt-4 space-y-1 w-full max-w-xs">
              {slide.content
                .split("\n")
                .filter((l) => l.trim())
                .slice(0, 3)
                .map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-white/80"
                  >
                    <span className="w-1.5 h-1.5 bg-white/60 rounded-full" />
                    <div
                      className="h-2 bg-white/30 rounded"
                      style={{ width: `${60 + Math.random() * 30}%` }}
                    />
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Hover overlay with expand hint */}
        <div
          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="text-center">
            <svg
              className="w-10 h-10 text-white mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
              />
            </svg>
            <span className="text-white text-sm font-medium">
              Click to expand
            </span>
          </div>
        </div>
      </div>

      {/* Slide info footer */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-semibold text-gray-800 text-sm sm:text-base line-clamp-1 flex-1">
            {slide.title}
          </h4>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            #{index + 1}
          </span>
        </div>
        <div className="text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-3">
          {slide.content.split("\n")[0]}
        </div>

        {/* Speaker notes indicator */}
        {slide.speakerNotes && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
            <span>Speaker notes available</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default SlidePreview

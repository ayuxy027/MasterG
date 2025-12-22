import React from "react";
import type { GeneratedPoster } from "../../types/poster";

interface GenerationResultsProps {
  posters: GeneratedPoster[];
  isGenerating: boolean;
  count: number;
  onDownload: (poster: GeneratedPoster, index: number) => void;
  onDownloadAll: () => void;
  onClearHistory?: () => void;
}

const GenerationResults: React.FC<GenerationResultsProps> = ({
  posters,
  isGenerating,
  count,
  onDownload,
  onDownloadAll,
  onClearHistory,
}) => {
  // Determine grid columns based on number of images
  const getGridClass = () => {
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-1 md:grid-cols-2";
    return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"; // Default for 3 or more
  };

  // Show loading state
  if (isGenerating) {
    return (
      <div className="bg-white/80 backdrop-blur-md rounded-2xl p-12 shadow-xl border-2 border-orange-100">
        <div className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500 mb-6"></div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            Generating Educational Posters...
          </h3>
          <p className="text-gray-600 text-center max-w-md">
            Our AI is creating culturally relevant and educationally appropriate
            images using Google Imagen 3.0
          </p>
        </div>
      </div>
    );
  }

  // Show empty state
  if (posters.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-md rounded-2xl p-12 shadow-xl border-2 border-orange-100">
        <div className="flex flex-col items-center justify-center text-center">
          <svg
            className="w-24 h-24 text-orange-200 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No Posters Generated Yet
          </h3>
          <p className="text-gray-500 max-w-md">
            Enter a prompt and click "Generate Educational Posters" to create
            AI-powered educational images
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 overflow-hidden">
      {/* Header with Download All Button */}
      <div className="p-4 sm:p-6 border-b-2 border-orange-200/60 flex justify-between items-center">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-gray-800">
            Generated Educational Posters
          </h3>
          <p className="text-gray-600 text-xs sm:text-sm">
            {posters.length} poster{posters.length > 1 ? "s" : ""} created
            successfully
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onClearHistory && (
            <button
              onClick={onClearHistory}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors shadow-sm border border-gray-200"
              title="Clear poster history"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span className="hidden sm:inline">Clear History</span>
            </button>
          )}
          {posters.length > 1 && (
            <button
              onClick={onDownloadAll}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors shadow-md"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download All
            </button>
          )}
        </div>
      </div>

      {/* Posters Grid */}
      <div className="p-8">
        <div className={`grid ${getGridClass()} gap-6`}>
          {posters.map((poster, index) => (
            <div
              key={`${poster.imageBase64.substring(0, 20)}-${index}`}
              className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 bg-white flex items-center justify-center"
              style={{ minHeight: "300px" }}
            >
              <img
                src={`data:${poster.mimeType};base64,${poster.imageBase64}`}
                alt={`Educational poster ${index + 1}`}
                className="w-full h-full object-contain max-h-[600px] transition-transform duration-500 group-hover:scale-105"
                style={{ objectFit: "contain" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-5">
                <div className="text-white">
                  <h4 className="font-bold text-lg">Poster #{index + 1}</h4>
                  <p className="text-orange-200 text-sm">
                    Click download to save
                  </p>
                </div>
              </div>
              <button
                onClick={() => onDownload(poster, index)}
                className="absolute top-4 right-4 bg-orange-500 text-white rounded-full p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-orange-600 transform hover:scale-110"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GenerationResults;

import React from "react";

const StitchPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-gray-800 mb-4">
            <span className="text-orange-400">Stitch</span> - Coming Soon
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            A new feature is being stitched together. Stay tuned!
          </p>
        </div>

        {/* Placeholder Content */}
        <div className="bg-white rounded-xl shadow-lg p-8 sm:p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="mb-6">
              <svg
                className="w-24 h-24 mx-auto text-orange-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 13.44 4.442 17.082A2 2 0 0 0 4.982 21H19a2 2 0 0 0 .558-3.921l-1.115-.32A2 2 0 0 1 17 14.837V7.66"
                ></path>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m7 10.56 12.558-3.642A2 2 0 0 0 19.018 3H5a2 2 0 0 0-.558 3.921l1.115.32A2 2 0 0 1 7 9.163v7.178"
                ></path>
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Feature Under Development
            </h2>
            <p className="text-gray-600 mb-6">
              We're working on something exciting! This feature will be available soon.
            </p>
            <div className="flex justify-center gap-4">
              <a
                href="/chat"
                className="bg-orange-400 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-500 transition-all shadow-md hover:shadow-lg"
              >
                Try Chat Instead
              </a>
              <a
                href="/board"
                className="bg-white text-orange-400 border-2 border-orange-400 px-6 py-3 rounded-lg font-semibold hover:bg-orange-50 transition-all"
              >
                Try Whiteboard
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StitchPage;


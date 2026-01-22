import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface MinimizedNavbarProps {
  isExpanded: boolean;
  onToggle: () => void;
}

const MinimizedNavbar: React.FC<MinimizedNavbarProps> = ({ isExpanded, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Minimized M Button */}
      {!isExpanded && (
        <button
          onClick={onToggle}
          className="fixed left-4 top-1/2 -translate-y-1/2 z-40 w-11 h-11 rounded-full bg-white/90 border border-orange-200 shadow-lg transition-all duration-300 flex items-center justify-center hover:-translate-x-0.5 hover:shadow-xl"
          title="Expand Menu"
        >
          <span className="text-sm font-semibold tracking-tight text-orange-500">MG</span>
        </button>
      )}

      {/* Expanded Side Navbar */}
      {isExpanded && (
        <>
          {/* Side Panel */}
          <div className="fixed left-5 top-1/2 -translate-y-1/2 w-64 max-h-[80vh] bg-white/95 backdrop-blur-xl shadow-2xl z-50 transform transition-transform duration-300 flex flex-col rounded-2xl border border-orange-100/80 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-orange-100/80 bg-gradient-to-r from-orange-50/80 via-white to-orange-50/40">
              <a
                href="/"
                className="text-xl font-semibold tracking-tight text-orange-500 hover:text-orange-600 transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/');
                  onToggle();
                }}
              >
                MasterG
              </a>
              <button
                onClick={onToggle}
                className="text-orange-400 hover:text-orange-600 transition-colors p-1.5 hover:bg-orange-50 rounded-lg"
                title="Collapse Menu"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto">
              <a
                href="/stitch"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${isActive('/stitch')
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-orange-600 hover:bg-orange-50/80 hover:text-orange-700'
                  }`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/stitch');
                  onToggle();
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 13.44 4.442 17.082A2 2 0 0 0 4.982 21H19a2 2 0 0 0 .558-3.921l-1.115-.32A2 2 0 0 1 17 14.837V7.66"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m7 10.56 12.558-3.642A2 2 0 0 0 19.018 3H5a2 2 0 0 0-.558 3.921l1.115.32A2 2 0 0 1 7 9.163v7.178"></path>
                </svg>
                Stitch
              </a>
              <a
                href="/chat"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${isActive('/chat')
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-orange-600 hover:bg-orange-50/80 hover:text-orange-700'
                  }`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/chat');
                  onToggle();
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V2H8" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11v2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 12h2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 16a2 2 0 0 1-2 2H8.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 4 20.286V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 11v2" />
                </svg>
                Chat
              </a>
              <a
                href="/lmr"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${isActive('/lmr')
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-orange-600 hover:bg-orange-50/80 hover:text-orange-700'
                  }`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/lmr');
                  onToggle();
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                LMR
              </a>
              <a
                href="/board"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${isActive('/board')
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-orange-600 hover:bg-orange-50/80 hover:text-orange-700'
                  }`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/board');
                  onToggle();
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 6h4"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 10h4"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 14h4"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 18h4"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"></path>
                </svg>
                Whiteboard
              </a>
              <a
                href="/posters"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${isActive('/posters')
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-orange-600 hover:bg-orange-50/80 hover:text-orange-700'
                  }`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/posters');
                  onToggle();
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                Posters
              </a>
            </nav>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-orange-100/80 bg-gradient-to-r from-white to-orange-50/60 space-y-2">
              <a
                href="https://github.com/ayuxy027/MasterG"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full h-10 text-orange-600 hover:text-orange-700 hover:bg-orange-50/80 rounded-xl transition-all"
                onClick={onToggle}
                title="View on GitHub"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              <a
                href="/chat"
                className="block w-full bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-orange-600 transition-all text-center shadow-md hover:shadow-lg"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/chat');
                  onToggle();
                }}
              >
                Start Learning
              </a>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default MinimizedNavbar;

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
          className="fixed left-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-orange-400 hover:bg-orange-500 text-white font-bold text-lg shadow-lg transition-all duration-300 flex items-center justify-center hover:scale-110"
          title="Expand Menu"
        >
          M
        </button>
      )}

      {/* Expanded Drawer */}
      {isExpanded && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
            onClick={onToggle}
          />

          {/* Drawer */}
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-white/95 backdrop-blur-md shadow-2xl z-50 transform transition-transform duration-300 flex flex-col border-r-2 border-orange-200/60">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b-2 border-orange-200/60">
              <a href="/" className="text-2xl font-bold text-orange-500 hover:text-orange-600 transition-colors">
                MasterG
              </a>
              <button
                onClick={onToggle}
                className="text-orange-500 hover:text-orange-600 transition-colors p-1.5 hover:bg-orange-50 rounded-lg"
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
            <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
              <a
                href="/chat"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive('/chat')
                  ? 'bg-orange-400 text-white font-semibold shadow-md'
                  : 'text-orange-500 hover:bg-orange-50'
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
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive('/lmr')
                  ? 'bg-orange-400 text-white font-semibold shadow-md'
                  : 'text-orange-500 hover:bg-orange-50'
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
                href="/weave"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive('/weave')
                  ? 'bg-orange-400 text-white font-semibold shadow-md'
                  : 'text-orange-500 hover:bg-orange-50'
                  }`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/weave');
                  onToggle();
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 13.44 4.442 17.082A2 2 0 0 0 4.982 21H19a2 2 0 0 0 .558-3.921l-1.115-.32A2 2 0 0 1 17 14.837V7.66"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m7 10.56 12.558-3.642A2 2 0 0 0 19.018 3H5a2 2 0 0 0-.558 3.921l1.115.32A2 2 0 0 1 7 9.163v7.178"></path>
                </svg>
                Weave
              </a>
              <a
                href="/board"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive('/board')
                  ? 'bg-orange-400 text-white font-semibold shadow-md'
                  : 'text-orange-500 hover:bg-orange-50'
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
            </nav>

            {/* Footer */}
            <div className="p-4 border-t-2 border-orange-200/60">
              <a
                href="/chat"
                className="block w-full bg-orange-400 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-orange-500 transition-all text-center shadow-md hover:shadow-lg"
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

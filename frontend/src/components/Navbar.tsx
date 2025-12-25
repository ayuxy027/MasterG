import React, { useState, useEffect } from "react";

interface NavbarProps {
  alwaysVisible?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ alwaysVisible = false }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  useEffect(() => {
    if (alwaysVisible) {
      setIsVisible(true);
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down
        setIsVisible(false);
      } else {
        // Scrolling up
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY, alwaysVisible]);

  return (
    <>
      <header
        className={`flex items-center justify-between px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 shadow-lg max-w-5xl rounded-full mx-auto w-full bg-white/80 backdrop-blur-md border border-orange-200/60 transition-transform duration-300 ${isVisible ? "translate-y-0" : "-translate-y-24"
          }`}
      >
        <a
          href="/"
          className="text-lg sm:text-xl md:text-2xl font-bold text-orange-500"
        >
          MasterG
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-orange-500 text-sm font-medium">
          <a
            className="hover:text-orange-600 flex items-center gap-2 transition-colors"
            href="/stitch"
          >
            <svg
              className="w-5 h-5"
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
            Stitch
          </a>
          <a
            className="hover:text-orange-600 flex items-center gap-2 transition-colors"
            href="/chat"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6V2H8"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11v2" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h2" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12h2" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 16a2 2 0 0 1-2 2H8.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 4 20.286V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 11v2" />
            </svg>
            Chat
          </a>
          <a
            className="hover:text-orange-600 flex items-center gap-2 transition-colors"
            href="/lmr"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              ></path>
            </svg>
            LMR
          </a>
          <a
            className="hover:text-orange-600 flex items-center gap-2 transition-colors"
            href="/board"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"
              ></path>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M2 6h4"
              ></path>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M2 10h4"
              ></path>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M2 14h4"
              ></path>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M2 18h4"
              ></path>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"
              ></path>
            </svg>
            Whiteboard
          </a>
          <a
            className="hover:text-orange-600 flex items-center gap-2 transition-colors"
            href="/posters"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              ></path>
            </svg>
            Posters
          </a>
        </nav>

        <div className="flex items-center gap-3 sm:gap-4">
          <a
            href="https://github.com/ayuxy027/MasterG"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center justify-center w-9 h-9 text-orange-500 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-all"
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
            className="hidden md:flex bg-orange-400 text-white px-4 md:px-5 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold hover:bg-orange-500 transition-all shadow-md"
            href="/chat"
          >
            Start Learning
          </a>
          <button
            type="button"
            onClick={toggleMenu}
            className="md:hidden text-orange-500 p-1.5 hover:bg-orange-50 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {isMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      <>
        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ease-out ${isMenuOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
            }`}
          onClick={closeMenu}
        />

        {/* Mobile Menu Panel */}
        <div
          className={`fixed top-20 left-1/2 transform -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm bg-white/95 backdrop-blur-md border-2 border-orange-200/60 rounded-xl shadow-xl z-50 md:hidden py-2.5 px-3 transition-all duration-300 ease-out ${isMenuOpen
              ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
              : "opacity-0 -translate-y-4 scale-95 pointer-events-none"
            }`}
        >
          <nav className="flex flex-col gap-1">
            <a
              className="flex items-center gap-2.5 px-3 py-2 text-orange-500 text-sm font-medium rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-all"
              href="/stitch"
              onClick={closeMenu}
            >
              <svg
                className="w-4 h-4"
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
              Stitch
            </a>
            <a
              className="flex items-center gap-2.5 px-3 py-2 text-orange-500 text-sm font-medium rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-all"
              href="/chat"
              onClick={closeMenu}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6V2H8"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 11v2"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2 12h2"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20 12h2"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20 16a2 2 0 0 1-2 2H8.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 4 20.286V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 11v2"
                />
              </svg>
              Chat
            </a>
            <a
              className="flex items-center gap-2.5 px-3 py-2 text-orange-500 text-sm font-medium rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-all"
              href="/lmr"
              onClick={closeMenu}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                ></path>
              </svg>
              LMR
            </a>
            <a
              className="flex items-center gap-2.5 px-3 py-2 text-orange-500 text-sm font-medium rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-all"
              href="/board"
              onClick={closeMenu}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"
                ></path>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M2 6h4"
                ></path>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M2 10h4"
                ></path>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M2 14h4"
                ></path>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M2 18h4"
                ></path>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"
                ></path>
              </svg>
              Whiteboard
            </a>
            <a
              className="flex items-center gap-2.5 px-3 py-2 text-orange-500 text-sm font-medium rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-all"
              href="/posters"
              onClick={closeMenu}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                ></path>
              </svg>
              Posters
            </a>
            <a
              href="https://github.com/ayuxy027/MasterG"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-10 h-10 text-orange-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
              onClick={closeMenu}
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
              className="flex items-center justify-center gap-2 mt-1.5 px-3 py-2 bg-orange-400 text-white text-sm font-semibold rounded-lg hover:bg-orange-500 transition-all shadow-md"
              href="/chat"
              onClick={closeMenu}
            >
              Start Learning
            </a>
          </nav>
        </div>
      </>
    </>
  );
};

export default Navbar;

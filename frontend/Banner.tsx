import React from "react";

interface BannerProps {
    isVisible?: boolean;
}

const Banner: React.FC<BannerProps> = ({ isVisible = true }) => (
    <div 
        className={`fixed top-0 left-0 right-0 z-[60] flex flex-wrap items-center justify-center w-full h-[40px] sm:h-[44px] px-3 sm:px-4 font-medium text-xs sm:text-sm text-white text-center bg-gradient-to-b from-orange-500 to-orange-600 gap-2 sm:gap-3 transition-opacity duration-300 ${
            isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
    >
        <p className="flex-shrink-0">
            <span className="hidden sm:inline">MasterG is 100% offline and needs local setup to be booted. </span>
            <span className="sm:hidden">100% offline - needs local setup</span>
        </p>
        <a
            href="https://github.com/ayuxy027/MasterG"
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm rounded-md text-orange-600 bg-white hover:bg-slate-50 transition-all active:scale-95 shadow-sm hover:shadow-md whitespace-nowrap"
            target="_blank"
            rel="noopener noreferrer"
        >
            Setup Locally
            <svg
                width={14}
                height={14}
                viewBox="0 0 14 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0"
            >
                <path
                    d="M2.91797 7H11.0846"
                    stroke="#F54900"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d="M7 2.9165L11.0833 6.99984L7 11.0832"
                    stroke="#F54900"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </a>
    </div>
);

export default Banner;
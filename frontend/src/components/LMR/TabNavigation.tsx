import React, { useState, useRef, useEffect } from 'react';

interface TabNavigationProps {
  activeTab: 'upload' | 'materials' | 'questions';
  setActiveTab: React.Dispatch<React.SetStateAction<'upload' | 'materials' | 'questions'>>;
  hasUploadedFile: boolean;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, setActiveTab, hasUploadedFile }) => {
  const [tooltipTab, setTooltipTab] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const handleTabClick = (tab: 'upload' | 'materials' | 'questions') => {
    if (tab === 'upload' || hasUploadedFile) {
      setActiveTab(tab);
    }
  };

  useEffect(() => {
    if (tooltipTab && buttonRefs.current[tooltipTab]) {
      const button = buttonRefs.current[tooltipTab];
      if (button) {
        const rect = button.getBoundingClientRect();
        setTooltipPosition({
          top: rect.top - 8,
          left: rect.left + rect.width / 2
        });
      }
    } else {
      setTooltipPosition(null);
    }
  }, [tooltipTab]);

  return (
    <div className="bg-orange-100 border-b-2 border-orange-200 relative">
      <nav className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 p-3 sm:p-4 md:p-5">
        {(['upload', 'materials', 'questions'] as const).map((tab) => {
          const labels: Record<typeof tab, string> = {
            upload: 'Upload',
            materials: 'Learning Materials',
            questions: 'Generated Questions'
          };
          
          const isDisabled = tab !== 'upload' && !hasUploadedFile;
          
          return (
            <div 
              key={tab}
              className="relative z-0"
              onMouseEnter={() => isDisabled && setTooltipTab(tab)}
              onMouseLeave={() => setTooltipTab(null)}
            >
              <button
                ref={(el) => { buttonRefs.current[tab] = el; }}
                onClick={() => handleTabClick(tab)}
                disabled={isDisabled}
                className={`relative z-0 px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-full capitalize transition-all font-semibold text-xs sm:text-sm md:text-base shadow-md transform ${
                  isDisabled 
                    ? 'bg-gray-100 text-gray-400 border-2 border-gray-200 cursor-not-allowed'
                    : activeTab === tab
                    ? 'bg-orange-400 text-white hover:bg-orange-500 shadow-lg hover:scale-105'
                    : 'bg-white text-orange-600 border-2 border-orange-200 hover:bg-orange-50 hover:border-orange-300 hover:scale-105'
                }`}
              >
                {labels[tab]}
              </button>
            </div>
          );
        })}
      </nav>
      
      {/* Tooltip - positioned outside overflow container using fixed positioning */}
      {tooltipTab && tooltipPosition && (
        <div 
          className="fixed px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap shadow-2xl z-[9999] pointer-events-none"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: 'translateX(-50%) translateY(-100%)',
          }}
        >
          Upload docs first
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabNavigation;
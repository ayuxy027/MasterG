import React from 'react';

type Mode = 'study' | 'plan' | 'ideation';

interface ModeSelectorProps {
  currentMode: Mode;
  setCurrentMode: (mode: Mode) => void;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ currentMode, setCurrentMode }) => {
  const modes: Array<{id: Mode, label: string, description: string}> = [
    {
      id: 'study',
      label: 'Study Mode',
      description: 'Focused learning environment with structured conversation flow, detailed explanations, and progressive learning paths.'
    },
    {
      id: 'plan',
      label: 'Plan Mode',
      description: 'Learning path creation and goal tracking with multilingual content planning capabilities.'
    },
    {
      id: 'ideation',
      label: 'Ideation Mode',
      description: 'Creative brainstorming and concept exploration with open-ended discussions.'
    }
  ];

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-orange-200 shadow-sm relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCI+CiAgPHBhdGggZD0iTTEgMUg1VjVINFYxWk0xIDEwSDNWMTJIMVoiIGZpbGw9InJnYmEoMjU1LCAxMDIsIDUzLCAwLjA1KS8+CiAgPHBhdGggZD0iTTEwIDFIODJWMkgxMFoiIGZpbGw9InJnYmEoMjU1LCAxMDIsIDUzLCAwLjA1KS8+CiAgPHBhdGggZD0iTTEwIDEwSDgyVjEySDEwWiIgZmlsbD0icmdiYSgyNTUsIDEwMiwgNTMsIDAuMDUpLy4KPC9zdmc+')] opacity-30 -rotate-12"></div>
      <div className="relative z-10">
        <h2 className="text-lg font-bold text-orange-800 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
          Learning Mode
        </h2>
        <div className="flex flex-wrap gap-3">
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setCurrentMode(mode.id)}
              className={`px-5 py-2.5 rounded-full capitalize transition-all transform hover:scale-105 ${
                currentMode === mode.id
                  ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-lg'
                  : 'bg-white text-orange-700 border border-orange-200 hover:bg-orange-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  currentMode === mode.id
                    ? 'bg-white/20'
                    : 'bg-orange-100'
                }`}>
                  {mode.id === 'study' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v8.5C4.168 14.523 5.754 14 7.5 14s3.332.523 4.5 1.253m0-8.5C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v8.5C19.832 14.523 18.246 14 16.5 14c-1.746 0-3.332.523-4.5 1.253"></path>
                    </svg>
                  )}
                  {mode.id === 'plan' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                    </svg>
                  )}
                  {mode.id === 'ideation' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                    </svg>
                  )}
                </div>
                <span className="font-medium">{mode.label}</span>
              </div>
            </button>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
          <p className="text-orange-700 text-sm">
            {modes.find(m => m.id === currentMode)?.description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModeSelector;
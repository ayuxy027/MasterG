import React, { useState } from 'react';
import ChatInterface from './ChatInterface';

const AIChatPage: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<'study' | 'plan' | 'ideation'>('study');
  const [messages, setMessages] = useState<Array<{id: number, text: string, sender: 'user' | 'ai', timestamp: string}>>([]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-12">
        {/* Header Section */}
        <div className="mb-6 sm:mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-gray-800 mb-2 sm:mb-3">
            <span className="text-orange-400">RAG-Powered</span> Agentic AI Chat
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
            Multilingual support for 22+ Indian languages with adaptive learning engine
          </p>
        </div>
        
        <ChatInterface 
          currentMode={currentMode} 
          setCurrentMode={setCurrentMode}
          messages={messages} 
          setMessages={setMessages} 
        />
      </div>
    </div>
  );
};

export default AIChatPage;
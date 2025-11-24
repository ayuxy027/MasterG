import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
}

interface ChatInterfaceProps {
  currentMode: 'study' | 'plan' | 'ideation';
  setCurrentMode: (mode: 'study' | 'plan' | 'ideation') => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ currentMode, setCurrentMode, messages, setMessages }) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('deepseek');
  const [selectedLanguage, setSelectedLanguage] = useState('english');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
        setShowLanguageDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSendMessage = () => {
    if (inputValue.trim() === '' && !attachedFile) return;
    
    const newMessage: Message = {
      id: messages.length + 1,
      text: inputValue.trim() || `[File attached: ${attachedFile?.name}]`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    setAttachedFile(null);
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getExamplePrompts = () => {
    switch(currentMode) {
      case 'study':
        return [
          "Explain photosynthesis",
          "Math problem: 2x + 5 = 15",
          "Tell me about the French Revolution"
        ];
      case 'plan':
        return [
          "Create study plan for physics",
          "Set learning goals",
          "Plan my study schedule for next week"
        ];
      case 'ideation':
        return [
          "Creative project ideas",
          "Brainstorm solutions for climate change",
          "How can I improve my writing skills?"
        ];
      default:
        return [];
    }
  };

  const models = [
    { value: 'deepseek', label: 'DeepSeek R1' },
    { value: 'llama', label: ' Llama 4 Scout ' },
    { value: 'qwen', label: 'Qwen 3 7b' },
    { value: 'kimi', label: 'Kimi K2 Instruct' }
  ];

  const languages = [
    { value: 'english', label: 'English' },
    { value: 'hindi', label: 'हिंदी' },
    { value: 'tamil', label: 'தமிழ்' },
    { value: 'telugu', label: 'తెలుగు' },
    { value: 'bengali', label: 'বাংলা' },
    { value: 'marathi', label: 'मराठी' },
    { value: 'gujarati', label: 'ગુજરાતી' },
    { value: 'kannada', label: 'ಕನ್ನಡ' }
  ];

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 overflow-hidden">
      {/* Chat Header with Integrated Mode Toggle */}
      <div className="bg-orange-100 border-b-2 border-orange-200 p-4 sm:p-5 md:p-6">
        {/* Mode Toggle Buttons - Prominent */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {(['study', 'plan', 'ideation'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setCurrentMode(mode)}
              className={`px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-full capitalize transition-all font-semibold text-xs sm:text-sm md:text-base shadow-md transform hover:scale-105 ${
                currentMode === mode
                  ? 'bg-orange-400 text-white hover:bg-orange-500 shadow-lg'
                  : 'bg-white text-orange-600 border-2 border-orange-200 hover:bg-orange-50 hover:border-orange-300'
              }`}
            >
              {mode} Mode
            </button>
          ))}
        </div>
      </div>
      
      {/* Messages Container */}
      <div className="h-[400px] sm:h-[450px] md:h-[500px] lg:h-[600px] bg-gradient-to-b from-white to-orange-50/30 overflow-y-auto p-3 sm:p-4 md:p-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
              </div>
              <p className="text-sm sm:text-base md:text-lg text-gray-600 font-medium mb-2">Start a conversation</p>
              <p className="text-xs sm:text-sm text-gray-500">Ask anything or use the quick prompts below</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
          <div 
            key={message.id} 
              className={`flex mb-3 sm:mb-4 md:mb-6 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
                className={`max-w-[90%] sm:max-w-[85%] md:max-w-[75%] rounded-2xl p-2.5 sm:p-3 md:p-4 shadow-md ${
                message.sender === 'user' 
                    ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white rounded-br-sm' 
                    : 'bg-white text-gray-800 rounded-bl-sm border-2 border-orange-100'
              }`}
            >
                <p className="text-xs sm:text-sm md:text-base leading-relaxed break-words">{message.text}</p>
                <div className={`text-[10px] sm:text-xs mt-1.5 sm:mt-2 ${message.sender === 'user' ? 'text-orange-100' : 'text-gray-500'}`}>
                {message.timestamp}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* File Attachment Indicator */}
      {attachedFile && (
        <div className="px-3 sm:px-4 py-2 sm:py-2.5 bg-orange-50 border-t border-orange-200/60 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
          </svg>
          <span className="text-[10px] sm:text-xs md:text-sm text-gray-700 truncate flex-1 min-w-0">{attachedFile.name}</span>
          <button 
            onClick={() => setAttachedFile(null)}
            className="text-orange-500 hover:text-orange-700 transition-colors p-1 flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      )}
      
      {/* Input Area with Dropdowns */}
      <div className="border-t-2 border-orange-200/60 p-2.5 sm:p-3 md:p-4 bg-white">
        {/* Dropdowns Row */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:gap-3 mb-2 sm:mb-3">
          {/* Model Dropdown */}
          <div className="relative" ref={modelDropdownRef}>
            <button
              onClick={() => {
                setShowModelDropdown(!showModelDropdown);
                setShowLanguageDropdown(false);
              }}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-orange-50 border-2 border-orange-200 rounded-lg hover:bg-orange-100 hover:border-orange-300 transition-all text-[10px] sm:text-xs md:text-sm font-medium text-orange-700 whitespace-nowrap"
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
              </svg>
              <span className="hidden sm:inline">{models.find(m => m.value === selectedModel)?.label}</span>
              <span className="sm:hidden">Model</span>
              <svg className={`w-3 h-3 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showModelDropdown && (
              <div className="absolute bottom-full left-0 mb-2 w-40 sm:w-48 bg-white border-2 border-orange-200 rounded-xl shadow-xl z-50 overflow-hidden">
                {models.map((model) => (
                  <button
                    key={model.value}
                    onClick={() => {
                      setSelectedModel(model.value);
                      setShowModelDropdown(false);
                    }}
                    className={`w-full text-left px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm hover:bg-orange-50 transition-colors ${
                      selectedModel === model.value ? 'bg-orange-100 text-orange-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    {model.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Language Dropdown */}
          <div className="relative" ref={languageDropdownRef}>
            <button
              onClick={() => {
                setShowLanguageDropdown(!showLanguageDropdown);
                setShowModelDropdown(false);
              }}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-orange-50 border-2 border-orange-200 rounded-lg hover:bg-orange-100 hover:border-orange-300 transition-all text-[10px] sm:text-xs md:text-sm font-medium text-orange-700 whitespace-nowrap"
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path>
              </svg>
              <span className="hidden sm:inline">{languages.find(l => l.value === selectedLanguage)?.label}</span>
              <span className="sm:hidden">Lang</span>
              <svg className={`w-3 h-3 transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showLanguageDropdown && (
              <div className="absolute bottom-full left-0 mb-2 w-40 sm:w-48 max-h-64 overflow-y-auto bg-white border-2 border-orange-200 rounded-xl shadow-xl z-50">
                {languages.map((language) => (
                  <button
                    key={language.value}
                    onClick={() => {
                      setSelectedLanguage(language.value);
                      setShowLanguageDropdown(false);
                    }}
                    className={`w-full text-left px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm hover:bg-orange-50 transition-colors ${
                      selectedLanguage === language.value ? 'bg-orange-100 text-orange-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    {language.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* File Attach Button */}
          <div className="flex-1"></div>
          <input
            type="file"
            id="file-attach"
            className="hidden"
            onChange={handleFileAttach}
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
          />
          <button
            onClick={() => document.getElementById('file-attach')?.click()}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-all font-medium border-2 border-transparent hover:border-orange-200"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
            </svg>
            <span className="hidden sm:inline">Attach</span>
          </button>
        </div>

        {/* Input Textarea and Send */}
        <div className="flex gap-2 sm:gap-3">
          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Ask anything in ${currentMode} mode...`}
              className="w-full border-2 border-orange-200 rounded-xl p-2.5 sm:p-3 md:p-4 resize-none min-h-[44px] sm:min-h-[48px] md:min-h-[56px] focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all text-xs sm:text-sm md:text-base bg-white"
              rows={1}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() && !attachedFile}
            className={`p-2.5 sm:p-3 md:p-4 rounded-xl transition-all flex-shrink-0 ${
              inputValue.trim() || attachedFile
                ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white hover:from-orange-500 hover:to-orange-600 shadow-md hover:shadow-lg transform hover:scale-105'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
            </svg>
          </button>
        </div>
        
        {/* Example Prompts */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3">
          <span className="text-[10px] sm:text-xs text-gray-500 font-medium">Quick prompts:</span>
          {getExamplePrompts().slice(0, 3).map((prompt, index) => (
              <button 
                key={index}
              className="text-[10px] sm:text-xs md:text-sm bg-orange-50 text-orange-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full hover:bg-orange-100 hover:text-orange-800 transition-all border border-orange-200 font-medium"
                onClick={() => setInputValue(prompt)}
              >
                {prompt}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;

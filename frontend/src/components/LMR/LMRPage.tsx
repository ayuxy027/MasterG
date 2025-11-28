import React, { useState, ReactNode } from 'react';
import MaterialsTab from './MaterialsTab';
import QuestionsTab from './QuestionsTab';

type ViewId = 'summary' | 'questions' | 'quiz' | 'notes' | 'pdf';
interface ViewOption {
  id: ViewId;
  label: string;
  icon: ReactNode;
}

const LMRPage: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedModel, setSelectedModel] = useState('deepseek');
  const [selectedLanguage, setSelectedLanguage] = useState('english');
  const [selectedTone, setSelectedTone] = useState('professional');
  const [activeView, setActiveView] = useState<ViewId>('summary');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setIsProcessing(true);
      
      // Simulate processing time
      setTimeout(() => {
        setIsProcessing(false);
      }, 2000);
    }
  };

  const models = [
    { value: 'deepseek', label: 'DeepSeek R1' },
    { value: 'llama', label: 'Llama 4 Scout' },
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

  const tones = [
    { value: 'professional', label: 'Professional', description: 'Formal and academic tone' },
    { value: 'friendly', label: 'Friendly', description: 'Casual and approachable tone' },
    { value: 'conversational', label: 'Conversational', description: 'Natural and engaging tone' },
    { value: 'concise', label: 'Concise', description: 'Brief and to-the-point tone' }
  ];

  const views: ViewOption[] = [
    { 
      id: 'summary', 
      label: 'Summary', 
      icon: (
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
      )
    },
    { 
      id: 'questions', 
      label: 'Questions', 
      icon: (
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <line x1="12" x2="12.01" y1="17" y2="17"/>
        </svg>
      )
    },
    { 
      id: 'quiz', 
      label: 'Quiz', 
      icon: (
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
        </svg>
      )
    },
    { 
      id: 'notes', 
      label: 'Recall Notes', 
      icon: (
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
        </svg>
      )
    },
    { 
      id: 'pdf', 
      label: 'Download PDF', 
      icon: (
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
      )
    }
  ];

  const hasContent = uploadedFile && !isProcessing;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8">
        {/* Header Section */}
        <div className="mb-6 sm:mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-gray-800 mb-2 sm:mb-3">
            <span className="text-orange-400">Last Minute Recall</span> (LMR)
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
            AI-powered quick revision notes and questions for last-minute exam preparation
          </p>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-stretch">
          {/* Sidebar - Controls */}
          <aside className="lg:w-80 xl:w-96 flex-shrink-0">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 p-5 sm:p-6 sticky top-24 space-y-6 h-full">
              {/* Upload Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                  <h2 className="text-sm sm:text-base font-semibold text-gray-800">
                    Upload Document
                  </h2>
                </div>
                <div 
                  className={`border-2 border-dashed rounded-xl p-5 sm:p-6 text-center cursor-pointer transition-all ${
                    uploadedFile ? 'border-orange-400 bg-orange-50' : 'border-orange-200 hover:border-orange-400 hover:bg-orange-50'
                  }`}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  {!uploadedFile ? (
                    <>
                      <svg className="w-12 h-12 sm:w-14 sm:h-14 text-orange-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                      </svg>
                      <p className="text-sm text-gray-700 font-medium mb-1">Click to upload</p>
                      <p className="text-xs text-gray-500">PDF, DOC, DOCX supported</p>
                    </>
                  ) : (
                    <>
                      <svg className="w-12 h-12 sm:w-14 sm:h-14 text-orange-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <p className="text-sm text-gray-800 font-medium break-words mb-1">{uploadedFile.name}</p>
                      <p className="text-xs text-orange-600 font-medium">Uploaded successfully</p>
                    </>
                  )}
                  
                  {isProcessing && (
                    <div className="mt-4">
                      <div className="w-full bg-orange-200 rounded-full h-2.5">
                        <div className="bg-orange-500 h-full rounded-full animate-pulse w-3/4 transition-all"></div>
                      </div>
                      <p className="text-xs text-orange-600 mt-2 font-medium">Processing document...</p>
                    </div>
                  )}
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              {/* Language Selector */}
              <div>
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-800 mb-2.5">
                  <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path>
                  </svg>
                  Language
                </label>
                <select 
                  value={selectedLanguage} 
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border-2 border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-700 transition-all"
                >
                  {languages.map((lang) => (
                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                  ))}
                </select>
              </div>

              {/* Model Selector */}
              <div>
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-800 mb-2.5">
                  <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                  </svg>
                  AI Model
                </label>
                <select 
                  value={selectedModel} 
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border-2 border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-700 transition-all"
                >
                  {models.map((model) => (
                    <option key={model.value} value={model.value}>{model.label}</option>
                  ))}
                </select>
              </div>

              {/* Tone Selector */}
              <div>
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-800 mb-2.5">
                  <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
                  </svg>
                  Tone
                </label>
                <select 
                  value={selectedTone} 
                  onChange={(e) => setSelectedTone(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border-2 border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-700 transition-all"
                >
                  {tones.map((tone) => (
                    <option key={tone.value} value={tone.value}>{tone.label}</option>
                  ))}
                </select>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1.5 ml-1">
                  {tones.find(t => t.value === selectedTone)?.description}
                </p>
              </div>

              {/* Status Indicator */}
              {hasContent && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                    <div className="flex-1">
                      <p className="text-xs sm:text-sm text-gray-700 font-medium">Ready to generate</p>
                      <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5">
                        {models.find(m => m.value === selectedModel)?.label} • {tones.find(t => t.value === selectedTone)?.label}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 flex flex-col">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border-2 border-orange-200/60 overflow-hidden flex-1 flex flex-col">
              {/* View Navigation Dock */}
              <div className="bg-orange-100 border-b-2 border-orange-200 p-3 sm:p-4 md:p-5">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 md:gap-3 max-w-full">
                  {views.map((view) => {
                    const isDisabled = !hasContent && view.id !== 'summary';
                    return (
                      <button
                        key={view.id}
                        onClick={() => hasContent && setActiveView(view.id)}
                        disabled={isDisabled}
                        className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 rounded-full transition-all font-semibold text-xs sm:text-sm md:text-base shadow-md transform whitespace-nowrap flex-shrink-0 ${
                          isDisabled
                            ? 'bg-gray-100 text-gray-400 border-2 border-gray-200 cursor-not-allowed'
                            : activeView === view.id
                            ? 'bg-orange-400 text-white hover:bg-orange-500 shadow-lg hover:scale-105'
                            : 'bg-white text-orange-600 border-2 border-orange-200 hover:bg-orange-50 hover:border-orange-300 hover:scale-105'
                        }`}
                      >
                        <span className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">{view.icon}</span>
                        <span className="hidden sm:inline">{view.label}</span>
                        <span className="sm:hidden">{view.label.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content Display */}
              <div className="p-6 sm:p-8 md:p-10 min-h-[500px]">
                {!hasContent ? (
                  <div className="text-center py-16 sm:py-20">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-full bg-orange-100 flex items-center justify-center">
                      <svg className="w-10 h-10 sm:w-12 sm:h-12 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
                    </div>
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-800 mb-3">
                      <span className="text-orange-400">Upload Document</span> to Get Started
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto leading-relaxed">
                      Upload your study materials to generate last-minute recall notes, questions, and quizzes in your preferred language.
                    </p>
                  </div>
                ) : (
                  <>
                    {activeView === 'summary' && (
                      <div>
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800">Content Summary</h2>
                          </div>
                          <div className="hidden sm:flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                            <span className="px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-full">{languages.find(l => l.value === selectedLanguage)?.label}</span>
                            <span className="px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-full">{tones.find(t => t.value === selectedTone)?.label}</span>
                          </div>
                        </div>
                        <MaterialsTab 
                          language={selectedLanguage}
                          model={selectedModel}
                          tone={selectedTone}
                        />
                      </div>
                    )}
                    {activeView === 'questions' && (
                      <div>
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/>
                              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                              <line x1="12" x2="12.01" y1="17" y2="17"/>
                            </svg>
                            <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800">Generated Questions</h2>
                          </div>
                          <div className="hidden sm:flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                            <span className="px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-full">{languages.find(l => l.value === selectedLanguage)?.label}</span>
                            <span className="px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-full">{tones.find(t => t.value === selectedTone)?.label}</span>
                          </div>
                        </div>
                        <QuestionsTab 
                          language={selectedLanguage}
                          model={selectedModel}
                          tone={selectedTone}
                        />
                      </div>
                    )}
                    {activeView === 'quiz' && (
                      <div>
                        <div className="flex items-center gap-3 mb-6">
                          <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                          </svg>
                          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800">Practice Quiz</h2>
                        </div>
                        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-8 text-center">
                          <p className="text-gray-600 text-lg">Quiz functionality coming soon...</p>
                        </div>
                      </div>
                    )}
                    {activeView === 'notes' && (
                      <div>
                        <div className="flex items-center gap-3 mb-6">
                          <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                          </svg>
                          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800">Last-Minute Recall Notes</h2>
                        </div>
                        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-8 text-center">
                          <p className="text-gray-600 text-lg">Recall notes functionality coming soon...</p>
                        </div>
                      </div>
                    )}
                    {activeView === 'pdf' && (
                      <div>
                        <div className="flex items-center gap-3 mb-6">
                          <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                          </svg>
                          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800">Download PDF</h2>
                        </div>
                        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-8 text-center">
                          <button className="px-8 py-4 bg-orange-400 text-white rounded-xl hover:bg-orange-500 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold text-base sm:text-lg flex items-center gap-2 mx-auto">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            Download Generated PDF
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default LMRPage;

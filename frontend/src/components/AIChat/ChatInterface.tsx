import React, { useState, useRef, useEffect } from 'react';
import { sendQuery, uploadFile, ChatApiError } from '../../services/chatApi';
import type { MessageUI, UploadProgress } from '../../types/chat';
import MarkdownRenderer from '../ui/MarkdownRenderer';

interface ChatInterfaceProps {
  userId: string;
  sessionId: string;
  currentMode: 'study' | 'plan' | 'ideation';
  setCurrentMode: (mode: 'study' | 'plan' | 'ideation') => void;
  messages: MessageUI[];
  setMessages: React.Dispatch<React.SetStateAction<MessageUI[]>>;
  onSessionUpdate: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  userId,
  sessionId,
  currentMode,
  setCurrentMode,
  messages,
  setMessages,
  onSessionUpdate,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [showMetadata, setShowMetadata] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (inputValue.trim() === '' || isLoading) return;

    const userMessage: MessageUI = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await sendQuery(userId, sessionId, userMessage.content);

      const assistantMessage: MessageUI = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        sources: response.sources,
        metadata: response.metadata,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      onSessionUpdate(); // Refresh session list
    } catch (error) {
      console.error('Failed to send message:', error);
      
      const errorMessage: MessageUI = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: error instanceof ChatApiError
          ? `⚠️ Error: ${error.message}`
          : '⚠️ Failed to get response. Please try again.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      const fileId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Add to upload progress tracking
      setUploadProgress((prev) => [
        ...prev,
        { fileId, fileName: file.name, progress: 0, status: 'uploading' },
      ]);

      try {
        await uploadFile(userId, sessionId, file, (progress) => {
          setUploadProgress((prev) =>
            prev.map((item) =>
              item.fileId === fileId
                ? { ...item, progress, status: progress < 100 ? 'uploading' : 'processing' }
                : item
            )
          );
        });

        // Success
        setUploadProgress((prev) =>
          prev.map((item) =>
            item.fileId === fileId ? { ...item, status: 'completed', progress: 100 } : item
          )
        );

        // Add system message
        const systemMessage: MessageUI = {
          id: `system-${Date.now()}`,
          role: 'assistant',
          content: `✅ Successfully uploaded **${file.name}**. You can now ask questions about this document!`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, systemMessage]);

        // Remove from progress after 3 seconds
        setTimeout(() => {
          setUploadProgress((prev) => prev.filter((item) => item.fileId !== fileId));
        }, 3000);
      } catch (error) {
        console.error('Upload failed:', error);
        
        setUploadProgress((prev) =>
          prev.map((item) =>
            item.fileId === fileId
              ? {
                  ...item,
                  status: 'error',
                  error: error instanceof ChatApiError ? error.message : 'Upload failed',
                }
              : item
          )
        );

        // Add error message
        const errorMessage: MessageUI = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Failed to upload **${file.name}**: ${
            error instanceof ChatApiError ? error.message : 'Unknown error'
          }`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    }

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getExamplePrompts = () => {
    switch (currentMode) {
      case 'study':
        return [
          'Explain photosynthesis from the uploaded PDF',
          'Summarize page 5',
          'What are the key concepts in this document?',
        ];
      case 'plan':
        return [
          'Create a study plan from this material',
          'What topics should I focus on?',
          'Generate practice questions',
        ];
      case 'ideation':
        return [
          'What projects can I build with this knowledge?',
          'Connect concepts across documents',
          'Suggest creative applications',
        ];
      default:
        return [];
    }
  };

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-full flex flex-col bg-white/50">
      {/* Mode Toggle Header */}
      <div className="bg-orange-100 border-b-2 border-orange-200 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {(['study', 'plan', 'ideation'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setCurrentMode(mode)}
              className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full capitalize transition-all font-semibold text-sm shadow-md transform hover:scale-105 ${
                currentMode === mode
                  ? 'bg-orange-400 text-white hover:bg-orange-500 shadow-lg'
                  : 'bg-white text-orange-600 border-2 border-orange-200 hover:bg-orange-50 hover:border-orange-300'
              }`}
            >
              {mode} Mode
            </button>
          ))}
          
          {/* Metadata Toggle */}
          <button
            onClick={() => setShowMetadata(!showMetadata)}
            className={`ml-2 px-3 py-2 rounded-full text-xs font-medium transition-all ${
              showMetadata
                ? 'bg-blue-400 text-white'
                : 'bg-white text-gray-600 border-2 border-gray-200 hover:bg-gray-50'
            }`}
            title="Toggle AI metadata"
          >
            🤖 Info
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gradient-to-b from-white to-orange-50/30">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-4">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-orange-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="text-lg text-gray-600 font-medium mb-2">
                Start a conversation
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Upload documents and ask questions in {currentMode} mode
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 transition-colors font-medium"
              >
                Upload Document
              </button>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex mb-6 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 shadow-md ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 rounded-bl-sm border-2 border-orange-100'
                  }`}
                >
                  {/* Message Content */}
                  <div className="prose prose-sm max-w-none">
                    {message.role === 'assistant' ? (
                      <MarkdownRenderer content={message.content} />
                    ) : (
                      <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                        {message.content}
                      </p>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div
                    className={`text-xs mt-2 ${
                      message.role === 'user' ? 'text-orange-100' : 'text-gray-500'
                    }`}
                  >
                    {formatTimestamp(message.timestamp)}
                  </div>

                  {/* Source Citations */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-600 mb-2">
                        📚 Sources:
                      </p>
                      <div className="space-y-2">
                        {message.sources.map((source, idx) => (
                          <div
                            key={idx}
                            className="bg-orange-50 rounded-lg p-2 border border-orange-200"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-orange-700">
                                {source.pdfName}
                              </span>
                              <span className="text-xs text-orange-500">
                                • Page {source.pageNo}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 line-clamp-2">
                              {source.snippet}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Metadata */}
                  {showMetadata && message.metadata && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-600 mb-2">
                        🤖 AI Metadata:
                      </p>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div>
                          <span className="font-medium">Layer:</span>{' '}
                          <span
                            className={`px-2 py-0.5 rounded ${
                              message.metadata.layer === 'LAYER1-GROQ-FAST'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {message.metadata.layer}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Response Time:</span>{' '}
                          {message.metadata.responseTimeMs}ms
                        </div>
                        <div>
                          <span className="font-medium">Reasoning:</span>{' '}
                          {message.metadata.reasoning}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start mb-6">
                <div className="bg-white rounded-2xl p-4 shadow-md border-2 border-orange-100">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0.1s' }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Upload Progress Indicators */}
      {uploadProgress.length > 0 && (
        <div className="px-4 py-2 bg-orange-50 border-t border-orange-200 space-y-2">
          {uploadProgress.map((upload) => (
            <div key={upload.fileId} className="flex items-center gap-3">
              <svg
                className="w-4 h-4 text-orange-600 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-700 truncate">{upload.fileName}</span>
                  <span className="text-gray-500 ml-2">
                    {upload.status === 'completed'
                      ? '✓'
                      : upload.status === 'error'
                      ? '✗'
                      : `${Math.round(upload.progress)}%`}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      upload.status === 'completed'
                        ? 'bg-green-500'
                        : upload.status === 'error'
                        ? 'bg-red-500'
                        : 'bg-orange-500'
                    }`}
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
                {upload.error && (
                  <p className="text-xs text-red-600 mt-1">{upload.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="border-t-2 border-orange-200 p-4 bg-white">
        {/* File Upload Button Row */}
        <div className="flex items-center gap-2 mb-3">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
            accept=".pdf,image/*"
            multiple
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-all font-medium border-2 border-orange-200 hover:border-orange-300"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Upload PDF/Image
          </button>
          <span className="text-xs text-gray-500">
            Multiple files supported
          </span>
        </div>

        {/* Input & Send */}
        <div className="flex gap-3">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Ask anything in ${currentMode} mode...`}
            className="flex-1 border-2 border-orange-200 rounded-xl p-3 resize-none min-h-[56px] focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all text-sm bg-white"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className={`p-3 rounded-xl transition-all flex-shrink-0 ${
              inputValue.trim() && !isLoading
                ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white hover:from-orange-500 hover:to-orange-600 shadow-md hover:shadow-lg transform hover:scale-105'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>

        {/* Example Prompts */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-xs text-gray-500 font-medium">Quick prompts:</span>
          {getExamplePrompts().map((prompt, index) => (
            <button
              key={index}
              className="text-xs bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full hover:bg-orange-100 hover:text-orange-800 transition-all border border-orange-200 font-medium"
              onClick={() => setInputValue(prompt)}
              disabled={isLoading}
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

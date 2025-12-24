import React, { useState, useRef, useEffect } from "react";
import {
  sendStreamingQuery,
  uploadFile,
  ChatApiError,
  getSessionDocuments,
  translateMessage,
} from "../../services/chatApi";
import { INDIAN_LANGUAGES } from "../../constants/appConstants";
import type {
  MessageUI,
  UploadProgress,
  FileListItem,
  MentionedFile,
  SourceCitation,
} from "../../types/chat";
import MarkdownRenderer from "../ui/MarkdownRenderer";
import Accordion from "../ui/Accordion";
import { MessageSkeleton } from "../ui/Skeleton";
import MicButton from "../ui/MicButton";
import MentionInput from "../ui/MentionInput";
import StreamingMessage from "../ui/StreamingMessage";

interface ChatInterfaceProps {
  userId: string;
  sessionId: string;
  messages: MessageUI[];
  setMessages: React.Dispatch<React.SetStateAction<MessageUI[]>>;
  onSessionUpdate: (firstUserMessage?: string) => void;
  initialPrompt?: string | null;
  onInitialPromptConsumed?: () => void;
  selectedLanguage: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  userId,
  sessionId,
  messages,
  setMessages,
  onSessionUpdate,
  initialPrompt,
  onInitialPromptConsumed,
  selectedLanguage,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<FileListItem[]>([]);
  const [selectedMentions, setSelectedMentions] = useState<MentionedFile[]>([]);
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load uploaded files for dynamic prompt generation
  useEffect(() => {
    loadUploadedFiles();
    // Check if this is a new session (no messages)
    setIsFirstMessage(messages.length === 0);
  }, [sessionId, messages.length]);

  // Handle initial prompt from Plan mode
  useEffect(() => {
    if (initialPrompt) {
      setInputValue(initialPrompt);
      onInitialPromptConsumed?.();
    }
  }, [initialPrompt, onInitialPromptConsumed]);

  const loadUploadedFiles = async () => {
    try {
      const files = await getSessionDocuments(userId, sessionId);
      setUploadedFiles(files);
    } catch (error) {
      console.error("Failed to load files:", error);
    }
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() === "" || isLoading) return;

    // Get mentioned file IDs for filtering
    const mentionedFileIds = selectedMentions.map((m) => m.fileId);
    const messageContent = inputValue.trim();
    const shouldGenerateName = isFirstMessage && messages.length === 0;

    const userMessage: MessageUI = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setSelectedMentions([]); // Clear mentions after sending
    setIsLoading(true);
    setIsFirstMessage(false);

    try {
      // STREAMING MODE
      const assistantMessageId = `assistant-${Date.now()}`;

      // Add placeholder streaming message
      const streamingMessage: MessageUI = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
        streamingLayer: "analyzing",
        sources: [],
      };
      setMessages((prev) => [...prev, streamingMessage]);

      const collectedSources: SourceCitation[] = [];

      await sendStreamingQuery(
        userId,
        sessionId,
        userMessage.content,
        (chunk) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content:
                      chunk.type === "text" && chunk.content
                        ? msg.content + chunk.content
                        : msg.content,
                    streamingLayer:
                      chunk.type === "layer" && chunk.layer
                        ? chunk.layer
                        : msg.streamingLayer,
                    sources:
                      chunk.type === "source" && chunk.source
                        ? [...(msg.sources || []), chunk.source]
                        : msg.sources,
                    thinking:
                      chunk.type === "thinking" && chunk.thinking
                        ? chunk.thinking
                        : msg.thinking,
                    isStreaming:
                      chunk.type !== "done" && chunk.type !== "error",
                  }
                : msg
            )
          );

          if (chunk.type === "source" && chunk.source) {
            collectedSources.push(chunk.source);
          }
        },
        mentionedFileIds.length > 0 ? mentionedFileIds : undefined
      );

      // Trigger session update with first message for name generation
      onSessionUpdate(shouldGenerateName ? messageContent : undefined);
    } catch (error) {
      console.error("Failed to send message:", error);

      const errorMessage: MessageUI = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content:
          error instanceof ChatApiError
            ? `⚠️ Error: ${error.message}`
            : "⚠️ Failed to get response. Please try again.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranslateMessage = async (messageId: string, content: string) => {
    // Find message and check if already translated
    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    // Allow re-translation regardless of previous state to support language switching

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, isTranslating: true } : msg
      )
    );

    try {
      const response = await translateMessage(
        userId,
        sessionId,
        content,
        "en",
        selectedLanguage // Global selected language
      );

      if (response.success && response.translated) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  translatedContent: response.translated,
                  isTranslating: false,
                }
              : msg
          )
        );
      } else {
        throw new Error(response.error || "Translation failed");
      }
    } catch (error) {
      console.error("Translation error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, isTranslating: false } : msg
        )
      );
      // Optionally show a toast or error indicator
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    for (const file of fileArray) {
      const fileId = `upload-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Add to upload progress tracking
      setUploadProgress((prev) => [
        ...prev,
        { fileId, fileName: file.name, progress: 0, status: "uploading" },
      ]);

      try {
        await uploadFile(userId, sessionId, file, (progress) => {
          setUploadProgress((prev) =>
            prev.map((item) =>
              item.fileId === fileId
                ? {
                    ...item,
                    progress,
                    status: progress < 100 ? "uploading" : "processing",
                  }
                : item
            )
          );
        });

        // Success
        setUploadProgress((prev) =>
          prev.map((item) =>
            item.fileId === fileId
              ? { ...item, status: "completed", progress: 100 }
              : item
          )
        );

        // Add system message
        const systemMessage: MessageUI = {
          id: `system-${Date.now()}`,
          role: "assistant",
          content: `✅ Successfully uploaded **${file.name}**. You can now ask questions about this document!`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, systemMessage]);

        // Refresh uploaded files list for dynamic prompts
        loadUploadedFiles();

        // Remove from progress after 3 seconds
        setTimeout(() => {
          setUploadProgress((prev) =>
            prev.filter((item) => item.fileId !== fileId)
          );
        }, 3000);
      } catch (error) {
        console.error("Upload failed:", error);

        setUploadProgress((prev) =>
          prev.map((item) =>
            item.fileId === fileId
              ? {
                  ...item,
                  status: "error",
                  error:
                    error instanceof ChatApiError
                      ? error.message
                      : "Upload failed",
                }
              : item
          )
        );

        // Add error message
        const errorMessage: MessageUI = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `⚠️ Failed to upload **${file.name}**: ${
            error instanceof ChatApiError ? error.message : "Unknown error"
          }`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    }

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getExamplePrompts = () => {
    // Only show example prompts when documents are uploaded
    if (uploadedFiles.length > 0) {
      return [
        "Summarize the key points from the documents",
        "Explain the main concepts in simple terms",
        "What are the important topics covered?",
      ];
    }

    // Return empty array if no files (prompts won't be shown anyway)
    return [];
  };

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="h-full flex flex-col bg-white/50 overflow-hidden">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gradient-to-b from-white to-orange-50/30 min-h-0">
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
                Upload documents and ask questions about them
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
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id}>
                  {/* Use StreamingMessage for streaming assistant messages */}
                  {message.role === "assistant" && message.isStreaming ? (
                    <StreamingMessage
                      content={message.content}
                      isStreaming={message.isStreaming}
                      sources={message.sources || []}
                      timestamp={message.timestamp}
                    />
                  ) : (
                    <div
                      className={`flex ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-4 shadow-md ${
                          message.role === "user"
                            ? "bg-gradient-to-br from-orange-400 to-orange-500 text-white rounded-br-sm"
                            : "bg-white text-gray-800 rounded-bl-sm border-2 border-orange-100"
                        }`}
                      >
                        {/* Message Content */}
                        <div className="prose prose-sm max-w-none">
                          {message.role === "assistant" ? (
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
                            message.role === "user"
                              ? "text-orange-100"
                              : "text-gray-500"
                          }`}
                        >
                          {formatTimestamp(message.timestamp)}
                        </div>

                        {/* Source Citations - Accordion */}
                        {message.sources &&
                          message.sources.length > 0 &&
                          !message.isStreaming && (
                            <div className="mt-3">
                              <Accordion
                                title="Sources"
                                icon={
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                    />
                                  </svg>
                                }
                                badge={message.sources.length}
                              >
                                <div className="space-y-2">
                                  {[...message.sources]
                                    .reverse()
                                    .map((source, idx) => (
                                      <div
                                        key={idx}
                                        className="bg-orange-50 rounded-lg p-3 border border-orange-200"
                                      >
                                        <div className="flex items-center gap-2 mb-1.5">
                                          <span className="text-xs font-semibold text-orange-700">
                                            {source.pdfName}
                                          </span>
                                        </div>
                                        <p className="text-xs text-gray-700 leading-relaxed">
                                          {source.snippet}
                                        </p>
                                      </div>
                                    ))}
                                </div>
                              </Accordion>
                            </div>
                          )}

                        {/* Thinking Process - Accordion */}
                        {message.thinking &&
                          !message.isStreaming &&
                          message.role === "assistant" && (
                            <div className="mt-3">
                              <Accordion
                                title="Thinking Process"
                                icon={
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                    />
                                  </svg>
                                }
                              >
                                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                  <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-mono">
                                    {message.thinking}
                                  </p>
                                </div>
                              </Accordion>
                            </div>
                          )}

                        {/* Translation Section */}
                        {message.role === "assistant" &&
                          !message.isStreaming &&
                          !message.id.startsWith("system-") &&
                          !message.id.startsWith("error-") && (
                            <div className="mt-3">
                              <Accordion
                                title="Translation"
                                icon={
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                                    />
                                  </svg>
                                }
                              >
                                <div className="space-y-3 p-1">
                                  {/* Translated Content */}
                                  {message.translatedContent ? (
                                    <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                                      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                                        {message.translatedContent}
                                      </p>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-gray-500 italic">
                                      No translation generated yet.
                                    </p>
                                  )}

                                  {/* Translate Action */}
                                  <button
                                    onClick={() =>
                                      handleTranslateMessage(
                                        message.id,
                                        message.content
                                      )
                                    }
                                    disabled={message.isTranslating}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-orange-200 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors text-xs font-semibold"
                                  >
                                    {message.isTranslating ? (
                                      <>
                                        <svg
                                          className="animate-spin w-3 h-3"
                                          viewBox="0 0 24 24"
                                        >
                                          <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            fill="none"
                                          ></circle>
                                          <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                          ></path>
                                        </svg>
                                        Translating to{" "}
                                        {INDIAN_LANGUAGES.find(
                                          (l) => l.code === selectedLanguage
                                        )?.name || selectedLanguage}
                                        ...
                                      </>
                                    ) : (
                                      <>
                                        <svg
                                          className="w-3.5 h-3.5"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                                          />
                                        </svg>
                                        {message.translatedContent
                                          ? "Translate Again"
                                          : "Translate"}{" "}
                                        to{" "}
                                        {INDIAN_LANGUAGES.find(
                                          (l) => l.code === selectedLanguage
                                        )?.name || selectedLanguage}
                                      </>
                                    )}
                                  </button>
                                </div>
                              </Accordion>
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && !messages.some((m) => m.isStreaming) && (
                <MessageSkeleton />
              )}
            </div>
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
                  <span className="text-gray-700 truncate">
                    {upload.fileName}
                  </span>
                  <span className="text-gray-500 ml-2">
                    {upload.status === "completed"
                      ? "✓"
                      : upload.status === "error"
                      ? "✗"
                      : `${Math.round(upload.progress)}%`}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      upload.status === "completed"
                        ? "bg-green-500"
                        : upload.status === "error"
                        ? "bg-red-500"
                        : "bg-orange-500"
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

      {/* Compact Input Area - All controls on one line */}
      <div className="flex-shrink-0 border-t-2 border-orange-200 p-3 bg-white">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files)}
          accept=".pdf,.txt,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,image/*"
          multiple
        />

        {/* Single Line Input with all controls - centered vertically */}
        <div className="flex gap-2 items-center">
          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-xl transition-all border-2 border-orange-200 hover:border-orange-300 flex-shrink-0"
            title="Upload files (PDF, TXT, DOC, PPT, Images)"
          >
            <svg
              className="w-5 h-5"
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
          </button>

          {/* Text Input - Takes remaining space */}
          <MentionInput
            value={inputValue}
            onChange={setInputValue}
            selectedMentions={selectedMentions}
            onMentionsChange={setSelectedMentions}
            availableFiles={uploadedFiles}
            placeholder="Ask anything about your documents..."
            disabled={isLoading}
            onKeyPress={handleKeyPress}
          />

          {/* Voice Input Button */}
          <MicButton
            onTranscript={(text) => {
              setInputValue((prev) => (prev ? `${prev} ${text}` : text));
            }}
            disabled={isLoading}
          />

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className={`p-2.5 rounded-xl transition-all flex-shrink-0 border-2 ${
              inputValue.trim() && !isLoading
                ? "bg-gradient-to-br from-orange-400 to-orange-500 text-white border-orange-400 hover:from-orange-500 hover:to-orange-600 shadow-md hover:shadow-lg"
                : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
            }`}
          >
            <svg
              className="w-5 h-5"
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

        {/* Example Prompts - Compact - Only show if documents uploaded */}
        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-xs text-gray-500 font-medium">Try:</span>
            {getExamplePrompts().map((prompt, index) => (
              <button
                key={index}
                className="text-xs bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full hover:bg-orange-100 hover:text-orange-800 transition-all border border-orange-200 font-medium"
                onClick={() => setInputValue(prompt)}
                disabled={isLoading}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;

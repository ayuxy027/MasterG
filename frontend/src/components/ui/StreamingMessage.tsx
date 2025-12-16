import React from "react";
import type { SourceCitation } from "../../types/chat";
import MarkdownRenderer from "./MarkdownRenderer";
import Accordion from "./Accordion";

interface StreamingMessageProps {
    content: string;
    isStreaming: boolean;
    sources: SourceCitation[];
    timestamp: Date;
}

/**
 * StreamingMessage - Displays a streaming AI response with typing animation
 * - Shows content as it streams
 * - Animated cursor while streaming
 * - Sources appear after streaming completes
 */
const StreamingMessage: React.FC<StreamingMessageProps> = ({
    content,
    isStreaming,
    sources,
    timestamp,
}) => {
    const formatTimestamp = (date: Date): string => {
        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl p-4 shadow-md bg-white text-gray-800 rounded-bl-sm border-2 border-orange-100">

                {/* Message Content */}
                <div className="prose prose-sm max-w-none">
                    {content ? (
                        <div className="relative">
                            <MarkdownRenderer content={content} />
                            {/* Typing cursor animation */}
                            {isStreaming && (
                                <span className="inline-block w-2 h-4 bg-orange-400 ml-0.5 animate-pulse rounded-sm" />
                            )}
                        </div>
                    ) : isStreaming ? (
                        <div className="flex items-center gap-2 text-gray-500">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                            <span className="text-sm">Thinking...</span>
                        </div>
                    ) : null}
                </div>

                {/* Timestamp */}
                <div className="text-xs mt-2 text-gray-500">
                    {formatTimestamp(timestamp)}
                </div>

                {/* Source Citations - Show only after streaming is complete */}
                {!isStreaming && sources && sources.length > 0 && (
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
                            badge={sources.length}
                        >
                            <div className="space-y-2">
                                {[...sources].reverse().map((source, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-orange-50 rounded-lg p-3 border border-orange-200"
                                    >
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-xs font-semibold text-orange-700">
                                                {source.pdfName}
                                            </span>
                                            <span className="text-xs text-orange-500">
                                                • Page {source.pageNo}
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
            </div>
        </div>
    );
};

export default StreamingMessage;

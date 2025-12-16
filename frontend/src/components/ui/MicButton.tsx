import React from "react";
import { useVoiceInput } from "../../hooks/useVoiceInput";

interface MicButtonProps {
    onTranscript: (text: string) => void;
    disabled?: boolean;
    className?: string;
}

const MicButton: React.FC<MicButtonProps> = ({
    onTranscript,
    disabled = false,
    className = "",
}) => {
    const { status, toggleRecording, cancelRecording, error } = useVoiceInput({
        onTranscript,
        onError: (err) => console.error("[MicButton] Error:", err),
    });

    const isRecording = status === "recording";
    const isProcessing = status === "processing";
    const isError = status === "error";

    const handleClick = async () => {
        if (disabled || isProcessing) return;
        await toggleRecording();
    };

    const getButtonStyles = (): string => {
        const baseStyles =
            "relative p-2.5 rounded-xl transition-all flex-shrink-0 flex items-center justify-center border-2";

        if (disabled || isProcessing) {
            return `${baseStyles} bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed`;
        }

        if (isRecording) {
            return `${baseStyles} bg-red-500 text-white border-red-500 hover:bg-red-600 hover:border-red-600 shadow-lg animate-pulse`;
        }

        if (isError) {
            return `${baseStyles} bg-red-50 text-red-600 border-red-300 hover:bg-red-100`;
        }

        return `${baseStyles} bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100 hover:border-orange-300`;
    };

    const getTooltip = (): string => {
        if (isProcessing) return "Processing audio...";
        if (isRecording) return "Click to stop recording";
        if (isError && error) return error;
        return "Click to start voice input";
    };

    return (
        <div className="relative">
            <button
                onClick={handleClick}
                disabled={disabled || isProcessing}
                className={`${getButtonStyles()} ${className}`}
                title={getTooltip()}
                aria-label={isRecording ? "Stop recording" : "Start voice input"}
            >
                {/* Mic Icon */}
                {!isProcessing && !isRecording && (
                    <MicIcon className="w-5 h-5" />
                )}

                {/* Recording Icon with Animation */}
                {isRecording && (
                    <div className="relative">
                        <MicIcon className="w-5 h-5" />
                        {/* Pulsing ring animation */}
                        <span className="absolute -inset-1 rounded-full bg-white/30 animate-ping" />
                    </div>
                )}

                {/* Processing Spinner */}
                {isProcessing && (
                    <svg
                        className="w-5 h-5 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                )}
            </button>

            {/* Recording indicator dot */}
            {isRecording && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-lg" />
            )}

            {/* Error tooltip */}
            {isError && error && (
                <button
                    onClick={cancelRecording}
                    className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs bg-red-100 text-red-600 px-2 py-1 rounded whitespace-nowrap shadow-md"
                >
                    ✕ {error.length > 30 ? error.substring(0, 30) + "..." : error}
                </button>
            )}
        </div>
    );
};

// Microphone Icon Component
const MicIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
    <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
        />
    </svg>
);

export default MicButton;

import { useState, useRef, useCallback } from "react";

type VoiceInputStatus = "idle" | "recording" | "processing" | "error";

interface UseVoiceInputOptions {
    onTranscript: (text: string) => void;
    onError?: (error: string) => void;
}

interface UseVoiceInputReturn {
    status: VoiceInputStatus;
    error: string | null;
    toggleRecording: () => Promise<void>;
    cancelRecording: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

export function useVoiceInput({
    onTranscript,
    onError,
}: UseVoiceInputOptions): UseVoiceInputReturn {
    const [status, setStatus] = useState<VoiceInputStatus>("idle");
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);

    /**
     * Start recording audio from microphone
     */
    const startRecording = useCallback(async () => {
        try {
            setError(null);
            setStatus("recording");
            audioChunksRef.current = [];

            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000,
                },
            });
            streamRef.current = stream;

            // Create MediaRecorder with supported MIME type
            const mimeType = getSupportedMimeType();
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType,
                audioBitsPerSecond: 128000,
            });
            mediaRecorderRef.current = mediaRecorder;

            // Collect audio chunks
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            // Handle recording stop
            mediaRecorder.onstop = async () => {
                // Stop all tracks
                stream.getTracks().forEach((track) => track.stop());

                if (audioChunksRef.current.length === 0) {
                    setStatus("idle");
                    return;
                }

                // Process the audio
                setStatus("processing");
                try {
                    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                    const transcript = await sendAudioToBackend(audioBlob, mimeType);

                    if (transcript && transcript.trim()) {
                        onTranscript(transcript);
                        setStatus("idle");
                    } else {
                        throw new Error("No speech detected");
                    }
                } catch (err: any) {
                    const errorMessage = err.message || "Transcription failed";
                    setError(errorMessage);
                    setStatus("error");
                    onError?.(errorMessage);
                }
            };

            // Handle errors
            mediaRecorder.onerror = (event: any) => {
                const errorMessage = event.error?.message || "Recording failed";
                setError(errorMessage);
                setStatus("error");
                onError?.(errorMessage);
            };

            // Start recording
            mediaRecorder.start(100); // Collect data every 100ms
            console.log("[VoiceInput] Recording started");
        } catch (err: any) {
            let errorMessage = "Failed to access microphone";

            if (err.name === "NotAllowedError") {
                errorMessage = "Microphone access denied. Please allow microphone access.";
            } else if (err.name === "NotFoundError") {
                errorMessage = "No microphone found. Please connect a microphone.";
            } else if (err.message) {
                errorMessage = err.message;
            }

            setError(errorMessage);
            setStatus("error");
            onError?.(errorMessage);
        }
    }, [onTranscript, onError]);

    /**
     * Stop recording
     */
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
            console.log("[VoiceInput] Recording stopped");
        }
    }, []);

    /**
     * Toggle recording state
     */
    const toggleRecording = useCallback(async () => {
        if (status === "recording") {
            stopRecording();
        } else if (status === "idle" || status === "error") {
            await startRecording();
        }
    }, [status, startRecording, stopRecording]);

    /**
     * Cancel recording and reset state
     */
    const cancelRecording = useCallback(() => {
        // Stop recording if active
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }

        // Stop all audio tracks
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
        }

        // Reset state
        audioChunksRef.current = [];
        setError(null);
        setStatus("idle");
    }, []);

    return {
        status,
        error,
        toggleRecording,
        cancelRecording,
    };
}

/**
 * Get supported audio MIME type for MediaRecorder
 */
function getSupportedMimeType(): string {
    const types = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
        "audio/wav",
    ];

    for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
            console.log("[VoiceInput] Using MIME type:", type);
            return type;
        }
    }

    // Fallback
    return "audio/webm";
}

/**
 * Send audio to backend for transcription
 */
async function sendAudioToBackend(audioBlob: Blob, mimeType: string): Promise<string> {
    const formData = new FormData();

    // Determine file extension from MIME type
    const extension = mimeType.includes("webm") ? "webm"
        : mimeType.includes("ogg") ? "ogg"
            : mimeType.includes("mp4") ? "m4a"
                : mimeType.includes("wav") ? "wav"
                    : "webm";

    formData.append("audio", audioBlob, `recording.${extension}`);

    console.log(`[VoiceInput] Sending audio to backend: ${audioBlob.size} bytes, type: ${mimeType}`);

    const response = await fetch(`${API_BASE_URL}/api/speech/transcribe`, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
        throw new Error(data.error || "Transcription failed");
    }

    console.log("[VoiceInput] Transcription received:", data.data?.text);
    return data.data?.text || "";
}

export default useVoiceInput;

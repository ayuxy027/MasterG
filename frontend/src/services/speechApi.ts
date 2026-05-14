import { API_BASE_URL } from "../config/api";

interface TranscribeResponse {
    success: boolean;
    data?: {
        text: string;
        language?: string;
        duration?: number;
    };
    error?: string;
}

/**
 * Transcribe audio blob to text using the speech API
 * @param audioBlob - Recorded audio blob from MediaRecorder
 * @returns Transcription response with text
 */
export async function transcribeAudio(audioBlob: Blob): Promise<TranscribeResponse> {
    const formData = new FormData();

    // Append the audio blob with a filename
    const extension = audioBlob.type.includes("webm") ? "webm" : "wav";
    formData.append("audio", audioBlob, `recording.${extension}`);

    try {
        const response = await fetch(`${API_BASE_URL}/api/speech/transcribe`, {
            method: "POST",
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Transcription failed");
        }

        return data;
    } catch (error: unknown) {
        console.error("[SpeechAPI] Transcription error:", error);

        if (error instanceof Error) {
            return {
                success: false,
                error: error.message,
            };
        }

        return {
            success: false,
            error: "Failed to transcribe audio",
        };
    }
}

import { Request, Response } from "express";
import { speechService } from "../services/speech.service";

/**
 * POST /api/speech/transcribe
 * Transcribe audio file to text using Whisper
 */
export const transcribeAudio = async (req: Request, res: Response) => {
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: "No audio file provided",
            });
        }

        const audioFile = req.file;
        console.log(`[Speech Controller] Received audio: ${audioFile.originalname}, size: ${audioFile.size}, type: ${audioFile.mimetype}`);

        // Validate file type
        const allowedTypes = [
            "audio/webm",
            "audio/wav",
            "audio/mpeg",
            "audio/mp3",
            "audio/ogg",
            "audio/mp4",
            "audio/x-m4a",
            "audio/wave",
            "audio/x-wav",
        ];

        if (!allowedTypes.includes(audioFile.mimetype)) {
            return res.status(400).json({
                success: false,
                error: `Unsupported audio format: ${audioFile.mimetype}. Supported: webm, wav, mp3, ogg, m4a`,
            });
        }

        // Validate file size (max 25MB for Groq Whisper)
        const maxSize = 25 * 1024 * 1024; // 25MB
        if (audioFile.size > maxSize) {
            return res.status(413).json({
                success: false,
                error: "Audio file too large. Maximum size is 25MB.",
            });
        }

        // Transcribe the audio
        const result = await speechService.transcribeBuffer(
            audioFile.buffer,
            audioFile.mimetype
        );

        return res.json({
            success: true,
            data: {
                text: result.text,
                language: result.language,
                duration: result.duration,
            },
        });
    } catch (error: any) {
        console.error("[Speech Controller] Transcription error:", error);

        return res.status(500).json({
            success: false,
            error: error.message || "Failed to transcribe audio",
        });
    }
};

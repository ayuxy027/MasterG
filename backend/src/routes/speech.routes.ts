import { Router } from "express";
import multer from "multer";
import { transcribeAudio } from "../controllers/speech.controller";

const router = Router();

// Configure multer for audio upload (in-memory storage)
const audioUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024, // 25MB max
    },
    fileFilter: (req, file, cb) => {
        // Accept common audio formats
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

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported audio format: ${file.mimetype}`));
        }
    },
});

/**
 * POST /api/speech/transcribe
 * Upload audio file and get transcription
 * 
 * Request: multipart/form-data with 'audio' field
 * Response: { success: true, data: { text: string, language?: string, duration?: number } }
 */
router.post("/transcribe", audioUpload.single("audio"), transcribeAudio);

export default router;

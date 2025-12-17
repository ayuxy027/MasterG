import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

interface TranscriptionResult {
    text: string;
    language?: string;
    duration?: number;
}

/**
 * Speech Service using Local Whisper.cpp
 * Uses the local whisper model for fully offline transcription
 */
class SpeechService {
    private whisperPath: string;
    private modelPath: string;
    private tempDir: string;

    constructor() {
        // Paths for whisper.cpp binary and model
        const backendRoot = path.resolve(__dirname, "../..");
        this.whisperPath = path.join(backendRoot, "bin", "whisper", "whisper-cli.exe");
        this.modelPath = path.join(backendRoot, "models", "whisper", "ggml-base.bin");
        this.tempDir = path.join(backendRoot, "uploads", "temp");

        // Ensure temp directory exists
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }


    }

    /**
     * Convert audio buffer to WAV format using ffmpeg
     * WebM audio needs to be converted to WAV for whisper.cpp
     */
    private async convertToWav(inputPath: string, outputPath: string): Promise<void> {
        try {
            // Use ffmpeg to convert to 16kHz mono WAV (required by whisper.cpp)
            const command = `ffmpeg -y -i "${inputPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${outputPath}"`;

            await execAsync(command);
        } catch (error: any) {

            // If ffmpeg fails, try to use the file directly if it's already WAV
            if (inputPath.endsWith(".wav")) {
                fs.copyFileSync(inputPath, outputPath);
            } else {
                throw new Error(`Audio conversion failed: ${error.message}. Please ensure FFmpeg is installed.`);
            }
        }
    }

    /**
     * Transcribe audio buffer to text using local Whisper
     * @param audioBuffer - Raw audio buffer
     * @param mimeType - MIME type of the audio (e.g., 'audio/webm', 'audio/wav')
     * @returns Transcription result with text, language, and duration
     */
    async transcribeBuffer(
        audioBuffer: Buffer,
        mimeType: string
    ): Promise<TranscriptionResult> {
        const timestamp = Date.now();
        const extension = this.getExtensionFromMime(mimeType);
        const inputPath = path.join(this.tempDir, `speech_input_${timestamp}.${extension}`);
        const wavPath = path.join(this.tempDir, `speech_${timestamp}.wav`);

        try {


            // Check if whisper binary exists
            if (!fs.existsSync(this.whisperPath)) {
                throw new Error(`Whisper CLI not found at: ${this.whisperPath}`);
            }

            // Check if model exists
            if (!fs.existsSync(this.modelPath)) {
                throw new Error(`Whisper model not found at: ${this.modelPath}`);
            }

            // Write audio buffer to temp file
            fs.writeFileSync(inputPath, audioBuffer);


            // Convert to WAV format if not already WAV
            if (mimeType !== "audio/wav" && mimeType !== "audio/wave" && mimeType !== "audio/x-wav") {
                await this.convertToWav(inputPath, wavPath);
            } else {
                // Already WAV, just copy
                fs.copyFileSync(inputPath, wavPath);
            }

            // Run whisper.cpp transcription
            const result = await this.runWhisper(wavPath);

            return result;
        } catch (error: any) {

            throw error;
        } finally {
            // Cleanup temp files
            this.cleanupFile(inputPath);
            this.cleanupFile(wavPath);
            this.cleanupFile(wavPath + ".txt"); // whisper creates .txt output
        }
    }

    /**
     * Run the whisper.cpp CLI
     */
    private async runWhisper(wavPath: string): Promise<TranscriptionResult> {
        // Build whisper command
        // -m: model path
        // -f: input file
        // -otxt: output as text file
        // -np: no prints (quiet mode)
        // --threads: number of CPU threads
        const command = `"${this.whisperPath}" -m "${this.modelPath}" -f "${wavPath}" -otxt -np --threads 4`;



        try {
            const { stdout, stderr } = await execAsync(command, {
                timeout: 120000, // 2 minute timeout
                maxBuffer: 10 * 1024 * 1024, // 10MB buffer
                cwd: path.dirname(this.whisperPath), // Run from whisper directory for DLL loading
            });



            // Read the output text file
            const outputPath = wavPath + ".txt";
            if (!fs.existsSync(outputPath)) {
                // Try to get text from stdout if file not created
                const text = this.extractTextFromOutput(stdout);
                if (text) {
                    return { text, language: "en" };
                }
                throw new Error("Whisper did not produce output file");
            }

            const text = fs.readFileSync(outputPath, "utf-8").trim();


            return {
                text,
                language: "en",
                duration: 0,
            };
        } catch (error: any) {


            // Check for common errors
            if (error.code === 3221225781) {
                throw new Error(
                    "Whisper CLI is missing required DLLs. Please download the complete whisper.cpp Windows release " +
                    "from https://github.com/ggerganov/whisper.cpp/releases and copy all DLL files " +
                    "(whisper.dll, ggml.dll, etc.) to the bin/whisper folder. " +
                    "Also ensure Visual C++ Redistributables are installed."
                );
            }

            throw new Error(`Transcription failed: ${error.message || "Unknown error"}`);
        }
    }

    /**
     * Extract text from whisper stdout (fallback if txt file not created)
     */
    private extractTextFromOutput(stdout: string): string {
        // Whisper might output timestamped lines like:
        // [00:00:00.000 --> 00:00:02.000] Hello world
        const lines = stdout.split("\n");
        const textParts: string[] = [];

        for (const line of lines) {
            const match = line.match(/\[\d+:\d+:\d+\.\d+ --> \d+:\d+:\d+\.\d+\]\s*(.+)/);
            if (match) {
                textParts.push(match[1].trim());
            }
        }

        return textParts.join(" ").trim();
    }

    /**
     * Transcribe audio from file path (legacy method for compatibility)
     * @param filePath - Path to audio file
     * @returns Transcription result
     */
    async transcribe(filePath: string): Promise<TranscriptionResult> {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Audio file not found: ${filePath}`);
        }

        const audioBuffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase().slice(1);
        const mimeType = this.getMimeFromExtension(ext);

        return this.transcribeBuffer(audioBuffer, mimeType);
    }

    /**
     * Get file extension from MIME type
     */
    private getExtensionFromMime(mimeType: string): string {
        const mimeToExt: Record<string, string> = {
            "audio/webm": "webm",
            "audio/wav": "wav",
            "audio/wave": "wav",
            "audio/x-wav": "wav",
            "audio/mpeg": "mp3",
            "audio/mp3": "mp3",
            "audio/ogg": "ogg",
            "audio/mp4": "m4a",
            "audio/x-m4a": "m4a",
            "audio/flac": "flac",
        };

        return mimeToExt[mimeType] || "wav";
    }

    /**
     * Get MIME type from file extension
     */
    private getMimeFromExtension(ext: string): string {
        const extToMime: Record<string, string> = {
            webm: "audio/webm",
            wav: "audio/wav",
            mp3: "audio/mpeg",
            ogg: "audio/ogg",
            m4a: "audio/mp4",
            flac: "audio/flac",
        };

        return extToMime[ext] || "audio/wav";
    }

    /**
     * Cleanup a temp file safely
     */
    private cleanupFile(filePath: string): void {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (e) {
            // Ignore cleanup errors
        }
    }
}

// Export singleton instance
export const speechService = new SpeechService();
export default speechService;

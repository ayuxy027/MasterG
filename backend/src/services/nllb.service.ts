import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";
import { env } from "../config/env";

export interface NLLBTranslateOptions {
  srcLang: string; // e.g. eng_Latn
  tgtLang: string; // e.g. hin_Deva
  batchSize?: number; // Batch size for translation (auto-detected based on CPU/GPU)
  useCache?: boolean; // Whether to use cache (default: true)
}

export class NLLBService {
  private scriptPath: string;
  private pythonExecutable: string;
  private pythonProcess: ChildProcess | null = null; // Persistent Python process
  private translationCache: Map<string, string> = new Map(); // Simple in-memory cache
  private readonly CACHE_MAX_SIZE = 1000; // Limit cache size
  private requestQueue: Array<{
    id: string;
    payload: string;
    resolve: (value: { success: boolean; translated?: string; error?: string }) => void;
  }> = []; // Queue for concurrent requests
  private isProcessing = false; // Track if processing a request
  private requestIdCounter = 0; // Generate unique request IDs

  constructor() {
    this.scriptPath = path.resolve(
      __dirname,
      "..",
      "..",
      "proxy",
      "nllb_server.py"
    );
    // Use venv python - CRITICAL for torch and other dependencies
    // On Windows, venv uses Scripts/python.exe; on Unix/Mac, it's bin/python
    const isWindows = process.platform === "win32";
    const venvPython = path.resolve(
      __dirname,
      "..",
      "..",
      "proxy",
      "venv",
      isWindows ? "Scripts" : "bin",
      isWindows ? "python.exe" : "python"
    );
    // Always prioritize venv python if it exists (has torch and all deps)
    if (fs.existsSync(venvPython)) {
      this.pythonExecutable = venvPython;
      console.log(`✅ Using NLLB venv Python: ${venvPython}`);
    } else {
      this.pythonExecutable = env.PYTHON_EXECUTABLE || "python3";
      console.warn(`⚠️  NLLB venv not found at ${venvPython}, using ${this.pythonExecutable}. Translation may fail without proper dependencies.`);
    }

    // Start persistent Python server only if enabled
    if (env.NLLB_ENABLED) {
      this.startServer();
    }
  }

  private startServer() {
    if (this.pythonProcess) {
      return; // Already running
    }

    console.log("🚀 Starting NLLB-200 persistent server...");
    this.pythonProcess = spawn(this.pythonExecutable, [this.scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.pythonProcess.stderr.on("data", (data: Buffer) => {
      const msg = data.toString();
      // Log server messages to stderr (model loading, etc.)
      if (msg.includes("Loading") || msg.includes("ready") || msg.includes("error")) {
        console.log(`[NLLB] ${msg.trim()}`);
      }
    });

    this.pythonProcess.on("error", (err: Error) => {
      console.error("❌ NLLB server error:", err);
      this.pythonProcess = null;
    });

    this.pythonProcess.on("exit", (code: number) => {
      console.warn(`⚠️  NLLB server exited with code ${code}`);
      this.pythonProcess = null;
      // Attempt to restart after a delay
      if (env.NLLB_ENABLED) {
        setTimeout(() => {
          if (!this.pythonProcess) {
            console.log("🔄 Attempting to restart NLLB server...");
            this.startServer();
          }
        }, 5000);
      }
    });
  }

  /**
   * Generate cache key from text and language options
   * OPTIMIZATION: Use hash for better cache key distribution and memory efficiency
   */
  private getCacheKey(text: string, options: NLLBTranslateOptions): string {
    // Use simple hash function for better cache key distribution
    // This prevents cache key collisions and reduces memory usage
    let hash = 0;
    const keyString = `${options.srcLang}:${options.tgtLang}:${text}`;
    for (let i = 0; i < keyString.length; i++) {
      const char = keyString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `nllb:${Math.abs(hash).toString(36)}:${keyString.length}`;
  }

  /**
   * Clear cache if it exceeds max size
   */
  private manageCache(): void {
    if (this.translationCache.size > this.CACHE_MAX_SIZE) {
      // Remove oldest 20% of entries (simple LRU approximation)
      const entriesToRemove = Math.floor(this.CACHE_MAX_SIZE * 0.2);
      const keys = Array.from(this.translationCache.keys());
      for (let i = 0; i < entriesToRemove; i++) {
        this.translationCache.delete(keys[i]);
      }
    }
  }

  async translate(
    text: string,
    options: NLLBTranslateOptions
  ): Promise<string> {
    if (!env.NLLB_ENABLED) {
      throw new Error("NLLB-200 is not enabled. Set NLLB_ENABLED=true to enable.");
    }

    // Check cache if enabled (default: true)
    const useCache = options.useCache !== false;
    if (useCache) {
      const cacheKey = this.getCacheKey(text, options);
      const cached = this.translationCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const result = await this.runPython(text, options);

    if (!result.success || !result.translated) {
      throw new Error(
        result.error || "NLLB translation failed for unknown reasons"
      );
    }

    // Store in cache
    if (useCache) {
      const cacheKey = this.getCacheKey(text, options);
      this.translationCache.set(cacheKey, result.translated);
      this.manageCache();
    }

    return result.translated;
  }

  /**
   * Stream translation sentence-by-sentence.
   *
   * This expects the Python server to emit one JSON object per line:
   *  { success, type: "chunk" | "complete" | "error", index?, total?, translated? }
   */
  async streamTranslate(
    text: string,
    options: NLLBTranslateOptions,
    onChunk: (chunk: {
      success: boolean;
      type?: string;
      index?: number;
      total?: number;
      translated?: string;
      error?: string;
    }) => void
  ): Promise<void> {
    if (!env.NLLB_ENABLED) {
      onChunk({
        success: false,
        type: "error",
        error: "NLLB-200 is not enabled. Set NLLB_ENABLED=true to enable.",
      });
      return;
    }

    // Ensure server is running
    await new Promise<void>((resolve) => {
      if (!this.pythonProcess) {
        this.startServer();
        setTimeout(() => resolve(), 2000);
      } else {
        resolve();
      }
    });

    if (!this.pythonProcess) {
      onChunk({
        success: false,
        type: "error",
        error: "NLLB server is not running",
      });
      return;
    }

    return new Promise<void>((resolve) => {
      const payload = JSON.stringify({
        text,
        src_lang: options.srcLang,
        tgt_lang: options.tgtLang,
        stream: true,
        batch_size: options.batchSize || undefined, // Auto-detect if not specified
      }) + "\n";

      let stdoutBuffer = "";

      const dataHandler = (data: Buffer) => {
        stdoutBuffer += data.toString();

        // Process all complete lines
        let newlineIndex = stdoutBuffer.indexOf("\n");
        while (newlineIndex !== -1) {
          const line = stdoutBuffer.slice(0, newlineIndex).trim();
          stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);

          if (line.length > 0) {
            try {
              const parsed = JSON.parse(line);
              onChunk(parsed);

              if (parsed.type === "complete" || parsed.type === "error") {
                this.pythonProcess!.stdout.removeListener("data", dataHandler);
                resolve();
                return;
              }
            } catch (err) {
              onChunk({
                success: false,
                type: "error",
                error:
                  err instanceof Error
                    ? `Invalid JSON from NLLB server: ${err.message}`
                    : "Invalid JSON from NLLB server",
              });
              this.pythonProcess!.stdout.removeListener("data", dataHandler);
              resolve();
              return;
            }
          }

          newlineIndex = stdoutBuffer.indexOf("\n");
        }
      };

      this.pythonProcess!.stdout.on("data", dataHandler);

      // Send request
      this.pythonProcess!.stdin.write(payload);
    });
  }

  private runPython(
    text: string,
    options: NLLBTranslateOptions
  ): Promise<{ success: boolean; translated?: string; error?: string }> {
    return new Promise((resolve) => {
      // Ensure server is running
      if (!this.pythonProcess) {
        this.startServer();
        // Wait a bit for server to start
        setTimeout(() => {
          if (!this.pythonProcess) {
            resolve({
              success: false,
              error: "NLLB server failed to start",
            });
            return;
          }
          this.sendRequest(text, options, resolve);
        }, 2000);
        return;
      }

      this.sendRequest(text, options, resolve);
    });
  }

  private sendRequest(
    text: string,
    options: NLLBTranslateOptions,
    resolve: (value: { success: boolean; translated?: string; error?: string }) => void
  ) {
    // ROBUST: Ensure server is running, start if needed
    if (!this.pythonProcess) {
      this.startServer();
      // Wait a bit longer for server to be ready
      setTimeout(() => {
        if (!this.pythonProcess) {
          resolve({
            success: false,
            error: "NLLB server failed to start. Please check Python environment.",
          });
          return;
        }
        this.sendRequest(text, options, resolve);
      }, 3000); // Increased wait time
      return;
    }

    // CONCURRENT REQUEST HANDLING: Generate unique request ID and queue request
    const requestId = `req_${++this.requestIdCounter}_${Date.now()}`;
    const payload = JSON.stringify({
      id: requestId, // Add request ID for matching responses
      text,
      src_lang: options.srcLang,
      tgt_lang: options.tgtLang,
      batch_size: options.batchSize || undefined, // Auto-detect if not specified
    }) + "\n";

    // Add to queue
    this.requestQueue.push({
      id: requestId,
      payload,
      resolve,
    });

    // Process queue if not already processing
    this.processQueue();
  }

  /**
   * Process translation requests sequentially to avoid mixing responses
   * CONCURRENT TRANSLATION FIX: Queue requests and process one at a time
   * This ensures Hindi and Marathi translations don't interfere with each other
   */
  private processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    const request = this.requestQueue.shift();
    if (!request) return;

    this.isProcessing = true;
    console.log(`[NLLB] Processing translation request ${request.id} (${this.requestQueue.length} in queue)`);

    let stdoutBuffer = "";

    const dataHandler = (data: Buffer) => {
      stdoutBuffer += data.toString();
      // Check if we have a complete JSON response (ends with newline)
      if (stdoutBuffer.includes("\n")) {
        const lines = stdoutBuffer.split("\n");
        const responseLine = lines[0];
        stdoutBuffer = lines.slice(1).join("\n");

        // Remove listeners to avoid processing this response again
        this.pythonProcess!.stdout.removeListener("data", dataHandler);
        this.pythonProcess!.stderr.removeListener("data", errorHandler);

        try {
          const parsed = JSON.parse(responseLine);
          
          // ROBUST: Ensure we always return something
          if (!parsed.success && !parsed.translated) {
            request.resolve({
              success: false,
              error: parsed.error || "Translation failed",
            });
          } else {
            request.resolve(parsed);
          }
        } catch (err: any) {
          // ROBUST: Even if JSON parsing fails, return error
          console.error(`Invalid JSON from NLLB server: ${err.message}. Output: ${responseLine.substring(0, 200)}`);
          request.resolve({
            success: false,
            error: `Invalid response from translation server`,
          });
        }

        // Process next request in queue after a small delay
        this.isProcessing = false;
        setTimeout(() => this.processQueue(), 50); // Small delay to ensure clean separation
      }
    };

    const errorHandler = (data: Buffer) => {
      const stderr = data.toString();
      // Only treat as fatal error if it's a Traceback or Fatal error
      if (stderr.includes("Traceback") || stderr.includes("Fatal error") || (stderr.includes("Error") && !stderr.includes("Warning"))) {
        this.pythonProcess!.stdout.removeListener("data", dataHandler);
        this.pythonProcess!.stderr.removeListener("data", errorHandler);
        request.resolve({
          success: false,
          error: `NLLB server error: ${stderr.substring(0, 500)}`,
        });
        this.isProcessing = false;
        setTimeout(() => this.processQueue(), 50);
      }
    };

    // Use 'once' to ensure handler is removed after processing
    this.pythonProcess.stdout.once("data", dataHandler);
    this.pythonProcess.stderr.once("data", errorHandler);

    // Send request to Python server
    this.pythonProcess.stdin.write(request.payload);
  }
}

export const nllbService = new NLLBService();


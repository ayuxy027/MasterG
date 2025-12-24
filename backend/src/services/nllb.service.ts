import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";
import { env } from "../config/env";
import { v4 as uuidv4 } from "uuid";

export interface NLLBTranslateOptions {
  srcLang: string; // e.g. eng_Latn
  tgtLang: string; // e.g. hin_Deva
  batchSize?: number; // Batch size for translation (auto-detected based on CPU/GPU)
  useCache?: boolean; // Whether to use cache (default: true)
}

// Pending request interface for queue
interface PendingRequest {
  resolve: (value: { success: boolean; translated?: string; error?: string }) => void;
  requestId: string;
}

export class NLLBService {
  private scriptPath: string;
  private modelPath: string;
  private pythonExecutable: string;
  private pythonProcess: ChildProcess | null = null;
  private translationCache: Map<string, string> = new Map();
  private readonly CACHE_MAX_SIZE = 1000;

  // Request queue to handle concurrent translations properly
  private requestQueue: PendingRequest[] = [];
  private isProcessing: boolean = false;
  private stdoutBuffer: string = "";

  constructor() {
    this.scriptPath = path.resolve(
      __dirname,
      "..",
      "..",
      "proxy",
      "nllb_server.py"
    );
    this.modelPath = path.resolve(
      __dirname,
      "..",
      "..",
      "proxy",
      "models",
      "nllb-200-distilled-600M"
    );

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

    if (fs.existsSync(venvPython)) {
      this.pythonExecutable = venvPython;
      console.log(`✅ Using NLLB venv Python: ${venvPython}`);
    } else {
      this.pythonExecutable = env.PYTHON_EXECUTABLE || "python3";
      console.warn(`⚠️  NLLB venv not found at ${venvPython}, using ${this.pythonExecutable}`);
    }

    if (env.NLLB_ENABLED) {
      this.startServer();
    }
  }

  private startServer() {
    if (this.pythonProcess) {
      return;
    }

    const spawnEnv = {
      ...process.env,
      NLLB_MODEL_PATH: this.modelPath,
      TRANSFORMERS_OFFLINE: "1",
      HF_DATASETS_OFFLINE: "1",
      HF_HUB_OFFLINE: "1",
    };

    if (!fs.existsSync(this.modelPath)) {
      console.warn(`⚠️  NLLB model directory not found at ${this.modelPath}`);
    }

    console.log("🚀 Starting NLLB-200 persistent server...");
    this.pythonProcess = spawn(this.pythonExecutable, [this.scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
      env: spawnEnv,
    });

    // Handle stdout - process responses
    this.pythonProcess.stdout.on("data", (data: Buffer) => {
      this.handleStdout(data);
    });

    this.pythonProcess.stderr.on("data", (data: Buffer) => {
      const msg = data.toString();
      if (msg.includes("Loading") || msg.includes("ready") || msg.includes("error") || msg.includes("✅")) {
        console.log(`[NLLB] ${msg.trim()}`);
      }
    });

    this.pythonProcess.on("error", (err: Error) => {
      console.error("❌ NLLB server error:", err);
      this.pythonProcess = null;
      this.rejectAllPending("NLLB server error");
    });

    this.pythonProcess.on("exit", (code: number) => {
      console.warn(`⚠️  NLLB server exited with code ${code}`);
      this.pythonProcess = null;
      this.rejectAllPending("NLLB server exited");

      if (env.NLLB_ENABLED) {
        setTimeout(() => {
          if (!this.pythonProcess) {
            console.log("🔄 Attempting to restart NLLB server...");
            this.startServer();
          }
        }, 5001);
      }
    });
  }

  /**
   * Handle stdout data - parse responses and resolve pending requests IN ORDER
   */
  private handleStdout(data: Buffer) {
    this.stdoutBuffer += data.toString();

    // Process complete lines
    let newlineIndex = this.stdoutBuffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = this.stdoutBuffer.slice(0, newlineIndex).trim();
      this.stdoutBuffer = this.stdoutBuffer.slice(newlineIndex + 1);

      if (line.length > 0) {
        try {
          const parsed = JSON.parse(line);

          // Pop the first pending request (FIFO order)
          const pending = this.requestQueue.shift();
          if (pending) {
            pending.resolve(parsed);
          } else {
            console.warn("⚠️ Received response but no pending request");
          }
        } catch (err) {
          console.error("❌ Invalid JSON from NLLB server:", line.substring(0, 100));
          // Still pop the pending request and reject it
          const pending = this.requestQueue.shift();
          if (pending) {
            pending.resolve({ success: false, error: "Invalid JSON from NLLB server" });
          }
        }
      }

      newlineIndex = this.stdoutBuffer.indexOf("\n");
    }
  }

  /**
   * Reject all pending requests (on error)
   */
  private rejectAllPending(errorMessage: string) {
    while (this.requestQueue.length > 0) {
      const pending = this.requestQueue.shift();
      if (pending) {
        pending.resolve({ success: false, error: errorMessage });
      }
    }
  }

  private getCacheKey(text: string, options: NLLBTranslateOptions): string {
    const keyString = `${options.srcLang}:${options.tgtLang}:${text}`;
    let hash = 2166136261;
    for (let i = 0; i < keyString.length; i++) {
      hash ^= keyString.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    const textLen = text.length;
    const firstChar = text.charCodeAt(0) || 0;
    const lastChar = text.charCodeAt(text.length - 1) || 0;
    return `nllb:${Math.abs(hash >>> 0).toString(36)}:${textLen}:${firstChar}:${lastChar}`;
  }

  private manageCache(): void {
    if (this.translationCache.size > this.CACHE_MAX_SIZE) {
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

    const result = await this.sendRequest(text, options);

    if (!result.success || !result.translated) {
      throw new Error(result.error || "NLLB translation failed");
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
   * Send a translation request - uses queue for proper ordering
   */
  private async sendRequest(
    text: string,
    options: NLLBTranslateOptions
  ): Promise<{ success: boolean; translated?: string; error?: string }> {
    return new Promise((resolve) => {
      // Ensure server is running
      if (!this.pythonProcess) {
        this.startServer();
        setTimeout(() => {
          if (!this.pythonProcess) {
            resolve({ success: false, error: "NLLB server failed to start" });
            return;
          }
          this.queueRequest(text, options, resolve);
        }, 3000);
        return;
      }

      this.queueRequest(text, options, resolve);
    });
  }

  /**
   * Add request to queue and send to Python
   */
  private queueRequest(
    text: string,
    options: NLLBTranslateOptions,
    resolve: (value: { success: boolean; translated?: string; error?: string }) => void
  ) {
    const requestId = uuidv4();

    // Add to queue FIRST
    this.requestQueue.push({ resolve, requestId });

    // Then send to Python
    const payload = JSON.stringify({
      text,
      src_lang: options.srcLang,
      tgt_lang: options.tgtLang,
      batch_size: options.batchSize || undefined,
    }) + "\n";

    try {
      this.pythonProcess!.stdin.write(payload);
    } catch (error) {
      // Remove from queue if send failed
      const idx = this.requestQueue.findIndex(r => r.requestId === requestId);
      if (idx !== -1) {
        this.requestQueue.splice(idx, 1);
      }
      resolve({ success: false, error: "Failed to send to NLLB server" });
    }
  }

  /**
   * Stream translation - not used by LMR but kept for compatibility
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
    // For streaming, use same queue mechanism
    const result = await this.translate(text, options);
    onChunk({
      success: true,
      type: "complete",
      translated: result,
    });
  }
}

export const nllbService = new NLLBService();

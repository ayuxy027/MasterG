import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";
import { env } from "../config/env";

export interface NLLBTranslateOptions {
  srcLang: string; // e.g. eng_Latn
  tgtLang: string; // e.g. hin_Deva
}

export class NLLBService {
  private scriptPath: string;
  private pythonExecutable: string;
  private pythonProcess: ChildProcess | null = null; // Persistent Python process

  constructor() {
    this.scriptPath = path.resolve(
      __dirname,
      "..",
      "..",
      "proxy",
      "nllb_server.py"
    );
    // Use venv python - CRITICAL for torch and other dependencies
    const venvPython = path.resolve(
      __dirname,
      "..",
      "..",
      "proxy",
      "venv",
      "bin",
      "python"
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

  async translate(
    text: string,
    options: NLLBTranslateOptions
  ): Promise<string> {
    if (!env.NLLB_ENABLED) {
      throw new Error("NLLB-200 is not enabled. Set NLLB_ENABLED=true to enable.");
    }

    const result = await this.runPython(text, options);

    if (!result.success || !result.translated) {
      throw new Error(
        result.error || "NLLB translation failed for unknown reasons"
      );
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
    if (!this.pythonProcess) {
      resolve({
        success: false,
        error: "NLLB server is not running",
      });
      return;
    }

    const payload = JSON.stringify({
      text,
      src_lang: options.srcLang,
      tgt_lang: options.tgtLang,
    }) + "\n";

    let stdoutBuffer = "";

    const dataHandler = (data: Buffer) => {
      stdoutBuffer += data.toString();
      // Check if we have a complete JSON response (ends with newline)
      if (stdoutBuffer.includes("\n")) {
        const lines = stdoutBuffer.split("\n");
        const responseLine = lines[0];
        stdoutBuffer = lines.slice(1).join("\n");

        this.pythonProcess!.stdout.removeListener("data", dataHandler);

        try {
          const parsed = JSON.parse(responseLine);
          resolve(parsed);
        } catch (err: any) {
          resolve({
            success: false,
            error: `Invalid JSON from NLLB server: ${err.message}. Output: ${responseLine.substring(0, 200)}`,
          });
        }
      }
    };

    const errorHandler = (data: Buffer) => {
      const stderr = data.toString();
      // Only treat as fatal error if it's a Traceback or Fatal error
      // Ignore "Warning" messages - those are expected and handled gracefully
      if (stderr.includes("Traceback") || stderr.includes("Fatal error") || (stderr.includes("Error") && !stderr.includes("Warning"))) {
        this.pythonProcess!.stderr.removeListener("data", errorHandler);
        resolve({
          success: false,
          error: `NLLB server error: ${stderr.substring(0, 500)}`,
        });
      }
    };

    this.pythonProcess.stdout.on("data", dataHandler);
    this.pythonProcess.stderr.on("data", errorHandler);

    // Send request
    this.pythonProcess.stdin.write(payload);
  }
}

export const nllbService = new NLLBService();


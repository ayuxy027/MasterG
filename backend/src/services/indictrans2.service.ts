import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { env } from "../config/env";

export interface IndicTrans2TranslateOptions {
  srcLang: string; // e.g. eng_Latn
  tgtLang: string; // e.g. hin_Deva
}

export class IndicTrans2Service {
  private scriptPath: string;
  private pythonExecutable: string;
  private pythonProcess: any = null; // Persistent Python process

  constructor() {
    this.scriptPath = path.resolve(
      __dirname,
      "..",
      "..",
      "proxy",
      "indictrans2_server.py"  // Changed to server version
    );
    // Use venv python - CRITICAL for torch and other dependencies
    // Windows uses Scripts directory, Unix uses bin
    const isWindows = process.platform === 'win32';
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
      console.log(`✅ Using IndicTrans2 venv Python: ${venvPython}`);
    } else {
      this.pythonExecutable = env.PYTHON_EXECUTABLE || "python3";
      console.warn(`⚠️  IndicTrans2 venv not found at ${venvPython}, using ${this.pythonExecutable}. Translation may fail without proper dependencies.`);
    }

    // Start persistent Python server
    this.startServer();
  }

  private startServer() {
    if (this.pythonProcess) {
      return; // Already running
    }

    console.log("🚀 Starting IndicTrans2 persistent server...");
    this.pythonProcess = spawn(this.pythonExecutable, [this.scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.pythonProcess.stderr.on("data", (data: Buffer) => {
      const msg = data.toString();
      // Log server messages to stderr (model loading, etc.)
      if (msg.includes("Loading") || msg.includes("ready") || msg.includes("error")) {
        console.log(`[IndicTrans2] ${msg.trim()}`);
      }
    });

    this.pythonProcess.on("error", (err: Error) => {
      console.error("❌ IndicTrans2 server error:", err);
      this.pythonProcess = null;
    });

    this.pythonProcess.on("exit", (code: number) => {
      console.warn(`⚠️  IndicTrans2 server exited with code ${code}`);
      this.pythonProcess = null;
      // Attempt to restart after a delay
      setTimeout(() => {
        if (!this.pythonProcess) {
          console.log("🔄 Attempting to restart IndicTrans2 server...");
          this.startServer();
        }
      }, 5000);
    });
  }

  async translate(
    text: string,
    options: IndicTrans2TranslateOptions
  ): Promise<string> {
    const result = await this.runPython(text, options);

    if (!result.success || !result.translated) {
      throw new Error(
        result.error || "IndicTrans2 translation failed for unknown reasons"
      );
    }

    return result.translated;
  }

  private runPython(
    text: string,
    options: IndicTrans2TranslateOptions
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
              error: "IndicTrans2 server failed to start",
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
    options: IndicTrans2TranslateOptions,
    resolve: (value: { success: boolean; translated?: string; error?: string }) => void
  ) {
    if (!this.pythonProcess) {
      resolve({
        success: false,
        error: "IndicTrans2 server is not running",
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

        this.pythonProcess.stdout.removeListener("data", dataHandler);

        try {
          const parsed = JSON.parse(responseLine);
          resolve(parsed);
        } catch (err: any) {
          resolve({
            success: false,
            error: `Invalid JSON from IndicTrans2 server: ${err.message}. Output: ${responseLine.substring(0, 200)}`,
          });
        }
      }
    };

    const errorHandler = (data: Buffer) => {
      const stderr = data.toString();
      // Only treat as error if it's not just a log message
      if (stderr.includes("Error") || stderr.includes("Traceback")) {
        this.pythonProcess.stderr.removeListener("data", errorHandler);
        resolve({
          success: false,
          error: `IndicTrans2 server error: ${stderr.substring(0, 500)}`,
        });
      }
    };

    this.pythonProcess.stdout.on("data", dataHandler);
    this.pythonProcess.stderr.on("data", errorHandler);

    // Send request
    this.pythonProcess.stdin.write(payload);
  }
}

export const indicTrans2Service = new IndicTrans2Service();



import { spawn } from "child_process";
import path from "path";
import { env } from "../config/env";

export interface IndicTrans2TranslateOptions {
  srcLang: string; // e.g. eng_Latn
  tgtLang: string; // e.g. hin_Deva
}

export class IndicTrans2Service {
  private scriptPath: string;
  private pythonExecutable: string;

  constructor() {
    this.scriptPath = path.resolve(
      __dirname,
      "..",
      "..",
      "proxy",
      "indictrans2_service.py"
    );
    // Use venv python if available, otherwise fallback to system python3
    const venvPython = path.resolve(
      __dirname,
      "..",
      "..",
      "proxy",
      "venv",
      "bin",
      "python"
    );
    this.pythonExecutable = env.PYTHON_EXECUTABLE || venvPython;
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
      const child = spawn(this.pythonExecutable, [this.scriptPath], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      const payload = JSON.stringify({
        text,
        src_lang: options.srcLang,
        tgt_lang: options.tgtLang,
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("error", (err) => {
        resolve({
          success: false,
          error: `Failed to start IndicTrans2 Python service: ${err.message}`,
        });
      });

      child.on("close", (code) => {
        if (!stdout.trim()) {
          // Check for common errors
          if (stderr.includes("FileNotFoundError") || stderr.includes("model not found")) {
            resolve({
              success: false,
              error: `IndicTrans2 model not found. Please run: cd backend/proxy && source venv/bin/activate && python setup_models.py`,
            });
            return;
          }
          if (stderr.includes("local_files_only") || stderr.includes("not found locally")) {
            resolve({
              success: false,
              error: `Model files missing. Run setup_models.py to download the model locally first.`,
            });
            return;
          }
          resolve({
            success: false,
            error: stderr || "Empty response from IndicTrans2 Python service",
          });
          return;
        }

        try {
          const parsed = JSON.parse(stdout);
          resolve(parsed);
        } catch (err: any) {
          resolve({
            success: false,
            error: `Invalid JSON from IndicTrans2 Python service: ${err.message}. Output: ${stdout.substring(0, 200)}`,
          });
        }
      });

      child.stdin.write(payload);
      child.stdin.end();
    });
  }
}

export const indicTrans2Service = new IndicTrans2Service();



import axios from "axios";
import env from "../config/env";

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export class OllamaService {
  private baseUrl: string;
  private defaultModel: string = "deepseek-r1:7b";

  constructor() {
    // Ollama runs locally, default port is 11434
    this.baseUrl = process.env.OLLAMA_URL || "http://localhost:11434";
    this.defaultModel = process.env.OLLAMA_MODEL || "deepseek-r1:7b";
  }

  /**
   * Check if Ollama is running and accessible
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      console.error("Ollama connection check failed:", error);
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 10000,
      });
      return response.data.models || [];
    } catch (error: any) {
      console.error("Failed to list Ollama models:", error.message);
      throw new Error(`Failed to list models: ${error.message}`);
    }
  }

  /**
   * Generate LaTeX content using Ollama
   */
  async generateLatexContent(
    prompt: string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    try {
      const model = options?.model || this.defaultModel;
      const requestBody: OllamaGenerateRequest = {
        model,
        prompt: this.buildLatexPrompt(prompt),
        stream: false,
        options: {
          temperature: options?.temperature || 0.7,
          num_predict: options?.maxTokens || 4096,
        },
      };

      const response = await axios.post<OllamaGenerateResponse>(
        `${this.baseUrl}/api/generate`,
        requestBody,
        {
          timeout: 120000, // 2 minutes for generation
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.data.response) {
        throw new Error("No response from Ollama");
      }

      return response.data.response.trim();
    } catch (error: any) {
      console.error("Ollama generation error:", error.message);
      if (error.code === "ECONNREFUSED") {
        throw new Error("Ollama is not running. Please start Ollama service.");
      }
      if (error.code === "ETIMEDOUT") {
        throw new Error("Ollama request timed out. The model may be too slow.");
      }
      throw new Error(`Ollama generation failed: ${error.message}`);
    }
  }

  /**
   * Build optimized prompt for LaTeX generation
   */
  private buildLatexPrompt(userPrompt: string): string {
    return `You are an expert educational content generator specializing in creating LaTeX documents for Indian curriculum (NCERT, CBSE, State Boards).

Generate a complete, valid LaTeX document based on the following requirements:

${userPrompt}

Requirements:
1. Generate ONLY valid LaTeX code - no explanations, no markdown, just LaTeX
2. Use proper LaTeX packages for multilingual support (babel, polyglossia, fontspec)
3. Include proper mathematical notation using amsmath, amssymb packages
4. Structure the document with sections, subsections
5. Use proper Indian language fonts and encoding
6. Include proper document structure: \\documentclass, \\begin{document}, \\end{document}
7. Ensure all mathematical formulas are properly formatted
8. Use proper LaTeX syntax for tables, lists, and formatting

Generate the complete LaTeX document now:`;
  }

  /**
   * Stream generation (for real-time updates)
   */
  async *generateStream(
    prompt: string,
    options?: {
      model?: string;
      temperature?: number;
    }
  ): AsyncGenerator<string, void, unknown> {
    try {
      const model = options?.model || this.defaultModel;
      const requestBody: OllamaGenerateRequest = {
        model,
        prompt: this.buildLatexPrompt(prompt),
        stream: true,
        options: {
          temperature: options?.temperature || 0.7,
        },
      };

      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        requestBody,
        {
          responseType: "stream",
          timeout: 300000, // 5 minutes for streaming
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      for await (const chunk of response.data) {
        const lines = chunk.toString().split("\n").filter((line: string) => line.trim());
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              yield data.response;
            }
            if (data.done) {
              return;
            }
          } catch (e) {
            // Skip invalid JSON lines
            continue;
          }
        }
      }
    } catch (error: any) {
      console.error("Ollama stream error:", error.message);
      throw new Error(`Ollama streaming failed: ${error.message}`);
    }
  }

  /**
   * Pull/download a model
   */
  async pullModel(modelName: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/api/pull`,
        { name: modelName },
        {
          timeout: 600000, // 10 minutes for model download
        }
      );
    } catch (error: any) {
      console.error("Failed to pull model:", error.message);
      throw new Error(`Failed to pull model ${modelName}: ${error.message}`);
    }
  }
}

export const ollamaService = new OllamaService();


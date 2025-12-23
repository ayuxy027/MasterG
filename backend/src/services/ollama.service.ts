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
  response?: string; // Optional for streaming chunks
  thinking?: string; // DeepSeek R1 thinking process
  done: boolean;
  done_reason?: string;
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
  private defaultModel: string;

  constructor() {
    // Ollama runs locally - config from env.ts
    this.baseUrl = env.OLLAMA_URL;
    this.defaultModel = env.OLLAMA_CHAT_MODEL;
  }

  /**
   * Check if Ollama is running and accessible
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5001,
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
   * Generate plain educational content using Ollama
   */
  async generateTextContent(
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
        prompt,
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
   * Stream generation (for real-time updates)
   * Returns objects with type: 'thinking' | 'response' and content
   */
  async *generateStream(
    prompt: string,
    options?: {
      model?: string;
      temperature?: number;
    }
  ): AsyncGenerator<{ type: "thinking" | "response"; content: string }, void, unknown> {
    try {
      const model = options?.model || this.defaultModel;
      const requestBody: OllamaGenerateRequest = {
        model,
        prompt,
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

            // DeepSeek R1 has separate thinking and response fields
            if (data.thinking) {
              yield { type: "thinking", content: data.thinking };
            }
            if (data.response) {
              yield { type: "response", content: data.response };
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


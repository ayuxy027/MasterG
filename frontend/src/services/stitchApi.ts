const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "http://localhost:5001/api";

export interface StitchGenerateRequest {
  topic: string;
  language: string;
  grade: string;
  subject: string;
  curriculum: string;
  culturalContext?: boolean;
}

export interface StitchGenerateResponse {
  success: boolean;
  content?: string;
  metadata?: {
    topic: string;
    language: string;
    grade: string;
    subject: string;
    curriculum: string;
    generatedAt: string;
  };
  error?: string;
}

export interface StitchStatusResponse {
  success: boolean;
  connected: boolean;
  models: Array<{
    name: string;
    size: number;
    modified: string;
  }>;
  error?: string;
}

export interface StitchModel {
  name: string;
  size: number;
  modified: string;
  details?: {
    parent_model: string;
    format: string;
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

export interface StitchTranslateRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface StitchTranslateResponse {
  success: boolean;
  translated?: string;
  error?: string;
}

export interface StitchTranslateStreamChunk {
  success: boolean;
  type?: "chunk" | "complete" | "error";
  index?: number;
  total?: number;
  translated?: string;
  error?: string;
}

export class StitchApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StitchApiError";
  }
}

class StitchApi {
  /**
   * Check Ollama connection status
   */
  async checkStatus(): Promise<StitchStatusResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/stitch/status`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new StitchApiError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof StitchApiError) {
        throw error;
      }
      throw new StitchApiError(
        error instanceof Error ? error.message : "Failed to check Ollama status"
      );
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<StitchModel[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/stitch/models`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new StitchApiError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      if (error instanceof StitchApiError) {
        throw error;
      }
      throw new StitchApiError(
        error instanceof Error ? error.message : "Failed to list models"
      );
    }
  }

  /**
   * Generate content
   */
  async generateContent(
    request: StitchGenerateRequest
  ): Promise<StitchGenerateResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/stitch/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new StitchApiError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof StitchApiError) {
        throw error;
      }
      throw new StitchApiError(
        error instanceof Error ? error.message : "Failed to generate content"
      );
    }
  }

  /**
   * Translate generated content using IndicTrans2
   */
  async translateContent(
    request: StitchTranslateRequest
  ): Promise<StitchTranslateResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/stitch/translate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new StitchApiError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof StitchApiError) {
        throw error;
      }
      throw new StitchApiError(
        error instanceof Error ? error.message : "Failed to translate content"
      );
    }
  }

  /**
   * Stream translation sentence-by-sentence using SSE-style POST response.
   * Calls onChunk for every server event (chunk, complete, error).
   */
  async translateContentStream(
    request: StitchTranslateRequest,
    onChunk: (chunk: StitchTranslateStreamChunk) => void
  ): Promise<void> {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/stitch/translate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...request, stream: true }),
      });
    } catch (error) {
      onChunk({
        success: false,
        type: "error",
        error:
          error instanceof Error
            ? error.message
            : "Failed to start streaming translation",
      });
      return;
    }

    if (!response.ok || !response.body) {
      let errMsg = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const data = await response.json();
        if (data && data.error) {
          errMsg = data.error;
        }
      } catch {
        // ignore JSON parse error, keep default message
      }
      onChunk({
        success: false,
        type: "error",
        error: errMsg,
      });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by double newline
      let sepIndex = buffer.indexOf("\n\n");
      while (sepIndex !== -1) {
        const rawEvent = buffer.slice(0, sepIndex).trim();
        buffer = buffer.slice(sepIndex + 2);

        if (rawEvent.startsWith("data:")) {
          const jsonPart = rawEvent.slice(5).trim();
          try {
            const parsed = JSON.parse(jsonPart) as StitchTranslateStreamChunk;
            onChunk(parsed);
          } catch (error) {
            onChunk({
              success: false,
              type: "error",
              error:
                error instanceof Error
                  ? `Failed to parse stream chunk: ${error.message}`
                  : "Failed to parse stream chunk",
            });
          }
        }

        sepIndex = buffer.indexOf("\n\n");
      }
    }
  }

}

export const stitchAPI = new StitchApi();


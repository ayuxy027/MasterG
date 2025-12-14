const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "http://localhost:5000/api";

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
  latexCode?: string;
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
   * Generate LaTeX content
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
   * Generate PDF from LaTeX
   */
  async generatePDF(latexCode: string): Promise<Blob> {
    try {
      const response = await fetch(`${API_BASE_URL}/stitch/pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ latexCode }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new StitchApiError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.blob();
    } catch (error) {
      if (error instanceof StitchApiError) {
        throw error;
      }
      throw new StitchApiError(
        error instanceof Error ? error.message : "Failed to generate PDF"
      );
    }
  }
}

export const stitchAPI = new StitchApi();


const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export interface LMRSummary {
  summary: string;
  keyTopics: string[];
  importantConcepts: string[];
  language: string;
}

export interface LMRQuestion {
  id: number;
  question: string;
  answer: string;
  subject: string;
  difficulty: "Easy" | "Medium" | "Hard";
  pageReference?: number;
}

export interface LMRQuiz {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: "Easy" | "Medium" | "Hard";
  subject: string;
}

export interface LMRRecallNote {
  topic: string;
  keyPoints: string[];
  quickFacts: string[];
  mnemonics?: string[];
}

export interface LMRUploadResponse {
  success: boolean;
  fileId: string;
  fileName: string;
  chunksCreated: number;
  message: string;
}

export interface LMRGenerateResponse<T> {
  success: boolean;
  data: T;
}

export interface LMRAllContent {
  summary: LMRSummary;
  questions: LMRQuestion[];
  quiz: LMRQuiz[];
  recallNotes: LMRRecallNote[];
}

export interface LMRHistory {
  _id: string;
  fileId: string;
  fileName: string;
  userId?: string;
  sessionId?: string;
  language: string;
  tone: string;
  hasSummary: boolean;
  hasQuestions: boolean;
  hasQuiz: boolean;
  hasRecallNotes: boolean;
  createdAt: string;
  updatedAt: string;
}

export class LMRApi {
  /**
   * Helper to handle API errors with better error messages
   */
  private static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = `Server error: ${response.status} ${response.statusText}`;

      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const error = await response.json();
          errorMessage = error.error || error.message || errorMessage;
        } else {
          // If response is HTML (404 page), provide a clearer message
          const text = await response.text();
          if (text.includes("<!DOCTYPE")) {
            errorMessage = `API endpoint not found (404). Make sure the backend server is running on ${API_BASE_URL}`;
          } else {
            errorMessage = text || errorMessage;
          }
        }
      } catch (e) {
        // If parsing fails, use the status message
        console.error("Error parsing error response:", e);
      }

      throw new Error(errorMessage);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    }

    throw new Error("Unexpected response format from server");
  }

  /**
   * Upload document for LMR processing
   */
  static async uploadDocument(
    file: File,
    userId?: string,
    sessionId?: string
  ): Promise<LMRUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    if (userId) formData.append("userId", userId);
    if (sessionId) formData.append("sessionId", sessionId);

    try {
      const response = await fetch(`${API_BASE_URL}/api/lmr/upload`, {
        method: "POST",
        body: formData,
      });

      return this.handleResponse<LMRUploadResponse>(response);
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  }

  /**
   * Generate summary from uploaded document
   */
  static async generateSummary(
    fileId: string,
    language: string = "english",
    tone: string = "professional"
  ): Promise<LMRSummary> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/lmr/generate/summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileId, language, tone }),
      });

      const result: LMRGenerateResponse<LMRSummary> = await this.handleResponse(
        response
      );
      return result.data;
    } catch (error) {
      console.error("Generate summary error:", error);
      throw error;
    }
  }

  /**
   * Generate questions from uploaded document
   */
  static async generateQuestions(
    fileId: string,
    language: string = "english",
    count: number = 10
  ): Promise<LMRQuestion[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/lmr/generate/questions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fileId, language, count }),
        }
      );

      const result: LMRGenerateResponse<LMRQuestion[]> =
        await this.handleResponse(response);
      return result.data;
    } catch (error) {
      console.error("Generate questions error:", error);
      throw error;
    }
  }

  /**
   * Generate quiz from uploaded document
   */
  static async generateQuiz(
    fileId: string,
    language: string = "english",
    count: number = 10
  ): Promise<LMRQuiz[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/lmr/generate/quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileId, language, count }),
      });

      const result: LMRGenerateResponse<LMRQuiz[]> = await this.handleResponse(
        response
      );
      return result.data;
    } catch (error) {
      console.error("Generate quiz error:", error);
      throw error;
    }
  }

  /**
   * Generate recall notes from uploaded document
   */
  static async generateRecallNotes(
    fileId: string,
    language: string = "english"
  ): Promise<LMRRecallNote[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/lmr/generate/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileId, language }),
      });

      const result: LMRGenerateResponse<LMRRecallNote[]> =
        await this.handleResponse(response);
      return result.data;
    } catch (error) {
      console.error("Generate recall notes error:", error);
      throw error;
    }
  }

  /**
   * Generate all content at once
   */
  static async generateAllContent(
    fileId: string,
    language: string = "english"
  ): Promise<LMRAllContent> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/lmr/generate/all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileId, language }),
      });

      const result: LMRGenerateResponse<LMRAllContent> =
        await this.handleResponse(response);
      return result.data;
    } catch (error) {
      console.error("Generate all content error:", error);
      throw error;
    }
  }

  /**
   * Download PDF with all generated content
   */
  static async downloadPDF(
    fileId: string,
    language: string = "english",
    fileName: string = "LMR-Notes"
  ): Promise<Blob> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/lmr/download/pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileId, language, fileName }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to download PDF: ${response.status} ${response.statusText}`;
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const error = await response.json();
            errorMessage = error.error || error.message || errorMessage;
          }
        } catch (e) {
          console.error("Error parsing PDF download error:", e);
        }
        throw new Error(errorMessage);
      }

      return response.blob();
    } catch (error) {
      console.error("Download PDF error:", error);
      throw error;
    }
  }

  /**
   * Get LMR history for a user or session
   */
  static async getHistory(
    userId?: string,
    sessionId?: string,
    limit: number = 10
  ): Promise<LMRHistory[]> {
    try {
      const params = new URLSearchParams();
      if (userId) params.append("userId", userId);
      if (sessionId) params.append("sessionId", sessionId);
      params.append("limit", limit.toString());

      const response = await fetch(
        `${API_BASE_URL}/api/lmr/history?${params}`,
        {
          method: "GET",
        }
      );

      const result: LMRGenerateResponse<LMRHistory[]> =
        await this.handleResponse(response);
      return result.data;
    } catch (error) {
      console.error("Get history error:", error);
      throw error;
    }
  }

  /**
   * Delete a history entry
   */
  static async deleteHistory(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/lmr/history/${id}`, {
        method: "DELETE",
      });

      await this.handleResponse(response);
    } catch (error) {
      console.error("Delete history error:", error);
      throw error;
    }
  }
}

export default LMRApi;

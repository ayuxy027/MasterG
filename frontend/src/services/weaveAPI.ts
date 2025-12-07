// API service for Weave functionality
import {
  PresentationRequest,
  PresentationResponse,
} from "../types/presentation"

const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "http://localhost:5000/api"

interface GeneratePresentationResponse {
  success: boolean
  data?: PresentationResponse
  error?: string
}

interface GetPresentationResponse {
  success: boolean
  data?: PresentationResponse
  error?: string
}

interface SavePresentationResponse {
  success: boolean
  data?: PresentationResponse
  error?: string
}

export const weaveAPI = {
  /**
   * Generate a new presentation
   */
  async generatePresentation(
    request: PresentationRequest
  ): Promise<GeneratePresentationResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/weave/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      })

      const data = await response.json()
      return data
    } catch (error) {
      console.error("Error generating presentation:", error)
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate presentation",
      }
    }
  },

  /**
   * Get a presentation by ID
   */
  async getPresentation(id: string): Promise<GetPresentationResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/weave/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()
      return data
    } catch (error) {
      console.error("Error fetching presentation:", error)
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch presentation",
      }
    }
  },

  /**
   * Save a presentation
   */
  async savePresentation(
    presentation: any,
    userId: string
  ): Promise<SavePresentationResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/weave/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ presentation, userId }),
      })

      const data = await response.json()
      return data
    } catch (error) {
      console.error("Error saving presentation:", error)
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save presentation",
      }
    }
  },
}

/**
 * Board API Service
 * Communicates with backend for AI card generation and actions
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

export interface CardData {
  id: string;
  title: string;
  content: string;
}

export type CardAction = "summarize" | "actionPoints" | "mindMap" | "flashcards";

export interface OllamaStatus {
  connected: boolean;
  model?: string;
}

export interface GenerateResponse {
  success: boolean;
  cards?: CardData[];
  message?: string;
}

export interface ActionResponse {
  success: boolean;
  action?: CardAction;
  result?: string;
  cards?: CardData[];
  message?: string;
}

/**
 * Check Ollama connection status
 */
export async function checkOllamaStatus(): Promise<OllamaStatus> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/board/ollama/status`, {
      method: "GET",
    });

    if (!response.ok) {
      return { connected: false };
    }

    return response.json();
  } catch (error: any) {
    console.error("Board API: Ollama status check error:", error);
    return { connected: false };
  }
}

/**
 * Generate educational cards from a prompt
 */
export async function generateCards(
  prompt: string,
  cardCount: number = 3
): Promise<CardData[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/board/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, cardCount }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Failed to generate cards");
    }

    const data: GenerateResponse = await response.json();
    if (!data.success || !data.cards) {
      throw new Error(data.message || "Failed to generate cards");
    }

    return data.cards;
  } catch (error: any) {
    console.error("Board API: Generate error:", error);
    throw error;
  }
}

/**
 * Perform AI action on selected cards
 */
export async function performCardAction(
  action: CardAction,
  cardContents: string[]
): Promise<ActionResponse> {
  try {
    if (cardContents.length === 0) {
      return { success: false, message: "No cards selected" };
    }

    if (cardContents.length > 4) {
      return { success: false, message: "Maximum 4 cards can be selected" };
    }

    const response = await fetch(`${API_BASE_URL}/api/board/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, cardContents }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Failed to perform action");
    }

    return response.json();
  } catch (error: any) {
    console.error("Board API: Action error:", error);
    return {
      success: false,
      message: error.message || "Failed to perform action",
    };
  }
}


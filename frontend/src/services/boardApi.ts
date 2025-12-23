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

export interface BoardSession {
  sessionId: string;
  sessionName?: string;
  updatedAt: string;
  cardCount: number;
  stickyNoteCount: number;
  drawingPathCount: number;
}

export interface BoardSessionData {
  userId: string;
  sessionId: string;
  sessionName?: string;
  drawingPaths: Array<{
    points: Array<{ x: number; y: number }>;
    color: string;
    strokeWidth: number;
    tool: string;
  }>;
  cards: Array<{
    id: string;
    title: string;
    content: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  stickyNotes: Array<{
    id: string;
    x: number;
    y: number;
    text: string;
    color: string;
    width: number;
    height: number;
    enableMarkdown?: boolean;
    ruled?: boolean;
    fontSize?: number;
    fontFamily?: string;
    isBold?: boolean;
    isItalic?: boolean;
    isUnderline?: boolean;
  }>;
  viewOffset: { x: number; y: number };
  zoom: number;
  createdAt: string;
  updatedAt: string;
}

class BoardApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BoardApiError";
  }
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
 * Generate educational cards from a prompt (with streaming support)
 */
export async function generateCards(
  prompt: string,
  cardCount: number = 3,
  onThinkingUpdate?: (text: string) => void,
  onCardUpdate?: (cards: CardData[]) => void
): Promise<CardData[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/board/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, cardCount, stream: true }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Failed to generate cards");
    }

    // Handle streaming response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("No response body for streaming");
    }

    let buffer = "";
    let accumulatedThinking = "";
    let cards: CardData[] = [];
    let latestPartialCards: CardData[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);

            if (parsed.type === "thinking") {
              accumulatedThinking += parsed.content;
              if (onThinkingUpdate) {
                onThinkingUpdate(accumulatedThinking);
              }
            } else if (parsed.type === "card" && parsed.cards) {
              // Real-time card updates as they're generated
              latestPartialCards = parsed.cards;
              if (onCardUpdate) {
                onCardUpdate(latestPartialCards);
              }
            } else if (parsed.type === "complete") {
              if (parsed.cards) {
                cards = parsed.cards;
                // Send final update
                if (onCardUpdate) {
                  onCardUpdate(cards);
                }
              }
              if (parsed.thinkingText && onThinkingUpdate) {
                onThinkingUpdate(parsed.thinkingText);
              }
            } else if (parsed.type === "error") {
              throw new Error(parsed.error);
            }
          } catch (e) {
            // Skip invalid JSON
            continue;
          }
        }
      }
    }

    // Use final cards or fallback to partial cards
    if (cards.length === 0 && latestPartialCards.length > 0) {
      cards = latestPartialCards;
    }

    if (cards.length === 0) {
      throw new Error("No cards generated");
    }

    return cards;
  } catch (error: any) {
    console.error("Board API: Generate error:", error);
    throw error;
  }
}

/**
 * Perform AI action on selected cards (with streaming support)
 */
export async function performCardAction(
  action: CardAction,
  cardContents: string[],
  onPartialUpdate?: (data: { type: string; cards?: CardData[]; content?: string }) => void,
  onThinkingUpdate?: (text: string) => void
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

    // Handle streaming response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      // Fallback to non-streaming
      return response.json();
    }

    let buffer = "";
    let cards: CardData[] = [];
    let result = "";
    let partialCards: CardData[] = [];
    let partialResult = "";
    let accumulatedThinking = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);

            if (parsed.type === "thinking") {
              // Thinking text updates (accumulated, like generateCards)
              accumulatedThinking += parsed.content || "";
              if (onThinkingUpdate) {
                onThinkingUpdate(accumulatedThinking);
              }
            } else if (parsed.type === "card" && parsed.cards) {
              // Partial card updates
              partialCards = parsed.cards;
              if (onPartialUpdate) {
                onPartialUpdate({ type: "card", cards: partialCards });
              }
            } else if (parsed.type === "partial" && parsed.content) {
              // Partial text updates (for summarize, actionPoints)
              partialResult = parsed.content;
              if (onPartialUpdate) {
                onPartialUpdate({ type: "partial", content: partialResult });
              }
            } else if (parsed.type === "complete") {
              if (parsed.thinkingText && onThinkingUpdate) {
                onThinkingUpdate(parsed.thinkingText);
              }
              if (parsed.cards) {
                cards = parsed.cards;
              }
              if (parsed.result) {
                result = parsed.result;
              }
            } else if (parsed.type === "error") {
              throw new Error(parsed.error);
            }
          } catch (e) {
            // Skip invalid JSON
            continue;
          }
        }
      }
    }

    // Return final result
    if (cards.length > 0) {
      return {
        success: true,
        action,
        cards,
      };
    } else if (result) {
      return {
        success: true,
        action,
        result,
      };
    } else {
      throw new Error("No result received from action");
    }
  } catch (error: any) {
    console.error("Board API: Action error:", error);
    return {
      success: false,
      message: error.message || "Failed to perform action",
    };
  }
}

/**
 * Board Session Management
 */
export class BoardSessionApi {
  /**
   * Get all Board sessions for a user
   */
  async getAllSessions(userId: string): Promise<BoardSession[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/board/sessions/${userId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new BoardApiError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      return data.sessions || [];
    } catch (error) {
      if (error instanceof BoardApiError) {
        throw error;
      }
      throw new BoardApiError(
        error instanceof Error ? error.message : "Failed to get Board sessions"
      );
    }
  }

  /**
   * Get a specific Board session
   */
  async getSession(userId: string, sessionId: string): Promise<BoardSessionData> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/board/sessions/${userId}/${sessionId}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 404) {
          throw new BoardApiError("Session not found");
        }
        throw new BoardApiError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      return data.session;
    } catch (error) {
      if (error instanceof BoardApiError) {
        throw error;
      }
      throw new BoardApiError(
        error instanceof Error ? error.message : "Failed to get Board session"
      );
    }
  }

  /**
   * Save Board session
   */
  async saveSession(
    userId: string,
    sessionId: string,
    data: {
      sessionName?: string;
      drawingPaths?: Array<{
        points: Array<{ x: number; y: number }>;
        color: string;
        strokeWidth: number;
        tool: string;
      }>;
      cards?: Array<{
        id: string;
        title: string;
        content: string;
        x: number;
        y: number;
        width: number;
        height: number;
      }>;
      stickyNotes?: Array<{
        id: string;
        x: number;
        y: number;
        text: string;
        color: string;
        width: number;
        height: number;
        enableMarkdown?: boolean;
        ruled?: boolean;
        fontSize?: number;
        fontFamily?: string;
        isBold?: boolean;
        isItalic?: boolean;
        isUnderline?: boolean;
      }>;
      viewOffset?: { x: number; y: number };
      zoom?: number;
    }
  ): Promise<BoardSessionData> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/board/sessions/${userId}/${sessionId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new BoardApiError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const result = await response.json();
      return result.session;
    } catch (error) {
      if (error instanceof BoardApiError) {
        throw error;
      }
      throw new BoardApiError(
        error instanceof Error ? error.message : "Failed to save Board session"
      );
    }
  }

  /**
   * Delete Board session
   */
  async deleteSession(userId: string, sessionId: string): Promise<void> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/board/sessions/${userId}/${sessionId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new BoardApiError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }
    } catch (error) {
      if (error instanceof BoardApiError) {
        throw error;
      }
      throw new BoardApiError(
        error instanceof Error ? error.message : "Failed to delete Board session"
      );
    }
  }

  /**
   * Update session name
   */
  async updateSessionName(
    userId: string,
    sessionId: string,
    sessionName: string
  ): Promise<void> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/board/sessions/${userId}/${sessionId}/name`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionName }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new BoardApiError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }
    } catch (error) {
      if (error instanceof BoardApiError) {
        throw error;
      }
      throw new BoardApiError(
        error instanceof Error ? error.message : "Failed to update session name"
      );
    }
  }
}

export const boardSessionApi = new BoardSessionApi();

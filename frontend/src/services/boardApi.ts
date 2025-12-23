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
              // Thinking text updates
              if (onThinkingUpdate) {
                onThinkingUpdate(parsed.content || "");
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


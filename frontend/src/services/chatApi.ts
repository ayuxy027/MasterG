import type {
  QueryResponse,
  ChatSession,
  SessionListItem,
  UploadResponse,
  FileListItem,
  StreamChunk,
} from "../types/chat";
import { API_BASE_URL } from "../config/api";
import { getOrCreateUserId, generateSessionId as makeSessionId } from "../utils/identity";

interface ServerSession {
  sessionId: string;
  chatName?: string;
  messages?: { content: string }[];
  createdAt: string;
  updatedAt: string;
}

interface ServerMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: unknown[];
  metadata?: Record<string, unknown>;
  translatedContent?: string;
  translatedLanguage?: string;
}

export const generateUserId = (): string => getOrCreateUserId();
export const getUserId = generateUserId;
export const generateSessionId = (): string => makeSessionId("session");

// API Error class
export class ChatApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "ChatApiError";
  }
}

// API Client functions

/**
 * Send a query to the chat API (non-streaming)
 * @param mentionedFileIds - Optional file IDs to filter RAG search (for @ mentions)
 */
export async function sendQuery(
  userId: string,
  sessionId: string,
  query: string,
  mentionedFileIds?: string[]
): Promise<QueryResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        sessionId,
        query,
        mentionedFileIds,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ChatApiError(
        errorData.message || "Failed to send query",
        response.status,
        errorData
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof ChatApiError) throw error;
    throw new ChatApiError(
      error instanceof Error ? error.message : "Network error",
      undefined,
      error
    );
  }
}

/**
 * Send a streaming query to the chat API
 * Returns Server-Sent Events for real-time response streaming
 * @param onChunk - Callback function called for each streamed chunk
 * @param mentionedFileIds - Optional file IDs to filter RAG search (for @ mentions)
 */
export async function sendStreamingQuery(
  userId: string,
  sessionId: string,
  query: string,
  onChunk: (chunk: StreamChunk) => void,
  mentionedFileIds?: string[],
  signal?: AbortSignal
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/query/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, sessionId, query, mentionedFileIds }),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ChatApiError(
        errorData.message || "Streaming request failed",
        response.status,
        errorData
      );
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) throw new ChatApiError("Failed to get response stream");

    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        onChunk({ type: "done" } as StreamChunk);
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === "[DONE]") continue;
        try {
          onChunk(JSON.parse(jsonStr) as StreamChunk);
        } catch {
          // Stream may deliver partially-buffered JSON; skip silently.
        }
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    if (error instanceof ChatApiError) throw error;
    throw new ChatApiError(
      error instanceof Error ? error.message : "Streaming error",
      undefined,
      error
    );
  }
}

export async function uploadFile(
  userId: string,
  sessionId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResponse> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);
    formData.append("sessionId", sessionId);

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = (e.loaded / e.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch {
            reject(new ChatApiError("Invalid response format", xhr.status));
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject(
              new ChatApiError(
                errorData.message || "Upload failed",
                xhr.status,
                errorData
              )
            );
          } catch {
            reject(new ChatApiError("Upload failed", xhr.status));
          }
        }
      });

      xhr.addEventListener("error", () => {
        reject(new ChatApiError("Network error during upload"));
      });

      xhr.addEventListener("abort", () => {
        reject(new ChatApiError("Upload aborted"));
      });

      xhr.addEventListener("timeout", () => {
        reject(new ChatApiError("Upload timed out"));
      });

      xhr.open("POST", `${API_BASE_URL}/api/upload`);
      xhr.send(formData);
    });
  } catch (error) {
    if (error instanceof ChatApiError) throw error;
    throw new ChatApiError(
      error instanceof Error ? error.message : "Upload error",
      undefined,
      error
    );
  }
}

export async function getAllSessions(
  userId: string
): Promise<SessionListItem[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/chats?userId=${encodeURIComponent(userId)}`,
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ChatApiError(
        errorData.message || "Failed to fetch sessions",
        response.status,
        errorData
      );
    }

    const data = await response.json();

    // Transform to SessionListItem format
    return (
      data.sessions?.map((session: ServerSession) => ({
        sessionId: session.sessionId,
        chatName: session.chatName,
        messageCount: session.messages?.length || 0,
        lastMessage:
          session.messages?.[session.messages.length - 1]?.content ||
          "New conversation",
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
      })) || []
    );
  } catch (error) {
    if (error instanceof ChatApiError) throw error;
    throw new ChatApiError(
      error instanceof Error ? error.message : "Network error",
      undefined,
      error
    );
  }
}

export async function getSessionDetails(
  userId: string,
  sessionId: string
): Promise<ChatSession> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/chats/${sessionId}?userId=${encodeURIComponent(
        userId
      )}`,
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ChatApiError(
        errorData.message || "Failed to fetch session details",
        response.status,
        errorData
      );
    }

    const data = await response.json();

    // Transform timestamps to Date objects
    return {
      userId: data.session.userId || userId,
      sessionId: data.session.sessionId,
      chromaCollectionName: data.session.chromaCollectionName,
      messages:
        data.session.messages?.map((msg: ServerMessage) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })) || [],
      createdAt: new Date(data.session.createdAt),
      updatedAt: new Date(data.session.updatedAt),
      language: data.session.language,
      grade: data.session.grade,
    };
  } catch (error) {
    if (error instanceof ChatApiError) throw error;
    throw new ChatApiError(
      error instanceof Error ? error.message : "Network error",
      undefined,
      error
    );
  }
}

export async function deleteSession(
  userId: string,
  sessionId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/chats/${sessionId}?userId=${encodeURIComponent(
        userId
      )}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ChatApiError(
        errorData.message || "Failed to delete session",
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ChatApiError) throw error;
    throw new ChatApiError(
      error instanceof Error ? error.message : "Network error",
      undefined,
      error
    );
  }
}

export async function updateChatName(
  userId: string,
  sessionId: string,
  chatName: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/chats/${sessionId}/name?userId=${encodeURIComponent(
        userId
      )}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chatName }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ChatApiError(
        errorData.message || "Failed to update chat name",
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ChatApiError) throw error;
    throw new ChatApiError(
      error instanceof Error ? error.message : "Network error",
      undefined,
      error
    );
  }
}



export async function updateSessionSettings(
  userId: string,
  sessionId: string,
  settings: { language?: string; grade?: string }
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/chats/${sessionId}/settings?userId=${encodeURIComponent(
        userId
      )}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ChatApiError(
        errorData.message || "Failed to update settings",
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ChatApiError) throw error;
    throw new ChatApiError(
      error instanceof Error ? error.message : "Network error",
      undefined,
      error
    );
  }
}

export async function getSessionDocuments(
  userId: string,
  sessionId: string
): Promise<FileListItem[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/browse/files?userId=${encodeURIComponent(
        userId
      )}&sessionId=${encodeURIComponent(sessionId)}`,
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ChatApiError(
        errorData.message || "Failed to fetch documents",
        response.status,
        errorData
      );
    }

    const data = await response.json();

    // Transform files to FileListItem format
    // Backend returns: { fileId, fileName, count } where count = number of chunks/pages
    return (
      data.files?.map(
        (file: { fileId: string; fileName: string; count?: number }) => ({
          fileId: file.fileId,
          fileName: file.fileName,
          language: "unknown", // ChromaDB metadata doesn't include language in unique files
          pageCount: file.count || 0, // count = number of chunks (usually 1 per page)
          uploadedAt: new Date(),
        })
      ) || []
    );
  } catch (error) {
    if (error instanceof ChatApiError) throw error;
    throw new ChatApiError(
      error instanceof Error ? error.message : "Network error",
      undefined,
      error
    );
  }
}

export async function getAllUserFiles(
  userId: string,
  sessionId: string
): Promise<FileListItem[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/browse/files?userId=${encodeURIComponent(
        userId
      )}&sessionId=${encodeURIComponent(sessionId)}`,
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ChatApiError(
        errorData.message || "Failed to fetch files",
        response.status,
        errorData
      );
    }

    const data = await response.json();

    return (
      data.files?.map(
        (file: { fileId: string; fileName: string; count?: number }) => ({
          fileId: file.fileId,
          fileName: file.fileName,
          language: "unknown",
          pageCount: file.count || 0,
          uploadedAt: new Date(),
        })
      ) || []
    );
  } catch (error) {
    if (error instanceof ChatApiError) throw error;
    throw new ChatApiError(
      error instanceof Error ? error.message : "Network error",
      undefined,
      error
    );
  }
}

export async function generateChatName(firstMessage: string): Promise<string> {
  try {
    // Use Gemini to generate a short, descriptive chat name
    const prompt = `Generate a very short (2-5 words) title for a chat that starts with: "${firstMessage.substring(
      0,
      100
    )}...". Only return the title, nothing else.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY || ""
      }`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      // Fallback to truncated first message
      return (
        firstMessage.substring(0, 30) + (firstMessage.length > 30 ? "..." : "")
      );
    }

    const data = await response.json();
    const generatedName =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    return (
      generatedName ||
      firstMessage.substring(0, 30) + (firstMessage.length > 30 ? "..." : "")
    );
  } catch {
    // Fallback to truncated first message
    return (
      firstMessage.substring(0, 30) + (firstMessage.length > 30 ? "..." : "")
    );
  }
}

export async function deleteFile(
  userId: string,
  sessionId: string,
  fileId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/browse/files/${fileId}?userId=${encodeURIComponent(
        userId
      )}&sessionId=${encodeURIComponent(sessionId)}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ChatApiError(
        errorData.message || "Failed to delete file",
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ChatApiError) throw error;
    throw new ChatApiError(
      error instanceof Error ? error.message : "Network error",
      undefined,
      error
    );
  }
}

export async function translateMessage(
  userId: string,
  sessionId: string,
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<{ success: boolean; translated?: string; error?: string }> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/chats/${sessionId}/translate?userId=${encodeURIComponent(
        userId
      )}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          sourceLanguage,
          targetLanguage,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ChatApiError(
        errorData.error || "Failed to translate message",
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ChatApiError) throw error;
    throw new ChatApiError(
      error instanceof Error ? error.message : "Network error",
      undefined,
      error
    );
  }
}


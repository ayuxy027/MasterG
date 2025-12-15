import type {
  QueryResponse,
  ChatSession,
  SessionListItem,
  UploadResponse,
  FileListItem,
} from "../types/chat";

// API Configuration - VITE_API_URL should NOT include /api suffix
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Utility functions for session management
export const generateUserId = (): string => {
  const stored = localStorage.getItem("masterji_userId");
  if (stored) return stored;

  const newUserId = `user_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 9)}`;
  localStorage.setItem("masterji_userId", newUserId);
  return newUserId;
};

export const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export const getUserId = (): string => {
  return generateUserId(); // Always gets or creates
};

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
 * Send a query to the chat API
 */
export async function sendQuery(
  userId: string,
  sessionId: string,
  query: string
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
 * Upload a file (PDF or image) to the chat session
 */
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
          } catch (e) {
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
          } catch (e) {
            reject(new ChatApiError("Upload failed", xhr.status));
          }
        }
      });

      xhr.addEventListener("error", () => {
        reject(new ChatApiError("Network error during upload"));
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

/**
 * Get all chat sessions for a user
 */
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
      data.sessions?.map((session: any) => ({
        sessionId: session.sessionId,
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

/**
 * Get details of a specific chat session
 */
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
        data.session.messages?.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })) || [],
      createdAt: new Date(data.session.createdAt),
      updatedAt: new Date(data.session.updatedAt),
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

/**
 * Delete a chat session
 */
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

/**
 * Get all documents in a chat session
 */
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

/**
 * Get unique files list (all files uploaded by user in a session)
 */
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

/**
 * Generate chat name using Gemini API
 */
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
  } catch (error) {
    // Fallback to truncated first message
    return (
      firstMessage.substring(0, 30) + (firstMessage.length > 30 ? "..." : "")
    );
  }
}

/**
 * Delete a file from session
 */
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

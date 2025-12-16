import type { DocumentInfo, AnalysisResult } from "../types/topic";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Get all documents for a session
 */
export async function getDocuments(
    userId: string,
    sessionId: string
): Promise<DocumentInfo[]> {
    const response = await fetch(
        `${API_BASE_URL}/api/analyze/documents?userId=${encodeURIComponent(userId)}&sessionId=${encodeURIComponent(sessionId)}`,
        { method: "GET" }
    );

    if (!response.ok) {
        throw new Error("Failed to get documents");
    }

    const data = await response.json();
    return data.documents;
}

/**
 * Analyze a document and extract topics
 */
export async function extractTopics(
    userId: string,
    sessionId: string,
    documentId: string,
    documentName: string
): Promise<AnalysisResult> {
    const response = await fetch(`${API_BASE_URL}/api/analyze/extract-topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, sessionId, documentId, documentName }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to analyze");
    }

    return response.json();
}

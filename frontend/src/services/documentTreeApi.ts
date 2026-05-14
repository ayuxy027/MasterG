import type { DocumentTree, LearningPlan, TreeNode } from "../types/documentTree";
import { API_BASE_URL } from "../config/api";

export async function extractDocumentTree(
    userId: string,
    sessionId: string,
    documentId: string,
    documentName: string
): Promise<DocumentTree> {
    const response = await fetch(`${API_BASE_URL}/api/document-tree/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, sessionId, documentId, documentName }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to extract document tree");
    }

    return response.json();
}

export async function getDocumentTree(
    userId: string,
    sessionId: string,
    documentId: string
): Promise<DocumentTree | null> {
    const response = await fetch(
        `${API_BASE_URL}/api/document-tree/get?userId=${encodeURIComponent(userId)}&sessionId=${encodeURIComponent(sessionId)}&documentId=${encodeURIComponent(documentId)}`,
        {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        }
    );

    if (!response.ok) {
        if (response.status === 404) {
            return null;
        }
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to get document tree");
    }

    const data = await response.json();
    return data.tree || null;
}

export async function generateLearningPath(
    documentId: string,
    rootNodes: TreeNode[]
): Promise<LearningPlan> {
    const response = await fetch(
        `${API_BASE_URL}/api/document-tree/generate-learning-path`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ documentId, rootNodes }),
        }
    );

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to generate learning path");
    }

    return response.json();
}

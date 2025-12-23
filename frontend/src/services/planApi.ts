// API Configuration - matches chatApi.ts pattern
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

export interface PlanResponse {
    plan: string;
    translations: Record<string, string>;
    createdAt?: string;
}

export async function generatePlan(userId: string, sessionId: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/api/plan/generate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, sessionId }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate plan");
    }

    const data = await response.json();
    return data.plan;
}

export async function getLatestPlan(userId: string, sessionId: string): Promise<PlanResponse | null> {
    const response = await fetch(`${API_BASE_URL}/api/plan?userId=${userId}&sessionId=${sessionId}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        if (response.status === 404) return null;
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch plan");
    }

    const data = await response.json();
    return {
        plan: data.plan,
        translations: data.translations || {},
        createdAt: data.createdAt
    };
}

export async function translatePlan(userId: string, sessionId: string, targetLang: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/api/plan/translate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, sessionId, targetLang }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to translate plan");
    }

    const data = await response.json();
    return data.translatedPlan;
}

export async function optimizePrompt(topic: string, context: string, documentId?: string, grade?: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/api/plan/optimize`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic, context, documentId, grade }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to optimize prompt:", errorData);
        throw new Error(errorData.error || `Failed to optimize prompt: ${response.statusText}`);
    }

    const data = await response.json();
    return data.optimizedPrompt;
}

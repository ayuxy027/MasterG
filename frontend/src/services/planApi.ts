// API Configuration - matches chatApi.ts pattern
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

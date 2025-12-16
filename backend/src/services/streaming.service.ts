import axios from "axios";
import env from "../config/env";
import { SourceCitation, StreamChunk } from "../types";

/**
 * Streaming Service for Gemini AI responses
 * Provides real-time word-by-word response streaming using REST API
 */
class StreamingService {
    private apiKey: string;
    private apiUrl: string = "https://generativelanguage.googleapis.com/v1beta";
    private model: string = "gemini-2.0-flash-exp";

    constructor() {
        this.apiKey = env.GEMMA_API_KEY;
    }

    /**
     * Stream a response from Gemini using Server-Sent Events
     * Yields chunks of text as they are generated
     */
    async *streamResponse(
        prompt: string,
        context: string,
        chatHistory: Array<{ role: string; content: string }> = []
    ): AsyncGenerator<StreamChunk> {
        try {
            // Build the full prompt with context
            const fullPrompt = `
You are an intelligent educational assistant. Answer based on the provided document context.

CONTEXT FROM DOCUMENTS:
${context}

CHAT HISTORY:
${chatHistory.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n')}

USER QUESTION: ${prompt}

INSTRUCTIONS:
- Provide a clear, well-structured answer
- Use markdown formatting where appropriate
- Reference specific parts of the documents when relevant
- If information isn't in the context, say so clearly

ANSWER:`;

            // Use streaming endpoint
            const response = await axios.post(
                `${this.apiUrl}/models/${this.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`,
                {
                    contents: [
                        {
                            role: "user",
                            parts: [{ text: fullPrompt }]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 4096,
                    }
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    responseType: "stream"
                }
            );

            // Parse SSE stream
            let buffer = "";

            for await (const chunk of response.data) {
                buffer += chunk.toString();

                // Process complete SSE messages
                const lines = buffer.split("\n");
                buffer = lines.pop() || ""; // Keep incomplete line in buffer

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const jsonStr = line.slice(6).trim();
                        if (jsonStr && jsonStr !== "[DONE]") {
                            try {
                                const data = JSON.parse(jsonStr);
                                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                                if (text) {
                                    yield {
                                        type: 'text',
                                        content: text
                                    };
                                }
                            } catch (e) {
                                // Ignore parse errors for incomplete JSON
                            }
                        }
                    }
                }
            }

            yield { type: 'done' };
        } catch (error: any) {
            console.error("Streaming error:", error.message);
            yield {
                type: 'error',
                error: error.message || 'Streaming failed'
            };
        }
    }

    /**
     * Non-streaming query for building context (used before streaming)
     */
    async getContextAndSources(
        query: string,
        documents: string[],
        metadatas: any[]
    ): Promise<{ context: string; sources: SourceCitation[] }> {
        // Build context from documents
        const context = documents.slice(0, 5).join("\n\n---\n\n");

        // Build sources (top 3, reversed for relevance display)
        const sources: SourceCitation[] = metadatas
            .slice(0, 3)
            .map((m, idx) => ({
                pdfName: m.fileName || "Document",
                pageNo: m.page || 1,
                snippet: documents[idx]?.substring(0, 100) || ""
            }))
            .reverse();

        return { context, sources };
    }

    /**
     * Stream with sources - yields layer info, text chunks, then sources at the end
     */
    async *streamWithSources(
        prompt: string,
        context: string,
        sources: SourceCitation[],
        chatHistory: Array<{ role: string; content: string }> = [],
        layer: string = "LAYER3-GEMINI"
    ): AsyncGenerator<StreamChunk> {
        // First yield the layer info
        yield {
            type: 'layer',
            layer: layer
        };

        // Stream the response text
        for await (const chunk of this.streamResponse(prompt, context, chatHistory)) {
            yield chunk;
            if (chunk.type === 'error') return;
            if (chunk.type === 'done') break;
        }

        // Then yield sources one by one
        for (const source of sources) {
            yield {
                type: 'source',
                source: source
            };
        }

        yield { type: 'done' };
    }
}

export const streamingService = new StreamingService();

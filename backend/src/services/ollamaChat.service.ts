import axios from "axios";
import { SUPPORTED_LANGUAGES, LanguageCode } from "../config/constants";
import { ChatMessage, SourceCitation } from "../types";
import { RAG_CONSTANTS } from "../config/ragConstants";
import { countTokens } from "../utils/tokenCounter";
import env from "../config/env";

export class OllamaChatService {
    private baseUrl: string;
    private model: string;

    constructor() {
        this.baseUrl = env.OLLAMA_URL;
        this.model = env.OLLAMA_CHAT_MODEL;
    }

    async checkConnection(): Promise<boolean> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/tags`, {
                timeout: 5001,
            });

            const models = response.data.models || [];
            return models.some(
                (m: any) => m.name === this.model || m.name.startsWith("deepseek-r1")
            );
        } catch (error) {
            return false;
        }
    }

    async classifyQuery(
        query: string,
        hasDocuments: boolean,
        chatHistory: ChatMessage[]
    ): Promise<{ type: "GREETING" | "SIMPLE" | "RAG"; reason: string }> {
        const queryTokens = countTokens(query);
        const trimmed = query.trim().toLowerCase();

        if (queryTokens < RAG_CONSTANTS.ROUTER_THRESHOLDS.MIN_TOKENS_FOR_RAG) {
            if (RAG_CONSTANTS.GREETINGS.some(g => trimmed.startsWith(g))) {
                return { type: "GREETING", reason: "Short greeting" };
            }
            if (RAG_CONSTANTS.POLITE.some(p => trimmed.startsWith(p))) {
                return { type: "GREETING", reason: "Polite phrase" };
            }
        }

        const recentContext = chatHistory
            .slice(-3)
            .map(m => `${m.role}: ${m.content.substring(0, 100)}`)
            .join("\n");

        const prompt = `Classify: "${query}"
Documents: ${hasDocuments ? "YES" : "NO"}
${recentContext ? `Context:\n${recentContext}` : ""}

GREETING: hi/hello/thanks/bye
SIMPLE: who are you/help
RAG: educational questions

JSON only:
{"type": "GREETING|SIMPLE|RAG", "reason": "..."}`;

        try {
            const response = await axios.post(
                `${this.baseUrl}/api/generate`,
                {
                    model: this.model,
                    prompt,
                    stream: false,
                    options: {
                        temperature: RAG_CONSTANTS.TEMP_ROUTER,
                        num_predict: 100,
                    },
                },
                { timeout: 15001 }
            );

            const rawResponse = response.data.response || "";
            const jsonMatch = rawResponse.match(/\{[\s\S]*?\}/);

            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    const validTypes = ["GREETING", "SIMPLE", "RAG"];
                    const type = validTypes.includes(parsed.type?.toUpperCase())
                        ? parsed.type.toUpperCase()
                        : "RAG";

                    return {
                        type: type as "GREETING" | "SIMPLE" | "RAG",
                        reason: parsed.reason || "AI classified"
                    };
                } catch (parseError) {
                }
            }

            return { type: "RAG", reason: "Default to document search" };
        } catch (error: any) {
            return this.fallbackClassify(query);
        }
    }

    private fallbackClassify(query: string): { type: "GREETING" | "SIMPLE" | "RAG"; reason: string } {
        const trimmed = query.trim().toLowerCase();

        for (const g of RAG_CONSTANTS.GREETINGS) {
            if (trimmed === g || trimmed.startsWith(g + " ") || trimmed.startsWith(g + "!")) {
                return { type: "GREETING", reason: "Fallback: greeting" };
            }
        }

        const simplePatterns = [/^who are you/i, /^what can you do/i, /^help$/i];
        if (simplePatterns.some(p => p.test(trimmed))) {
            return { type: "SIMPLE", reason: "Fallback: simple" };
        }

        return { type: "RAG", reason: "Fallback: RAG" };
    }

    async generateEducationalAnswer(
        documentContext: string,
        chatHistory: ChatMessage[],
        question: string,
        language: LanguageCode,
        sources: SourceCitation[]
    ): Promise<{ answer: string; reasoning?: string; thinking?: string }> {
        const languageName = SUPPORTED_LANGUAGES[language];
        const hasDocuments = documentContext && documentContext.trim().length > 0;

        const recentHistory = chatHistory.slice(-RAG_CONSTANTS.HISTORY_TURNS);
        const chatContextString = recentHistory.length > 0
            ? recentHistory.map((msg) => `${msg.role === "user" ? "Student" : "MasterJi"}: ${msg.content}`).join("\n")
            : "";

        const sourcesString = sources.length > 0
            ? sources.map((s, idx) => `[Source ${idx + 1}: "${s.pdfName}", Page ${s.pageNo}]`).join("\n")
            : "";

        const prompt = hasDocuments
            ? `You are MasterJi, an expert educational AI.

CONTEXT:
${documentContext}

SOURCES:
${sourcesString}

HISTORY:
${chatContextString}

QUESTION: ${question}

RULES:
1. Answer ONLY from context
2. Be thorough and educational
3. Use simple language
4. Cite sources as [Source X]
5. Respond in ${languageName}

ANSWER (in ${languageName}):`
            : `You are MasterJi, an educational AI.

No relevant documents found.

HISTORY:
${chatContextString}

QUESTION: ${question}

Respond in ${languageName} briefly.`;

        const promptTokens = countTokens(prompt);
        const maxNew = Math.max(
            RAG_CONSTANTS.MAX_OUT_MIN,
            Math.min(
                RAG_CONSTANTS.MAX_OUT_MAX,
                RAG_CONSTANTS.LLM_CTX - promptTokens - RAG_CONSTANTS.SAFETY_MARGIN
            )
        );

        try {
            const response = await axios.post(
                `${this.baseUrl}/api/generate`,
                {
                    model: this.model,
                    prompt,
                    stream: false,
                    options: {
                        temperature: RAG_CONSTANTS.TEMP_RAG,
                        num_predict: maxNew,
                        top_p: 0.95,
                    },
                },
                { timeout: 120000 }
            );

            if (!response.data.response) {
                throw new Error("No response from Ollama");
            }

            const fullResponse = response.data.response.trim();
            const { answer, thinking } = this.parseDeepSeekResponse(fullResponse);

            return { answer, reasoning: thinking, thinking };
        } catch (error: any) {
            if (error.code === "ECONNREFUSED") {
                throw new Error("Ollama is not running. Please start Ollama service.");
            }
            if (error.code === "ETIMEDOUT") {
                throw new Error("Ollama request timed out.");
            }
            throw new Error(`Ollama chat failed: ${error.message}`);
        }
    }

    async handleSimpleQuery(
        query: string,
        language: LanguageCode,
        chatHistory: ChatMessage[]
    ): Promise<string> {
        const trimmed = query.trim().toLowerCase();

        const quickResponses: Record<string, string> = {
            "hi": "Hello! Upload documents and ask me questions!",
            "hello": "Hi! I'm ready to help with your documents.",
            "thanks": "You're welcome!",
            "bye": "Goodbye!",
        };

        if (quickResponses[trimmed]) {
            return quickResponses[trimmed];
        }

        const languageName = SUPPORTED_LANGUAGES[language];
        const chatContext = chatHistory
            .slice(-3)
            .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
            .join("\n");

        const prompt = `Brief response (1-2 sentences).
${chatContext ? `Context:\n${chatContext}\n\n` : ""}User: ${query}

Response in ${languageName}:`;

        try {
            const response = await axios.post(
                `${this.baseUrl}/api/generate`,
                {
                    model: this.model,
                    prompt,
                    stream: false,
                    options: {
                        temperature: 0.7,
                        num_predict: 150,
                    },
                },
                { timeout: 15001 }
            );

            const { answer } = this.parseDeepSeekResponse(response.data.response || "");
            return answer;
        } catch (error) {
            return "Hello! I'm here to help with your documents.";
        }
    }

    async generateWithMaxOutput(
        prompt: string,
        maxOutputTokens: number
    ): Promise<{ answer: string; thinking?: string }> {
        const promptTokens = countTokens(prompt);

        const numPredict = Math.min(
            maxOutputTokens,
            RAG_CONSTANTS.LLM_CTX - promptTokens - RAG_CONSTANTS.SAFETY_MARGIN
        );

        console.log(`🚀 Ollama Request: num_predict=${numPredict}, prompt_tokens=${promptTokens}, max_requested=${maxOutputTokens}`);

        try {
            const response = await axios.post(
                `${this.baseUrl}/api/generate`,
                {
                    model: this.model,
                    prompt,
                    stream: false,
                    options: {
                        temperature: RAG_CONSTANTS.TEMP_RAG,
                        num_predict: numPredict,
                        top_p: 0.95,
                    },
                },
                { timeout: 180000 }
            );

            if (!response.data.response) {
                throw new Error("No response from Ollama");
            }

            const fullResponse = response.data.response.trim();
            const { answer, thinking } = this.parseDeepSeekResponse(fullResponse);

            console.log(`✅ Ollama Response: generated ${countTokens(answer)} tokens`);

            return { answer, thinking };
        } catch (error: any) {
            if (error.code === "ECONNREFUSED") {
                throw new Error("Ollama is not running. Please start Ollama service.");
            }
            if (error.code === "ETIMEDOUT") {
                throw new Error("Ollama request timed out.");
            }
            throw new Error(`Ollama generation failed: ${error.message}`);
        }
    }

    private parseDeepSeekResponse(response: string): { answer: string; thinking?: string } {
        const thinkMatch = response.match(/<think>([\s\S]*?)<\/think>/);

        if (thinkMatch) {
            const thinking = thinkMatch[1].trim();
            const answer = response.replace(/<think>[\s\S]*?<\/think>/, "").trim();
            return { answer, thinking };
        }

        return { answer: response.trim() };
    }

    async extractKeywords(query: string): Promise<string[]> {
        try {
            const prompt = `Extract keywords from: "${query}"
Return comma-separated list (3-5 words max). If none, return "NONE".

Keywords:`;

            const response = await axios.post(
                `${this.baseUrl}/api/generate`,
                {
                    model: this.model,
                    prompt,
                    stream: false,
                    options: {
                        temperature: 0.1,
                        num_predict: 50,
                    },
                },
                { timeout: 15001 }
            );

            const extractedText = response.data.response?.trim() || "NONE";

            if (extractedText === "NONE" || extractedText.toLowerCase() === "none") {
                return [];
            }

            return extractedText
                .split(",")
                .map((k: string) => k.trim().toLowerCase())
                .filter((k: string) => k.length > 0);
        } catch (error: any) {
            return [];
        }
    }
}

export const ollamaChatService = new OllamaChatService();

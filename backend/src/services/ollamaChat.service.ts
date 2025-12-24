import axios from "axios";
import { SUPPORTED_LANGUAGES, LanguageCode } from "../config/constants";
import { ChatMessage, SourceCitation } from "../types";
import env from "../config/env";

/**
 * Ollama Chat Service
 * Uses local DeepSeek R1 model for AI responses
 * Completely offline - replaces Groq and Gemini services
 */
export class OllamaChatService {
    private baseUrl: string;
    private model: string;

    constructor() {
        this.baseUrl = env.OLLAMA_URL;
        this.model = env.OLLAMA_CHAT_MODEL;
    }

    /**
     * Check if Ollama is running and the chat model is available
     */
    async checkConnection(): Promise<boolean> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/tags`, {
                timeout: 5001,
            });

            const models = response.data.models || [];
            const hasChatModel = models.some(
                (m: any) => m.name === this.model || m.name.startsWith("deepseek-r1")
            );

            if (!hasChatModel) {
                console.warn(`⚠️ Chat model "${this.model}" not found in Ollama`);
                return false;
            }

            return true;
        } catch (error) {
            console.error("Ollama chat connection check failed:", error);
            return false;
        }
    }

    /**
     * AI-Powered Query Classification
     * Uses LLM to intelligently classify the query type
     * Returns: GREETING | SIMPLE | RAG
     */
    async classifyQuery(
        query: string,
        hasDocuments: boolean,
        chatHistory: ChatMessage[]
    ): Promise<{ type: "GREETING" | "SIMPLE" | "RAG"; reason: string }> {

        const recentContext = chatHistory
            .slice(-3)
            .map(m => `${m.role}: ${m.content.substring(0, 100)}`)
            .join("\n");

        const prompt = `You are a query classifier. Analyze the user's query and classify it.

CLASSIFICATION TYPES:
1. GREETING - Simple greetings, thanks, bye (e.g., "hi", "hello", "thanks", "bye")
2. SIMPLE - General questions that don't need documents (e.g., "who are you", "what can you do", "help")
3. RAG - Questions that need document context to answer (e.g., "explain chapter 1", "what is photosynthesis", "summarize the text")

CONTEXT:
- User has documents uploaded: ${hasDocuments ? "YES" : "NO"}
${recentContext ? `- Recent conversation:\n${recentContext}` : "- No previous conversation"}

USER QUERY: "${query}"

RULES:
- If it's a greeting or thanks → GREETING
- If asking about you/your capabilities → SIMPLE  
- If asking about content/information/explanation → RAG
- If unclear but seems educational → RAG

Respond with ONLY this JSON format (no other text):
{"type": "GREETING" or "SIMPLE" or "RAG", "reason": "brief explanation"}`;

        try {
            const response = await axios.post(
                `${this.baseUrl}/api/generate`,
                {
                    model: this.model,
                    prompt,
                    stream: false,
                    options: {
                        temperature: 0.1,  // Low temperature for consistent classification
                        num_predict: 100,  // Short response for speed
                    },
                },
                {
                    timeout: 15001,  // 15 second timeout
                }
            );

            const rawResponse = response.data.response || "";

            // Parse the JSON response
            const jsonMatch = rawResponse.match(/\{[\s\S]*?\}/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    const validTypes = ["GREETING", "SIMPLE", "RAG"];
                    const type = validTypes.includes(parsed.type?.toUpperCase())
                        ? parsed.type.toUpperCase()
                        : "RAG";

                    // AI Classification completed

                    return {
                        type: type as "GREETING" | "SIMPLE" | "RAG",
                        reason: parsed.reason || "AI classified"
                    };
                } catch (parseError) {
                    console.warn("Failed to parse classification JSON, using fallback");
                }
            }

            // Fallback: Check raw response for type keywords
            const upperResponse = rawResponse.toUpperCase();
            if (upperResponse.includes("GREETING")) {
                return { type: "GREETING", reason: "Detected greeting pattern" };
            }
            if (upperResponse.includes("SIMPLE")) {
                return { type: "SIMPLE", reason: "Detected simple query pattern" };
            }

            // Default to RAG for educational queries
            return { type: "RAG", reason: "Default to document search" };

        } catch (error: any) {
            console.error("AI classification error:", error.message);
            // Fallback to simple rule-based classification if AI fails
            return this.fallbackClassify(query);
        }
    }

    /**
     * Fallback classification when AI fails
     */
    private fallbackClassify(query: string): { type: "GREETING" | "SIMPLE" | "RAG"; reason: string } {
        const trimmed = query.trim().toLowerCase();

        const greetings = ["hi", "hello", "hey", "thanks", "thank you", "bye", "goodbye"];
        for (const g of greetings) {
            if (trimmed === g || trimmed.startsWith(g + " ") || trimmed.startsWith(g + "!")) {
                return { type: "GREETING", reason: "Fallback: greeting pattern matched" };
            }
        }

        const simplePatterns = [/^who are you/i, /^what can you do/i, /^help$/i];
        if (simplePatterns.some(p => p.test(trimmed))) {
            return { type: "SIMPLE", reason: "Fallback: simple pattern matched" };
        }

        return { type: "RAG", reason: "Fallback: default to RAG" };
    }

    /**
     * Build optimized educational prompt for better last-layer attention
     * Ensures descriptive answers strictly based on document chunks
     */
    private buildEducationalPrompt(
        documentContext: string,
        chatHistory: ChatMessage[],
        question: string,
        language: LanguageCode,
        sources: SourceCitation[]
    ): string {
        const languageName = SUPPORTED_LANGUAGES[language];
        const hasDocuments = documentContext && documentContext.trim().length > 0;

        // OPTIMIZATION: Only use last 3-5 messages for recency and relevance
        const recentHistory = chatHistory.slice(-5);
        const chatContextString =
            recentHistory.length > 0
                ? recentHistory
                    .map((msg) => {
                        const role = msg.role === "user" ? "Student" : "MasterJi";
                        return `${role}: ${msg.content}`;
                    })
                    .join("\n")
                : "No previous conversation";

        // Format source citations clearly
        const sourcesString =
            sources.length > 0
                ? sources
                    .map(
                        (s, idx) =>
                            `[Source ${idx + 1}]: "${s.pdfName}", Page ${s.pageNo}`
                    )
                    .join("\n")
                : "";

        if (hasDocuments) {
            // OPTIMIZED PROMPT STRUCTURE for better last-layer attention
            return `You are MasterJi, an expert educational AI assistant helping students learn.

# TASK
Provide a comprehensive, detailed, and educational answer to the student's question using ONLY the information from the provided document context below.
Your answer must be descriptive, thorough, and based strictly on the given context.
Respond in ${languageName}.

# CONTEXT FROM DOCUMENTS
${documentContext}

# AVAILABLE SOURCES
${sourcesString}

# RECENT CONVERSATION (Last 5 messages for context)
${chatContextString}

# STUDENT'S QUESTION
${question}

# CRITICAL INSTRUCTIONS - READ CAREFULLY
1. **Answer ONLY from the provided context above** - Do not use external knowledge or make assumptions
2. **Be descriptive and thorough** - Provide detailed explanations, not brief summaries
3. **Use simple, educational language** - Break down complex concepts into understandable parts
4. **Cite your sources** - Use [Source X] notation when referencing specific information
5. **Structure your answer clearly** - Use paragraphs, bullet points, or numbered lists when appropriate
6. **Provide examples** - If the context contains examples, include them in your explanation
7. **If information is incomplete** - Clearly state: "Based on the provided documents, I can tell you [what you know]. However, the documents don't contain information about [what's missing]."
8. **Never say**: "Let me search", "I'm analyzing", "Looking through documents" - Just answer directly
9. **Never hallucinate** - If the context doesn't contain the answer, say so explicitly

# ANSWER FORMAT
- Start immediately with the answer (no preamble like "Based on the document...")
- Be comprehensive and educational
- Include relevant details, definitions, and explanations
- Use examples from the context when available
- Cite sources using [Source X] notation
- End with a summary if the answer is long

# YOUR DETAILED ANSWER (in ${languageName})
`;
        } else {
            // No documents available
            return `You are MasterJi, an educational AI assistant.

# SITUATION
The student has asked a question, but no relevant documents were found in their uploaded files.

# RECENT CONVERSATION
${chatContextString}

# STUDENT'S QUESTION
${question}

# INSTRUCTIONS
1. Check if the student is referring to something from the conversation history
2. If it's a general educational question, provide a brief answer and note: "This is general knowledge as it's not in your uploaded documents. For detailed information specific to your materials, please upload the relevant documents."
3. If it's about specific content they mentioned before, politely ask them to upload the relevant document
4. If it's not educational, politely decline and remind them you're here to help with their studies

# YOUR RESPONSE (in ${languageName})
`;
        }
    }

    /**
     * Generate educational answer using Ollama (DeepSeek R1)
     * Replaces Groq's generateEducationalAnswer
     */
    async generateEducationalAnswer(
        documentContext: string,
        chatHistory: ChatMessage[],
        question: string,
        language: LanguageCode,
        sources: SourceCitation[]
    ): Promise<{ answer: string; reasoning?: string; thinking?: string }> {
        try {
            const prompt = this.buildEducationalPrompt(
                documentContext,
                chatHistory,
                question,
                language,
                sources
            );

            console.log(`🤖 Generating educational answer with Ollama (${this.model})`);

            const response = await axios.post(
                `${this.baseUrl}/api/generate`,
                {
                    model: this.model,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0.7,
                        num_predict: 3000,
                        top_p: 0.95,
                    },
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    timeout: 120000, // 2 minutes for generation
                }
            );

            if (!response.data.response) {
                throw new Error("No response from Ollama");
            }

            const fullResponse = response.data.response.trim();

            // Extract thinking if present (DeepSeek R1 format)
            const { answer, thinking } = this.parseDeepSeekResponse(fullResponse);

            return {
                answer,
                reasoning: thinking,
                thinking,
            };
        } catch (error: any) {
            if (error.code === "ECONNREFUSED") {
                throw new Error("Ollama is not running. Please start Ollama service.");
            }
            if (error.code === "ETIMEDOUT") {
                throw new Error("Ollama request timed out. The model may be processing.");
            }
            console.error("Ollama chat error:", error.message);
            throw new Error(`Ollama chat failed: ${error.message}`);
        }
    }

    /**
     * Generic chat completion method (for router service)
     * Replaces Groq's chatCompletion
     */
    async chatCompletion(
        messages: Array<{ role: string; content: string }>,
        responseFormat?: "json_object" | "text"
    ): Promise<string> {
        try {
            // console.log(`🤖 [OllamaService] Sending request to ${this.model} at ${this.baseUrl}`);

            // Convert messages array to a single prompt for Ollama
            const prompt = messages
                .map((m) => {
                    if (m.role === "system") return `System: ${m.content}`;
                    if (m.role === "user") return `User: ${m.content}`;
                    return `Assistant: ${m.content}`;
                })
                .join("\n\n");

            const fullPrompt = responseFormat === "json_object"
                ? `${prompt}\n\nRespond with valid JSON only:`
                : prompt;

            const response = await axios.post(
                `${this.baseUrl}/api/generate`,
                {
                    model: this.model,
                    prompt: fullPrompt,
                    stream: false,
                    options: {
                        temperature: 0.1, // More deterministic
                        num_predict: 8192, // Increased for longer JSON outputs
                    },
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    timeout: 60000,
                }
            );

            if (!response.data.response) {
                // console.error("❌ [OllamaService] No response data received from Ollama API");
                throw new Error("No response from Ollama");
            }

            const result = response.data.response.trim();
            // console.log(`✅ [OllamaService] Response received. Length: ${result.length}`);

            // For JSON responses, try to extract just the JSON part
            if (responseFormat === "json_object") {
                return this.extractJSON(result);
            }

            // Remove thinking tags if present
            const { answer } = this.parseDeepSeekResponse(result);
            return answer;
        } catch (error: any) {
            if (error.code === "ECONNREFUSED") {
                console.error(`❌ [OllamaService] Connection refused to ${this.baseUrl}. Is Ollama running?`);
                throw new Error("Ollama is not running. Please start Ollama service.");
            }
            console.error("❌ [OllamaService] Chat completion error:", {
                message: error.message,
                code: error.code,
                model: this.model,
                url: this.baseUrl
            });
            throw new Error(`Ollama chat completion failed: ${error.message}`);
        }
    }

    /**
     * Handle simple queries (greetings, basic questions)
     * Optimized for speed - low token count for fast responses
     */
    async handleSimpleQuery(
        query: string,
        language: LanguageCode,
        chatHistory: ChatMessage[]
    ): Promise<string> {
        const trimmed = query.trim().toLowerCase();

        // Quick responses for common greetings (no LLM needed)
        const quickResponses: Record<string, string> = {
            "hi": "Hello! How can I help you today? Feel free to upload documents and ask me questions about them!",
            "hello": "Hi there! I'm ready to help you with your documents. What would you like to know?",
            "hey": "Hey! How can I assist you today?",
            "good morning": "Good morning! How can I help you today?",
            "good afternoon": "Good afternoon! What can I do for you?",
            "good evening": "Good evening! How may I assist you?",
            "thanks": "You're welcome! Let me know if you need anything else.",
            "thank you": "You're welcome! Feel free to ask more questions anytime.",
            "bye": "Goodbye! Have a great day!",
            "goodbye": "Goodbye! Come back anytime you need help with your documents!",
        };

        // Check for exact quick response
        if (quickResponses[trimmed]) {
            return quickResponses[trimmed];
        }

        // For other simple queries, use LLM with low token limit for speed
        const languageName = SUPPORTED_LANGUAGES[language];

        const chatContext = chatHistory
            .slice(-3)  // Only last 3 messages for speed
            .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
            .join("\n");

        const prompt = `You are a helpful AI assistant. Respond briefly (1-2 sentences max).

${chatContext ? `Recent chat:\n${chatContext}\n\n` : ""}User: ${query}

Brief response in ${languageName}:`;

        try {
            const response = await axios.post(
                `${this.baseUrl}/api/generate`,
                {
                    model: this.model,
                    prompt,
                    stream: false,
                    options: {
                        temperature: 0.7,
                        num_predict: 150,  // Very low for speed
                    },
                },
                {
                    timeout: 15001,  // 15 second timeout for speed
                }
            );

            const { answer } = this.parseDeepSeekResponse(response.data.response || "");
            return answer;
        } catch (error) {
            // Fallback response if LLM fails
            return "Hello! I'm here to help you with your documents. Upload a PDF or image and ask me questions about it!";
        }
    }

    /**
     * Query with full document context (Gemini-style)
     * Replaces Gemini's queryWithFullDocument
     */
    async queryWithFullDocument(
        query: string,
        fullDocumentContent: string,
        language: LanguageCode,
        chatHistory: ChatMessage[],
        documentMetadata?: {
            fileName: string;
            totalPages: number;
            language?: string;
        }
    ): Promise<{ answer: string; strategy: string; thinking?: string }> {
        const languageName = SUPPORTED_LANGUAGES[language];

        const chatContext =
            chatHistory.length > 0
                ? chatHistory
                    .slice(-10)
                    .map((m) => {
                        let msgText = `${m.role === "user" ? "Student" : "Assistant"}: ${m.content}`;
                        if (m.sources && m.sources.length > 0) {
                            const sourceInfo = m.sources
                                .map((s) => `${s.pdfName} Page ${s.pageNo}`)
                                .join(", ");
                            msgText += `\n  [Referenced: ${sourceInfo}]`;
                        }
                        return msgText;
                    })
                    .join("\n")
                : "";

        const prompt = `You are an expert educational tutor. Answer the question directly based on the complete document provided.

📚 DOCUMENT CONTENT:
${documentMetadata
                ? `File: ${documentMetadata.fileName} (${documentMetadata.totalPages} pages)`
                : ""
            }

${fullDocumentContent}

${"=".repeat(80)}

${chatContext
                ? `CONVERSATION HISTORY (use this to understand context and references):
${chatContext}

`
                : ""
            }Current Question: ${query}

CRITICAL - DO NOT:
- Say "Let me search", "Let me analyze", "I'm looking", "Searching"
- Provide intermediate thinking steps
- Explain your process

CRITICAL - DO:
- Use conversation history to understand references (e.g., "that chapter", "upas chapter", "solve exercise")
- Start IMMEDIATELY with the answer
- Answer in ${languageName}
- Cite page numbers when relevant
- Be direct and thorough

Start your answer NOW in ${languageName}:`;

        try {
            const response = await axios.post(
                `${this.baseUrl}/api/generate`,
                {
                    model: this.model,
                    prompt,
                    stream: false,
                    options: {
                        temperature: 0.7,
                        num_predict: 4096,
                        top_p: 0.95,
                    },
                },
                {
                    timeout: 180000, // 3 minutes for large documents
                }
            );

            const { answer, thinking } = this.parseDeepSeekResponse(
                response.data.response || ""
            );

            return {
                answer,
                strategy: "FULL_DOCUMENT_CONTEXT_OLLAMA",
                thinking,
            };
        } catch (error: any) {
            console.error("❌ Ollama full document query error:", error.message);
            throw new Error(`Ollama full document query failed: ${error.message}`);
        }
    }

    /**
     * Parse DeepSeek R1 response to extract thinking and answer
     * DeepSeek R1 may include <think>...</think> tags
     */
    private parseDeepSeekResponse(response: string): {
        answer: string;
        thinking?: string;
    } {
        // Check for <think> tags (DeepSeek R1 format)
        const thinkMatch = response.match(/<think>([\s\S]*?)<\/think>/);

        if (thinkMatch) {
            const thinking = thinkMatch[1].trim();
            const answer = response.replace(/<think>[\s\S]*?<\/think>/, "").trim();
            return { answer, thinking };
        }

        // No thinking tags, return as-is
        return { answer: response.trim() };
    }

    /**
     * Extract JSON from response (for structured outputs)
     */
    private extractJSON(response: string): string {
        // Try to find JSON object in the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                // Validate it's valid JSON
                JSON.parse(jsonMatch[0]);
                return jsonMatch[0];
            } catch {
                // Invalid JSON, return original
            }
        }
        return response;
    }

    /**
     * Validate language code
     */
    validateLanguage(language: string): language is LanguageCode {
        return language in SUPPORTED_LANGUAGES;
    }

    /**
     * Extract keywords from query
     */
    async extractKeywords(query: string): Promise<string[]> {
        try {
            const prompt = `Extract ONLY the technical/educational keywords from this query. Ignore filler words and random content.

Query: "${query}"

Return ONLY a comma-separated list of important keywords (3-5 words max). If no meaningful keywords exist, return "NONE".

Example:
Query: "explain photosynthesis process"
Keywords: photosynthesis, process

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
                {
                    timeout: 15001,
                }
            );

            const extractedText = response.data.response?.trim() || "NONE";

            if (extractedText === "NONE" || extractedText.toLowerCase() === "none") {
                return [];
            }

            const keywords = extractedText
                .split(",")
                .map((k: string) => k.trim().toLowerCase())
                .filter((k: string) => k.length > 0);

            console.log(`🤖 Ollama extracted keywords: [${keywords.join(", ")}]`);
            return keywords;
        } catch (error: any) {
            console.error("⚠️ Ollama keyword extraction failed:", error.message);
            return [];
        }
    }
}

export const ollamaChatService = new OllamaChatService();

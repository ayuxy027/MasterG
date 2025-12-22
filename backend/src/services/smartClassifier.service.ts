import { ollamaChatService } from "./ollamaChat.service";
import { ChatMessage } from "../types";

/**
 * Smart Classifier with DeepSeek
 * 
 * Does TWO jobs in one LLM call:
 * 1. If query is simple (greeting, basic question) → Provides direct answer
 * 2. If query needs RAG → Suggests tool usage and optimized retrieval prompt
 */

export interface ClassificationResult {
    needsRAG: boolean;
    directAnswer?: string; // If needsRAG=false, this contains the answer
    retrievalPrompt?: string; // If needsRAG=true, optimized prompt for RAG
    reasoning?: string; // Why this decision was made
}

export class SmartClassifierService {
    /**
     * Main classification method - sends query to DeepSeek for smart routing
     */
    async classifyAndRoute(
        query: string,
        chatHistory: ChatMessage[]
    ): Promise<ClassificationResult> {
        const startTime = Date.now();

        console.log(`🧠 Smart Classifier analyzing: "${query.substring(0, 50)}..."`);

        const systemPrompt = `You are a smart query classifier for an educational RAG chatbot.

Your job is to analyze the user's query and decide:

1. **SIMPLE QUERY** (no documents needed):
   - Greetings: "hi", "hello", "thanks", "bye"
   - Basic questions about you: "who are you", "what can you do", "help"
   - General knowledge that doesn't need specific documents
   
   → For these, provide a direct, friendly answer

2. **RAG QUERY** (needs document retrieval):
   - Questions asking about specific topics, concepts, or information
   - Questions that would benefit from document context
   - Questions like "what is X", "explain Y", "how does Z work"
   
   → For these, suggest retrieval and provide an optimized search prompt

IMPORTANT: Respond ONLY in this exact JSON format (no extra text):
{
  "needsRAG": true/false,
  "directAnswer": "your answer here" (only if needsRAG=false),
  "retrievalPrompt": "optimized search query" (only if needsRAG=true),
  "reasoning": "brief explanation of your decision"
}

Examples:

User: "hi there"
{
  "needsRAG": false,
  "directAnswer": "Hello! I'm MasterJi, your educational AI assistant. I can help you understand your uploaded documents. Upload PDFs or images and ask me questions!",
  "reasoning": "Simple greeting, no documents needed"
}

User: "what is photosynthesis?"
{
  "needsRAG": true,
  "retrievalPrompt": "photosynthesis process plants energy light conversion",
  "reasoning": "Educational question that needs specific information from documents"
}

User: "who are you?"
{
  "needsRAG": false,
  "directAnswer": "I'm MasterJi, an AI-powered educational assistant. I help students understand their study materials by answering questions based on uploaded documents.",
  "reasoning": "Meta question about the assistant itself"
}

Now analyze this query:`;

        try {
            // Call Ollama using chatCompletion
            const response = await ollamaChatService.chatCompletion(
                [
                    {
                        role: "system",
                        content: systemPrompt,
                    },
                    ...chatHistory.slice(-3).map((msg) => ({
                        role: msg.role,
                        content: msg.content,
                    })),
                    {
                        role: "user",
                        content: `Query to classify: "${query}"`,
                    },
                ],
                "json_object"
            );

            console.log(`🔍 Raw classifier response: ${response.substring(0, 200)}...`);

            // Parse JSON response
            const result = this.parseClassifierResponse(response);

            const duration = Date.now() - startTime;
            console.log(
                `✅ Classification complete in ${duration}ms: ${result.needsRAG ? "RAG" : "DIRECT"
                }`
            );

            return result;
        } catch (error: any) {
            console.error("❌ Classifier error:", error.message);

            // Fallback: Use simple rule-based classification
            return this.fallbackClassification(query);
        }
    }

    /**
     * Parse DeepSeek's JSON response
     */
    private parseClassifierResponse(response: string): ClassificationResult {
        try {
            // Extract JSON from response (handle markdown code blocks)
            let jsonStr = response.trim();

            // Remove markdown code blocks if present
            jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");

            // Remove any text before/after JSON
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            }

            const parsed = JSON.parse(jsonStr);

            return {
                needsRAG: Boolean(parsed.needsRAG),
                directAnswer: parsed.directAnswer || undefined,
                retrievalPrompt: parsed.retrievalPrompt || undefined,
                reasoning: parsed.reasoning || undefined,
            };
        } catch (error) {
            console.warn("⚠️  Failed to parse JSON, using fallback");
            throw error; // Will trigger fallback
        }
    }

    /**
     * Fallback classification if DeepSeek fails
     */
    private fallbackClassification(query: string): ClassificationResult {
        const trimmed = query.trim().toLowerCase();

        // Simple patterns for direct answers
        const greetings = [
            "hi",
            "hello",
            "hey",
            "hola",
            "namaste",
            "good morning",
            "good afternoon",
            "good evening",
            "thanks",
            "thank you",
            "bye",
            "goodbye",
        ];

        const metaQuestions = [
            "who are you",
            "what can you do",
            "what are you",
            "help",
            "how do you work",
        ];

        // Check greetings
        if (
            greetings.some(
                (g) =>
                    trimmed === g ||
                    trimmed.startsWith(g + " ") ||
                    trimmed.startsWith(g + "!")
            )
        ) {
            return {
                needsRAG: false,
                directAnswer:
                    "Hello! I'm MasterJi, your educational AI assistant. Upload documents and ask me questions about them!",
                reasoning: "Greeting detected",
            };
        }

        // Check meta questions
        if (metaQuestions.some((q) => trimmed.includes(q))) {
            return {
                needsRAG: false,
                directAnswer:
                    "I'm MasterJi, an AI-powered educational assistant. I help you understand your study materials by answering questions based on your uploaded documents. Just upload PDFs or images and ask me anything!",
                reasoning: "Meta question detected",
            };
        }

        // Default: Needs RAG
        return {
            needsRAG: true,
            retrievalPrompt: query, // Use original query as-is
            reasoning: "Default RAG routing",
        };
    }
}

export const smartClassifierService = new SmartClassifierService();

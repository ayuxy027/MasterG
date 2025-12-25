import { ollamaChatService } from "./ollamaChat.service";
import { ChatMessage } from "../types";

/**
 * Smart Classifier
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

    // Smart Classifier analyzing

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
      // Build conversation prompt
      const chatContext = chatHistory
        .slice(-3)
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join("\n");

      const fullPrompt = `${systemPrompt}\n\n${
        chatContext ? `Context:\n${chatContext}\n\n` : ""
      }Query to classify: "${query}"\n\nRespond with JSON only.`;

      // Call Ollama using generateWithMaxOutput
      const ollamaResult = await ollamaChatService.generateWithMaxOutput(
        fullPrompt,
        500
      );
      const response = ollamaResult.answer;

      // Raw classifier response received

      // Parse JSON response
      const classificationResult = this.parseClassifierResponse(response);

      const duration = Date.now() - startTime;
      console.log(
        `✅ Classification complete in ${duration}ms: ${
          classificationResult.needsRAG ? "RAG" : "DIRECT"
        }`
      );

      return classificationResult;
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

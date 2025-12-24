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
  ): Promise<{
    type: "GREETING" | "SIMPLE" | "RAG";
    reason: string;
    estimatedOutputTokens: number;
  }> {
    const queryTokens = countTokens(query);
    const trimmed = query.trim().toLowerCase();

    // Quick rejection of gibberish/non-educational queries
    if (this.isGibberish(trimmed)) {
      return {
        type: "SIMPLE",
        reason: "Invalid or gibberish query",
        estimatedOutputTokens: 50,
      };
    }

    if (queryTokens < RAG_CONSTANTS.ROUTER_THRESHOLDS.MIN_TOKENS_FOR_RAG) {
      if (RAG_CONSTANTS.GREETINGS.some((g) => trimmed.startsWith(g))) {
        return {
          type: "GREETING",
          reason: "Short greeting",
          estimatedOutputTokens: 30,
        };
      }
      if (RAG_CONSTANTS.POLITE.some((p) => trimmed.startsWith(p))) {
        return {
          type: "GREETING",
          reason: "Polite phrase",
          estimatedOutputTokens: 30,
        };
      }
    }

    const recentContext = chatHistory
      .slice(-3)
      .map((m) => `${m.role}: ${m.content.substring(0, 100)}`)
      .join("\n");

    const prompt = `You are a query classifier for an educational AI assistant.

TASK: Classify this user query and determine appropriate response length.

USER QUERY: "${query}"

CONTEXT:
- Documents available: ${hasDocuments ? "YES" : "NO"}
${recentContext ? `- Recent conversation:\n${recentContext}\n` : ""}

CLASSIFICATION RULES:

1. GREETING - Simple social interactions (30-50 tokens needed)
   - Examples: "hi", "hello", "thanks", "bye", "thank you"
   - Response: Brief acknowledgment

2. SIMPLE - Non-document queries or invalid content (50-150 tokens needed)
   - Examples: "help me", "how to use", "what can you do"
   - Invalid queries: gibberish, random characters, non-educational
   - Response: Brief help message or rejection

3. RAG - Educational questions requiring document knowledge (1000-15000 tokens)
   - ALWAYS classify as RAG if:
     * Query asks to explain/describe/analyze educational concepts
     * Query contains subject matter (math, science, history, etc.)
     * Query requests detailed information or examples
     * Query is about learning/understanding a topic
   - Token allocation based on complexity:
     * Simple definition/concept: 1000-2000 tokens
     * Moderate explanation with examples: 3000-5000 tokens  
     * Detailed analysis/multiple concepts: 8000-12000 tokens
     * Comprehensive deep-dive: 15000+ tokens

IMPORTANT:
- Educational queries should ALWAYS be RAG type, never SIMPLE
- If query mentions "explain", "understand", "learn", "study" → RAG
- If query contains academic/educational content → RAG
- Only mark as SIMPLE if truly non-educational or invalid

OUTPUT FORMAT (JSON only, no other text):
{"type": "GREETING|SIMPLE|RAG", "reason": "brief explanation", "outputTokens": number}`;

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        {
          model: this.model,
          prompt,
          stream: false,
          options: {
            temperature: RAG_CONSTANTS.TEMP_ROUTER,
            num_predict: 150,
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

          // Use AI's estimated output tokens, with fallback based on query length
          const estimatedTokens =
            parsed.outputTokens || this.estimateOutputTokens(queryTokens, type);

          return {
            type: type as "GREETING" | "SIMPLE" | "RAG",
            reason: parsed.reason || "AI classified",
            estimatedOutputTokens: estimatedTokens,
          };
        } catch (parseError) {}
      }

      return {
        type: "RAG",
        reason: "Default to document search",
        estimatedOutputTokens: this.estimateOutputTokens(queryTokens, "RAG"),
      };
    } catch (error: any) {
      return this.fallbackClassify(query);
    }
  }

  /**
   * Estimate output tokens based on query complexity
   */
  private estimateOutputTokens(queryTokens: number, type: string): number {
    if (type === "GREETING") return 30;
    if (type === "SIMPLE") return 100;

    // For RAG queries, scale based on query complexity
    if (queryTokens < 10) return 1000; // Simple: "What is X?"
    if (queryTokens < 25) return 3000; // Medium: "Explain X in detail"
    if (queryTokens < 50) return 8000; // Complex: "Explain X, Y, and Z..."
    return 15000; // Very complex: Long detailed questions
  }

  private fallbackClassify(query: string): {
    type: "GREETING" | "SIMPLE" | "RAG";
    reason: string;
    estimatedOutputTokens: number;
  } {
    const trimmed = query.trim().toLowerCase();
    const queryTokens = countTokens(query);

    for (const g of RAG_CONSTANTS.GREETINGS) {
      if (
        trimmed === g ||
        trimmed.startsWith(g + " ") ||
        trimmed.startsWith(g + "!")
      ) {
        return {
          type: "GREETING",
          reason: "Fallback: greeting",
          estimatedOutputTokens: 30,
        };
      }
    }

    const simplePatterns = [/^who are you/i, /^what can you do/i, /^help$/i];
    if (simplePatterns.some((p) => p.test(trimmed))) {
      return {
        type: "SIMPLE",
        reason: "Fallback: simple",
        estimatedOutputTokens: 100,
      };
    }

    // Default to RAG for any educational-sounding query
    return {
      type: "RAG",
      reason: "Fallback: Treat as educational query",
      estimatedOutputTokens: this.estimateOutputTokens(queryTokens, "RAG"),
    };
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
    const chatContextString =
      recentHistory.length > 0
        ? recentHistory
            .map(
              (msg) =>
                `${msg.role === "user" ? "Student" : "MasterJi"}: ${
                  msg.content
                }`
            )
            .join("\n")
        : "";

    const sourcesString =
      sources.length > 0
        ? sources
            .map(
              (s, idx) =>
                `[Source ${idx + 1}: "${s.pdfName}", Page ${s.pageNo}]`
            )
            .join("\n")
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

    // Only reject truly invalid queries (not educational ones)
    if (this.isGibberish(trimmed)) {
      return "I'm here to help with educational questions. Please ask about a specific topic or subject you'd like to learn about.";
    }

    // Check if it's an educational query that was misclassified
    const educationalIndicators = [
      "explain",
      "what",
      "how",
      "why",
      "when",
      "where",
      "define",
      "describe",
      "analyze",
      "solve",
      "calculate",
      "understand",
      "learn",
      "study",
      "concept",
      "theory",
      "formula",
      "equation",
      "process",
      "principle",
    ];

    if (educationalIndicators.some((word) => trimmed.includes(word))) {
      return "That's a great educational question! However, I need access to relevant documents to provide a detailed answer. Please make sure you've uploaded study materials related to this topic.";
    }

    const quickResponses: Record<string, string> = {
      hi: "Hello! Upload documents and ask me questions!",
      hello: "Hi! I'm ready to help with your documents.",
      thanks: "You're welcome!",
      "thank you": "Happy to help!",
      bye: "Goodbye! Come back anytime you need help with your studies.",
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

      const { answer } = this.parseDeepSeekResponse(
        response.data.response || ""
      );
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

    const calculatedMaxTokens =
      RAG_CONSTANTS.LLM_CTX - promptTokens - RAG_CONSTANTS.SAFETY_MARGIN;

    // Ensure num_predict is always positive and at least 50 tokens
    const numPredict = Math.max(
      50,
      Math.min(maxOutputTokens, calculatedMaxTokens)
    );

    console.log(
      `🚀 Ollama Request: num_predict=${numPredict}, prompt_tokens=${promptTokens}, max_requested=${maxOutputTokens}, calculated_max=${calculatedMaxTokens}`
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
            num_predict: numPredict,
            top_p: 0.95,
          },
        },
        { timeout: 180000 }
      );

      if (!response.data) {
        console.error("❌ Ollama returned no data", {
          status: response.status,
          statusText: response.statusText,
        });
        throw new Error("No data from Ollama");
      }

      // DeepSeek R1 may return content in 'thinking' field instead of 'response'
      // when the reasoning takes up all the tokens
      const responseText = response.data.response?.trim() || "";
      const thinkingText = response.data.thinking?.trim() || "";

      if (!responseText && !thinkingText) {
        console.error(
          "❌ Ollama response missing both 'response' and 'thinking' fields",
          {
            data: response.data,
          }
        );
        throw new Error(
          "No content from Ollama - both response and thinking fields are empty"
        );
      }

      // If response is empty but we have thinking, use the thinking content
      const fullResponse = responseText || thinkingText;
      const { answer, thinking } = this.parseDeepSeekResponse(fullResponse);

      console.log(
        `✅ Ollama Response: generated ${countTokens(answer)} tokens`
      );

      return { answer, thinking };
    } catch (error: any) {
      console.error("❌ Ollama generateWithMaxOutput error:", {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
      });

      if (error.code === "ECONNREFUSED") {
        throw new Error("Ollama is not running. Please start Ollama service.");
      }
      if (error.code === "ETIMEDOUT") {
        throw new Error("Ollama request timed out.");
      }
      throw new Error(`Ollama generation failed: ${error.message}`);
    }
  }

  private parseDeepSeekResponse(response: string): {
    answer: string;
    thinking?: string;
  } {
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

  /**
   * Check if query is gibberish/non-educational
   */
  private isGibberish(query: string): boolean {
    const trimmed = query.trim();

    // Too short (less than 2 chars)
    if (trimmed.length < 2) return true;

    // Only repeated characters (e.g., "aaaa", "!!!!")
    if (/^(.)\1+$/.test(trimmed)) return true;

    // Only symbols or numbers
    if (/^[^a-zA-Z]+$/.test(trimmed)) return true;

    // Random keyboard mashing - but be more lenient
    // Only flag if there are VERY long consonant clusters (6+)
    const consonantClusters = trimmed.match(/[bcdfghjklmnpqrstvwxyz]{6,}/gi);
    if (consonantClusters && consonantClusters.length > 2) return true;

    // Very low vowel ratio - only for short strings
    // Long queries (like educational ones) can have technical terms with low vowel ratio
    if (trimmed.length <= 10) {
      const vowels = trimmed.match(/[aeiou]/gi);
      const vowelRatio = vowels ? vowels.length / trimmed.length : 0;
      if (vowelRatio < 0.1) return true;
    }

    // Check for obvious keyboard mashing (same few keys repeated)
    const gibberishPatterns = [
      /^[qwerty]{5,}$/i, // keyboard row
      /^[asdfgh]{5,}$/i, // keyboard row
      /^[zxcvbn]{5,}$/i, // keyboard row
      /^[a-z]{2,3}\1+$/i, // repeated pattern like "asdasdasd"
    ];

    if (gibberishPatterns.some((pattern) => pattern.test(trimmed))) {
      return true;
    }

    // If query contains common educational words, it's definitely not gibberish
    const educationalKeywords = [
      "explain",
      "what",
      "how",
      "why",
      "when",
      "where",
      "who",
      "define",
      "describe",
      "analyze",
      "compare",
      "calculate",
      "solve",
      "understand",
      "learn",
      "study",
      "teach",
      "tell",
      "show",
      "demonstrate",
      "elaborate",
      "detail",
      "discuss",
    ];

    const lowerQuery = trimmed.toLowerCase();
    if (educationalKeywords.some((keyword) => lowerQuery.includes(keyword))) {
      return false;
    }

    // If it has proper sentence structure (words separated by spaces), likely valid
    const words = trimmed.split(/\s+/);
    if (words.length >= 3) {
      // Check if at least 50% of words have reasonable length
      const reasonableWords = words.filter(
        (w) => w.length >= 2 && w.length <= 20
      );
      if (reasonableWords.length >= words.length * 0.5) {
        return false;
      }
    }

    return false;
  }
}

export const ollamaChatService = new OllamaChatService();

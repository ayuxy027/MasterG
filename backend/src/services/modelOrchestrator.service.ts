import { groqService } from "./groq.service";
import { geminiService } from "./gemini.service";
import { cacheService } from "./cache.service";
import { errorHandlerService } from "./errorHandler.service";
import { ChatMessage } from "../types";
import logger from "./logger.service";

export interface ModelResponse {
  answer: string;
  model: "groq" | "gemini";
  cached: boolean;
  duration: number;
}

/**
 * Model Orchestration Service
 * Manages primary and fallback models with intelligent routing
 */
export class ModelOrchestratorService {
  private readonly PRIMARY_MODEL = "groq";
  private readonly FALLBACK_MODEL = "gemini";
  private readonly TIMEOUT = 30000; // 30 seconds

  async generateResponse(
    context: string,
    query: string,
    chatHistory: ChatMessage[],
    language: string,
    sources?: any[]
  ): Promise<ModelResponse> {
    const startTime = Date.now();

    // Check cache first
    const cacheKey = JSON.stringify({
      context: context.substring(0, 200),
      query,
      language,
    });
    const cachedResponse = cacheService.getResponse(
      cacheKey,
      this.PRIMARY_MODEL
    );

    if (cachedResponse) {
      logger.info("✨ Returning cached response");
      return {
        answer: cachedResponse,
        model: "groq",
        cached: true,
        duration: Date.now() - startTime,
      };
    }

    // Try primary model (Groq)
    try {
      logger.info("🚀 Attempting primary model: Groq");
      const response = await this.executeWithTimeout(
        () =>
          groqService.generateEducationalAnswer(
            context,
            chatHistory,
            query,
            language as any,
            sources
          ),
        this.TIMEOUT
      );

      // Cache the response
      cacheService.setResponse(cacheKey, this.PRIMARY_MODEL, response.answer);

      return {
        answer: response.answer,
        model: "groq",
        cached: false,
        duration: Date.now() - startTime,
      };
    } catch (primaryError) {
      logger.warn("⚠️  Primary model failed, attempting fallback");

      // Fallback to Gemini
      try {
        logger.info("🔄 Using fallback model: Gemini");
        const fallbackResponse = await this.executeWithTimeout(
          () =>
            this.generateGeminiResponse(
              context,
              query,
              chatHistory,
              language,
              sources
            ),
          this.TIMEOUT
        );

        // Cache fallback response
        cacheService.setResponse(
          cacheKey,
          this.FALLBACK_MODEL,
          fallbackResponse
        );

        return {
          answer: fallbackResponse,
          model: "gemini",
          cached: false,
          duration: Date.now() - startTime,
        };
      } catch (fallbackError) {
        logger.error("❌ Both models failed");

        // Last resort: return static fallback
        return {
          answer: this.getStaticFallback(language),
          model: "groq",
          cached: false,
          duration: Date.now() - startTime,
        };
      }
    }
  }

  /**
   * Generate simple response (no RAG)
   */
  async generateSimpleResponse(
    query: string,
    chatHistory: ChatMessage[],
    language: string
  ): Promise<ModelResponse> {
    const startTime = Date.now();

    try {
      const messages = [
        ...chatHistory.slice(-5).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        {
          role: "user" as const,
          content: `${query}\n\n[Respond in ${language}]`,
        },
      ];

      const systemPrompt = `You are a helpful multilingual AI assistant. Respond in ${language} language. Be concise and direct.`;

      const response = await errorHandlerService.retryWithBackoff(
        () =>
          groqService.chatCompletion([
            { role: "system", content: systemPrompt },
            ...messages,
          ]),
        2,
        1000
      );

      return {
        answer: response,
        model: "groq",
        cached: false,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      logger.error("❌ Simple response generation failed:", error);
      return {
        answer: this.getStaticFallback(language),
        model: "groq",
        cached: false,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Generate Gemini response (fallback)
   */
  private async generateGeminiResponse(
    context: string,
    query: string,
    chatHistory: ChatMessage[],
    language: string,
    sources?: any[]
  ): Promise<string> {
    // Build prompt for Gemini
    const prompt = `Context from documents:\n${context}\n\nQuestion: ${query}\n\nProvide a detailed answer in ${language}.`;

    const messages = [
      ...chatHistory.slice(-3).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user" as const, content: prompt },
    ];

    // Use Gemini's chat completion (simplified)
    const response = await geminiService.queryWithFullDocument(
      query,
      context,
      language as any,
      chatHistory,
      { fileName: "Document", totalPages: 1 }
    );

    return response.answer;
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), timeoutMs)
      ),
    ]);
  }

  /**
   * Static fallback response
   */
  private getStaticFallback(language: string): string {
    const fallbacks: Record<string, string> = {
      en: "I'm having trouble processing your request right now. Please try again in a moment.",
      hi: "मुझे अभी आपके अनुरोध को संसाधित करने में परेशानी हो रही है। कृपया कुछ समय बाद पुनः प्रयास करें।",
    };

    return fallbacks[language] || fallbacks.en;
  }

  /**
   * Health check for models
   */
  async healthCheck(): Promise<{ groq: boolean; gemini: boolean }> {
    const results = {
      groq: false,
      gemini: false,
    };

    try {
      await groqService.chatCompletion([{ role: "user", content: "test" }]);
      results.groq = true;
    } catch (error) {
      logger.error("Groq health check failed");
    }

    try {
      await geminiService.queryWithFullDocument(
        "test",
        "test content",
        "en",
        [],
        { fileName: "test", totalPages: 1 }
      );
      results.gemini = true;
    } catch (error) {
      logger.error("Gemini health check failed");
    }

    return results;
  }
}

export const modelOrchestratorService = new ModelOrchestratorService();

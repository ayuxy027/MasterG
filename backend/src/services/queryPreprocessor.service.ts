import {
  QueryType,
  queryValidatorService,
  ValidationResult,
} from "./queryValidator.service";
import { queryOptimizerService } from "./queryOptimizer.service";
import { languageService } from "./language.service";
import { ChatMessage } from "../types";
import logger from "./logger.service";

export interface QueryPreprocessResult {
  originalQuery: string;
  sanitizedQuery: string;
  optimizedQuery: string;
  validation: ValidationResult;
  language: string;
  languageCode: string;
  shouldProceedToRAG: boolean;
}

/**
 * Query Preprocessing Pipeline
 * Language Detection → Validation → Classification → Optimization
 */
export class QueryPreprocessorService {
  /**
   * Full preprocessing pipeline
   */
  async preprocessQuery(
    query: string,
    chatHistory: ChatMessage[]
  ): Promise<QueryPreprocessResult> {
    const startTime = Date.now();

    // Step 1: Language Detection
    const detectedLang = languageService.detectLanguage(query);
    logger.info(
      `🌐 Language: ${detectedLang.language} (${detectedLang.languageCode})`
    );

    // Step 2: Sanitize Query
    const sanitizedQuery = queryValidatorService.sanitizeQuery(query);

    // Step 3: Validate & Classify
    const validation = await queryValidatorService.validateQuery(
      sanitizedQuery
    );
    logger.info(
      `🎯 Query Type: ${validation.type} (confidence: ${validation.confidence})`
    );

    // Step 4: Optimize Query
    const optimizedQuery = await queryOptimizerService.optimizeQuery(
      sanitizedQuery,
      detectedLang.languageCode
    );

    // Step 5: Decide if RAG is needed
    const shouldProceedToRAG = this.shouldUseRAG(validation.type, chatHistory);

    const duration = Date.now() - startTime;
    logger.debug(`⏱️  Preprocessing completed in ${duration}ms`);

    return {
      originalQuery: query,
      sanitizedQuery,
      optimizedQuery,
      validation,
      language: detectedLang.language,
      languageCode: detectedLang.languageCode,
      shouldProceedToRAG,
    };
  }

  /**
   * Determine if RAG retrieval is needed
   */
  private shouldUseRAG(
    queryType: QueryType,
    chatHistory: ChatMessage[]
  ): boolean {
    // Greetings and direct answers don't need RAG
    if (
      queryType === QueryType.GREETING ||
      queryType === QueryType.DIRECT_ANSWER
    ) {
      return false;
    }

    // Invalid and out-of-scope don't need RAG
    if (
      queryType === QueryType.INVALID ||
      queryType === QueryType.OUT_OF_SCOPE
    ) {
      return false;
    }

    // If it's asking about previous chat and we have history, don't need documents
    if (queryType === QueryType.AMBIGUOUS && chatHistory.length > 0) {
      return false;
    }

    // RAG queries definitely need retrieval
    return true;
  }

  /**
   * Extract context from chat history
   */
  extractChatContext(
    chatHistory: ChatMessage[],
    maxMessages: number = 5
  ): string {
    return chatHistory
      .slice(-maxMessages)
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");
  }
}

export const queryPreprocessorService = new QueryPreprocessorService();

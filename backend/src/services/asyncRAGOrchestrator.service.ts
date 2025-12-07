import { queryPreprocessorService } from "./queryPreprocessor.service";
import { decisionEngineService } from "./decisionEngine.service";
import { cacheService } from "./cache.service";
import { vectorDBService } from "./vectordb.service";
import { ChatMessage } from "../types";
import logger from "./logger.service";
import { v4 as uuidv4 } from "uuid";

export interface RAGResponse {
  answer: string;
  sources: any[];
  metadata: {
    correlationId: string;
    strategy: string;
    language: string;
    queryType: string;
    cached: boolean;
    duration: number;
    [key: string]: any;
  };
}

/**
 * Async RAG Orchestrator Service
 * Main entry point for the redesigned RAG architecture
 */
export class AsyncRAGOrchestratorService {
  /**
   * Process query through async pipeline
   */
  async processQuery(
    query: string,
    chatHistory: ChatMessage[],
    chromaCollectionName: string
  ): Promise<RAGResponse> {
    const correlationId = uuidv4();
    const startTime = Date.now();

    logger.info(
      `🎬 [${correlationId}] Starting RAG pipeline for query: "${query.substring(
        0,
        50
      )}..."`
    );

    try {
      // PHASE 1: Query Preprocessing
      logger.info(`📋 [${correlationId}] Phase 1: Preprocessing`);
      const preprocessResult = await queryPreprocessorService.preprocessQuery(
        query,
        chatHistory
      );

      // Check if query is invalid
      if (!preprocessResult.validation.isValid) {
        logger.warn(
          `⚠️  [${correlationId}] Invalid query: ${preprocessResult.validation.reason}`
        );
        return this.buildInvalidResponse(
          preprocessResult.validation.reason,
          preprocessResult.languageCode,
          correlationId,
          Date.now() - startTime
        );
      }

      // Check cache for this exact query
      const cachedResult = cacheService.getQueryResult(
        preprocessResult.optimizedQuery,
        chromaCollectionName
      );

      if (cachedResult) {
        logger.info(`✨ [${correlationId}] Returning cached result`);
        return {
          ...cachedResult,
          metadata: {
            ...cachedResult.metadata,
            correlationId,
            cached: true,
            duration: Date.now() - startTime,
          },
        };
      }

      // PHASE 2: Decision Making
      logger.info(`🎯 [${correlationId}] Phase 2: Decision Engine`);

      // Check if documents exist in collection
      const hasDocuments = await this.checkDocumentsExist(chromaCollectionName);

      const decision = await decisionEngineService.makeDecision(
        preprocessResult.validation.type,
        hasDocuments,
        chatHistory.length,
        preprocessResult.languageCode
      );

      logger.info(
        `🎯 [${correlationId}] Decision: ${decision.strategy} (confidence: ${decision.confidence})`
      );

      // PHASE 3: Execute Strategy
      logger.info(
        `🚀 [${correlationId}] Phase 3: Executing ${decision.strategy}`
      );

      const result = await decisionEngineService.executeStrategy(
        decision,
        preprocessResult.optimizedQuery,
        chatHistory,
        chromaCollectionName,
        preprocessResult.languageCode
      );

      // Build final response
      const response: RAGResponse = {
        answer: result.answer,
        sources: result.sources,
        metadata: {
          correlationId,
          strategy: decision.strategy,
          language: preprocessResult.language,
          queryType: preprocessResult.validation.type,
          cached: false,
          duration: Date.now() - startTime,
          ...result.metadata,
        },
      };

      // Cache the result
      cacheService.setQueryResult(
        preprocessResult.optimizedQuery,
        chromaCollectionName,
        response
      );

      logger.info(
        `✅ [${correlationId}] RAG pipeline completed in ${response.metadata.duration}ms`
      );

      return response;
    } catch (error: any) {
      logger.error(`❌ [${correlationId}] RAG pipeline error:`, error);

      // Graceful degradation
      return this.buildErrorResponse(
        error.message,
        "en",
        correlationId,
        Date.now() - startTime
      );
    }
  }

  /**
   * Check if documents exist in collection
   */
  private async checkDocumentsExist(collectionName: string): Promise<boolean> {
    try {
      const collection = await vectorDBService.initCollection(collectionName);
      const count = await collection.count();
      return count > 0;
    } catch (error) {
      logger.warn("Failed to check document count, assuming documents exist");
      return true;
    }
  }

  /**
   * Build response for invalid queries
   */
  private buildInvalidResponse(
    reason: string,
    language: string,
    correlationId: string,
    duration: number
  ): RAGResponse {
    const messages: Record<string, string> = {
      en: "Please provide a valid question.",
      hi: "कृपया एक वैध प्रश्न प्रदान करें।",
    };

    return {
      answer: messages[language] || messages.en,
      sources: [],
      metadata: {
        correlationId,
        strategy: "INVALID",
        language,
        queryType: "INVALID",
        cached: false,
        duration,
        reason,
      },
    };
  }

  /**
   * Build error response
   */
  private buildErrorResponse(
    errorMessage: string,
    language: string,
    correlationId: string,
    duration: number
  ): RAGResponse {
    const messages: Record<string, string> = {
      en: "An error occurred while processing your request. Please try again.",
      hi: "आपके अनुरोध को संसाधित करते समय एक त्रुटि हुई। कृपया पुनः प्रयास करें।",
    };

    return {
      answer: messages[language] || messages.en,
      sources: [],
      metadata: {
        correlationId,
        strategy: "ERROR",
        language,
        queryType: "ERROR",
        cached: false,
        duration,
        error: errorMessage,
      },
    };
  }

  /**
   * Get system health status
   */
  async getHealthStatus() {
    const cacheStats = cacheService.getStats();

    return {
      status: "operational",
      cache: {
        queryHitRate: this.calculateHitRate(cacheStats.query),
        embeddingHitRate: this.calculateHitRate(cacheStats.embedding),
        responseHitRate: this.calculateHitRate(cacheStats.response),
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Calculate cache hit rate
   */
  private calculateHitRate(stats: any): number {
    const total = stats.hits + stats.misses;
    return total > 0 ? (stats.hits / total) * 100 : 0;
  }
}

export const asyncRAGOrchestratorService = new AsyncRAGOrchestratorService();

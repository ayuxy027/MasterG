import { decisionEngineService } from "./decisionEngine.service";
import { vectorDBService } from "./vectordb.service";
import { smartClassifierService } from "./smartClassifier.service";
import { ChatMessage } from "../types";
import { v4 as uuidv4 } from "uuid";

export interface RAGResponse {
  answer: string;
  sources: any[];
  metadata: {
    correlationId: string;
    strategy: string;
    language: string;
    queryType: string;
    duration: number;
    [key: string]: any;
  };
}

/**
 * OPTIMIZED RAG Orchestrator Service
 * 
 * New Architecture (Faster for Simple Queries):
 * 1. Query → Smart Classifier (DeepSeek) → Either:
 *    a) Direct Answer (for greetings, simple queries) ← FAST PATH
 *    b) Optimized Retrieval Prompt + RAG → Precise retrieval ← SMART PATH
 * 
 * Removed:
 * - Cache service (simplified)
 * - Logger service (using console)
 * - Online APIs (fully offline with Ollama)
 */
export class AsyncRAGOrchestratorService {
  /**
   * Process query through optimized pipeline
   */
  async processQuery(
    query: string,
    chatHistory: ChatMessage[],
    chromaCollectionName: string
  ): Promise<RAGResponse> {
    const correlationId = uuidv4();
    const startTime = Date.now();

    console.log(
      `🎬 [${correlationId}] Processing query: "${query.substring(0, 50)}..."`
    );

    try {
      // ═══════════════════════════════════════════════════════════════
      // OPTIMIZATION: Smart Classification with DeepSeek (Single LLM Call)
      // Does TWO jobs:
      // 1. Provides direct answer for simple queries (FAST)
      // 2. Optimizes retrieval prompt for RAG queries (SMART)
      // ═══════════════════════════════════════════════════════════════

      console.log(`🧠 [${correlationId}] Smart classification in progress...`);
      const classification = await smartClassifierService.classifyAndRoute(
        query,
        chatHistory
      );

      console.log(
        `🎯 [${correlationId}] Classification: ${classification.needsRAG ? "RAG" : "DIRECT"
        }`
      );

      // FAST PATH: Direct answer (no RAG needed)
      if (!classification.needsRAG && classification.directAnswer) {
        console.log(`⚡ [${correlationId}] Fast path: Direct answer`);

        return {
          answer: classification.directAnswer,
          sources: [],
          metadata: {
            correlationId,
            strategy: "DIRECT",
            language: "en",
            queryType: "SIMPLE",
            duration: Date.now() - startTime,
            reasoning: classification.reasoning,
          },
        };
      }

      // SMART PATH: RAG with optimized retrieval
      console.log(
        `🔍 [${correlationId}] Smart path: RAG with optimized prompt`
      );

      // Check if documents exist
      const hasDocuments = await this.checkDocumentsExist(chromaCollectionName);

      if (!hasDocuments) {
        return {
          answer:
            "Please upload some documents first, then ask me questions about them.",
          sources: [],
          metadata: {
            correlationId,
            strategy: "NO_DOCUMENTS",
            language: "en",
            queryType: "RAG",
            duration: Date.now() - startTime,
          },
        };
      }

      // Use optimized retrieval prompt if classifier provided one
      const retrievalQuery = classification.retrievalPrompt || query;
      console.log(
        `📝 [${correlationId}] Using retrieval prompt: "${retrievalQuery.substring(0, 50)}..."`
      );

      // Execute RAG with optimized prompt
      const result = await decisionEngineService.handleRAGQuery(
        retrievalQuery,
        chatHistory,
        chromaCollectionName,
        query // Pass original query for answer generation
      );

      const response: RAGResponse = {
        answer: result.answer,
        sources: result.sources,
        metadata: {
          correlationId,
          strategy: "RAG",
          language: "en",
          queryType: "RAG",
          duration: Date.now() - startTime,
          retrievalPrompt: retrievalQuery,
          originalQuery: query,
          reasoning: classification.reasoning,
          ...result.metadata,
        },
      };

      console.log(
        `✅ [${correlationId}] Pipeline completed in ${response.metadata.duration}ms`
      );

      return response;
    } catch (error: any) {
      console.error(`❌ [${correlationId}] Pipeline error:`, error.message);

      return this.buildErrorResponse(
        error.message,
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
      console.warn("⚠️  Failed to check document count");
      return false;
    }
  }

  /**
   * Build error response
   */
  private buildErrorResponse(
    errorMessage: string,
    correlationId: string,
    duration: number
  ): RAGResponse {
    return {
      answer: "I'm having trouble processing your request. Please try again.",
      sources: [],
      metadata: {
        correlationId,
        strategy: "ERROR",
        language: "en",
        queryType: "ERROR",
        duration,
        error: errorMessage,
      },
    };
  }

  /**
   * Get system health status
   */
  async getHealthStatus() {
    try {
      // Simple health check - just verify Ollama is accessible
      const { ollamaChatService } = await import("./ollamaChat.service");
      const ollamaStatus = await ollamaChatService.checkConnection();

      return {
        status: ollamaStatus ? "operational" : "degraded",
        ollama: ollamaStatus,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "degraded",
        ollama: false,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export const asyncRAGOrchestratorService = new AsyncRAGOrchestratorService();

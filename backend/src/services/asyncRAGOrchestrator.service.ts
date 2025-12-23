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
 * RAG Orchestrator Service
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

    // Processing query

    try {
      // SIMPLIFIED FLOW: Check documents first, then search
      // This removes the dependency on the smart classifier (saving 1 LLM call)

      const hasDocuments = await this.checkDocumentsExist(chromaCollectionName);

      if (!hasDocuments) {
        // Fallback to simple chat if no docs
        const { ollamaChatService } = await import("./ollamaChat.service");
        const simpleAnswer = await ollamaChatService.handleSimpleQuery(query, "en", chatHistory);

        return {
          answer: simpleAnswer,
          sources: [],
          metadata: {
            correlationId,
            strategy: "SIMPLE_CHAT_NO_DOCS",
            language: "en",
            queryType: "SIMPLE",
            duration: Date.now() - startTime,
          },
        };
      }

      // Execute RAG directly

      // OPTIMIZATION: Expand query for better retrieval with local models
      // User queries like "how does it work" need context ("photosynthesis process")
      const { ollamaChatService } = await import("./ollamaChat.service");
      const keywords = await ollamaChatService.extractKeywords(query);

      const retrievalQuery = keywords.length > 0
        ? `${query} ${keywords.join(" ")}`
        : query;

      if (keywords.length > 0) {
        console.log(`🔍 Expanded query: "${retrievalQuery}"`);
      }

      // Use the expanded query for retrieval, original for generation
      const result = await decisionEngineService.handleRAGQuery(
        retrievalQuery, // Expanded query
        chatHistory,
        chromaCollectionName,
        query // Original query
      );

      const response: RAGResponse = {
        answer: result.answer,
        sources: result.sources,
        metadata: {
          correlationId,
          strategy: "RAG_DIRECT",
          language: "en",
          queryType: "RAG",
          duration: Date.now() - startTime,
          originalQuery: query,
          ...result.metadata,
        },
      };

      // Pipeline completed

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

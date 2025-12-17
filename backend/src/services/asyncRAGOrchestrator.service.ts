import { decisionEngineService } from "./decisionEngine.service";
import { vectorDBService } from "./vectordb.service";
import { ollamaChatService } from "./ollamaChat.service";
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
    duration: number;
    [key: string]: any;
  };
}

/**
 * Simplified RAG Orchestrator Service
 * Uses only Ollama (DeepSeek R1) - Completely Offline
 * 
 * Architecture:
 * 1. Preprocess → Classify query type
 * 2. Decision → Choose strategy (SIMPLE vs RAG)
 * 3. Execute → Use Ollama for response
 */
export class AsyncRAGOrchestratorService {
  /**
   * Process query through simplified pipeline
   */
  async processQuery(
    query: string,
    chatHistory: ChatMessage[],
    chromaCollectionName: string
  ): Promise<RAGResponse> {
    const correlationId = uuidv4();
    const startTime = Date.now();

    logger.info(
      `🎬 [${correlationId}] Starting RAG pipeline for query: "${query.substring(0, 50)}..."`
    );

    try {
      // PHASE 1: Quick Query Classification (no LLM, just rules)
      logger.info(`📋 [${correlationId}] Phase 1: Classifying query`);
      const classification = this.classifyQuery(query);

      logger.info(
        `🎯 [${correlationId}] Query type: ${classification.type}`
      );

      // PHASE 2: Handle based on type
      if (classification.type === "GREETING") {
        // Handle greetings directly - no RAG, no sources
        const greeting = await this.handleGreeting(query, chatHistory);
        return {
          answer: greeting,
          sources: [],
          metadata: {
            correlationId,
            strategy: "GREETING",
            language: "en",
            queryType: "GREETING",
            duration: Date.now() - startTime,
          },
        };
      }

      if (classification.type === "SIMPLE") {
        // Handle simple questions without RAG
        const answer = await this.handleSimpleQuery(query, chatHistory);
        return {
          answer,
          sources: [],
          metadata: {
            correlationId,
            strategy: "SIMPLE",
            language: "en",
            queryType: "SIMPLE",
            duration: Date.now() - startTime,
          },
        };
      }

      // PHASE 3: RAG Query - Check documents
      const hasDocuments = await this.checkDocumentsExist(chromaCollectionName);

      if (!hasDocuments) {
        return {
          answer: "Please upload some documents first, then ask me questions about them.",
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

      // PHASE 4: Execute RAG Strategy
      logger.info(`🚀 [${correlationId}] Phase 2: Executing RAG strategy`);

      const result = await decisionEngineService.handleRAGQuery(
        query,
        chatHistory,
        chromaCollectionName
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
          ...result.metadata,
        },
      };

      logger.info(
        `✅ [${correlationId}] RAG pipeline completed in ${response.metadata.duration}ms`
      );

      return response;
    } catch (error: any) {
      logger.error(`❌ [${correlationId}] RAG pipeline error:`, error);

      return this.buildErrorResponse(
        error.message,
        correlationId,
        Date.now() - startTime
      );
    }
  }

  /**
   * Simple rule-based query classification (no LLM needed)
   */
  private classifyQuery(query: string): { type: "GREETING" | "SIMPLE" | "RAG" } {
    const trimmed = query.trim().toLowerCase();

    // Greeting patterns
    const greetings = [
      "hi", "hello", "hey", "hola", "namaste", "greetings",
      "good morning", "good afternoon", "good evening", "good night",
      "thanks", "thank you", "thx", "bye", "goodbye", "see you",
      "how are you", "what's up", "wassup", "sup"
    ];

    if (greetings.some(g => trimmed === g || trimmed.startsWith(g + " ") || trimmed.startsWith(g + "!"))) {
      return { type: "GREETING" };
    }

    // Simple questions that don't need documents
    const simplePatterns = [
      /^who are you/i,
      /^what can you do/i,
      /^help$/i,
      /^what is your name/i,
      /^how do you work/i,
    ];

    if (simplePatterns.some(p => p.test(trimmed))) {
      return { type: "SIMPLE" };
    }

    // Default: RAG query (needs documents)
    return { type: "RAG" };
  }

  /**
   * Handle greetings with Ollama
   */
  private async handleGreeting(
    query: string,
    chatHistory: ChatMessage[]
  ): Promise<string> {
    try {
      const response = await ollamaChatService.handleSimpleQuery(
        query,
        "en",
        chatHistory
      );
      return response;
    } catch (error) {
      logger.error("Greeting handler error:", error);
      return "Hello! How can I help you today? Feel free to upload documents and ask me questions about them.";
    }
  }

  /**
   * Handle simple queries with Ollama (no RAG)
   */
  private async handleSimpleQuery(
    query: string,
    chatHistory: ChatMessage[]
  ): Promise<string> {
    try {
      const response = await ollamaChatService.handleSimpleQuery(
        query,
        "en",
        chatHistory
      );
      return response;
    } catch (error) {
      logger.error("Simple query handler error:", error);
      return "I'm an AI assistant that helps you understand your documents. Upload PDFs or images and ask me questions about them!";
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
      logger.warn("Failed to check document count");
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
    const ollamaStatus = await ollamaChatService.checkConnection();

    return {
      status: ollamaStatus ? "operational" : "degraded",
      ollama: ollamaStatus,
      timestamp: new Date().toISOString(),
    };
  }
}

export const asyncRAGOrchestratorService = new AsyncRAGOrchestratorService();

import { decisionEngineService } from "./decisionEngine.service";
import { vectorDBService } from "./vectordb.service";
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

export class AsyncRAGOrchestratorService {
  async processQuery(
    query: string,
    chatHistory: ChatMessage[],
    chromaCollectionName: string
  ): Promise<RAGResponse> {
    const correlationId = uuidv4();
    const startTime = Date.now();

    try {
      const hasDocuments = await this.checkDocumentsExist(chromaCollectionName);

      if (!hasDocuments) {
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

      const { ollamaChatService } = await import("./ollamaChat.service");
      const keywords = await ollamaChatService.extractKeywords(query);

      const retrievalQuery = keywords.length > 0
        ? `${query} ${keywords.join(" ")}`
        : query;

      const result = await decisionEngineService.handleRAGQuery(
        retrievalQuery,
        chatHistory,
        chromaCollectionName,
        query
      );

      const response: RAGResponse = {
        answer: result.answer,
        sources: result.sources,
        metadata: {
          correlationId,
          strategy: "RAG_OPTIMIZED",
          language: "en",
          queryType: "RAG",
          duration: Date.now() - startTime,
          originalQuery: query,
          ...result.metadata,
        },
      };

      return response;
    } catch (error: any) {
      return this.buildErrorResponse(
        error.message,
        correlationId,
        Date.now() - startTime
      );
    }
  }

  private async checkDocumentsExist(collectionName: string): Promise<boolean> {
    try {
      const collection = await vectorDBService.initCollection(collectionName);
      const count = await collection.count();
      return count > 0;
    } catch (error) {
      return false;
    }
  }

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

  async getHealthStatus() {
    try {
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

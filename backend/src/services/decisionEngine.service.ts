import { QueryType } from "./queryValidator.service";
import { retrievalManagerService } from "./retrievalManager.service";
import { modelOrchestratorService } from "./modelOrchestrator.service";
import { queryPreprocessorService } from "./queryPreprocessor.service";
import { ChatMessage } from "../types";
import logger from "./logger.service";

export interface DecisionResult {
  strategy: "SIMPLE_RESPONSE" | "RAG_RESPONSE" | "DIRECT_ANSWER" | "FALLBACK";
  useRAG: boolean;
  reason: string;
  confidence: number;
}

/**
 * Decision Engine
 * Determines the best strategy for responding to queries
 */
export class DecisionEngineService {
  /**
   * Decide response strategy based on query analysis
   */
  async makeDecision(
    queryType: QueryType,
    hasDocuments: boolean,
    chatHistoryLength: number,
    language: string
  ): Promise<DecisionResult> {
    // CASE 1: Greeting or invalid query
    if (queryType === QueryType.GREETING || queryType === QueryType.INVALID) {
      return {
        strategy: "SIMPLE_RESPONSE",
        useRAG: false,
        reason: "Greeting or invalid query - no retrieval needed",
        confidence: 0.95,
      };
    }

    // CASE 2: Out of scope
    if (queryType === QueryType.OUT_OF_SCOPE) {
      return {
        strategy: "FALLBACK",
        useRAG: false,
        reason: "Query out of scope",
        confidence: 0.9,
      };
    }

    // CASE 3: Direct answer (factual)
    if (queryType === QueryType.DIRECT_ANSWER) {
      return {
        strategy: "DIRECT_ANSWER",
        useRAG: false,
        reason: "Factual query - can answer directly without documents",
        confidence: 0.85,
      };
    }

    // CASE 4: RAG query but no documents
    if (queryType === QueryType.VALID_RAG_QUERY && !hasDocuments) {
      return {
        strategy: "FALLBACK",
        useRAG: false,
        reason: "RAG query but no documents available",
        confidence: 0.8,
      };
    }

    // CASE 5: RAG query with documents
    if (queryType === QueryType.VALID_RAG_QUERY && hasDocuments) {
      return {
        strategy: "RAG_RESPONSE",
        useRAG: true,
        reason: "Valid RAG query with available documents",
        confidence: 0.9,
      };
    }

    // DEFAULT: Simple response
    return {
      strategy: "SIMPLE_RESPONSE",
      useRAG: false,
      reason: "Default fallback to simple response",
      confidence: 0.5,
    };
  }

  /**
   * Execute decision strategy
   */
  async executeStrategy(
    decision: DecisionResult,
    query: string,
    chatHistory: ChatMessage[],
    chromaCollectionName: string,
    language: string
  ): Promise<{ answer: string; sources: any[]; metadata: any }> {
    logger.info(`🎯 Executing strategy: ${decision.strategy}`);

    switch (decision.strategy) {
      case "SIMPLE_RESPONSE":
        return await this.handleSimpleResponse(query, chatHistory, language);

      case "DIRECT_ANSWER":
        return await this.handleDirectAnswer(query, chatHistory, language);

      case "RAG_RESPONSE":
        return await this.handleRAGResponse(
          query,
          chatHistory,
          chromaCollectionName,
          language
        );

      case "FALLBACK":
        return await this.handleFallback(query, language);

      default:
        return await this.handleSimpleResponse(query, chatHistory, language);
    }
  }

  /**
   * Handle simple response (no RAG)
   */
  private async handleSimpleResponse(
    query: string,
    chatHistory: ChatMessage[],
    language: string
  ): Promise<{ answer: string; sources: any[]; metadata: any }> {
    const response = await modelOrchestratorService.generateSimpleResponse(
      query,
      chatHistory,
      language
    );

    return {
      answer: response.answer,
      sources: [],
      metadata: {
        strategy: "SIMPLE_RESPONSE",
        model: response.model,
        cached: response.cached,
        duration: response.duration,
      },
    };
  }

  /**
   * Handle direct answer (factual)
   */
  private async handleDirectAnswer(
    query: string,
    chatHistory: ChatMessage[],
    language: string
  ): Promise<{ answer: string; sources: any[]; metadata: any }> {
    const response = await modelOrchestratorService.generateSimpleResponse(
      query,
      chatHistory,
      language
    );

    return {
      answer: response.answer,
      sources: [],
      metadata: {
        strategy: "DIRECT_ANSWER",
        model: response.model,
        cached: response.cached,
        duration: response.duration,
      },
    };
  }

  /**
   * Handle RAG response (with retrieval)
   */
  private async handleRAGResponse(
    query: string,
    chatHistory: ChatMessage[],
    chromaCollectionName: string,
    language: string
  ): Promise<{ answer: string; sources: any[]; metadata: any }> {
    // Step 1: Retrieve relevant context
    const retrieval = await retrievalManagerService.retrieve(
      query,
      chromaCollectionName,
      language
    );

    if (retrieval.chunks.length === 0) {
      return {
        answer:
          language === "en"
            ? "I couldn't find relevant information in your documents."
            : "मुझे आपके दस्तावेज़ों में प्रासंगिक जानकारी नहीं मिली।",
        sources: [],
        metadata: {
          strategy: "RAG_RESPONSE",
          retrievalStats: retrieval.stats,
        },
      };
    }

    // Step 2: Build context
    const context = retrievalManagerService.buildContext(retrieval.chunks);

    // Step 3: Build sources
    const sources = retrieval.chunks.slice(0, 5).map((chunk) => ({
      pdfName: chunk.metadata.fileName,
      pageNo: chunk.metadata.page || 1,
      snippet: chunk.content.substring(0, 100),
    }));

    // Step 4: Generate answer
    const response = await modelOrchestratorService.generateResponse(
      context,
      query,
      chatHistory,
      language,
      sources
    );

    return {
      answer: response.answer,
      sources,
      metadata: {
        strategy: "RAG_RESPONSE",
        model: response.model,
        cached: response.cached,
        duration: response.duration,
        retrievalStats: retrieval.stats,
      },
    };
  }

  /**
   * Handle fallback
   */
  private async handleFallback(
    query: string,
    language: string
  ): Promise<{ answer: string; sources: any[]; metadata: any }> {
    const fallbacks: Record<string, string> = {
      en: "I'm sorry, I can't help with that. Please ask a question related to your uploaded documents.",
      hi: "क्षमा करें, मैं इसमें मदद नहीं कर सकता। कृपया अपने अपलोड किए गए दस्तावेज़ों से संबंधित प्रश्न पूछें।",
    };

    return {
      answer: fallbacks[language] || fallbacks.en,
      sources: [],
      metadata: {
        strategy: "FALLBACK",
      },
    };
  }
}

export const decisionEngineService = new DecisionEngineService();

import { ollamaChatService } from "./ollamaChat.service";
import { ollamaEmbeddingService } from "./ollamaEmbedding.service";
import { vectorDBService } from "./vectordb.service";
import { ChatMessage } from "../types";

/**
 * Optimized Decision Engine
 * Uses only Ollama (DeepSeek R1) - Completely Offline
 */
export class DecisionEngineService {
  private readonly TOP_K = 5; // OPTIMIZED: Reduced from 8
  private readonly SIMILARITY_THRESHOLD = 0.5; // OPTIMIZED: Increased from 0.4

  /**
   * Handle RAG query - retrieve context and generate answer
   * 
   * @param retrievalQuery - Optimized query for retrieval (from smart classifier)
   * @param chatHistory - Chat conversation history
   * @param chromaCollectionName - Collection to search in
   * @param originalQuery - Original user query (for answer generation)
   */
  async handleRAGQuery(
    retrievalQuery: string,
    chatHistory: ChatMessage[],
    chromaCollectionName: string,
    originalQuery?: string
  ): Promise<{ answer: string; sources: any[]; metadata: any }> {
    const startTime = Date.now();

    try {
      // Use original query for display, retrieval query for search
      const queryForAnswer = originalQuery || retrievalQuery;

      // Step 1: Generate query embedding using Ollama
      console.log("🔍 Generating query embedding with Ollama");
      const queryEmbedding = await ollamaEmbeddingService.generateEmbedding(
        retrievalQuery
      );

      // Step 2: Retrieve relevant chunks from ChromaDB
      console.log(`🔍 Searching in collection: ${chromaCollectionName}`);
      const searchResults = await vectorDBService.queryChunks(
        queryEmbedding,
        this.TOP_K,
        chromaCollectionName
      );

      // Step 3: Filter and build context
      const relevantChunks = this.filterChunks(searchResults);

      if (relevantChunks.length === 0) {
        return {
          answer:
            "I couldn't find relevant information in your documents for this question. Try rephrasing or ask about something else in the documents.",
          sources: [],
          metadata: {
            chunksFound: 0,
            duration: Date.now() - startTime,
          },
        };
      }

      // Step 4: Build context string (OPTIMIZED: Use only 3 chunks)
      const context = this.buildContext(relevantChunks);

      // Step 5: Build sources for citation
      const sources = relevantChunks.slice(0, 3).map((chunk) => ({
        pdfName: chunk.metadata.fileName || "Document",
        pageNo: chunk.metadata.page || 1,
        snippet: chunk.content.substring(0, 150) + "...",
      }));

      // Step 6: Generate answer using Ollama (use original query)
      console.log("🤖 Generating answer with Ollama (DeepSeek R1)");
      const response = await ollamaChatService.generateEducationalAnswer(
        context,
        chatHistory,
        queryForAnswer,
        "en",
        sources
      );

      return {
        answer: response.answer,
        sources,
        metadata: {
          chunksFound: relevantChunks.length,
          duration: Date.now() - startTime,
          thinking: response.thinking,
        },
      };
    } catch (error: any) {
      console.error("❌ RAG query error:", error.message);
      throw error;
    }
  }

  /**
   * Filter chunks by similarity score
   */
  private filterChunks(searchResults: {
    documents: string[];
    metadatas: any[];
    distances: number[];
  }): Array<{ content: string; metadata: any; score: number }> {
    if (!searchResults.documents || searchResults.documents.length === 0) {
      return [];
    }

    return searchResults.documents
      .map((doc, idx) => ({
        content: doc,
        metadata: searchResults.metadatas[idx],
        distance: searchResults.distances[idx],
        score: 1 - searchResults.distances[idx],
      }))
      .filter((chunk) => chunk.score >= this.SIMILARITY_THRESHOLD)
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Build context string from chunks
   */
  private buildContext(
    chunks: Array<{ content: string; metadata: any }>
  ): string {
    return chunks
      .slice(0, 5)
      .map((chunk, idx) => {
        const fileName = chunk.metadata.fileName || "Document";
        const pageNo = chunk.metadata.page || 1;
        return `[Source ${idx + 1}: ${fileName}, Page ${pageNo}]\n${chunk.content}`;
      })
      .join("\n\n---\n\n");
  }
}

export const decisionEngineService = new DecisionEngineService();

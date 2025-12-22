import { ollamaChatService } from "./ollamaChat.service";
import { ollamaEmbeddingService } from "./ollamaEmbedding.service";
import { vectorDBService } from "./vectordb.service";
import { ChatMessage } from "../types";

/**
 * Decision Engine
 */
export class DecisionEngineService {
  private readonly SIMILARITY_THRESHOLD = 0.5;

  /**
   * Get optimal TOP_K based on query complexity
   * Simple queries need fewer chunks, complex queries need more
   */
  private getOptimalTopK(query: string): number {
    const words = query.trim().split(/\s+/).length;
    const hasQuestionWords = /\b(what|how|why|when|where|who|explain|describe|compare|analyze)\b/i.test(query);
    const hasMultipleConcepts = /\b(and|or|also|additionally|furthermore)\b/i.test(query);

    // Simple query: fewer chunks needed
    if (words <= 5 && !hasQuestionWords) {
      return 5;
    }

    // Medium query: standard retrieval
    if (words <= 15 && !hasMultipleConcepts) {
      return 8;
    }

    // Complex query: more context needed
    return 12;
  }

  /**
   * Extract metadata filters from query (e.g., file mentions, page numbers)
   */
  private extractMetadataFilters(query: string): any {
    const filters: any = {};

    // Check for page number mentions
    const pageMatch = query.match(/page\s+(\d+)/i);
    if (pageMatch) {
      filters.page = parseInt(pageMatch[1]);
    }

    // Check for page range mentions
    const rangeMatch = query.match(/pages?\s+(\d+)\s*(?:to|-)\s*(\d+)/i);
    if (rangeMatch) {
      filters.page = {
        $gte: parseInt(rangeMatch[1]),
        $lte: parseInt(rangeMatch[2]),
      };
    }

    return Object.keys(filters).length > 0 ? { where: filters } : undefined;
  }

  /**
   * Reorder chunks to combat "lost in the middle" problem
   * Places most relevant chunks at start and end for better attention
   */
  private reorderChunksForAttention(
    chunks: Array<{ content: string; metadata: any; score: number }>
  ): Array<{ content: string; metadata: any; score: number }> {
    if (chunks.length <= 2) {
      return chunks; // No reordering needed
    }

    const reordered: typeof chunks = [];
    const sorted = [...chunks].sort((a, b) => b.score - a.score);

    let left = 0;
    let right = sorted.length - 1;
    let useLeft = true;

    // Interleave: Best, Worst, 2nd Best, 2nd Worst, ...
    while (left <= right) {
      if (useLeft) {
        reordered.push(sorted[left++]);
      } else {
        reordered.push(sorted[right--]);
      }
      useLeft = !useLeft;
    }

    console.log('🔄 Reordered chunks for better attention:');
    reordered.forEach((chunk, idx) => {
      console.log(`  Position ${idx + 1}: Score ${chunk.score.toFixed(3)}`);
    });

    return reordered;
  }

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

      // OPTIMIZATION 1: Adaptive TOP_K based on query complexity
      const topK = this.getOptimalTopK(retrievalQuery);
      console.log(`📊 Using adaptive TOP_K = ${topK} for query: "${retrievalQuery.substring(0, 50)}..."`);

      // OPTIMIZATION 2: Extract metadata filters from query
      const metadataFilters = this.extractMetadataFilters(retrievalQuery);
      if (metadataFilters) {
        console.log('🔍 Applying metadata filters:', metadataFilters);
      }

      // Step 1: Generate query embedding using Ollama
      const queryEmbedding = await ollamaEmbeddingService.generateEmbedding(
        retrievalQuery
      );

      // Step 2: Retrieve relevant chunks from ChromaDB with adaptive TOP_K
      const searchResults = await vectorDBService.queryChunks(
        queryEmbedding,
        topK,  // Dynamic instead of fixed
        chromaCollectionName,
        metadataFilters  // Apply filters if found
      );

      // Step 3: Filter chunks by similarity
      const relevantChunks = this.filterChunks(searchResults);

      if (relevantChunks.length === 0) {
        return {
          answer:
            "I couldn't find relevant information in your documents for this question. Try rephrasing or ask about something else in the documents.",
          sources: [],
          metadata: {
            chunksFound: 0,
            duration: Date.now() - startTime,
            topK,
          },
        };
      }

      // OPTIMIZATION 3: Reorder chunks for better attention
      const reorderedChunks = this.reorderChunksForAttention(relevantChunks);

      // Build context from reordered chunks
      const context = this.buildContext(reorderedChunks);

      // Build sources from reordered chunks (top 5 for better visibility)
      const sources = reorderedChunks.slice(0, 5).map((chunk) => ({
        pdfName: chunk.metadata.fileName || "Document",
        pageNo: chunk.metadata.page || 1,
        snippet: chunk.content.substring(0, 150) + "...",
      }));

      // Step 4: Generate answer using Ollama with optimized context
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
          topK,
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
      .slice(0, 15)
      .map((chunk, idx) => {
        const fileName = chunk.metadata.fileName || "Document";
        const pageNo = chunk.metadata.page || 1;
        return `[Source ${idx + 1}: ${fileName}, Page ${pageNo}]\n${chunk.content}`;
      })
      .join("\n\n---\n\n");
  }
}

export const decisionEngineService = new DecisionEngineService();

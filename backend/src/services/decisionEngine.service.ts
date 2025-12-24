import { ollamaEmbeddingService } from "./ollamaEmbedding.service";
import { vectorDBService } from "./vectordb.service";
import { rerankerService } from "./reranker.service";
import { countTokens } from "../utils/tokenCounter";
import { RAG_CONSTANTS } from "../config/ragConstants";
import { ChatMessage } from "../types";

export class DecisionEngineService {
  async handleRAGQuery(
    retrievalQuery: string,
    chatHistory: ChatMessage[],
    chromaCollectionName: string,
    originalQuery?: string
  ): Promise<{ answer: string; sources: any[]; metadata: any }> {
    const startTime = Date.now();
    const queryForAnswer = originalQuery || retrievalQuery;

    try {
      const queryEmbedding = await ollamaEmbeddingService.generateEmbedding(
        retrievalQuery
      );

      const searchResults = await vectorDBService.queryChunks(
        queryEmbedding,
        RAG_CONSTANTS.RETRIEVE_K,
        chromaCollectionName
      );

      if (!searchResults.documents || searchResults.documents.length === 0) {
        return {
          answer:
            "I couldn't find relevant information in your documents. Please upload more relevant files.",
          sources: [],
          metadata: {
            chunksFound: 0,
            duration: Date.now() - startTime,
            topK: RAG_CONSTANTS.RETRIEVE_K,
          },
        };
      }

      const candidateChunks = searchResults.documents.map((doc, idx) => ({
        content: doc,
        metadata: searchResults.metadatas[idx],
        distance: searchResults.distances[idx],
      }));

      const rerankedChunks = rerankerService.rerank(candidateChunks, 3);

      if (rerankedChunks.length === 0) {
        return {
          answer:
            "I couldn't find relevant information in your documents to answer that question. Try asking about specific topics covered in the uploaded materials.",
          sources: [], // Don't send irrelevant chunks to frontend
          metadata: {
            chunksFound: 0,
            duration: Date.now() - startTime,
            topK: RAG_CONSTANTS.RETRIEVE_K,
            relevanceCheck: "No chunks met minimum relevance threshold",
          },
        };
      }

      const context = this.buildContext(rerankedChunks);

      // Create sources with deduplication based on pdfName + pageNo + snippet
      const sourcesMap = new Map<
        string,
        { pdfName: string; pageNo: number; snippet: string }
      >();

      rerankedChunks.forEach((chunk) => {
        const pdfName = chunk.metadata.fileName || "Document";
        const pageNo = chunk.metadata.page || 1;
        const snippet = chunk.content.substring(0, 150) + "...";

        // Create unique key from pdfName + pageNo + first 50 chars of snippet
        const uniqueKey = `${pdfName}|${pageNo}|${snippet.substring(0, 50)}`;

        // Only add if not already present
        if (!sourcesMap.has(uniqueKey)) {
          sourcesMap.set(uniqueKey, { pdfName, pageNo, snippet });
        }
      });

      const sources = Array.from(sourcesMap.values());

      const { ollamaChatService } = await import("./ollamaChat.service");

      const response = await ollamaChatService.generateEducationalAnswer(
        context,
        chatHistory.slice(-RAG_CONSTANTS.HISTORY_TURNS),
        queryForAnswer,
        "en",
        sources
      );

      return {
        answer: response.answer,
        sources,
        metadata: {
          chunksFound: rerankedChunks.length,
          topK: RAG_CONSTANTS.RETRIEVE_K,
          duration: Date.now() - startTime,
          thinking: response.thinking,
        },
      };
    } catch (error: any) {
      throw error;
    }
  }

  private buildContext(
    chunks: Array<{ content: string; metadata: any }>
  ): string {
    return chunks
      .map((chunk, idx) => {
        const fileName = chunk.metadata.fileName || "Document";
        const pageNo = chunk.metadata.page || 1;
        return `[Source ${idx + 1}: ${fileName}, Page ${pageNo}]\n${
          chunk.content
        }`;
      })
      .join("\n\n---\n\n");
  }
}

export const decisionEngineService = new DecisionEngineService();

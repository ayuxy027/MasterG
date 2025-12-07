import { embeddingService } from "./embedding.service";
import { vectorDBService } from "./vectordb.service";
import { documentService } from "./document.service";
import { cacheService } from "./cache.service";
import { errorHandlerService } from "./errorHandler.service";
import logger from "./logger.service";

export interface RetrievalResult {
  chunks: Array<{
    content: string;
    metadata: any;
    score: number;
    source: "vector" | "mongodb";
  }>;
  documents: Map<string, Array<{ pageNumber: number; content: string }>>;
  stats: {
    vectorResults: number;
    mongoResults: number;
    totalRetrieved: number;
    duration: number;
  };
}

/**
 * Multi-Source Retrieval Manager
 * Orchestrates parallel retrieval from Vector DB and MongoDB
 */
export class RetrievalManagerService {
  private readonly TOP_K = 10;
  private readonly SIMILARITY_THRESHOLD = 0.6;

  /**
   * Parallel retrieval from multiple sources
   */
  async retrieve(
    query: string,
    chromaCollectionName: string,
    language: string
  ): Promise<RetrievalResult> {
    const startTime = Date.now();

    try {
      // Step 1: Generate query embedding (with cache)
      const queryEmbedding = await this.getEmbeddingWithCache(query);

      // Step 2: First, do a quick search to identify most relevant PDF
      logger.info(
        `🔍 Identifying most relevant PDF in collection: ${chromaCollectionName}`
      );
      const initialResults = await errorHandlerService.retryWithBackoff(
        () =>
          vectorDBService.queryChunks(
            queryEmbedding,
            this.TOP_K * 2, // Get more results for PDF analysis
            chromaCollectionName
          ),
        2,
        500
      );

      // Step 3: Analyze which PDF is most relevant
      const targetPdfGroup = this.identifyMostRelevantPDF(initialResults);

      let vectorResults = initialResults;

      // Step 4: If a dominant PDF is found, re-query with PDF filter
      if (targetPdfGroup) {
        logger.info(
          `📄 Target PDF identified: ${
            targetPdfGroup.fileName
          } (${targetPdfGroup.matchPercentage.toFixed(1)}% of top results)`
        );
        logger.info(
          `🎯 Re-querying with PDF filter: ${targetPdfGroup.fileName}`
        );

        // Re-query with PDF-specific filter
        const collection = await vectorDBService.getCollection(
          chromaCollectionName
        );
        const filteredResults = await collection.query({
          queryEmbeddings: [queryEmbedding],
          nResults: this.TOP_K,
          where: { fileName: { $eq: targetPdfGroup.fileName } },
        });

        vectorResults = {
          documents: filteredResults.documents[0] || [],
          metadatas: (filteredResults.metadatas[0] as any[]) || [],
          distances: filteredResults.distances[0] || [],
        };

        logger.info(
          `✅ Retrieved ${vectorResults.documents.length} chunks from ${targetPdfGroup.fileName}`
        );
      } else {
        logger.info(
          `📚 No dominant PDF found, using all ${initialResults.documents.length} chunks`
        );
        vectorResults = initialResults;
      }

      // Step 5: Filter and rank vector results
      const relevantChunks = this.filterAndRankChunks(vectorResults, language);

      logger.info(
        `✅ Found ${relevantChunks.length} relevant chunks from vector DB`
      );

      // Step 4: Get full documents from MongoDB (based on fileIds)
      const fileIds = [
        ...new Set(relevantChunks.map((chunk) => chunk.metadata.fileId)),
      ];
      let documents = new Map();

      if (fileIds.length > 0) {
        logger.info(`📄 Fetching ${fileIds.length} documents from MongoDB`);
        documents = await errorHandlerService.retryWithBackoff(
          () => documentService.getPagesByFileIds(fileIds),
          2,
          500
        );
      }

      const duration = Date.now() - startTime;
      logger.info(`⏱️  Retrieval completed in ${duration}ms`);

      return {
        chunks: relevantChunks,
        documents,
        stats: {
          vectorResults: vectorResults.documents.length,
          mongoResults: documents.size,
          totalRetrieved: relevantChunks.length,
          duration,
        },
      };
    } catch (error) {
      logger.error("❌ Retrieval error:", error);
      throw error;
    }
  }

  /**
   * Get embedding with cache support
   */
  private async getEmbeddingWithCache(query: string): Promise<number[]> {
    // Check cache first
    const cachedEmbedding = cacheService.getEmbedding(query);
    if (cachedEmbedding) {
      logger.debug("✨ Using cached embedding");
      return cachedEmbedding;
    }

    // Generate new embedding
    const embedding = await embeddingService.generateEmbedding(query);

    // Cache it
    cacheService.setEmbedding(query, embedding);

    return embedding;
  }

  /**
   * Identify the most relevant PDF from initial query results
   * Returns PDF info if >60% of top results come from the same PDF
   */
  private identifyMostRelevantPDF(vectorResults: {
    documents: string[];
    metadatas: any[];
    distances: number[];
  }): { fileName: string; pdfGroup: string; matchPercentage: number } | null {
    if (!vectorResults.metadatas || vectorResults.metadatas.length === 0) {
      return null;
    }

    // Count occurrences of each PDF in top results
    const pdfCounts = new Map<
      string,
      { fileName: string; pdfGroup: string; count: number }
    >();

    for (const metadata of vectorResults.metadatas) {
      const fileName = metadata.fileName || "unknown";
      const pdfGroup = metadata.pdfGroup || fileName;

      if (!pdfCounts.has(pdfGroup)) {
        pdfCounts.set(pdfGroup, { fileName, pdfGroup, count: 0 });
      }
      pdfCounts.get(pdfGroup)!.count++;
    }

    // Find the PDF with most matches
    let maxCount = 0;
    let dominantPdf: {
      fileName: string;
      pdfGroup: string;
      count: number;
    } | null = null;

    for (const pdfInfo of pdfCounts.values()) {
      if (pdfInfo.count > maxCount) {
        maxCount = pdfInfo.count;
        dominantPdf = pdfInfo;
      }
    }

    if (!dominantPdf) return null;

    const matchPercentage =
      (dominantPdf.count / vectorResults.metadatas.length) * 100;

    // Only filter by PDF if it represents >60% of results (strong signal)
    if (matchPercentage > 60) {
      return {
        fileName: dominantPdf.fileName,
        pdfGroup: dominantPdf.pdfGroup,
        matchPercentage,
      };
    }

    return null;
  }

  /**
   * Filter and rank chunks by relevance and language
   */
  private filterAndRankChunks(
    searchResults: {
      documents: string[];
      metadatas: any[];
      distances: number[];
    },
    language: string
  ): Array<{
    content: string;
    metadata: any;
    score: number;
    source: "vector";
  }> {
    const chunks = searchResults.documents
      .map((doc, idx) => ({
        content: doc,
        metadata: searchResults.metadatas[idx],
        distance: searchResults.distances[idx],
        score: 1 - searchResults.distances[idx], // Convert distance to similarity score
        source: "vector" as const,
      }))
      .filter((chunk) => {
        // Filter by similarity threshold
        if (chunk.score < 1 - this.SIMILARITY_THRESHOLD) {
          return false;
        }

        // Filter by language (prefer same language, but allow English)
        const chunkLang = chunk.metadata.language || "en";
        return chunkLang === language || chunkLang === "en";
      })
      .sort((a, b) => b.score - a.score); // Sort by relevance

    return chunks;
  }

  /**
   * Merge and deduplicate results from multiple sources
   */
  private mergeResults(
    vectorResults: any[],
    mongoResults: any[]
  ): Array<{ content: string; metadata: any; score: number; source: string }> {
    const merged = [...vectorResults, ...mongoResults];

    // Deduplicate by content hash
    const seen = new Set<string>();
    return merged.filter((result) => {
      const hash = this.hashContent(result.content);
      if (seen.has(hash)) {
        return false;
      }
      seen.add(hash);
      return true;
    });
  }

  /**
   * Hash content for deduplication
   */
  private hashContent(content: string): string {
    return content.substring(0, 100); // Simple hash using first 100 chars
  }

  /**
   * Build context from retrieved chunks
   */
  buildContext(chunks: Array<{ content: string; metadata: any }>): string {
    return chunks
      .slice(0, 5) // Limit to top 5 chunks
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

export const retrievalManagerService = new RetrievalManagerService();

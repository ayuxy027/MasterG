import { ollamaEmbeddingService } from "./ollamaEmbedding.service";
import { vectorDBService } from "./vectordb.service";
import { rerankerService } from "./reranker.service";
import { countTokens } from "../utils/tokenCounter";
import { RAG_CONSTANTS } from "../config/ragConstants";
import { ChatMessage } from "../types";

export class DecisionEngineService {
  /**
   * Extract mentioned document names from query with @ syntax
   * @document.pdf = strict search ONLY in that document
   * Regular mentions also detected as fallback
   */
  private extractMentionedDocuments(query: string): {
    documents: string[];
    isStrict: boolean;
    cleanQuery: string;
  } {
    const mentionedDocs: string[] = [];
    let isStrict = false;
    let cleanQuery = query;

    // Pattern 1: @document.ext (STRICT mode) - supports ANY file extension
    const strictPattern = /@([a-zA-Z0-9_\-\.]+)/gi;
    let match;
    while ((match = strictPattern.exec(query)) !== null) {
      let docName = match[1];
      // If no extension, try as-is (will fuzzy match later)
      mentionedDocs.push(docName);
      isStrict = true;
      // Remove @ mentions from query
      cleanQuery = cleanQuery.replace(match[0], "").trim();
    }

    console.log(
      `🔍 Extracted ${isStrict ? "STRICT" : "regular"} documents:`,
      mentionedDocs
    );

    // If strict mode detected, return immediately
    if (isStrict) {
      return { documents: mentionedDocs, isStrict: true, cleanQuery };
    }

    // Pattern 2: "in document.pdf" or "from file.pdf" (regular mode)
    const pattern1 =
      /(?:in|from|according to|based on|refer to|check|see)\s+(?:document|file|pdf)?\s*([a-zA-Z0-9_\-\.]+\.pdf)/gi;
    while ((match = pattern1.exec(query)) !== null) {
      mentionedDocs.push(match[1]);
    }

    // Pattern 3: Direct mention of .pdf files (regular mode)
    const pattern2 = /([a-zA-Z0-9_\-\.]+\.pdf)/gi;
    while ((match = pattern2.exec(query)) !== null) {
      if (!mentionedDocs.includes(match[1])) {
        mentionedDocs.push(match[1]);
      }
    }

    return { documents: mentionedDocs, isStrict: false, cleanQuery };
  }

  /**
   * Get fileIds for mentioned document names
   */
  private async getFileIdsForDocuments(
    documentNames: string[],
    collectionName: string
  ): Promise<string[]> {
    try {
      const allFiles = await vectorDBService.getUniqueFiles(collectionName);
      console.log(
        `📚 Available files in collection:`,
        allFiles.map((f) => `"${f.fileName}" (${f.fileId})`)
      );

      const fileIds: string[] = [];

      documentNames.forEach((docName) => {
        const lowerDocName = docName.toLowerCase();
        console.log(`🔎 Looking for matches for: "${docName}"`);

        // Match by filename (case-insensitive, partial match)
        const matchedFiles = allFiles.filter(
          (file) =>
            file.fileName.toLowerCase().includes(lowerDocName) ||
            lowerDocName.includes(file.fileName.toLowerCase())
        );

        console.log(
          `✅ Found ${matchedFiles.length} matches:`,
          matchedFiles.map((f) => f.fileName)
        );

        matchedFiles.forEach((file) => {
          if (!fileIds.includes(file.fileId)) {
            fileIds.push(file.fileId);
          }
        });
      });

      console.log(`🎯 Final fileIds to filter:`, fileIds);
      return fileIds;
    } catch (error) {
      console.error("Error getting fileIds for documents:", error);
      return [];
    }
  }

  async handleRAGQuery(
    retrievalQuery: string,
    chatHistory: ChatMessage[],
    chromaCollectionName: string,
    originalQuery?: string
  ): Promise<{ answer: string; sources: any[]; metadata: any }> {
    const startTime = Date.now();
    const queryForAnswer = originalQuery || retrievalQuery;

    try {
      // Check if user mentioned specific documents with @ syntax
      const {
        documents: mentionedDocs,
        isStrict,
        cleanQuery,
      } = this.extractMentionedDocuments(queryForAnswer);

      let fileIdsFilter: string[] | undefined;
      let searchQuery = isStrict ? cleanQuery : retrievalQuery;

      if (mentionedDocs.length > 0) {
        const strictLabel = isStrict ? "STRICT (@)" : "mentioned";
        console.log(
          `📄 User ${strictLabel} specific documents: ${mentionedDocs.join(
            ", "
          )}`
        );

        fileIdsFilter = await this.getFileIdsForDocuments(
          mentionedDocs,
          chromaCollectionName
        );

        if (fileIdsFilter.length > 0) {
          console.log(
            `✅ ${isStrict ? "STRICTLY" : ""} Filtering search to ${
              fileIdsFilter.length
            } document(s)`
          );
        } else {
          console.log(
            `⚠️ No matching documents found for: ${mentionedDocs.join(", ")}`
          );

          // In strict mode, fail immediately if document not found
          if (isStrict) {
            return {
              answer: `❌ Document not found: ${mentionedDocs.join(
                ", "
              )}. Please check the document name and try again. Use @documentname to strictly search in a specific document.`,
              sources: [],
              metadata: {
                chunksFound: 0,
                duration: Date.now() - startTime,
                topK: RAG_CONSTANTS.RETRIEVE_K,
                documentFilter: mentionedDocs,
                strictMode: true,
                error: "Document not found",
              },
            };
          }
        }
      }

      const queryEmbedding = await ollamaEmbeddingService.generateEmbedding(
        searchQuery
      );

      // Use filtered query ONLY if documents found and filter active
      const searchResults =
        fileIdsFilter && fileIdsFilter.length > 0
          ? await vectorDBService.queryChunksWithFilter(
              queryEmbedding,
              RAG_CONSTANTS.RETRIEVE_K,
              chromaCollectionName,
              fileIdsFilter
            )
          : await vectorDBService.queryChunks(
              queryEmbedding,
              RAG_CONSTANTS.RETRIEVE_K,
              chromaCollectionName
            );

      if (!searchResults.documents || searchResults.documents.length === 0) {
        const noResultsMessage =
          fileIdsFilter && fileIdsFilter.length > 0
            ? `❌ No relevant information found in ${
                isStrict ? "STRICT search of" : ""
              } document(s): ${mentionedDocs.join(", ")}. ${
                isStrict
                  ? "Try different keywords or remove @ for broader search."
                  : "Please check document names or try different topics."
              }`
            : "I couldn't find relevant information in your documents. Please upload more relevant files.";

        return {
          answer: noResultsMessage,
          sources: [],
          metadata: {
            chunksFound: 0,
            duration: Date.now() - startTime,
            topK: RAG_CONSTANTS.RETRIEVE_K,
            documentFilter:
              mentionedDocs.length > 0 ? mentionedDocs : undefined,
            strictMode: isStrict,
          },
        };
      }

      const candidateChunks = searchResults.documents.map((doc, idx) => ({
        content: doc,
        metadata: searchResults.metadatas[idx],
        distance: searchResults.distances[idx],
      }));

      // Debug: Log what documents were actually retrieved
      if (fileIdsFilter && fileIdsFilter.length > 0) {
        const retrievedFileIds = new Set(
          candidateChunks.map((c) => c.metadata.fileId)
        );
        const retrievedFileNames = new Set(
          candidateChunks.map((c) => c.metadata.fileName)
        );
        console.log(
          `🔍 Retrieved ${candidateChunks.length} chunks from fileIds:`,
          Array.from(retrievedFileIds)
        );
        console.log(
          `📄 File names in results:`,
          Array.from(retrievedFileNames)
        );
      }

      const rerankedChunks = rerankerService.rerank(candidateChunks, 3);

      // STRICT MODE: Filter out any chunks not from requested documents
      let finalChunks = rerankedChunks;
      if (isStrict && fileIdsFilter && fileIdsFilter.length > 0) {
        finalChunks = rerankedChunks.filter((chunk) =>
          fileIdsFilter.includes(chunk.metadata.fileId)
        );
        console.log(
          `🔒 STRICT MODE: Filtered ${rerankedChunks.length} → ${finalChunks.length} chunks (only from requested docs)`
        );
      }

      if (finalChunks.length === 0) {
        return {
          answer:
            "I couldn't find relevant information in your documents to answer that question. Try asking about specific topics covered in the uploaded materials.",
          sources: [], // Don't send irrelevant chunks to frontend
          metadata: {
            chunksFound: 0,
            duration: Date.now() - startTime,
            topK: RAG_CONSTANTS.RETRIEVE_K,
            relevanceCheck: "No chunks met minimum relevance threshold",
            strictMode: isStrict,
          },
        };
      }

      const context = this.buildContext(finalChunks);

      // Create sources with deduplication based on pdfName + pageNo + snippet
      const sourcesMap = new Map<
        string,
        { pdfName: string; pageNo: number; snippet: string }
      >();

      finalChunks.forEach((chunk) => {
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
          chunksFound: finalChunks.length,
          topK: RAG_CONSTANTS.RETRIEVE_K,
          duration: Date.now() - startTime,
          thinking: response.thinking,
          documentFilter: mentionedDocs.length > 0 ? mentionedDocs : undefined,
          strictMode: isStrict,
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

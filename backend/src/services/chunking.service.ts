import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { v4 as uuidv4 } from "uuid";
import { Chunk, ChunkMetadata } from "../types";
import env from "../config/env";
import { languageService } from "./language.service";

export class ChunkingService {
  private splitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: env.CHUNK_SIZE,
      chunkOverlap: env.CHUNK_OVERLAP,
      separators: ["\n\n", "\n", ". ", " ", ""],
    });
  }

  /**
   * Create ONE chunk per page (no splitting within pages)
   * Each page = 1 chunk with proper page number for citations
   * NOW WITH LANGUAGE DETECTION + FULL DOCUMENT STORAGE
   */
  async createChunks(
    text: string,
    fileName: string,
    fileId: string,
    pageNumber: number,
    userId?: string,
    fullDocumentContent?: string // Store complete PDF content for context
  ): Promise<Chunk[]> {
    try {
      // Detect language of the page text
      const languageDetection = languageService.detectLanguage(text);

      // console.log(
      //   `📝 Page ${pageNumber} detected as ${languageDetection.language} (${
      //     languageDetection.languageCode
      //   }) with ${(languageDetection.confidence * 100).toFixed(0)}% confidence`
      // );

      // Split text into chunks using the configured splitter
      const splitDocs = await this.splitter.createDocuments([text]);

      const chunks: Chunk[] = splitDocs.map((doc, index) => {
        const metadata: ChunkMetadata = {
          fileName, // PDF name for citations
          fileId,
          page: pageNumber, // Page number for citations
          chunkIndex: index,
          timestamp: new Date().toISOString(),
          userId,
          language: languageDetection.languageCode, // Store detected language
          languageConfidence: languageDetection.confidence, // Store confidence
        };

        return {
          id: uuidv4(),
          content: doc.pageContent.trim(),
          metadata,
        };
      });

      // Filter out empty chunks
      const validChunks = chunks.filter(this.validateChunk);

      // console.log(
      //   `✅ Created ${validChunks.length} chunks for ${fileName} (Page ${pageNumber}, Lang: ${
      //     languageDetection.language
      //   })`
      // );

      return validChunks;
    } catch (error) {
      console.error("Chunking error:", error);
      throw new Error("Failed to create chunks from text");
    }
  }

  /**
   * Validate chunk content
   */
  validateChunk(chunk: Chunk): boolean {
    return (
      chunk.content.trim().length > 0 &&
      chunk.content.length <= env.CHUNK_SIZE * 1.5 // Allow some buffer
    );
  }
}

export const chunkingService = new ChunkingService();

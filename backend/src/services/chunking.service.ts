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

      console.log(
        `📝 Page ${pageNumber} detected as ${languageDetection.language} (${
          languageDetection.languageCode
        }) with ${(languageDetection.confidence * 100).toFixed(0)}% confidence`
      );

      // Create a SINGLE chunk for the entire page (no splitting)
      const metadata: ChunkMetadata = {
        fileName, // PDF name for citations
        fileId,
        page: pageNumber, // Page number for citations
        chunkIndex: 0, // Always 0 since one chunk per page
        timestamp: new Date().toISOString(),
        userId,
        language: languageDetection.languageCode, // NEW: Store detected language
        languageConfidence: languageDetection.confidence, // NEW: Store confidence
        // fullDocumentContent removed - now stored separately in MongoDB to avoid payload issues
      };

      const chunk: Chunk = {
        id: uuidv4(),
        content: text.trim(), // Use entire page text as one chunk
        metadata,
      };

      console.log(
        `✅ Created 1 chunk for ${fileName} (Page ${pageNumber}, Lang: ${
          languageDetection.language
        }, ChunkID: ${chunk.id.substring(0, 8)}...)`
      );
      return [chunk]; // Return array with single chunk
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

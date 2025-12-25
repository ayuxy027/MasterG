import { v4 as uuidv4 } from "uuid";
import { Chunk, ChunkMetadata } from "../types";
import { RAG_CONSTANTS } from "../config/ragConstants";
import { languageService } from "./language.service";
import { countTokens, splitRecursively } from "../utils/tokenCounter";

export class ChunkingService {
  async createChunks(
    text: string,
    fileName: string,
    fileId: string,
    pageNumber: number,
    userId?: string
  ): Promise<Chunk[]> {
    const languageDetection = languageService.detectLanguage(text);

    const textChunks = splitRecursively(text, RAG_CONSTANTS.CHUNK_TOK);

    const chunks: Chunk[] = [];

    for (let i = 0; i < textChunks.length; i++) {
      const content = textChunks[i].trim();

      if (content.length === 0) continue;

      const tokenCount = countTokens(content);

      let overlapContent = '';
      if (i > 0) {
        const prevChunk = textChunks[i - 1];
        const words = prevChunk.trim().split(/\s+/);
        const overlapWords = words.slice(-Math.floor(RAG_CONSTANTS.OVERLAP_TOK / 2));
        overlapContent = overlapWords.join(' ');
      }

      const finalContent = overlapContent ? `${overlapContent} ${content}` : content;

      const metadata: ChunkMetadata = {
        fileName,
        fileId,
        page: pageNumber,
        chunkIndex: i,
        timestamp: new Date().toISOString(),
        userId,
        language: languageDetection.languageCode,
        languageConfidence: languageDetection.confidence,
      };

      chunks.push({
        id: uuidv4(),
        content: finalContent,
        metadata,
      });
    }

    return chunks.filter(chunk => countTokens(chunk.content) <= RAG_CONSTANTS.CHUNK_TOK * 1.2);
  }
}

export const chunkingService = new ChunkingService();

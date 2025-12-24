import { RAG_CONSTANTS } from "../config/ragConstants";

interface RankedChunk {
  content: string;
  metadata: any;
  score: number;
  distance: number;
}

export class RerankerService {
  rerank(
    chunks: Array<{ content: string; metadata: any; distance: number }>,
    topK: number = 3
  ): RankedChunk[] {
    if (chunks.length === 0) return [];

    const scored = chunks.map((chunk) => ({
      ...chunk,
      score: 1 - chunk.distance,
    }));

    const sorted = scored.sort((a, b) => b.score - a.score);

    const result = sorted.slice(0, topK);

    // Increased threshold to 0.3 (from 0.1) to filter out irrelevant chunks
    // Only return chunks with good relevance scores
    const minAcceptableScore = 0.3;
    const filtered = result.filter(
      (chunk) => chunk.score >= minAcceptableScore
    );

    // Don't force low-quality chunks - return empty if none are relevant
    return filtered;
  }

  computeCosineSimilarity(queryEmbed: number[], chunkEmbed: number[]): number {
    let dotProduct = 0;
    let queryMag = 0;
    let chunkMag = 0;

    for (let i = 0; i < queryEmbed.length; i++) {
      dotProduct += queryEmbed[i] * chunkEmbed[i];
      queryMag += queryEmbed[i] * queryEmbed[i];
      chunkMag += chunkEmbed[i] * chunkEmbed[i];
    }

    const magnitude = Math.sqrt(queryMag) * Math.sqrt(chunkMag);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }
}

export const rerankerService = new RerankerService();

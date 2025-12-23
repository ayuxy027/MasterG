/**
 * RAG (Retrieval-Augmented Generation) Types
 * Core type definitions for the RAG system
 */

export interface DocumentChunk {
  id: string;
  documentId: string;
  text: string;
  pageNumber: number;
  chunkIndex: number;
  startPosition: number;
  endPosition: number;
  wordCount: number;
  metadata: ChunkMetadata;
  createdAt: number;
}

export interface ChunkMetadata {
  hasHeading: boolean;
  headingText?: string;
  hasBulletPoints: boolean;
  hasNumberedList: boolean;
  hasCode: boolean;
  language?: string;
  section?: string;
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
  matchedTerms: string[];
  relevanceReason: string;
}

export interface DocumentIndex {
  documentId: string;
  documentName: string;
  totalChunks: number;
  totalWords: number;
  totalPages: number;
  vocabulary: Map<string, number>; // term -> document frequency
  idf: Map<string, number>; // term -> inverse document frequency
  avgChunkLength: number;
  createdAt: number;
  lastAccessedAt: number;
}

export interface RAGConfig {
  // Chunking settings
  chunkSize: number; // target tokens per chunk
  chunkOverlap: number; // overlap between chunks
  minChunkSize: number; // minimum chunk size
  
  // Search settings
  topK: number; // number of chunks to retrieve
  minScore: number; // minimum relevance score
  reranking: boolean; // whether to rerank results
  
  // BM25 parameters
  bm25K1: number; // term frequency saturation
  bm25B: number; // length normalization
  
  // Context settings
  maxContextTokens: number; // max tokens for context
  includePageNumbers: boolean;
}

export const DEFAULT_RAG_CONFIG: RAGConfig = {
  chunkSize: 300,    // Smaller chunks for better relevance
  chunkOverlap: 30,
  minChunkSize: 50,
  topK: 3,            // Only top 3 most relevant chunks
  minScore: 0.5,      // Higher threshold for relevance
  reranking: true,
  bm25K1: 1.5,
  bm25B: 0.75,
  maxContextTokens: 800, // ~3200 chars, leaves room for prompt + response
  includePageNumbers: true,
};

export interface RAGProgress {
  stage: 'extracting' | 'chunking' | 'indexing' | 'saving' | 'complete';
  progress: number; // 0-100
  message: string;
  details?: string;
}

export type RAGProgressCallback = (progress: RAGProgress) => void;

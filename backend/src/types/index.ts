import { LanguageCode } from "../config/constants";

export interface ChunkMetadata {
  fileName: string;
  fileId: string;
  page?: number;
  chunkIndex: number;
  timestamp: string;
  userId?: string; // Added for user-specific chunks
  language?: string; // NEW: Detected language of the chunk
  languageConfidence?: number; // NEW: Confidence score (0-1)
  fullDocumentContent?: string; // Store complete original content for AI context
}

export interface Chunk {
  id: string;
  content: string;
  metadata: ChunkMetadata;
}

export interface EmbeddingResult {
  embedding: number[];
  text: string;
}

// Chat-related types
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: SourceCitation[]; // Sources for assistant messages
  translatedContent?: string; // Stored translation
  translatedLanguage?: string; // Language code of translation
}

export interface ChatHistory {
  userId: string;
  sessionId: string;
  messages: ChatMessage[];
  language?: string;
  grade?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SourceCitation {
  pdfName: string;
  pageNo: number;
  snippet?: string;
}

export interface QueryRequest {
  query: string;
  topK?: number;
  userId?: string; // For chat context retrieval
  sessionId?: string; // For maintaining conversation threads
  mentionedFileIds?: string[]; // For @ mentions - filter RAG to specific files
  // language is removed - now auto-detected from query text only
}

// Streaming response types
export interface StreamChunk {
  type: 'layer' | 'text' | 'source' | 'done' | 'error';
  content?: string;
  layer?: string;
  source?: SourceCitation;
  error?: string;
}

export interface QueryResponse {
  success: boolean;
  answer: string;
  sources: SourceCitation[]; // Changed from ChunkMetadata to SourceCitation
  reasoning?: string;
  chatHistory?: ChatMessage[]; // Optional: return updated chat history
  metadata?: {
    layer?: string;
    reasoning?: string;
    responseTimeMs?: number;
    messageCount?: number;
  };
}

export interface UploadResponse {
  success: boolean;
  fileId: string;
  fileName: string;
  chunksCreated: number;
  message: string;
}

export interface ApiError {
  success: false;
  error: string;
  details?: string;
}


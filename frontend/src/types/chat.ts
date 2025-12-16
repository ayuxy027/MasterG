// Chat API Types - matching backend response structures

export interface SourceCitation {
  pdfName: string;
  pageNo: number;
  snippet: string;
  score?: string; // Relevance score (0-1)
}

export interface QueryMetadata {
  layer: "LAYER1-GROQ-FAST" | "LAYER3-GEMINI" | "LAYER3-GEMINI-STREAM";
  reasoning: string;
  responseTimeMs: number;
  messageCount: number;
}

export interface QueryResponse {
  success: boolean;
  answer: string;
  sources: SourceCitation[];
  metadata: QueryMetadata;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: SourceCitation[];
  metadata?: QueryMetadata;
}

export interface ChatSession {
  userId: string;
  sessionId: string;
  chromaCollectionName: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionListItem {
  sessionId: string;
  chatName?: string; // AI-generated chat name
  messageCount: number;
  lastMessage: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  fileId: string;
  fileName: string;
  userId: string;
  sessionId: string;
  chromaCollectionName: string;
  pagesProcessed: number;
  language: string;
}

export interface UploadedDocument {
  fileId: string;
  fileName: string;
  userId: string;
  sessionId: string;
  language: string;
  pages: Array<{
    pageNumber: number;
    pageContent: string;
  }>;
  createdAt: Date;
}

export interface BrowseResponse {
  success: boolean;
  documents: UploadedDocument[];
}

export interface FileListItem {
  fileId: string;
  fileName: string;
  language: string;
  pageCount: number;
  uploadedAt: Date;
}

// UI-specific types
export interface MessageUI {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: SourceCitation[];
  metadata?: QueryMetadata;
  isLoading?: boolean;
  isStreaming?: boolean; // NEW: indicates message is currently streaming
  streamingLayer?: string; // NEW: current layer being used for streaming
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number; // 0-100
  status: "uploading" | "processing" | "completed" | "error";
  error?: string;
}

// Streaming response types (for SSE)
export interface StreamChunk {
  type: 'layer' | 'text' | 'source' | 'done' | 'error';
  content?: string;
  layer?: string;
  source?: SourceCitation;
  error?: string;
}

// @ Mention types
export interface MentionedFile {
  fileId: string;
  fileName: string;
}


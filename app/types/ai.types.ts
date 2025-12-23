/**
 * EduLite Mobile AI - Type Definitions
 * Core types for AI models and services
 */

// ============================================
// Model Types
// ============================================

export type ModelType = "text" | "vision" | "hindi"

export interface ModelConfig {
  name: string
  path: string
  size: number // in bytes
  type: ModelType
  quantization: "q4_k" | "q4_k_m" | "q4_k_s" | "q5_k_m"
  contextLength: number
  gpuLayers: number
}

export interface ModelStatus {
  isLoaded: boolean
  isLoading: boolean
  error: string | null
  loadProgress: number
  memoryUsage: number
}

// ============================================
// Content Generation Types
// ============================================

export type SupportedLanguage =
  | "english"
  | "hindi"
  | "bengali"
  | "tamil"
  | "telugu"
  | "kannada"
  | "malayalam"
  | "marathi"
  | "gujarati"
  | "punjabi"
  | "odia"

// Sarvam-1 language codes (10 Indian languages)
export type SupportedIndicLanguage =
  | "asm"
  | "ben"
  | "brx"
  | "doi"
  | "eng"
  | "guj"
  | "hin"
  | "kan"
  | "kas"
  | "kok"
  | "mai"
  | "mal"
  | "mni"
  | "mar"
  | "nep"
  | "ori"
  | "pan"
  | "san"
  | "sat"
  | "snd"
  | "tam"
  | "tel"
  | "urd"

export type GradeLevel =
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "11"
  | "12"

export type Subject =
  | "mathematics"
  | "science"
  | "social_studies"
  | "hindi"
  | "english"
  | "physics"
  | "chemistry"
  | "biology"
  | "history"
  | "geography"
  | "economics"
  | "other"

export type Curriculum = "ncert" | "cbse" | "icse" | "state_board"

export interface ContentGenerationParams {
  language: SupportedLanguage
  grade: GradeLevel
  subject: Subject
  topic: string
  curriculum: Curriculum
  culturalContext?: string
  maxLength?: number
}

export interface GeneratedContent {
  id: string
  title: string
  content: string
  language: SupportedLanguage
  grade: GradeLevel
  subject: Subject
  topic: string
  wordCount: number
  estimatedReadTime: number
  confidence: number
  createdAt: string
  pdfPath?: string
}

// ============================================
// PDF Q&A Types
// ============================================

export interface PDFDocument {
  id: string
  name: string
  path: string
  pageCount: number
  size: number
  processedAt: string
  index: SemanticIndex
}

export interface SemanticIndex {
  keywords: Record<string, PageReference[]>
  concepts: Record<string, PageReference[]>
  entities: Record<string, PageReference[]>
}

export interface PageReference {
  page: number
  context: string
  confidence: number
}

export interface PDFQuestionParams {
  question: string
  documentId: string
  language?: SupportedLanguage
  maxTokens?: number
}

export interface PDFAnswer {
  answer: string
  confidence: number
  sources: AnswerSource[]
  processingTime: number
}

export interface AnswerSource {
  page: number
  excerpt: string
  relevance: number
}

// ============================================
// Document Scanner Types
// ============================================

export type DocumentType =
  | "receipt"
  | "form"
  | "notes"
  | "report"
  | "certificate"
  | "textbook"
  | "other"

export interface ScanResult {
  id: string
  imagePath: string
  text: string
  type: DocumentType
  confidence: number
  keyInfo: Record<string, unknown>
  summary: string
  insights: string[]
  ocrConfidence: number
  processedAt: string
}

export interface DocumentAnalysisParams {
  imagePath: string
  language?: SupportedLanguage
  extractKeyInfo?: boolean
  generateSummary?: boolean
}

// ============================================
// Translation Types
// ============================================

export interface TranslationParams {
  text: string
  sourceLanguage: string // Can be full name like 'english' or code like 'eng'
  targetLanguage: string // Can be full name like 'hindi' or code like 'hin'
  context?: string // Optional context for better translation (e.g., 'educational')
}

export interface TranslationResult {
  originalText: string
  translatedText: string
  sourceLanguage: string
  targetLanguage: string
  confidence: number
  processingTime: number
  languagePair: string // e.g., "eng->hin"
  method: string // e.g., "Sarvam-1-1B"
}

// ============================================
// Inference Types
// ============================================

export interface InferenceConfig {
  maxTokens: number
  temperature: number
  topP: number
  topK: number
  repeatPenalty: number
  stopSequences: string[]
}

export interface InferenceResult {
  text: string
  tokens: number
  processingTime: number
  confidence: number
}

// ============================================
// Memory & Performance Types
// ============================================

export interface MemoryInfo {
  total: number
  used: number
  available: number
  usagePercentage: number
}

export interface PerformanceMetrics {
  inferenceTime: number
  loadTime: number
  memoryPeak: number
  tokensPerSecond: number
}

// ============================================
// AI State Types (Redux)
// ============================================

export interface AIState {
  // Model status
  textModelStatus: ModelStatus
  visionModelStatus: ModelStatus
  translationModelStatus: ModelStatus // Sarvam-1 replaces Navarasa (Hindi model)

  // Current operation
  isProcessing: boolean
  currentOperation: string | null
  operationProgress: number

  // Generated content
  generatedContents: GeneratedContent[]

  // PDF documents
  loadedDocuments: PDFDocument[]

  // Scan results
  scanResults: ScanResult[]

  // Error handling
  error: string | null

  // Settings
  settings: AISettings
}

export interface AISettings {
  preferredLanguage: SupportedLanguage
  autoSaveContent: boolean
  enableGPU: boolean
  memoryLimit: number // in MB
  cacheEnabled: boolean
  offlineMode: boolean
}

// ============================================
// Event Types
// ============================================

export interface AIEvent {
  type: "model_loaded" | "inference_complete" | "error" | "progress"
  payload: unknown
  timestamp: number
}

export type AIEventCallback = (event: AIEvent) => void

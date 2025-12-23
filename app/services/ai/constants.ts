/**
 * EduLite Mobile AI - Constants
 * Model configurations and system constants
 * 
 * Models: Gemma 3 1B (Text) + Sarvam-1 (Translation to 10 Indian Languages)
 */

import { InferenceConfig, ModelConfig } from "../../types/ai.types"

// ============================================
// Model Configurations
// ============================================

export const TEXT_MODEL_CONFIG: ModelConfig = {
  name: "gemma-3-1b-it-q4_0",
  path: "models/gemma-3-1b-it-q4_0.gguf",
  size: 1003541152, // ~957 MB (actual file size)
  type: "text",
  quantization: "q4_k_m",
  contextLength: 2048,
  gpuLayers: 35,
}

// Sarvam-1 - Translation Model for 10 Indian Languages
// Uses prompt-based translation with excellent quality
// Supports: Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Odia, Punjabi
// GGUF available from: bartowski/sarvam-1-GGUF (verified working)
export const TRANSLATION_MODEL_CONFIG: ModelConfig = {
  name: "sarvam-1-Q4_K_M",
  path: "models/sarvam-1-Q4_K_M.gguf",
  size: 1200000000, // ~1.2 GB
  type: "text",
  quantization: "q4_k_m",
  contextLength: 2048,
  gpuLayers: 30,
}

// NOTE: Sarvam-1 replaces IndicTrans2 because:
// - IndicTrans2 GGUF does NOT exist on HuggingFace
// - Sarvam-1 GGUF is verified working (bartowski/sarvam-1-GGUF)
// - Supports 10 major Indian languages via prompt-based translation

// Legacy export for backward compatibility (points to Translation config)
export const HINDI_MODEL_CONFIG = TRANSLATION_MODEL_CONFIG

// Vision models currently disabled - using ML Kit OCR instead
// export const VISION_MODEL_CONFIG: ModelConfig = {
//     name: 'MobileVLM-v2-1.7B',
//     path: 'models/ggml-model-q4_k.gguf',
//     size: 791502848,
//     type: 'vision',
//     quantization: 'q4_k',
//     contextLength: 2048,
//     gpuLayers: 0,
// };
// export const VISION_PROJECTOR_PATH = 'models/mmproj-model-f16.gguf';

// ============================================
// Inference Configurations
// ============================================

export const CONTENT_GENERATION_CONFIG: InferenceConfig = {
  maxTokens: 500, // Increased for complete responses without cutoffs
  temperature: 0.4, // Balanced for educational content
  topP: 0.85,
  topK: 45, // Slightly higher for better vocabulary diversity
  repeatPenalty: 1.25, // Balanced to avoid repetition while allowing natural explanations
  stopSequences: [
    "</s>",
    "<|end|>",
    "<|eot_id|>",
    "<|end_of_text|>",
    "<|im_end|>",
    "\n\n\n",
    "---",
    "\n\nQuestion:",  // Prevent question generation
    "\n\nUser:",    // Prevent role confusion
  ],
}

// Optimized config specifically for Stitch feature - ensures complete responses
export const OPTIMIZED_STITCH_CONFIG: InferenceConfig = {
  maxTokens: 600, // Higher for complete structured responses
  temperature: 0.35, // Lower for more focused educational content
  topP: 0.85,
  topK: 40,
  repeatPenalty: 1.2, // Reduced to allow natural explanations
  stopSequences: [
    "</s>",
    "<|end|>",
    "<|eot_id|>",
    "<|end_of_text|>",
    "\n\n\n",
    "---",
    "\n\nQuestion:",
    "\n\nUser:",
  ],
}

export const QA_INFERENCE_CONFIG: InferenceConfig = {
  maxTokens: 300,
  temperature: 0.5,
  topP: 0.8,
  topK: 30,
  repeatPenalty: 1.2,
  stopSequences: ["</s>", "<|end|>", "<|eot_id|>", "Question:", "User:"],
}

export const TRANSLATION_INFERENCE_CONFIG: InferenceConfig = {
  maxTokens: 400,
  temperature: 0.1, // Very low for accurate translation
  topP: 0.85,
  topK: 20,
  repeatPenalty: 1.1,
  stopSequences: ["</s>", "<|end|>", "<|eot_id|>", "\n\n\n"],
}

export const DOCUMENT_ANALYSIS_CONFIG: InferenceConfig = {
  maxTokens: 250,
  temperature: 0.4,
  topP: 0.85,
  topK: 25,
  repeatPenalty: 1.15,
  stopSequences: ["</s>", "<|end|>", "<|eot_id|>"],
}

export const KEYWORD_EXTRACTION_CONFIG: InferenceConfig = {
  maxTokens: 150,
  temperature: 0.3,
  topP: 0.7,
  topK: 20,
  repeatPenalty: 1.0,
  stopSequences: ["</s>", "\n\n"],
}

// ============================================
// Memory Thresholds
// ============================================

export const MEMORY_THRESHOLDS = {
  WARNING: 0.8, // 80% - show warning
  CRITICAL: 0.9, // 90% - force cleanup
  MINIMUM_FREE: 500 * 1024 * 1024, // 500MB minimum free for model loading
}

export const MODEL_MEMORY_REQUIREMENTS = {
  text: 800 * 1024 * 1024, // 800MB runtime
  vision: 500 * 1024 * 1024, // 500MB runtime
  combined: 1200 * 1024 * 1024, // 1.2GB for both
}

// ============================================
// Language Support
// ============================================

// IndicTrans2 supported languages (10 Indian languages)
export const INDIC_LANGUAGES = {
  asm: {
    code: "asm",
    iso: "as",
    script: "Assamese",
    name: "Assamese",
    native: "অসমীয়া",
  },
  ben: {
    code: "ben",
    iso: "bn",
    script: "Bengali",
    name: "Bengali",
    native: "বাংলা",
  },
  brx: {
    code: "brx",
    iso: "brx",
    script: "Devanagari",
    name: "Bodo",
    native: "बड़ो",
  },
  doi: {
    code: "doi",
    iso: "doi",
    script: "Devanagari",
    name: "Dogri",
    native: "डोगरी",
  },
  eng: {
    code: "eng",
    iso: "en",
    script: "Latin",
    name: "English",
    native: "English",
  },
  guj: {
    code: "guj",
    iso: "gu",
    script: "Gujarati",
    name: "Gujarati",
    native: "ગુજરાતી",
  },
  hin: {
    code: "hin",
    iso: "hi",
    script: "Devanagari",
    name: "Hindi",
    native: "हिंदी",
  },
  kan: {
    code: "kan",
    iso: "kn",
    script: "Kannada",
    name: "Kannada",
    native: "ಕನ್ನಡ",
  },
  kas: {
    code: "kas",
    iso: "ks",
    script: "Devanagari",
    name: "Kashmiri",
    native: "कॉशुर",
  },
  kok: {
    code: "kok",
    iso: "kok",
    script: "Devanagari",
    name: "Konkani",
    native: "कोंकणी",
  },
  mai: {
    code: "mai",
    iso: "mai",
    script: "Devanagari",
    name: "Maithili",
    native: "मैथिली",
  },
  mal: {
    code: "mal",
    iso: "ml",
    script: "Malayalam",
    name: "Malayalam",
    native: "മലയാളം",
  },
  mni: {
    code: "mni",
    iso: "mni",
    script: "Bengali",
    name: "Manipuri",
    native: "মৈতৈলোন্",
  },
  mar: {
    code: "mar",
    iso: "mr",
    script: "Devanagari",
    name: "Marathi",
    native: "मराठी",
  },
  nep: {
    code: "nep",
    iso: "ne",
    script: "Devanagari",
    name: "Nepali",
    native: "नेपाली",
  },
  ori: {
    code: "ori",
    iso: "or",
    script: "Odia",
    name: "Odia",
    native: "ଓଡ଼ିଆ",
  },
  pan: {
    code: "pan",
    iso: "pa",
    script: "Gurmukhi",
    name: "Punjabi",
    native: "ਪੰਜਾਬੀ",
  },
  san: {
    code: "san",
    iso: "sa",
    script: "Devanagari",
    name: "Sanskrit",
    native: "संस्कृतम्",
  },
  sat: {
    code: "sat",
    iso: "sat",
    script: "Ol Chiki",
    name: "Santali",
    native: "ᱥᱟᱱᱛᱟᱲᱤ",
  },
  snd: {
    code: "snd",
    iso: "sd",
    script: "Arabic",
    name: "Sindhi",
    native: "سنڌي",
  },
  tam: {
    code: "tam",
    iso: "ta",
    script: "Tamil",
    name: "Tamil",
    native: "தமிழ்",
  },
  tel: {
    code: "tel",
    iso: "te",
    script: "Telugu",
    name: "Telugu",
    native: "తెలుగు",
  },
  urd: {
    code: "urd",
    iso: "ur",
    script: "Arabic",
    name: "Urdu",
    native: "اردو",
  },
}

// Legacy supported languages (kept for backward compatibility)
export const SUPPORTED_LANGUAGES = {
  hindi: { code: "hi", script: "Devanagari", name: "हिंदी" },
  english: { code: "en", script: "Latin", name: "English" },
  bengali: { code: "bn", script: "Bengali", name: "বাংলা" },
  tamil: { code: "ta", script: "Tamil", name: "தமிழ்" },
  telugu: { code: "te", script: "Telugu", name: "తెలుగు" },
  kannada: { code: "kn", script: "Kannada", name: "ಕನ್ನಡ" },
  malayalam: { code: "ml", script: "Malayalam", name: "മലയാളം" },
  marathi: { code: "mr", script: "Devanagari", name: "मराठी" },
  gujarati: { code: "gu", script: "Gujarati", name: "ગુજરાતી" },
  punjabi: { code: "pa", script: "Gurmukhi", name: "ਪੰਜਾਬੀ" },
  odia: { code: "or", script: "Odia", name: "ଓଡ଼ିଆ" },
}

// ============================================
// Document Types
// ============================================

export const DOCUMENT_TYPE_KEYWORDS = {
  receipt: [
    "receipt",
    "invoice",
    "total",
    "paid",
    "amount",
    "date",
    "tax",
    "gst",
    "bill",
  ],
  form: [
    "name",
    "address",
    "phone",
    "email",
    "signature",
    "date",
    "application",
    "form",
  ],
  notes: [
    "chapter",
    "lesson",
    "topic",
    "summary",
    "key points",
    "notes",
    "important",
  ],
  report: [
    "summary",
    "conclusion",
    "findings",
    "analysis",
    "data",
    "report",
    "results",
  ],
  certificate: [
    "certified",
    "awarded",
    "completed",
    "achievement",
    "certificate",
    "hereby",
  ],
  textbook: [
    "chapter",
    "exercise",
    "example",
    "definition",
    "theorem",
    "question",
  ],
}

// ============================================
// Curriculum Standards
// ============================================

export const CURRICULUM_INFO = {
  ncert: {
    name: "NCERT",
    fullName: "National Council of Educational Research and Training",
    grades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
  },
  cbse: {
    name: "CBSE",
    fullName: "Central Board of Secondary Education",
    grades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
  },
  icse: {
    name: "ICSE",
    fullName: "Indian Certificate of Secondary Education",
    grades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  },
  state_board: {
    name: "State Board",
    fullName: "State Board of Education",
    grades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
  },
}

// ============================================
// Performance Benchmarks
// ============================================

export const PERFORMANCE_TARGETS = {
  contentGeneration: {
    maxTime: 15001, // 15 seconds
    minWordCount: 200,
    maxWordCount: 500,
  },
  pdfProcessing: {
    maxTimePerPage: 2500, // 2.5 seconds per page
    maxTotalTime: 25001, // 25 seconds
  },
  qaResponse: {
    maxTime: 6000, // 6 seconds
    minConfidence: 0.7,
  },
  documentScanning: {
    maxTime: 8000, // 8 seconds
    minOcrConfidence: 0.85,
  },
}

// ============================================
// Cache Settings
// ============================================

export const CACHE_SETTINGS = {
  maxSize: 100 * 1024 * 1024, // 100MB
  ttl: 24 * 60 * 60 * 1000, // 24 hours
  maxEntries: 100,
  cleanupInterval: 60 * 60 * 1000, // 1 hour
}

// ============================================
// Error Messages
// ============================================

export const ERROR_MESSAGES = {
  MODEL_NOT_FOUND: "AI model file not found. Please download the models first.",
  MODEL_LOAD_FAILED: "Failed to load AI model. Please check device memory.",
  INFERENCE_FAILED: "AI processing failed. Please try again.",
  INSUFFICIENT_MEMORY:
    "Insufficient memory for AI operations. Please close other apps.",
  DOCUMENT_PROCESSING_FAILED: "Failed to process document. Please try again.",
  OCR_FAILED:
    "Failed to extract text from image. Please ensure image is clear.",
  UNSUPPORTED_LANGUAGE: "Selected language is not supported.",
  CONTEXT_TOO_LONG: "Input text is too long. Please reduce the content.",
}

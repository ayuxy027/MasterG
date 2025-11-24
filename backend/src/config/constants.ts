export const SUPPORTED_LANGUAGES = {
  en: 'English',
  hi: 'Hindi',
  mr: 'Marathi',
  gu: 'Gujarati',
  bn: 'Bengali',
  ta: 'Tamil',
  te: 'Telugu',
  kn: 'Kannada',
  ml: 'Malayalam',
  pa: 'Punjabi',
  ur: 'Urdu',
  or: 'Odia',
  as: 'Assamese',
  ks: 'Kashmiri',
  kok: 'Konkani',
  mai: 'Maithili',
  mni: 'Manipuri',
  ne: 'Nepali',
  sa: 'Sanskrit',
  sd: 'Sindhi',
  sat: 'Santali',
  brx: 'Bodo',
  doi: 'Dogri',
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

export const SUPPORTED_FILE_TYPES = {
  PDF: 'application/pdf',
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  JPG: 'image/jpg',
} as const;

export const API_ENDPOINTS = {
  GEMMA_EMBEDDING: 'https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent',
  GROQ_CHAT: 'https://api.groq.com/openai/v1/chat/completions',
} as const;

export const ERROR_MESSAGES = {
  FILE_UPLOAD_FAILED: 'Failed to upload file',
  INVALID_FILE_TYPE: 'Invalid file type. Only PDF and images are supported',
  FILE_TOO_LARGE: 'File size exceeds maximum limit',
  EXTRACTION_FAILED: 'Failed to extract text from file',
  EMBEDDING_FAILED: 'Failed to generate embeddings',
  VECTOR_STORE_FAILED: 'Failed to store vectors',
  QUERY_FAILED: 'Failed to process query',
  INVALID_LANGUAGE: 'Invalid language code',
} as const;

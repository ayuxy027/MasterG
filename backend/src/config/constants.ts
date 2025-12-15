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
  // Documents
  PDF: 'application/pdf',
  TXT: 'text/plain',
  DOC: 'application/msword',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

  // Presentations
  PPT: 'application/vnd.ms-powerpoint',
  PPTX: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // Images
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  JPG: 'image/jpg',
  GIF: 'image/gif',
  WEBP: 'image/webp',
} as const;

export type SupportedMimeType = typeof SUPPORTED_FILE_TYPES[keyof typeof SUPPORTED_FILE_TYPES];

// File type categories for UI
export const FILE_CATEGORIES = {
  document: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  presentation: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  image: ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'],
} as const;

// Get file category from MIME type
export const getFileCategory = (mimeType: string): 'document' | 'presentation' | 'image' | 'unknown' => {
  if (FILE_CATEGORIES.document.includes(mimeType as any)) return 'document';
  if (FILE_CATEGORIES.presentation.includes(mimeType as any)) return 'presentation';
  if (FILE_CATEGORIES.image.includes(mimeType as any)) return 'image';
  return 'unknown';
};

// Get viewer type from MIME type
export const getViewerType = (mimeType: string): 'pdf' | 'text' | 'docx' | 'ppt' | 'image' | 'unknown' => {
  switch (mimeType) {
    case SUPPORTED_FILE_TYPES.PDF: return 'pdf';
    case SUPPORTED_FILE_TYPES.TXT: return 'text';
    case SUPPORTED_FILE_TYPES.DOC:
    case SUPPORTED_FILE_TYPES.DOCX: return 'docx';
    case SUPPORTED_FILE_TYPES.PPT:
    case SUPPORTED_FILE_TYPES.PPTX: return 'ppt';
    case SUPPORTED_FILE_TYPES.JPEG:
    case SUPPORTED_FILE_TYPES.PNG:
    case SUPPORTED_FILE_TYPES.JPG:
    case SUPPORTED_FILE_TYPES.GIF:
    case SUPPORTED_FILE_TYPES.WEBP: return 'image';
    default: return 'unknown';
  }
};

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

export const RAG_CONSTANTS = Object.freeze({
  // Chunking
  CHUNK_TOK: 400,
  OVERLAP_TOK: 60,

  // Context windows
  EMBED_CTX: 2048,
  LLM_CTX: 32768,

  // Retrieval - optimized for 32k window
  RETRIEVE_K: 6,
  RERANK_THRESHOLD: 0.22,

  // Output constraints - maximize usage of 32k window
  MAX_OUT_MIN: 500, // Minimum output tokens
  MAX_OUT_MAX: 24000, // Maximum output ~75% of context (allowing space for prompt)

  // History - keep minimal for context efficiency
  HISTORY_TURNS: 3, // Only last 3 turns to save tokens

  // Temperature
  TEMP_RAG: 0.3, // Slightly higher for better educational explanations
  TEMP_ROUTER: 0.1,

  // Grade levels
  GRADE_MIN: 1,
  GRADE_MAX: 12,

  // Safety
  SAFETY_MARGIN: 500, // Increased safety margin for longer outputs

  ROUTER_THRESHOLDS: {
    MIN_TOKENS_FOR_RAG: 8,
    OFF_TOPIC_COSINE: 0.15,
  },

  GREETINGS: [
    "hi",
    "hello",
    "hey",
    "namaste",
    "good morning",
    "good afternoon",
    "good evening",
  ],
  POLITE: ["thanks", "thank you", "bye", "goodbye", "see you"],

  LATENCY_TARGETS: {
    ROUTER: 10,
    EMBED: 15,
    HNSW: 12,
    RERANK: 90,
    PROMPT_BUILD: 3,
    LLM_FIRST_TOK: 300,
    LLM_80_TOK: 1600,
    TRANSLATE: 200,
  },
} as const);

export type RAGConstants = typeof RAG_CONSTANTS;

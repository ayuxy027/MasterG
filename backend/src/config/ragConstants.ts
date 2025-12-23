export const RAG_CONSTANTS = Object.freeze({
    CHUNK_TOK: 400,
    OVERLAP_TOK: 60,
    EMBED_CTX: 2048,
    LLM_CTX: 32768,
    RETRIEVE_K: 6,
    RERANK_THRESHOLD: 0.22,
    MAX_OUT_MIN: 100,
    MAX_OUT_MAX: 8000,
    HISTORY_TURNS: 8,
    TEMP_RAG: 0.25,
    TEMP_ROUTER: 0.1,
    GRADE_MIN: 1,
    GRADE_MAX: 12,
    SAFETY_MARGIN: 300,

    ROUTER_THRESHOLDS: {
        MIN_TOKENS_FOR_RAG: 8,
        OFF_TOPIC_COSINE: 0.15,
    },

    GREETINGS: ['hi', 'hello', 'hey', 'namaste', 'good morning', 'good afternoon', 'good evening'],
    POLITE: ['thanks', 'thank you', 'bye', 'goodbye', 'see you'],

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

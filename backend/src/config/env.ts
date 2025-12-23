import dotenv from "dotenv";
import path from "path";

// Load environment variables (minimal - most values are hardcoded)
dotenv.config();

interface EnvConfig {
  // Server
  PORT: number;
  NODE_ENV: string;

  // ChromaDB
  CHROMA_URL: string;
  CHROMA_COLLECTION_NAME: string;

  // MongoDB
  MONGODB_URI: string;

  // File Storage
  UPLOAD_DIR: string;
  MAX_FILE_SIZE: number;

  // Chunking
  CHUNK_SIZE: number;
  CHUNK_OVERLAP: number;

  // Query Optimization
  ENABLE_QUERY_OPTIMIZATION: boolean;

  // Ollama Configuration (local AI)
  OLLAMA_URL: string;
  OLLAMA_CHAT_MODEL: string;
  OLLAMA_EMBED_MODEL: string;

  // Legacy external APIs (kept for type compatibility; not used in fully-local mode)
  OLLAMA_MODEL: string;
  GEMMA_API_KEY: string;

  // NLLB-200 Configuration (translation service)
  NLLB_ENABLED: boolean;

  // Python Executable (for proxy services)
  PYTHON_EXECUTABLE: string;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HARDCODED CONFIGURATION - Fully local Ollama-based system
 * No external API keys required (Groq, Gemini, Google Cloud removed)
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const env: EnvConfig = {
  // Server - Port 5001
  PORT: 5001,
  NODE_ENV: "development",

  // ChromaDB - Local vector database
  CHROMA_URL: "http://localhost:8000",
  CHROMA_COLLECTION_NAME: "edu_notes",

  // MongoDB - Local database
  MONGODB_URI: "mongodb://localhost:27017/masterg",

  // File Storage
  UPLOAD_DIR: "./uploads",
  MAX_FILE_SIZE: 31457280, // 30MB

  // Chunking Configuration
  CHUNK_SIZE: 1000,
  CHUNK_OVERLAP: 200,

  // Query Optimization
  ENABLE_QUERY_OPTIMIZATION: true,

  // Ollama Configuration (local AI - DeepSeek R1)
  OLLAMA_URL: "http://localhost:11434",
  OLLAMA_CHAT_MODEL: "deepseek-r1:1.5b",
  OLLAMA_EMBED_MODEL: "embeddinggemma:latest",

  // Legacy external APIs (not actively used in local-only mode)
  OLLAMA_MODEL: "deepseek-r1:1.5b",
  GEMMA_API_KEY: process.env.GEMMA_API_KEY || "",

  // NLLB-200 Configuration (translation)
  NLLB_ENABLED: true,

  // Python Executable
  PYTHON_EXECUTABLE: "python3",
};

export default env;

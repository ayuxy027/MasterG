import dotenv from "dotenv"
import path from "path"

// Load environment variables
dotenv.config()

interface EnvConfig {
  // Server
  PORT: number
  NODE_ENV: string

  // API Keys
  GEMINI_API_KEY: string
  GEMMA_API_KEY: string
  GROQ_API_KEY: string

  // Google Cloud
  GOOGLE_PROJECT_ID: string
  GOOGLE_LOCATION_ID: string

  // Groq Configuration
  GROQ_MODEL: string

  // ChromaDB
  CHROMA_URL: string
  CHROMA_COLLECTION_NAME: string

  // MongoDB
  MONGODB_URI?: string

  // File Storage
  UPLOAD_DIR: string
  MAX_FILE_SIZE: number

  // Chunking
  CHUNK_SIZE: number
  CHUNK_OVERLAP: number

  // Query Optimization
  ENABLE_QUERY_OPTIMIZATION: boolean
}

const getEnvVariable = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export const env: EnvConfig = {
  // Server
  PORT: parseInt(getEnvVariable("PORT", "5000"), 10),
  NODE_ENV: getEnvVariable("NODE_ENV", "development"),

  // API Keys
  GEMINI_API_KEY: getEnvVariable("GEMINI_API_KEY"),
  GEMMA_API_KEY: getEnvVariable("GEMMA_API_KEY"),
  GROQ_API_KEY: getEnvVariable("GROQ_API_KEY"),

  // Google Cloud
  GOOGLE_PROJECT_ID: getEnvVariable("GOOGLE_PROJECT_ID", "temp-472006"),
  GOOGLE_LOCATION_ID: getEnvVariable("GOOGLE_LOCATION_ID", "us-central1"),

  // Groq Configuration
  GROQ_MODEL: getEnvVariable("GROQ_MODEL", "llama-3.3-70b-versatile"),

  // ChromaDB
  CHROMA_URL: getEnvVariable("CHROMA_URL", "http://localhost:8000"),
  CHROMA_COLLECTION_NAME: getEnvVariable("CHROMA_COLLECTION_NAME", "edu_notes"),

  // MongoDB (optional - chat history feature)
  MONGODB_URI: process.env.MONGODB_URI,

  // File Storage
  UPLOAD_DIR: getEnvVariable("UPLOAD_DIR", "./uploads"),
  MAX_FILE_SIZE: parseInt(getEnvVariable("MAX_FILE_SIZE", "10485760"), 10), // 10MB

  // Chunking
  CHUNK_SIZE: parseInt(getEnvVariable("CHUNK_SIZE", "1000"), 10),
  CHUNK_OVERLAP: parseInt(getEnvVariable("CHUNK_OVERLAP", "200"), 10),

  // Query Optimization
  ENABLE_QUERY_OPTIMIZATION:
    getEnvVariable("ENABLE_QUERY_OPTIMIZATION", "true") === "true",
}

export default env

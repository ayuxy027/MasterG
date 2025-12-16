import axios from "axios";
import { EmbeddingResult } from "../types";
import logger from "./logger.service";

/**
 * Ollama Embedding Service
 * Uses local Ollama with embeddinggemma model for vector embeddings
 * Completely offline - no external API calls
 */
export class OllamaEmbeddingService {
  private baseUrl: string;
  private model: string;
  private readonly BATCH_SIZE = 10; // Smaller batches for local processing
  private readonly DELAY_BETWEEN_BATCHES = 500; // 500ms delay
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  constructor() {
    this.baseUrl = process.env.OLLAMA_URL || "http://localhost:11434";
    this.model = process.env.OLLAMA_EMBED_MODEL || "embeddinggemma:latest";
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if Ollama is running and the embedding model is available
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000,
      });

      const models = response.data.models || [];
      const hasEmbeddingModel = models.some(
        (m: any) => m.name === this.model || m.name.startsWith("embeddinggemma")
      );

      if (!hasEmbeddingModel) {
        console.warn(`⚠️ Embedding model "${this.model}" not found in Ollama`);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Ollama embedding connection check failed:", error);
      return false;
    }
  }

  /**
   * Generate embedding for a single text using Ollama
   */
  async generateEmbedding(text: string, retryCount = 0): Promise<number[]> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/embeddings`,
        {
          model: this.model,
          prompt: text,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 60000, // 60 second timeout for local processing
        }
      );

      const embedding = response.data.embedding;

      if (!embedding || !Array.isArray(embedding)) {
        throw new Error("Invalid embedding response from Ollama");
      }

      return embedding;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message;

      // Check for connection errors
      if (error.code === "ECONNREFUSED") {
        throw new Error(
          "Ollama is not running. Please start Ollama with: ollama serve"
        );
      }

      // Retry on timeout or temporary errors
      if (
        retryCount < this.MAX_RETRIES &&
        (error.code === "ETIMEDOUT" ||
          error.code === "ECONNRESET" ||
          error.message.includes("timeout"))
      ) {
        console.warn(
          `⚠️ Retry ${retryCount + 1}/${this.MAX_RETRIES} for Ollama embedding...`
        );
        await this.sleep(this.RETRY_DELAY * (retryCount + 1));
        return this.generateEmbedding(text, retryCount + 1);
      }

      console.error("❌ Ollama embedding error:", errorMessage);
      throw new Error(`Ollama embedding failed: ${errorMessage}`);
    }
  }

  /**
   * Generate embeddings for multiple texts with batching
   */
  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    try {
      console.log(
        `🔄 Generating Ollama embeddings for ${texts.length} chunks in batches of ${this.BATCH_SIZE}...`
      );

      const results: EmbeddingResult[] = [];
      const totalBatches = Math.ceil(texts.length / this.BATCH_SIZE);

      for (let i = 0; i < texts.length; i += this.BATCH_SIZE) {
        const batch = texts.slice(i, i + this.BATCH_SIZE);
        const batchNumber = Math.floor(i / this.BATCH_SIZE) + 1;

        console.log(
          `  📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} chunks)...`
        );

        // Process batch sequentially for local Ollama (to avoid overwhelming it)
        for (const text of batch) {
          try {
            const embedding = await this.generateEmbedding(text);
            results.push({ embedding, text });
          } catch (error) {
            console.error(
              `Failed to generate embedding for chunk: ${text.substring(0, 50)}...`
            );
            throw error;
          }
        }

        console.log(`  ✅ Batch ${batchNumber}/${totalBatches} complete`);

        // Add delay between batches
        if (i + this.BATCH_SIZE < texts.length) {
          await this.sleep(this.DELAY_BETWEEN_BATCHES);
        }
      }

      console.log(`✅ All ${results.length} Ollama embeddings generated successfully`);
      return results;
    } catch (error) {
      console.error("Batch Ollama embedding error:", error);
      throw new Error("Failed to generate Ollama embeddings for texts");
    }
  }

  /**
   * Validate embedding dimensions
   */
  validateEmbedding(embedding: number[]): boolean {
    return (
      Array.isArray(embedding) &&
      embedding.length > 0 &&
      embedding.every((val) => typeof val === "number")
    );
  }

  /**
   * Get embedding dimensions (useful for ChromaDB compatibility check)
   */
  async getEmbeddingDimensions(): Promise<number> {
    const testEmbedding = await this.generateEmbedding("test");
    return testEmbedding.length;
  }
}

export const ollamaEmbeddingService = new OllamaEmbeddingService();

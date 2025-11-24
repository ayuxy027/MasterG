import axios from 'axios';
import { API_ENDPOINTS } from '../config/constants';
import env from '../config/env';
import { EmbeddingResult } from '../types';

export class EmbeddingService {
  private apiKey: string;
  private apiUrl: string;
  private readonly BATCH_SIZE = 30; // Process 30 embeddings at a time
  private readonly DELAY_BETWEEN_BATCHES = 1000; // 1 second delay between batches
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // 2 seconds

  constructor() {
    this.apiKey = env.GEMMA_API_KEY;
    this.apiUrl = API_ENDPOINTS.GEMMA_EMBEDDING;
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate embedding for a single text with retry logic
   */
  async generateEmbedding(text: string, retryCount = 0): Promise<number[]> {
    try {
      const response = await axios.post(
        `${this.apiUrl}?key=${this.apiKey}`,
        {
          model: 'models/embedding-001',
          content: {
            parts: [{ text }],
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      const embedding = response.data.embedding.values;
      
      if (!embedding || !Array.isArray(embedding)) {
        throw new Error('Invalid embedding response');
      }

      return embedding;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      
      // Retry on network errors or rate limiting
      if (retryCount < this.MAX_RETRIES && 
          (error.code === 'ECONNRESET' || 
           error.code === 'ETIMEDOUT' ||
           error.message.includes('socket') ||
           error.message.includes('network') ||
           error.response?.status === 429)) {
        
        console.warn(`Retry ${retryCount + 1}/${this.MAX_RETRIES} for embedding generation...`);
        await this.sleep(this.RETRY_DELAY * (retryCount + 1)); // Exponential backoff
        return this.generateEmbedding(text, retryCount + 1);
      }

      if (axios.isAxiosError(error)) {
        console.error('Gemma API error:', errorMessage);
        throw new Error(`Embedding generation failed: ${errorMessage}`);
      }
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts with smart batching and rate limiting
   */
  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    try {
      console.log(`🔄 Generating embeddings for ${texts.length} chunks in batches of ${this.BATCH_SIZE}...`);
      
      const results: EmbeddingResult[] = [];
      const totalBatches = Math.ceil(texts.length / this.BATCH_SIZE);

      // Process in batches to avoid overwhelming the API
      for (let i = 0; i < texts.length; i += this.BATCH_SIZE) {
        const batch = texts.slice(i, i + this.BATCH_SIZE);
        const batchNumber = Math.floor(i / this.BATCH_SIZE) + 1;
        
        console.log(`  📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} chunks)...`);

        // Process batch with concurrency control
        const batchPromises = batch.map(async (text) => {
          try {
            const embedding = await this.generateEmbedding(text);
            return { embedding, text };
          } catch (error) {
            console.error(`Failed to generate embedding for chunk: ${text.substring(0, 50)}...`);
            throw error;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        console.log(`  ✅ Batch ${batchNumber}/${totalBatches} complete`);

        // Add delay between batches to avoid rate limiting (except for last batch)
        if (i + this.BATCH_SIZE < texts.length) {
          await this.sleep(this.DELAY_BETWEEN_BATCHES);
        }
      }

      console.log(`✅ All ${results.length} embeddings generated successfully`);
      return results;

    } catch (error) {
      console.error('Batch embedding error:', error);
      throw new Error('Failed to generate embeddings for texts');
    }
  }

  /**
   * Validate embedding dimensions
   */
  validateEmbedding(embedding: number[]): boolean {
    return Array.isArray(embedding) && embedding.length > 0 && embedding.every(val => typeof val === 'number');
  }
}

export const embeddingService = new EmbeddingService();

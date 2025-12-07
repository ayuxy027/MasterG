import NodeCache from "node-cache";
import { createHash } from "crypto";
import logger from "./logger.service";

/**
 * Multi-Tier Caching Service
 * - L1: In-Memory Cache (frequent queries, embeddings)
 * - L2: Query Results Cache
 * - L3: Model Response Cache
 */
export class CacheService {
  private queryCache: NodeCache; // L1: Query results
  private embeddingCache: NodeCache; // L2: Embeddings
  private responseCache: NodeCache; // L3: Model responses

  constructor() {
    // Query cache: 1 hour TTL
    this.queryCache = new NodeCache({
      stdTTL: 3600,
      checkperiod: 600,
      useClones: false,
    });

    // Embedding cache: 24 hours TTL
    this.embeddingCache = new NodeCache({
      stdTTL: 86400,
      checkperiod: 3600,
      useClones: false,
    });

    // Response cache: 30 minutes TTL
    this.responseCache = new NodeCache({
      stdTTL: 1800,
      checkperiod: 300,
      useClones: false,
    });

    logger.info("🗄️  Cache service initialized");
  }

  /**
   * Generate cache key from query
   */
  private generateKey(prefix: string, data: any): string {
    const hash = createHash("sha256")
      .update(JSON.stringify(data))
      .digest("hex");
    return `${prefix}:${hash}`;
  }

  /**
   * Query Cache Methods
   */
  getQueryResult(query: string, sessionId: string): any | null {
    const key = this.generateKey("query", { query, sessionId });
    return this.queryCache.get(key) || null;
  }

  setQueryResult(query: string, sessionId: string, result: any): void {
    const key = this.generateKey("query", { query, sessionId });
    this.queryCache.set(key, result);
    logger.debug(`📦 Cached query result: ${key}`);
  }

  /**
   * Embedding Cache Methods
   */
  getEmbedding(text: string): number[] | null {
    const key = this.generateKey("embedding", text);
    return this.embeddingCache.get(key) || null;
  }

  setEmbedding(text: string, embedding: number[]): void {
    const key = this.generateKey("embedding", text);
    this.embeddingCache.set(key, embedding);
    logger.debug(`📦 Cached embedding: ${key.substring(0, 30)}...`);
  }

  /**
   * Response Cache Methods
   */
  getResponse(prompt: string, modelId: string): string | null {
    const key = this.generateKey("response", { prompt, modelId });
    return this.responseCache.get(key) || null;
  }

  setResponse(prompt: string, modelId: string, response: string): void {
    const key = this.generateKey("response", { prompt, modelId });
    this.responseCache.set(key, response);
    logger.debug(`📦 Cached response: ${key.substring(0, 30)}...`);
  }

  /**
   * Cache Statistics
   */
  getStats() {
    return {
      query: this.queryCache.getStats(),
      embedding: this.embeddingCache.getStats(),
      response: this.responseCache.getStats(),
    };
  }

  /**
   * Clear specific cache
   */
  clearCache(type: "query" | "embedding" | "response" | "all") {
    switch (type) {
      case "query":
        this.queryCache.flushAll();
        break;
      case "embedding":
        this.embeddingCache.flushAll();
        break;
      case "response":
        this.responseCache.flushAll();
        break;
      case "all":
        this.queryCache.flushAll();
        this.embeddingCache.flushAll();
        this.responseCache.flushAll();
        break;
    }
    logger.info(`🗑️  Cleared ${type} cache`);
  }
}

export const cacheService = new CacheService();

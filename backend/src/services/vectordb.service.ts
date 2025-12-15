import { ChromaClient, Collection } from "chromadb";
import { Chunk, ChunkMetadata } from "../types";
import env from "../config/env";

export class VectorDBService {
  private client: ChromaClient;
  private collections: Map<string, Collection> = new Map(); // Cache collections by name

  constructor() {
    this.client = new ChromaClient({ path: env.CHROMA_URL });
  }

  /**
   * Get ChromaDB collection (public for advanced queries)
   */
  async getCollection(collectionName?: string): Promise<Collection> {
    return this.initCollection(collectionName);
  }

  /**
   * Initialize or get collection by name (supports per-chat collections)
   */
  async initCollection(collectionName?: string): Promise<Collection> {
    try {
      const name = collectionName || env.CHROMA_COLLECTION_NAME;

      // Return cached collection if exists
      if (this.collections.has(name)) {
        return this.collections.get(name)!;
      }

      // Create or get collection
      const collection = await this.client.getOrCreateCollection({
        name,
        metadata: {
          description: collectionName
            ? `Chat-specific collection: ${collectionName}`
            : "Educational notes and documents",
        },
      });

      // Cache it
      this.collections.set(name, collection);
      console.log(`📚 Collection "${name}" initialized`);

      return collection;
    } catch (error) {
      console.error("Collection initialization error:", error);
      throw new Error("Failed to initialize vector database collection");
    }
  }

  /**
   * Store chunks with embeddings in specific collection
   * Chunks are grouped by PDF for better organization
   */
  async storeChunks(
    chunks: Chunk[],
    embeddings: number[][],
    collectionName?: string
  ): Promise<void> {
    try {
      const collection = await this.initCollection(collectionName);

      // Group chunks by fileId (PDF)
      const chunksByPdf = chunks.reduce((acc, chunk, index) => {
        const fileId = chunk.metadata.fileId;
        if (!acc[fileId]) {
          acc[fileId] = {
            chunks: [],
            embeddings: [],
            fileName: chunk.metadata.fileName,
          };
        }
        acc[fileId].chunks.push(chunk);
        acc[fileId].embeddings.push(embeddings[index]);
        return acc;
      }, {} as Record<string, { chunks: Chunk[]; embeddings: number[][]; fileName: string }>);

      // Store each PDF group separately
      for (const [fileId, data] of Object.entries(chunksByPdf)) {
        const cleanedMetadatas = data.chunks.map((chunk) => {
          const { fullDocumentContent, ...cleanMetadata } = chunk.metadata;
          return {
            ...cleanMetadata,
            pdfGroup: fileId, // Add PDF grouping identifier
            totalChunksInPdf: data.chunks.length,
          } as any;
        });

        await collection.add({
          ids: data.chunks.map((chunk) => chunk.id),
          embeddings: data.embeddings,
          metadatas: cleanedMetadatas,
          documents: data.chunks.map((chunk) => chunk.content),
        });

        console.log(
          `✅ Stored ${data.chunks.length} chunks for PDF "${data.fileName}" (${fileId}) in collection "${collection.name}"`
        );
      }

      console.log(
        `📦 Total: ${chunks.length} chunks from ${Object.keys(chunksByPdf).length
        } PDF(s)`
      );
    } catch (error) {
      console.error("Vector store error:", error);
      throw new Error("Failed to store chunks in vector database");
    }
  }

  /**
   * Query similar chunks from specific collection
   */
  async queryChunks(
    queryEmbedding: number[],
    topK: number = 3,
    collectionName?: string
  ): Promise<{
    documents: string[];
    metadatas: ChunkMetadata[];
    distances: number[];
  }> {
    try {
      const collection = await this.initCollection(collectionName);

      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: topK,
      });

      if (!results.documents || !results.metadatas || !results.distances) {
        throw new Error("Invalid query results");
      }

      return {
        documents: results.documents[0] || [],
        metadatas: (results.metadatas[0] as ChunkMetadata[]) || [],
        distances: results.distances[0] || [],
      };
    } catch (error) {
      console.error("Vector query error:", error);
      throw new Error("Failed to query vector database");
    }
  }

  /**
   * Query chunks by metadata (fileName and/or page) from specific collection
   */
  async queryByMetadata(
    fileName?: string,
    pageNo?: number,
    collectionName?: string
  ): Promise<{ documents: string[]; metadatas: ChunkMetadata[] }> {
    try {
      const collection = await this.initCollection(collectionName);

      // Build where filter based on ChromaDB syntax
      let whereFilter: any;

      if (fileName && pageNo !== undefined) {
        // Both fileName and pageNo
        whereFilter = {
          $and: [{ fileName: { $eq: fileName } }, { page: { $eq: pageNo } }],
        };
      } else if (fileName) {
        // Only fileName
        whereFilter = { fileName: { $eq: fileName } };
      } else if (pageNo !== undefined) {
        // Only pageNo
        whereFilter = { page: { $eq: pageNo } };
      } else {
        // No filter provided
        return {
          documents: [],
          metadatas: [],
        };
      }

      const results = await collection.get({
        where: whereFilter,
      });

      return {
        documents: results.documents || [],
        metadatas: (results.metadatas as ChunkMetadata[]) || [],
      };
    } catch (error) {
      console.error("Query by metadata error:", error);
      throw new Error("Failed to query by metadata");
    }
  }

  /**
   * Get chunks grouped by PDF
   */
  async getChunksByPdfGroup(
    fileId: string,
    collectionName?: string
  ): Promise<{
    chunks: any[];
    metadata: any[];
  }> {
    try {
      const collection = await this.initCollection(collectionName);

      const results = await collection.get({
        where: { pdfGroup: { $eq: fileId } },
      });

      return {
        chunks: results.documents || [],
        metadata: results.metadatas || [],
      };
    } catch (error) {
      console.error("Get chunks by PDF group error:", error);
      return { chunks: [], metadata: [] };
    }
  }

  /**
   * Delete chunks by file ID from a specific collection
   */
  async deleteByFileId(fileId: string, collectionName?: string): Promise<void> {
    try {
      const collection = await this.initCollection(collectionName);

      // Query all documents with the fileId
      const results = await collection.get({
        where: { fileId: fileId },
      });

      if (results.ids && results.ids.length > 0) {
        await collection.delete({
          ids: results.ids,
        });
        console.log(`Deleted ${results.ids.length} chunks for file ${fileId}`);
      } else {
        console.log(`No chunks found for file ${fileId}`);
      }
    } catch (error) {
      console.error("Delete chunks error:", error);
      throw new Error("Failed to delete chunks from vector database");
    }
  }

  /**
   * Get collection stats
   */
  async getStats(): Promise<{ count: number }> {
    try {
      const collection = await this.initCollection();
      const count = await collection.count();
      return { count };
    } catch (error) {
      console.error("Get stats error:", error);
      throw new Error("Failed to get collection stats");
    }
  }

  /**
   * Get all documents with pagination
   */
  async getAllDocuments(
    limit: number = 50,
    offset: number = 0,
    collectionName?: string
  ): Promise<{
    documents: any[];
    metadatas: ChunkMetadata[];
    ids: string[];
    total: number;
  }> {
    try {
      const collection = await this.initCollection(collectionName);
      const total = await collection.count();

      // Get all documents (ChromaDB doesn't support offset, so we get all and slice)
      const results = await collection.get({});

      const startIndex = offset;
      const endIndex = offset + limit;

      return {
        documents: results.documents?.slice(startIndex, endIndex) || [],
        metadatas:
          (results.metadatas?.slice(startIndex, endIndex) as ChunkMetadata[]) ||
          [],
        ids: results.ids?.slice(startIndex, endIndex) || [],
        total,
      };
    } catch (error) {
      console.error("Get all documents error:", error);
      throw new Error("Failed to get all documents");
    }
  }

  /**
   * Get unique files in the collection
   */
  async getUniqueFiles(
    collectionName?: string
  ): Promise<{ fileName: string; fileId: string; count: number }[]> {
    try {
      const collection = await this.initCollection(collectionName);
      const results = await collection.get({});

      if (!results.metadatas) {
        return [];
      }

      // Group by fileId
      const fileMap = new Map<string, { fileName: string; count: number }>();

      results.metadatas.forEach((metadata: any) => {
        if (metadata.fileId) {
          if (fileMap.has(metadata.fileId)) {
            fileMap.get(metadata.fileId)!.count++;
          } else {
            fileMap.set(metadata.fileId, {
              fileName: metadata.fileName || "Unknown",
              count: 1,
            });
          }
        }
      });

      return Array.from(fileMap.entries()).map(([fileId, data]) => ({
        fileId,
        fileName: data.fileName,
        count: data.count,
      }));
    } catch (error) {
      console.error("Get unique files error:", error);
      throw new Error("Failed to get unique files");
    }
  }

  /**
   * Get documents by file ID
   */
  async getDocumentsByFileId(
    fileId: string,
    collectionName?: string
  ): Promise<{
    documents: string[];
    metadatas: ChunkMetadata[];
    ids: string[];
  }> {
    try {
      const collection = await this.initCollection(collectionName);

      const results = await collection.get({
        where: { fileId: fileId },
      });

      return {
        documents: results.documents || [],
        metadatas: (results.metadatas as ChunkMetadata[]) || [],
        ids: results.ids || [],
      };
    } catch (error) {
      console.error("Get documents by file error:", error);
      throw new Error("Failed to get documents by file ID");
    }
  }

  /**
   * Delete a ChromaDB collection entirely
   * Used when deleting a chat session
   */
  async deleteCollection(collectionName: string): Promise<void> {
    try {
      // Remove from local cache
      this.collections.delete(collectionName);

      // Delete from ChromaDB
      await this.client.deleteCollection({ name: collectionName });
      console.log(`🗑️ ChromaDB collection deleted: ${collectionName}`);
    } catch (error: any) {
      // Collection might not exist - that's ok
      if (error.message?.includes('does not exist')) {
        console.log(`📌 ChromaDB collection ${collectionName} doesn't exist (already deleted)`);
        return;
      }
      console.error("Delete collection error:", error);
      throw new Error(`Failed to delete collection: ${collectionName}`);
    }
  }
}

export const vectorDBService = new VectorDBService();

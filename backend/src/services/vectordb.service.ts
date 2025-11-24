import { ChromaClient, Collection } from 'chromadb';
import { Chunk, ChunkMetadata } from '../types';
import env from '../config/env';

export class VectorDBService {
  private client: ChromaClient;
  private collections: Map<string, Collection> = new Map(); // Cache collections by name

  constructor() {
    this.client = new ChromaClient({ path: env.CHROMA_URL });
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
            : 'Educational notes and documents' 
        },
      });

      // Cache it
      this.collections.set(name, collection);
      console.log(`📚 Collection "${name}" initialized`);

      return collection;
    } catch (error) {
      console.error('Collection initialization error:', error);
      throw new Error('Failed to initialize vector database collection');
    }
  }

  /**
   * Store chunks with embeddings in specific collection
   * Note: fullDocumentContent is excluded to avoid payload size issues
   */
  async storeChunks(chunks: Chunk[], embeddings: number[][], collectionName?: string): Promise<void> {
    try {
      const collection = await this.initCollection(collectionName);

      // Filter out fullDocumentContent from metadata to reduce payload size
      const cleanedMetadatas = chunks.map((chunk) => {
        const { fullDocumentContent, ...cleanMetadata } = chunk.metadata;
        return cleanMetadata as any;
      });

      await collection.add({
        ids: chunks.map((chunk) => chunk.id),
        embeddings: embeddings,
        metadatas: cleanedMetadatas,
        documents: chunks.map((chunk) => chunk.content),
      });

      console.log(`✅ Stored ${chunks.length} chunks in collection "${collection.name}"`);
    } catch (error) {
      console.error('Vector store error:', error);
      throw new Error('Failed to store chunks in vector database');
    }
  }

  /**
   * Query similar chunks from specific collection
   */
  async queryChunks(
    queryEmbedding: number[],
    topK: number = 3,
    collectionName?: string
  ): Promise<{ documents: string[]; metadatas: ChunkMetadata[]; distances: number[] }> {
    try {
      const collection = await this.initCollection(collectionName);

      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: topK,
      });

      if (!results.documents || !results.metadatas || !results.distances) {
        throw new Error('Invalid query results');
      }

      return {
        documents: results.documents[0] || [],
        metadatas: (results.metadatas[0] as ChunkMetadata[]) || [],
        distances: results.distances[0] || [],
      };
    } catch (error) {
      console.error('Vector query error:', error);
      throw new Error('Failed to query vector database');
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
          $and: [
            { fileName: { $eq: fileName } },
            { page: { $eq: pageNo } }
          ]
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
      console.error('Query by metadata error:', error);
      throw new Error('Failed to query by metadata');
    }
  }

  /**
   * Delete chunks by file ID
   */
  async deleteByFileId(fileId: string): Promise<void> {
    try {
      const collection = await this.initCollection();
      
      // Query all documents with the fileId
      const results = await collection.get({
        where: { fileId: fileId },
      });

      if (results.ids && results.ids.length > 0) {
        await collection.delete({
          ids: results.ids,
        });
        console.log(`Deleted ${results.ids.length} chunks for file ${fileId}`);
      }
    } catch (error) {
      console.error('Delete chunks error:', error);
      throw new Error('Failed to delete chunks from vector database');
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
      console.error('Get stats error:', error);
      throw new Error('Failed to get collection stats');
    }
  }

  /**
   * Get all documents with pagination
   */
  async getAllDocuments(limit: number = 50, offset: number = 0, collectionName?: string): Promise<{
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
        metadatas: (results.metadatas?.slice(startIndex, endIndex) as ChunkMetadata[]) || [],
        ids: results.ids?.slice(startIndex, endIndex) || [],
        total,
      };
    } catch (error) {
      console.error('Get all documents error:', error);
      throw new Error('Failed to get all documents');
    }
  }

  /**
   * Get unique files in the collection
   */
  async getUniqueFiles(collectionName?: string): Promise<{ fileName: string; fileId: string; count: number }[]> {
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
              fileName: metadata.fileName || 'Unknown',
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
      console.error('Get unique files error:', error);
      throw new Error('Failed to get unique files');
    }
  }

  /**
   * Get documents by file ID
   */
  async getDocumentsByFileId(fileId: string, collectionName?: string): Promise<{
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
      console.error('Get documents by file error:', error);
      throw new Error('Failed to get documents by file ID');
    }
  }
}

export const vectorDBService = new VectorDBService();

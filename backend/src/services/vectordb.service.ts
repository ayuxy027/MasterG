import { ChromaClient, Collection } from "chromadb";
import { Chunk, ChunkMetadata } from "../types";
import env from "../config/env";

export class VectorDBService {
  private client: ChromaClient;
  private collections: Map<string, Collection> = new Map();

  constructor() {
    this.client = new ChromaClient({ path: env.CHROMA_URL });
  }

  async getCollection(collectionName?: string): Promise<Collection> {
    return this.initCollection(collectionName);
  }

  async initCollection(collectionName?: string): Promise<Collection> {
    try {
      const name = collectionName || env.CHROMA_COLLECTION_NAME;

      if (this.collections.has(name)) {
        return this.collections.get(name)!;
      }

      const collection = await this.client.getOrCreateCollection({
        name,
        metadata: {
          description: collectionName
            ? `Chat-specific collection: ${collectionName}`
            : "Educational notes and documents",
        },
      });

      this.collections.set(name, collection);
      return collection;
    } catch (error) {
      throw new Error("Failed to initialize vector database collection");
    }
  }

  async storeChunks(
    chunks: Chunk[],
    embeddings: number[][],
    collectionName?: string
  ): Promise<void> {
    try {
      const collection = await this.initCollection(collectionName);

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

      for (const [fileId, data] of Object.entries(chunksByPdf)) {
        const cleanedMetadatas = data.chunks.map((chunk) => {
          const { fullDocumentContent, ...cleanMetadata } = chunk.metadata;
          return {
            ...cleanMetadata,
            pdfGroup: fileId,
            totalChunksInPdf: data.chunks.length,
          } as any;
        });

        await collection.add({
          ids: data.chunks.map((chunk) => chunk.id),
          embeddings: data.embeddings,
          metadatas: cleanedMetadatas,
          documents: data.chunks.map((chunk) => chunk.content),
        });
      }
    } catch (error) {
      throw new Error("Failed to store chunks in vector database");
    }
  }

  async queryChunks(
    queryEmbedding: number[],
    topK: number = 6,
    collectionName?: string,
    metadataFilters?: { where: any }
  ): Promise<{
    documents: string[];
    metadatas: ChunkMetadata[];
    distances: number[];
  }> {
    try {
      const collection = await this.initCollection(collectionName);

      const queryParams: any = {
        queryEmbeddings: [queryEmbedding],
        nResults: topK,
      };

      if (metadataFilters?.where) {
        queryParams.where = metadataFilters.where;
      }

      const results = await collection.query(queryParams);

      if (!results.documents || !results.metadatas || !results.distances) {
        throw new Error("Invalid query results");
      }

      return {
        documents: results.documents[0] || [],
        metadatas: (results.metadatas[0] as ChunkMetadata[]) || [],
        distances: results.distances[0] || [],
      };
    } catch (error) {
      throw new Error("Failed to query vector database");
    }
  }

  async queryChunksWithFilter(
    queryEmbedding: number[],
    topK: number = 6,
    collectionName?: string,
    fileIds?: string[]
  ): Promise<{
    documents: string[];
    metadatas: ChunkMetadata[];
    distances: number[];
  }> {
    try {
      const collection = await this.initCollection(collectionName);

      let whereFilter: any = undefined;
      if (fileIds && fileIds.length > 0) {
        if (fileIds.length === 1) {
          whereFilter = { fileId: { $eq: fileIds[0] } };
        } else {
          whereFilter = { fileId: { $in: fileIds } };
        }
      }

      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: topK,
        where: whereFilter,
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
      throw new Error("Failed to query vector database with filter");
    }
  }

  async queryByMetadata(
    fileName?: string,
    pageNo?: number,
    collectionName?: string
  ): Promise<{ documents: string[]; metadatas: ChunkMetadata[] }> {
    try {
      const collection = await this.initCollection(collectionName);

      let whereFilter: any;

      if (fileName && pageNo !== undefined) {
        whereFilter = {
          $and: [{ fileName: { $eq: fileName } }, { page: { $eq: pageNo } }],
        };
      } else if (fileName) {
        whereFilter = { fileName: { $eq: fileName } };
      } else if (pageNo !== undefined) {
        whereFilter = { page: { $eq: pageNo } };
      } else {
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
      throw new Error("Failed to query by metadata");
    }
  }

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
      return { chunks: [], metadata: [] };
    }
  }

  async deleteByFileId(fileId: string, collectionName?: string): Promise<void> {
    try {
      const collection = await this.initCollection(collectionName);

      const results = await collection.get({
        where: { fileId: fileId },
      });

      if (results.ids && results.ids.length > 0) {
        await collection.delete({
          ids: results.ids,
        });
      }
    } catch (error) {
      throw new Error("Failed to delete chunks from vector database");
    }
  }

  async getStats(): Promise<{ count: number }> {
    try {
      const collection = await this.initCollection();
      const count = await collection.count();
      return { count };
    } catch (error) {
      throw new Error("Failed to get collection stats");
    }
  }

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
      throw new Error("Failed to get all documents");
    }
  }

  async getUniqueFiles(
    collectionName?: string
  ): Promise<{ fileName: string; fileId: string; count: number }[]> {
    try {
      const collection = await this.initCollection(collectionName);
      const results = await collection.get({});

      if (!results.metadatas) {
        return [];
      }

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
      throw new Error("Failed to get unique files");
    }
  }

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
      throw new Error("Failed to get documents by file ID");
    }
  }

  async deleteCollection(collectionName: string): Promise<void> {
    try {
      this.collections.delete(collectionName);
      await this.client.deleteCollection({ name: collectionName });
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        return;
      }
      throw new Error(`Failed to delete collection: ${collectionName}`);
    }
  }
}

export const vectorDBService = new VectorDBService();

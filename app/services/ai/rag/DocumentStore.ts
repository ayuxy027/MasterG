/**
 * Document Store
 * SQLite-based storage for document chunks and indices
 * 
 * Features:
 * - Persistent storage using expo-sqlite
 * - CRUD operations for documents and chunks
 * - Index management
 * - Automatic cleanup of old documents
 */

import * as SQLite from 'expo-sqlite';
import { DocumentChunk, DocumentIndex } from './types';

const DB_NAME = 'rag_documents.db';
const MAX_DOCUMENTS = 10; // Maximum documents to keep in storage

export class DocumentStore {
  private static instance: DocumentStore;
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): DocumentStore {
    if (!DocumentStore.instance) {
      DocumentStore.instance = new DocumentStore();
    }
    return DocumentStore.instance;
  }

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('📦 DocumentStore already initialized');
      return;
    }

    console.log('📦 Initializing DocumentStore...');

    try {
      this.db = await SQLite.openDatabaseAsync(DB_NAME);

      // Create tables
      await this.db.execAsync(`
        -- Documents table
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          total_chunks INTEGER NOT NULL,
          total_words INTEGER NOT NULL,
          total_pages INTEGER NOT NULL,
          avg_chunk_length REAL NOT NULL,
          created_at INTEGER NOT NULL,
          last_accessed_at INTEGER NOT NULL
        );

        -- Chunks table
        CREATE TABLE IF NOT EXISTS chunks (
          id TEXT PRIMARY KEY,
          document_id TEXT NOT NULL,
          text TEXT NOT NULL,
          page_number INTEGER NOT NULL,
          chunk_index INTEGER NOT NULL,
          start_position INTEGER NOT NULL,
          end_position INTEGER NOT NULL,
          word_count INTEGER NOT NULL,
          metadata TEXT,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
        );

        -- Vocabulary table (for IDF calculation)
        CREATE TABLE IF NOT EXISTS vocabulary (
          document_id TEXT NOT NULL,
          term TEXT NOT NULL,
          document_frequency INTEGER NOT NULL,
          PRIMARY KEY (document_id, term),
          FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
        );

        -- Indices for faster queries
        CREATE INDEX IF NOT EXISTS idx_chunks_document ON chunks(document_id);
        CREATE INDEX IF NOT EXISTS idx_vocabulary_term ON vocabulary(term);
        CREATE INDEX IF NOT EXISTS idx_documents_accessed ON documents(last_accessed_at);
      `);

      this.isInitialized = true;
      console.log('✅ DocumentStore initialized');

      // Cleanup old documents if needed
      await this.enforceDocumentLimit();

    } catch (error) {
      console.error('❌ Failed to initialize DocumentStore:', error);
      throw error;
    }
  }

  /**
   * Save a document with its chunks
   */
  async saveDocument(
    documentId: string,
    documentName: string,
    chunks: DocumentChunk[],
    vocabulary: Map<string, number>
  ): Promise<void> {
    if (!this.db) await this.initialize();

    console.log(`💾 Saving document: ${documentName}`);
    console.log(`  └── Chunks: ${chunks.length}`);
    console.log(`  └── Vocabulary: ${vocabulary.size} terms`);

    try {
      const totalWords = chunks.reduce((sum, c) => sum + c.wordCount, 0);
      const totalPages = Math.max(...chunks.map(c => c.pageNumber));
      const avgChunkLength = totalWords / chunks.length;
      const now = Date.now();

      // Start transaction
      await this.db!.execAsync('BEGIN TRANSACTION');

      try {
        // Insert document
        await this.db!.runAsync(
          `INSERT OR REPLACE INTO documents 
           (id, name, total_chunks, total_words, total_pages, avg_chunk_length, created_at, last_accessed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [documentId, documentName, chunks.length, totalWords, totalPages, avgChunkLength, now, now]
        );

        // Insert chunks in batches
        const chunkBatchSize = 50;
        for (let i = 0; i < chunks.length; i += chunkBatchSize) {
          const batch = chunks.slice(i, i + chunkBatchSize);
          
          for (const chunk of batch) {
            await this.db!.runAsync(
              `INSERT OR REPLACE INTO chunks 
               (id, document_id, text, page_number, chunk_index, start_position, end_position, word_count, metadata, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                chunk.id,
                documentId,
                chunk.text,
                chunk.pageNumber,
                chunk.chunkIndex,
                chunk.startPosition,
                chunk.endPosition,
                chunk.wordCount,
                JSON.stringify(chunk.metadata),
                chunk.createdAt
              ]
            );
          }
        }

        // Insert vocabulary in batches
        const vocabBatchSize = 100;
        const vocabEntries = Array.from(vocabulary.entries());
        for (let i = 0; i < vocabEntries.length; i += vocabBatchSize) {
          const batch = vocabEntries.slice(i, i + vocabBatchSize);
          
          for (const [term, df] of batch) {
            await this.db!.runAsync(
              `INSERT OR REPLACE INTO vocabulary (document_id, term, document_frequency)
               VALUES (?, ?, ?)`,
              [documentId, term, df]
            );
          }
        }

        await this.db!.execAsync('COMMIT');
        console.log('✅ Document saved successfully');

      } catch (error) {
        await this.db!.execAsync('ROLLBACK');
        throw error;
      }

      // Enforce document limit
      await this.enforceDocumentLimit();

    } catch (error) {
      console.error('❌ Failed to save document:', error);
      throw error;
    }
  }

  /**
   * Get all chunks for a document
   */
  async getChunks(documentId: string): Promise<DocumentChunk[]> {
    if (!this.db) await this.initialize();

    try {
      // Update last accessed time
      await this.db!.runAsync(
        `UPDATE documents SET last_accessed_at = ? WHERE id = ?`,
        [Date.now(), documentId]
      );

      const rows = await this.db!.getAllAsync<any>(
        `SELECT * FROM chunks WHERE document_id = ? ORDER BY chunk_index`,
        [documentId]
      );

      return rows.map(row => ({
        id: row.id,
        documentId: row.document_id,
        text: row.text,
        pageNumber: row.page_number,
        chunkIndex: row.chunk_index,
        startPosition: row.start_position,
        endPosition: row.end_position,
        wordCount: row.word_count,
        metadata: JSON.parse(row.metadata || '{}'),
        createdAt: row.created_at,
      }));

    } catch (error) {
      console.error('❌ Failed to get chunks:', error);
      throw error;
    }
  }

  /**
   * Get vocabulary for a document
   */
  async getVocabulary(documentId: string): Promise<Map<string, number>> {
    if (!this.db) await this.initialize();

    try {
      const rows = await this.db!.getAllAsync<any>(
        `SELECT term, document_frequency FROM vocabulary WHERE document_id = ?`,
        [documentId]
      );

      const vocabulary = new Map<string, number>();
      for (const row of rows) {
        vocabulary.set(row.term, row.document_frequency);
      }

      return vocabulary;

    } catch (error) {
      console.error('❌ Failed to get vocabulary:', error);
      throw error;
    }
  }

  /**
   * Get document metadata
   */
  async getDocument(documentId: string): Promise<DocumentIndex | null> {
    if (!this.db) await this.initialize();

    try {
      const row = await this.db!.getFirstAsync<any>(
        `SELECT * FROM documents WHERE id = ?`,
        [documentId]
      );

      if (!row) return null;

      const vocabulary = await this.getVocabulary(documentId);

      // Calculate IDF
      const idf = new Map<string, number>();
      const totalChunks = row.total_chunks;
      vocabulary.forEach((df, term) => {
        idf.set(term, Math.log((totalChunks + 1) / (df + 1)) + 1);
      });

      return {
        documentId: row.id,
        documentName: row.name,
        totalChunks: row.total_chunks,
        totalWords: row.total_words,
        totalPages: row.total_pages,
        vocabulary,
        idf,
        avgChunkLength: row.avg_chunk_length,
        createdAt: row.created_at,
        lastAccessedAt: row.last_accessed_at,
      };

    } catch (error) {
      console.error('❌ Failed to get document:', error);
      throw error;
    }
  }

  /**
   * List all documents
   */
  async listDocuments(): Promise<Array<{
    id: string;
    name: string;
    totalChunks: number;
    totalPages: number;
    createdAt: number;
  }>> {
    if (!this.db) await this.initialize();

    try {
      const rows = await this.db!.getAllAsync<any>(
        `SELECT id, name, total_chunks, total_pages, created_at 
         FROM documents 
         ORDER BY last_accessed_at DESC`
      );

      return rows.map(row => ({
        id: row.id,
        name: row.name,
        totalChunks: row.total_chunks,
        totalPages: row.total_pages,
        createdAt: row.created_at,
      }));

    } catch (error) {
      console.error('❌ Failed to list documents:', error);
      throw error;
    }
  }

  /**
   * Check if document exists
   */
  async documentExists(documentId: string): Promise<boolean> {
    if (!this.db) await this.initialize();

    try {
      const row = await this.db!.getFirstAsync<any>(
        `SELECT id FROM documents WHERE id = ?`,
        [documentId]
      );
      return !!row;

    } catch (error) {
      console.error('❌ Failed to check document existence:', error);
      return false;
    }
  }

  /**
   * Delete a document and its chunks
   */
  async deleteDocument(documentId: string): Promise<void> {
    if (!this.db) await this.initialize();

    try {
      // Delete chunks first (even without CASCADE)
      await this.db!.runAsync(
        `DELETE FROM vocabulary WHERE document_id = ?`,
        [documentId]
      );
      
      await this.db!.runAsync(
        `DELETE FROM chunks WHERE document_id = ?`,
        [documentId]
      );

      await this.db!.runAsync(
        `DELETE FROM documents WHERE id = ?`,
        [documentId]
      );

      console.log(`🗑️ Deleted document: ${documentId}`);

    } catch (error) {
      console.error('❌ Failed to delete document:', error);
      throw error;
    }
  }

  /**
   * Enforce maximum document limit
   */
  private async enforceDocumentLimit(): Promise<void> {
    if (!this.db) return;

    try {
      const count = await this.db!.getFirstAsync<any>(
        `SELECT COUNT(*) as count FROM documents`
      );

      if (count && count.count > MAX_DOCUMENTS) {
        // Delete oldest documents
        const toDelete = count.count - MAX_DOCUMENTS;
        const oldest = await this.db!.getAllAsync<any>(
          `SELECT id FROM documents ORDER BY last_accessed_at ASC LIMIT ?`,
          [toDelete]
        );

        for (const doc of oldest) {
          await this.deleteDocument(doc.id);
        }

        console.log(`🧹 Cleaned up ${toDelete} old documents`);
      }

    } catch (error) {
      console.error('⚠️ Failed to enforce document limit:', error);
    }
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    totalDocuments: number;
    totalChunks: number;
    totalVocabTerms: number;
  }> {
    if (!this.db) await this.initialize();

    try {
      const docs = await this.db!.getFirstAsync<any>(
        `SELECT COUNT(*) as count FROM documents`
      );
      const chunks = await this.db!.getFirstAsync<any>(
        `SELECT COUNT(*) as count FROM chunks`
      );
      const vocab = await this.db!.getFirstAsync<any>(
        `SELECT COUNT(*) as count FROM vocabulary`
      );

      return {
        totalDocuments: docs?.count || 0,
        totalChunks: chunks?.count || 0,
        totalVocabTerms: vocab?.count || 0,
      };

    } catch (error) {
      console.error('❌ Failed to get stats:', error);
      return { totalDocuments: 0, totalChunks: 0, totalVocabTerms: 0 };
    }
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    if (!this.db) await this.initialize();

    try {
      await this.db!.execAsync(`
        DELETE FROM vocabulary;
        DELETE FROM chunks;
        DELETE FROM documents;
      `);
      console.log('🧹 All documents cleared');

    } catch (error) {
      console.error('❌ Failed to clear all:', error);
      throw error;
    }
  }
}

export default DocumentStore.getInstance();

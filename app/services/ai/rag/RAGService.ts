/**
 * RAG Service
 * Main orchestrator for Retrieval-Augmented Generation
 * 
 * Features:
 * - Document indexing pipeline
 * - Semantic search
 * - Context building
 * - Answer generation
 */

// Pure JS UUID generator (no native dependencies)
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
import {
  DocumentChunk,
  DocumentIndex,
  SearchResult,
  RAGConfig,
  RAGProgress,
  RAGProgressCallback,
  DEFAULT_RAG_CONFIG,
} from './types';
import ChunkingService from './ChunkingService';
import DocumentStore from './DocumentStore';
import SearchEngine from './SearchEngine';

export class RAGService {
  private static instance: RAGService;
  private config: RAGConfig;
  private activeDocumentId: string | null = null;
  private activeIndex: DocumentIndex | null = null;
  private activeChunks: DocumentChunk[] = [];
  private isProcessing = false;

  private constructor() {
    this.config = DEFAULT_RAG_CONFIG;
  }

  static getInstance(): RAGService {
    if (!RAGService.instance) {
      RAGService.instance = new RAGService();
    }
    return RAGService.instance;
  }

  /**
   * Configure RAG settings
   */
  configure(config: Partial<RAGConfig>): void {
    this.config = { ...this.config, ...config };
    SearchEngine.setConfig(this.config);
  }

  /**
   * Index a document for RAG
   */
  async indexDocument(
    text: string,
    documentName: string,
    estimatedPageCount: number = 1,
    onProgress?: RAGProgressCallback
  ): Promise<string> {
    if (this.isProcessing) {
      throw new Error('Another document is being processed');
    }

    this.isProcessing = true;
    const documentId = generateUUID();

    console.log('\n' + '='.repeat(60));
    console.log('📚 RAG INDEXING STARTED');
    console.log('='.repeat(60));
    console.log(`📄 Document: ${documentName}`);
    console.log(`📝 Text length: ${text.length} characters`);
    console.log(`📖 Estimated pages: ${estimatedPageCount}`);

    try {
      // Step 1: Initialize store
      onProgress?.({
        stage: 'extracting',
        progress: 5,
        message: 'Initializing document store...',
      });
      await DocumentStore.initialize();

      // Step 2: Chunk the document
      onProgress?.({
        stage: 'chunking',
        progress: 15,
        message: 'Splitting document into chunks...',
      });
      
      const chunks = ChunkingService.chunkDocument(
        text,
        documentId,
        estimatedPageCount
      );

      console.log(`✂️ Created ${chunks.length} chunks`);

      // Log sample chunks for debugging
      console.log('\n📋 Sample chunks:');
      chunks.slice(0, 3).forEach((chunk, i) => {
        console.log(`  [Chunk ${i + 1}] Page ${chunk.pageNumber}: ${chunk.text.substring(0, 100)}...`);
      });

      // Step 3: Build search index
      onProgress?.({
        stage: 'indexing',
        progress: 50,
        message: 'Building search index...',
        details: `Processing ${chunks.length} chunks`,
      });

      const { vocabulary, idf } = SearchEngine.buildIndex(chunks);
      const totalWords = chunks.reduce((sum, c) => sum + c.wordCount, 0);
      const avgChunkLength = totalWords / chunks.length;

      // Create document index
      const index: DocumentIndex = {
        documentId,
        documentName,
        totalChunks: chunks.length,
        totalWords,
        totalPages: estimatedPageCount,
        vocabulary,
        idf,
        avgChunkLength,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
      };

      console.log(`📊 Index built: ${vocabulary.size} unique terms`);

      // Step 4: Save to persistent storage
      onProgress?.({
        stage: 'saving',
        progress: 75,
        message: 'Saving to database...',
      });

      await DocumentStore.saveDocument(
        documentId,
        documentName,
        chunks,
        vocabulary
      );

      // Step 5: Set as active document
      this.activeDocumentId = documentId;
      this.activeIndex = index;
      this.activeChunks = chunks;

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Document indexed successfully!',
        details: `${chunks.length} chunks, ${vocabulary.size} terms`,
      });

      console.log('='.repeat(60));
      console.log('✅ RAG INDEXING COMPLETE');
      console.log('='.repeat(60) + '\n');

      return documentId;

    } catch (error) {
      console.error('❌ RAG indexing failed:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Load an existing document
   */
  async loadDocument(documentId: string): Promise<boolean> {
    console.log(`📂 Loading document: ${documentId}`);

    try {
      await DocumentStore.initialize();

      const index = await DocumentStore.getDocument(documentId);
      if (!index) {
        console.log('❌ Document not found');
        return false;
      }

      const chunks = await DocumentStore.getChunks(documentId);
      if (chunks.length === 0) {
        console.log('❌ No chunks found for document');
        return false;
      }

      this.activeDocumentId = documentId;
      this.activeIndex = index;
      this.activeChunks = chunks;

      console.log(`✅ Loaded: ${index.documentName}`);
      console.log(`  └── Chunks: ${chunks.length}`);
      console.log(`  └── Terms: ${index.vocabulary.size}`);

      return true;

    } catch (error) {
      console.error('❌ Failed to load document:', error);
      return false;
    }
  }

  /**
   * Search for relevant chunks
   */
  search(query: string): SearchResult[] {
    if (!this.activeIndex || this.activeChunks.length === 0) {
      console.warn('⚠️ No document loaded for search');
      return [];
    }

    return SearchEngine.search(query, this.activeChunks, this.activeIndex);
  }

  /**
   * Build context from search results
   */
  buildContext(results: SearchResult[]): string {
    return SearchEngine.buildContext(results);
  }

  /**
   * Get retrieval context for a question (main method for Q&A)
   */
  getRetrievalContext(question: string): {
    context: string;
    results: SearchResult[];
    metadata: {
      documentName: string;
      totalChunks: number;
      relevantChunks: number;
      pages: number[];
    };
  } | null {
    if (!this.activeIndex) {
      return null;
    }

    const results = this.search(question);
    const context = this.buildContext(results);

    // Get unique pages
    const pages = [...new Set(results.map(r => r.chunk.pageNumber))].sort((a, b) => a - b);

    return {
      context,
      results,
      metadata: {
        documentName: this.activeIndex.documentName,
        totalChunks: this.activeChunks.length,
        relevantChunks: results.length,
        pages,
      },
    };
  }

  /**
   * Get active document info
   */
  getActiveDocumentInfo(): {
    documentId: string;
    documentName: string;
    totalChunks: number;
    totalPages: number;
    totalWords: number;
  } | null {
    if (!this.activeDocumentId || !this.activeIndex) {
      return null;
    }

    return {
      documentId: this.activeDocumentId,
      documentName: this.activeIndex.documentName,
      totalChunks: this.activeIndex.totalChunks,
      totalPages: this.activeIndex.totalPages,
      totalWords: this.activeIndex.totalWords,
    };
  }

  /**
   * Check if a document is loaded
   */
  hasActiveDocument(): boolean {
    return this.activeDocumentId !== null && this.activeChunks.length > 0;
  }

  /**
   * Clear the active document
   */
  clearActiveDocument(): void {
    this.activeDocumentId = null;
    this.activeIndex = null;
    this.activeChunks = [];
    console.log('🧹 Active document cleared');
  }

  /**
   * Delete a document from storage
   */
  async deleteDocument(documentId: string): Promise<void> {
    await DocumentStore.deleteDocument(documentId);
    
    if (this.activeDocumentId === documentId) {
      this.clearActiveDocument();
    }
  }

  /**
   * List all indexed documents
   */
  async listDocuments(): Promise<Array<{
    id: string;
    name: string;
    totalChunks: number;
    totalPages: number;
    createdAt: number;
  }>> {
    await DocumentStore.initialize();
    return DocumentStore.listDocuments();
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    totalDocuments: number;
    totalChunks: number;
    totalVocabTerms: number;
    activeDocument: string | null;
  }> {
    const stats = await DocumentStore.getStats();
    return {
      ...stats,
      activeDocument: this.activeDocumentId,
    };
  }

  /**
   * Check if processing
   */
  isIndexing(): boolean {
    return this.isProcessing;
  }
}

export default RAGService.getInstance();

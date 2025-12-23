/**
 * Chunking Service
 * Splits documents into semantic chunks for RAG processing
 * 
 * Features:
 * - Semantic boundary detection (paragraphs, sections, sentences)
 * - Configurable chunk size with overlap
 * - Metadata extraction (headings, lists, etc.)
 * - Page number tracking
 */

import { 
  DocumentChunk, 
  ChunkMetadata, 
  RAGConfig, 
  DEFAULT_RAG_CONFIG 
} from './types';

// Pure JS UUID generator (no native dependencies)
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Common English stopwords for filtering
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'were', 'will', 'with', 'the', 'this', 'but', 'they',
  'have', 'had', 'what', 'when', 'where', 'who', 'which', 'why', 'how',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
  'very', 'just', 'can', 'should', 'now', 'i', 'you', 'your', 'we', 'our',
  'my', 'me', 'him', 'her', 'his', 'their', 'them', 'been', 'being', 'do',
  'does', 'did', 'doing', 'would', 'could', 'might', 'must', 'shall',
  'into', 'through', 'during', 'before', 'after', 'above', 'below', 'up',
  'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once'
]);

export class ChunkingService {
  private config: RAGConfig;

  constructor(config: Partial<RAGConfig> = {}) {
    this.config = { ...DEFAULT_RAG_CONFIG, ...config };
  }

  /**
   * Main method: Split text into semantic chunks
   */
  chunkDocument(
    text: string,
    documentId: string,
    estimatedPageCount: number = 1
  ): DocumentChunk[] {
    console.log('📝 Starting document chunking...');
    console.log(`  └── Document ID: ${documentId}`);
    console.log(`  └── Text length: ${text.length} chars`);

    // Step 1: Clean and normalize text
    const cleanedText = this.cleanText(text);

    // Step 2: Split into initial segments (paragraphs/sections)
    const segments = this.splitIntoSegments(cleanedText);
    console.log(`  └── Found ${segments.length} segments`);

    // Step 3: Create chunks with overlap
    const chunks = this.createChunks(segments, documentId, text.length, estimatedPageCount);
    console.log(`  └── Created ${chunks.length} chunks`);

    // Step 4: Extract metadata for each chunk
    const enrichedChunks = chunks.map(chunk => ({
      ...chunk,
      metadata: this.extractMetadata(chunk.text),
    }));

    console.log('✅ Chunking complete');
    return enrichedChunks;
  }

  /**
   * Clean and normalize text
   */
  private cleanText(text: string): string {
    return text
      // Normalize whitespace
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove excessive newlines (more than 2)
      .replace(/\n{3,}/g, '\n\n')
      // Remove excessive spaces
      .replace(/[ \t]{2,}/g, ' ')
      // Fix common OCR artifacts
      .replace(/['']/g, "'")
      .replace(/[""]/g, '"')
      .replace(/…/g, '...')
      // Remove control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim();
  }

  /**
   * Split text into semantic segments (paragraphs, sections)
   */
  private splitIntoSegments(text: string): string[] {
    const segments: string[] = [];

    // First, try to split by section headings
    const sectionPattern = /^(?:[A-Z][A-Z\s]+|(?:\d+\.)+\s*[A-Z]|\#{1,6}\s)/gm;
    const hasSections = sectionPattern.test(text);

    if (hasSections) {
      // Split by headings while keeping the heading with content
      const parts = text.split(/(?=^(?:[A-Z][A-Z\s]{4,}|(?:\d+\.)+\s*[A-Z]|\#{1,6}\s))/gm);
      for (const part of parts) {
        if (part.trim().length >= this.config.minChunkSize) {
          segments.push(part.trim());
        }
      }
    }

    // If no sections or sections are too few, split by paragraphs
    if (segments.length < 3) {
      segments.length = 0; // Clear
      const paragraphs = text.split(/\n\n+/);
      
      let currentSegment = '';
      for (const para of paragraphs) {
        const trimmed = para.trim();
        if (!trimmed) continue;

        const combined = currentSegment + (currentSegment ? '\n\n' : '') + trimmed;
        const wordCount = this.countWords(combined);

        if (wordCount >= this.config.chunkSize) {
          if (currentSegment) {
            segments.push(currentSegment);
          }
          currentSegment = trimmed;
        } else {
          currentSegment = combined;
        }
      }

      if (currentSegment) {
        segments.push(currentSegment);
      }
    }

    return segments;
  }

  /**
   * Create chunks with configurable overlap
   */
  private createChunks(
    segments: string[],
    documentId: string,
    totalLength: number,
    estimatedPageCount: number
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let globalPosition = 0;
    let chunkIndex = 0;

    for (const segment of segments) {
      const segmentWords = this.countWords(segment);

      // If segment is small enough, use as single chunk
      if (segmentWords <= this.config.chunkSize * 1.5) {
        chunks.push(this.createChunk(
          segment,
          documentId,
          chunkIndex++,
          globalPosition,
          totalLength,
          estimatedPageCount
        ));
        globalPosition += segment.length;
        continue;
      }

      // Split large segments into smaller chunks with overlap
      const sentences = this.splitIntoSentences(segment);
      let currentChunk = '';
      let chunkStartPos = globalPosition;

      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        const combined = currentChunk + (currentChunk ? ' ' : '') + sentence;
        const combinedWords = this.countWords(combined);

        if (combinedWords >= this.config.chunkSize) {
          // Save current chunk
          if (currentChunk.trim()) {
            chunks.push(this.createChunk(
              currentChunk.trim(),
              documentId,
              chunkIndex++,
              chunkStartPos,
              totalLength,
              estimatedPageCount
            ));
          }

          // Start new chunk with overlap
          const overlapSentences = this.getOverlapSentences(sentences, i);
          currentChunk = overlapSentences.join(' ') + ' ' + sentence;
          chunkStartPos = globalPosition + segment.indexOf(currentChunk.split(' ')[0]);
        } else {
          currentChunk = combined;
        }
      }

      // Don't forget the last chunk
      if (currentChunk.trim()) {
        chunks.push(this.createChunk(
          currentChunk.trim(),
          documentId,
          chunkIndex++,
          chunkStartPos,
          totalLength,
          estimatedPageCount
        ));
      }

      globalPosition += segment.length;
    }

    return chunks;
  }

  /**
   * Create a single chunk object
   */
  private createChunk(
    text: string,
    documentId: string,
    chunkIndex: number,
    startPosition: number,
    totalLength: number,
    estimatedPageCount: number
  ): DocumentChunk {
    const endPosition = startPosition + text.length;
    const pageNumber = this.estimatePageNumber(
      startPosition,
      totalLength,
      estimatedPageCount
    );

    return {
      id: generateUUID(),
      documentId,
      text,
      pageNumber,
      chunkIndex,
      startPosition,
      endPosition,
      wordCount: this.countWords(text),
      metadata: {} as ChunkMetadata, // Will be enriched later
      createdAt: Date.now(),
    };
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Handle common abbreviations that shouldn't split sentences
    const abbrevs = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Sr.', 'Jr.', 
                     'vs.', 'etc.', 'e.g.', 'i.e.', 'Fig.', 'fig.'];
    
    let processed = text;
    const placeholders: Map<string, string> = new Map();
    
    abbrevs.forEach((abbr, i) => {
      const placeholder = `__ABBR${i}__`;
      placeholders.set(placeholder, abbr);
      processed = processed.replace(new RegExp(abbr.replace('.', '\\.'), 'g'), placeholder);
    });

    // Split on sentence boundaries
    const sentences = processed.split(/(?<=[.!?])\s+(?=[A-Z])/);

    // Restore abbreviations
    return sentences.map(s => {
      let restored = s;
      placeholders.forEach((abbr, placeholder) => {
        restored = restored.replace(new RegExp(placeholder, 'g'), abbr);
      });
      return restored.trim();
    }).filter(s => s.length > 0);
  }

  /**
   * Get sentences for overlap from previous chunk
   */
  private getOverlapSentences(sentences: string[], currentIndex: number): string[] {
    const overlapWords = this.config.chunkOverlap;
    const result: string[] = [];
    let wordCount = 0;

    for (let i = currentIndex - 1; i >= 0 && wordCount < overlapWords; i--) {
      result.unshift(sentences[i]);
      wordCount += this.countWords(sentences[i]);
    }

    return result;
  }

  /**
   * Extract metadata from chunk text
   */
  private extractMetadata(text: string): ChunkMetadata {
    // Check for heading patterns
    const headingMatch = text.match(/^(?:#{1,6}\s+)?([A-Z][A-Z\s]+|(?:\d+\.)+\s*[A-Za-z]+)/);
    const hasHeading = !!headingMatch;

    // Check for lists
    const hasBulletPoints = /^[\s]*[-•*]\s/m.test(text);
    const hasNumberedList = /^[\s]*\d+[.)]\s/m.test(text);

    // Check for code blocks
    const hasCode = /```[\s\S]*?```|`[^`]+`/.test(text) ||
                   /^(?:    |\t)[^\n]+$/m.test(text);

    return {
      hasHeading,
      headingText: hasHeading ? headingMatch![1].trim() : undefined,
      hasBulletPoints,
      hasNumberedList,
      hasCode,
    };
  }

  /**
   * Estimate page number from position
   */
  private estimatePageNumber(
    position: number,
    totalLength: number,
    totalPages: number
  ): number {
    if (totalLength === 0 || totalPages === 0) return 1;
    const ratio = position / totalLength;
    return Math.min(Math.max(1, Math.ceil(ratio * totalPages)), totalPages);
  }

  /**
   * Count words in text
   */
  countWords(text: string): number {
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }

  /**
   * Tokenize text for indexing
   */
  tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !STOPWORDS.has(word));
  }

  /**
   * Get term frequency for a text
   */
  getTermFrequency(text: string): Map<string, number> {
    const tokens = this.tokenize(text);
    const tf = new Map<string, number>();

    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }

    return tf;
  }
}

export default new ChunkingService();

/**
 * Search Engine
 * BM25 + TF-IDF based search for RAG retrieval
 * 
 * Features:
 * - BM25 ranking algorithm (industry standard)
 * - TF-IDF weighting
 * - Query expansion
 * - Result reranking
 * - Fully offline operation
 */

import { 
  DocumentChunk, 
  DocumentIndex, 
  SearchResult, 
  RAGConfig, 
  DEFAULT_RAG_CONFIG 
} from './types';
import ChunkingService from './ChunkingService';

export class SearchEngine {
  private static instance: SearchEngine;
  private config: RAGConfig;
  private chunkingService: typeof ChunkingService;

  private constructor() {
    this.config = DEFAULT_RAG_CONFIG;
    this.chunkingService = ChunkingService;
  }

  static getInstance(): SearchEngine {
    if (!SearchEngine.instance) {
      SearchEngine.instance = new SearchEngine();
    }
    return SearchEngine.instance;
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<RAGConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Search for relevant chunks using BM25 algorithm
   */
  search(
    query: string,
    chunks: DocumentChunk[],
    index: DocumentIndex
  ): SearchResult[] {
    console.log(`🔍 Searching for: "${query}"`);
    console.log(`  └── Chunks to search: ${chunks.length}`);

    // Check for overview/summary questions - return first chunks
    const overviewPatterns = [
      /what.*(is|are).*(this|it|about|document|chapter|topic)/i,
      /what.*(about|topic|subject)/i,
      /summarize|summary|overview|introduction/i,
      /tell.*about/i,
      /^what is this$/i,
      /main.*topic/i,
    ];

    const isOverviewQuestion = overviewPatterns.some(pattern => pattern.test(query));
    
    if (isOverviewQuestion) {
      console.log('📖 Detected overview question - returning introduction chunks');
      // Return first few chunks (usually chapter intro/overview)
      const introChunks = chunks
        .filter(c => c.pageNumber <= 2) // First 2 pages
        .slice(0, 3); // Top 3 chunks
      
      if (introChunks.length > 0) {
        return introChunks.map((chunk, i) => ({
          chunk,
          score: 10 - i, // High scores for intro
          matchedTerms: ['overview', 'introduction'],
          relevanceReason: 'Document introduction/overview',
        }));
      }
    }

    // Step 1: Tokenize and expand query
    const queryTokens = this.chunkingService.tokenize(query);
    const expandedTokens = this.expandQuery(queryTokens);
    console.log(`  └── Query tokens: ${expandedTokens.join(', ')}`);

    // If no meaningful tokens, fall back to first chunks
    if (expandedTokens.length === 0) {
      console.log('⚠️ No valid search terms, returning first chunks');
      return chunks.slice(0, this.config.topK).map((chunk, i) => ({
        chunk,
        score: 5 - i,
        matchedTerms: [],
        relevanceReason: 'No specific terms matched - showing document start',
      }));
    }

    // Step 2: Calculate BM25 scores for each chunk
    const results: SearchResult[] = [];

    for (const chunk of chunks) {
      const score = this.calculateBM25Score(
        expandedTokens,
        chunk,
        index
      );

      if (score > this.config.minScore) {
        const matchedTerms = this.findMatchedTerms(expandedTokens, chunk.text);
        
        results.push({
          chunk,
          score,
          matchedTerms,
          relevanceReason: this.generateRelevanceReason(matchedTerms, score),
        });
      }
    }

    // Step 3: Sort by score
    results.sort((a, b) => b.score - a.score);

    // Step 4: Rerank if enabled
    const reranked = this.config.reranking
      ? this.rerank(results, query)
      : results;

    // Step 5: Return top K
    const topK = reranked.slice(0, this.config.topK);
    console.log(`✅ Found ${topK.length} relevant chunks`);

    return topK;
  }

  /**
   * Calculate BM25 score for a chunk
   * BM25(D, Q) = Σ IDF(qi) * (f(qi, D) * (k1 + 1)) / (f(qi, D) + k1 * (1 - b + b * |D| / avgdl))
   */
  private calculateBM25Score(
    queryTokens: string[],
    chunk: DocumentChunk,
    index: DocumentIndex
  ): number {
    const k1 = this.config.bm25K1;
    const b = this.config.bm25B;
    const avgdl = index.avgChunkLength;
    const docLength = chunk.wordCount;

    // Get term frequencies for this chunk
    const tf = this.chunkingService.getTermFrequency(chunk.text);

    let score = 0;

    for (const term of queryTokens) {
      // Get IDF (inverse document frequency)
      const idf = index.idf.get(term) || 0;
      if (idf === 0) continue;

      // Get term frequency in this chunk
      const termFreq = tf.get(term) || 0;
      if (termFreq === 0) continue;

      // BM25 formula
      const numerator = termFreq * (k1 + 1);
      const denominator = termFreq + k1 * (1 - b + b * (docLength / avgdl));
      
      score += idf * (numerator / denominator);
    }

    return score;
  }

  /**
   * Expand query with synonyms and related terms
   */
  private expandQuery(tokens: string[]): string[] {
    const expanded = new Set(tokens);

    // Common educational synonyms
    const synonyms: Record<string, string[]> = {
      // Question words
      'define': ['definition', 'meaning', 'explain', 'describe', 'means'],
      'explain': ['describe', 'elaborate', 'clarify', 'definition', 'discuss'],
      'describe': ['explain', 'discuss', 'elaborate', 'definition'],
      
      // Examples and instances
      'example': ['examples', 'instance', 'sample', 'illustration', 'case'],
      'examples': ['example', 'instances', 'cases', 'illustrations'],
      
      // Math/Science
      'calculate': ['compute', 'find', 'determine', 'solve', 'formula'],
      'formula': ['equation', 'formulas', 'equations', 'expression'],
      'solve': ['calculate', 'find', 'compute', 'solution'],
      
      // Comparison
      'difference': ['differences', 'different', 'compare', 'contrast', 'distinguish'],
      'compare': ['comparison', 'contrast', 'differences', 'similarities'],
      
      // Importance and significance
      'importance': ['important', 'significance', 'significant', 'role', 'crucial'],
      'important': ['importance', 'significant', 'crucial', 'key', 'main'],
      
      // Cause and effect
      'cause': ['causes', 'reason', 'reasons', 'why', 'factor'],
      'effect': ['effects', 'result', 'results', 'consequence', 'impact'],
      'why': ['reason', 'cause', 'because', 'explanation'],
      
      // Types and categories
      'type': ['types', 'kind', 'kinds', 'category', 'classification'],
      'types': ['type', 'kinds', 'categories', 'classes', 'forms'],
      
      // Process and method
      'process': ['procedure', 'method', 'steps', 'mechanism', 'how'],
      'method': ['process', 'procedure', 'technique', 'way', 'approach'],
      'steps': ['step', 'procedure', 'process', 'stages'],
      
      // Function and purpose
      'function': ['functions', 'role', 'purpose', 'work', 'job'],
      'purpose': ['function', 'role', 'reason', 'use', 'objective'],
      
      // Structure
      'structure': ['structures', 'anatomy', 'parts', 'components', 'composition'],
      'parts': ['part', 'components', 'structure', 'elements'],
      
      // Properties
      'property': ['properties', 'characteristics', 'features', 'attributes'],
      'characteristics': ['characteristic', 'properties', 'features', 'traits'],
      
      // Biology specific
      'heredity': ['inheritance', 'genetics', 'genes', 'traits', 'inherited'],
      'evolution': ['evolve', 'evolutionary', 'species', 'natural selection'],
      'species': ['organism', 'organisms', 'living', 'creatures'],
      'gene': ['genes', 'genetic', 'dna', 'chromosome', 'heredity'],
      'trait': ['traits', 'characteristics', 'features', 'inherited'],
      'variation': ['variations', 'differences', 'diversity', 'change'],
    };

    for (const token of tokens) {
      const relatedTerms = synonyms[token];
      if (relatedTerms) {
        relatedTerms.forEach(t => expanded.add(t));
      }
    }

    return Array.from(expanded);
  }

  /**
   * Find which query terms matched in the chunk
   */
  private findMatchedTerms(queryTokens: string[], text: string): string[] {
    const lowerText = text.toLowerCase();
    return queryTokens.filter(token => lowerText.includes(token));
  }

  /**
   * Generate human-readable relevance reason
   */
  private generateRelevanceReason(matchedTerms: string[], score: number): string {
    if (matchedTerms.length === 0) {
      return 'Low relevance';
    }

    const relevance = score > 5 ? 'Highly' : score > 2 ? 'Moderately' : 'Somewhat';
    const terms = matchedTerms.slice(0, 3).join(', ');

    return `${relevance} relevant (matches: ${terms})`;
  }

  /**
   * Rerank results based on additional signals
   */
  private rerank(results: SearchResult[], query: string): SearchResult[] {
    // Calculate additional signals for reranking
    const queryWords = query.toLowerCase().split(/\s+/);

    return results.map(result => {
      let boostScore = 0;

      // Boost chunks with headings that match query
      if (result.chunk.metadata.hasHeading) {
        const headingLower = result.chunk.metadata.headingText?.toLowerCase() || '';
        const headingMatches = queryWords.filter(w => headingLower.includes(w)).length;
        boostScore += headingMatches * 0.5;
      }

      // Boost chunks with exact phrase match
      const lowerText = result.chunk.text.toLowerCase();
      const queryLower = query.toLowerCase();
      if (lowerText.includes(queryLower)) {
        boostScore += 2;
      }

      // Boost chunks near the beginning of document (intro/definitions)
      if (result.chunk.chunkIndex < 3) {
        boostScore += 0.3;
      }

      return {
        ...result,
        score: result.score + boostScore,
      };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Build IDF index from chunks
   */
  buildIndex(chunks: DocumentChunk[]): {
    vocabulary: Map<string, number>;
    idf: Map<string, number>;
  } {
    const documentFrequency = new Map<string, Set<number>>();
    const totalDocs = chunks.length;

    // Count which chunks each term appears in
    for (let i = 0; i < chunks.length; i++) {
      const tokens = this.chunkingService.tokenize(chunks[i].text);
      const uniqueTokens = new Set(tokens);

      for (const token of uniqueTokens) {
        if (!documentFrequency.has(token)) {
          documentFrequency.set(token, new Set());
        }
        documentFrequency.get(token)!.add(i);
      }
    }

    // Calculate IDF for each term
    const vocabulary = new Map<string, number>();
    const idf = new Map<string, number>();

    documentFrequency.forEach((docs, term) => {
      const df = docs.size;
      vocabulary.set(term, df);
      // IDF formula: log((N + 1) / (df + 1)) + 1 (smoothed)
      idf.set(term, Math.log((totalDocs + 1) / (df + 1)) + 1);
    });

    console.log(`📊 Built index with ${vocabulary.size} unique terms`);

    return { vocabulary, idf };
  }

  /**
   * Build context string from search results
   */
  buildContext(results: SearchResult[]): string {
    if (results.length === 0) {
      return '';
    }

    // Group by page for better context
    const byPage = new Map<number, SearchResult[]>();
    for (const result of results) {
      const page = result.chunk.pageNumber;
      if (!byPage.has(page)) {
        byPage.set(page, []);
      }
      byPage.get(page)!.push(result);
    }

    // Build context string
    let context = '';
    let tokenCount = 0;
    const maxTokens = this.config.maxContextTokens;

    // Sort pages
    const sortedPages = Array.from(byPage.keys()).sort((a, b) => a - b);

    for (const page of sortedPages) {
      const pageResults = byPage.get(page)!;
      
      for (const result of pageResults) {
        const chunkTokens = this.estimateTokens(result.chunk.text);
        
        if (tokenCount + chunkTokens > maxTokens) {
          break;
        }

        if (this.config.includePageNumbers) {
          context += `[Page ${page}]:\n`;
        }
        context += result.chunk.text + '\n\n';
        tokenCount += chunkTokens;
      }

      if (tokenCount >= maxTokens) break;
    }

    return context.trim();
  }

  /**
   * Estimate token count (rough: 1 token ≈ 4 chars)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

export default SearchEngine.getInstance();

import { groqService } from './groq.service';
import { embeddingService } from './embedding.service';
import { vectorDBService } from './vectordb.service';
import { documentService } from './document.service';
import { languageService } from './language.service';
import { geminiService } from './gemini.service';
import { ChatMessage } from '../types';
import { LanguageCode, SUPPORTED_LANGUAGES } from '../config/constants';
import axios from 'axios';
import env from '../config/env';

export interface QueryDecision {
  shouldStopAtLayer1: boolean;
  isAbusive: boolean;
  isChatHistoryOnly: boolean;
  hasPageNumber: boolean;
  pageNumber?: number;
  isGreeting: boolean;
  reason: string;
}

export class QueryRouterService {
  /**
   * LAYER 1: Gate Keeper & Intent Analyzer
   * Decides what gets passed to next layers
   */
  async analyzeQuery(query: string, chatHistory: ChatMessage[]): Promise<QueryDecision> {
    try {
      const prompt = `Analyze this user query and classify it:

Query: "${query}"

Recent Chat: ${chatHistory.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}

Classify and extract information (JSON format):
{
  "isGreeting": true/false,           // "hi", "hello", "thanks", "bye"
  "isAbusive": true/false,            // Abusive/inappropriate content
  "isChatHistoryOnly": true/false,    // Refers ONLY to previous chat (e.g., "what did you say?", "explain that again")
  "hasPageNumber": true/false,        // Mentions specific page (e.g., "page 5", "on page 10")
  "pageNumber": number or null,       // Extract page number if mentioned
  "needsDocuments": true/false,       // Requires document content to answer
  "reason": "brief explanation"
}

Examples:
- "hi" → isGreeting: true, needsDocuments: false
- "you idiot" → isAbusive: true
- "what did you just say?" → isChatHistoryOnly: true
- "what is on page 5?" → hasPageNumber: true, pageNumber: 5
- "explain photosynthesis" → needsDocuments: true

Response (JSON only):`;

      const response = await groqService.chatCompletion([
        { role: 'user', content: prompt }
      ], 'json_object');

      const analysis = JSON.parse(response);
      
      // Only stop at Layer 1 if it's a greeting/abuse/chat-only AND doesn't need documents
      const shouldStop = (analysis.isGreeting || analysis.isAbusive || analysis.isChatHistoryOnly) 
                         && !analysis.needsDocuments;
      
      return {
        shouldStopAtLayer1: shouldStop,
        isAbusive: analysis.isAbusive || false,
        isChatHistoryOnly: analysis.isChatHistoryOnly || false,
        hasPageNumber: analysis.hasPageNumber || false,
        pageNumber: analysis.pageNumber || undefined,
        isGreeting: analysis.isGreeting || false,
        reason: analysis.reason || 'Query analysis complete',
      };
    } catch (error) {
      console.error('Query analysis error:', error);
      // Safe default - don't stop, proceed to Layer 2/3
      return {
        shouldStopAtLayer1: false,
        isAbusive: false,
        isChatHistoryOnly: false,
        hasPageNumber: false,
        isGreeting: false,
        reason: 'Analysis failed, proceeding to document search',
      };
    }
  }

  /**
   * LAYER 1 Handler: Groq Fast Response
   * Handles simple queries, greetings, invalid questions
   */
  async handleSimpleQuery(
    query: string,
    language: LanguageCode,
    chatHistory: ChatMessage[]
  ): Promise<string> {
    const languageName = SUPPORTED_LANGUAGES[language];
    
    const messages = [
      ...chatHistory.slice(-5).map(m => ({
        role: m.role,
        content: m.content,
      })),
      {
        role: 'user' as const,
        content: `${query}\n\n[Respond in ${languageName}]`,
      }
    ];

    const systemPrompt = `You are a helpful multilingual AI assistant. 

CRITICAL RULES:
1. Respond ONLY in ${languageName} language
2. Provide DIRECT answers - NO intermediate messages
3. For greetings: Be friendly and brief
4. For invalid questions: Politely explain you need a clear question
5. Keep responses concise (2-3 sentences max)

Language: ${languageName}`;

    return await groqService.chatCompletion([
      { role: 'system', content: systemPrompt },
      ...messages
    ]);
  }

  /**
   * LAYER 2 Handler: ChromaDB RAG
   * Document-specific queries with vector search
   */
  async handleDocumentQuery(
    query: string,
    language: LanguageCode,
    chatHistory: ChatMessage[],
    chromaCollectionName: string
  ): Promise<{ answer: string; sources: any[] }> {
    const languageName = SUPPORTED_LANGUAGES[language];

    // 1. Generate query embedding
    const queryEmbedding = await embeddingService.generateEmbedding(query);

    // 2. Search ChromaDB
    const searchResults = await vectorDBService.queryChunks(
      queryEmbedding,
      5,
      chromaCollectionName
    );

    // 3. Filter by distance and language
    const relevantChunks = searchResults.documents
      .map((doc, idx) => ({
        document: doc,
        metadata: searchResults.metadatas[idx],
        distance: searchResults.distances[idx],
      }))
      .filter(r => {
        const chunkLang = r.metadata.language || 'en';
        return r.distance < 0.6 && (chunkLang === language || chunkLang === 'en');
      })
      .slice(0, 3);

    if (relevantChunks.length === 0) {
      return {
        answer: language === 'en' 
          ? "I couldn't find relevant information in your documents. Could you rephrase your question?"
          : `मुझे आपके दस्तावेज़ों में प्रासंगिक जानकारी नहीं मिली। क्या आप अपना प्रश्न दोबारा लिख सकते हैं?`,
        sources: [],
      };
    }

    // 4. Build context
    const documentContext = relevantChunks.map(r => r.document).join('\n\n---\n\n');
    
    // 5. Get sources
    const sources = relevantChunks.map(r => ({
      pdfName: r.metadata.fileName,
      pageNo: r.metadata.page || 1,
      snippet: r.document.substring(0, 100),
    }));

    // 6. Generate answer with Groq
    const answer = await groqService.generateEducationalAnswer(
      documentContext,
      chatHistory,
      query,
      language,
      sources
    );

    return {
      answer: answer.answer,
      sources,
    };
  }

  /**
   * LAYER 3 Handler: Gemini Flash (Large Context) - ENHANCED WITH GEMINI-STYLE ORCHESTRATION
   * 
   * This now uses the same strategy as Gemini's document handling:
   * - Strategy 1: Full document context (for small docs <100 pages)
   * - Strategy 2: Smart chunking (for medium docs 100-500 pages)
   * - Strategy 3: Agentic decomposition (for complex queries)
   */
  async handleComplexQuery(
    query: string,
    language: LanguageCode,
    chatHistory: ChatMessage[],
    chromaCollectionName: string
  ): Promise<{ answer: string; sources: any[]; strategy?: string }> {
    const languageName = SUPPORTED_LANGUAGES[language];

    try {
      // 1. Get query embedding to find relevant documents
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      // 2. Search ChromaDB to identify which documents are relevant
      const searchResults = await vectorDBService.queryChunks(
        queryEmbedding,
        10,
        chromaCollectionName
      );

      // 3. Get unique fileIds from search results
      const fileIds = [...new Set(searchResults.metadatas.map(m => m.fileId))];
      
      if (fileIds.length === 0) {
        return {
          answer: language === 'en' 
            ? "I couldn't find any relevant documents. Please upload documents first."
            : "मुझे कोई प्रासंगिक दस्तावेज़ नहीं मिला। कृपया पहले दस्तावेज़ अपलोड करें।",
          sources: [],
          strategy: 'NO_DOCUMENTS',
        };
      }

      // 4. Get FULL document content from MongoDB (page-wise)
      const pagesMap = await documentService.getPagesByFileIds(fileIds);
      
      // 5. Decide strategy based on document size and query complexity
      const totalPages = Array.from(pagesMap.values()).reduce((sum, pages) => sum + pages.length, 0);
      const isComplexQuery = this.isComplexQuery(query);

      console.log(`📊 Document Stats: ${fileIds.length} files, ${totalPages} total pages`);
      console.log(`🧠 Query Type: ${isComplexQuery ? 'Complex (needs decomposition)' : 'Standard'}`);

      let result: { answer: string; strategy: string; pagesUsed?: number[] };

      // STRATEGY SELECTION (Gemini-style orchestration)
      if (totalPages <= 50 && !isComplexQuery) {
        // STRATEGY 1: Full Document Context (best for small docs)
        console.log(`🎯 Using Strategy 1: FULL DOCUMENT CONTEXT`);
        
        const fullContent = this.combineDocuments(pagesMap);
        const firstFileId = fileIds[0];
        const firstFileName = searchResults.metadatas.find(m => m.fileId === firstFileId)?.fileName || 'Document';
        
        const geminiResult = await geminiService.queryWithFullDocument(
          query,
          fullContent,
          language,
          chatHistory,
          {
            fileName: firstFileName,
            totalPages,
          }
        );

        result = {
          answer: geminiResult.answer,
          strategy: geminiResult.strategy,
        };

      } else if (isComplexQuery) {
        // STRATEGY 3: Agentic Decomposition (for complex queries)
        console.log(`🎯 Using Strategy 3: AGENTIC DECOMPOSITION`);
        
        // Get pages from first document
        const firstFilePages = Array.from(pagesMap.values())[0];
        const firstFileName = searchResults.metadatas.find(m => m.fileId === fileIds[0])?.fileName || 'Document';
        
        const agenticResult = await geminiService.queryWithAgenticDecomposition(
          query,
          firstFilePages,
          language,
          chatHistory,
          { fileName: firstFileName }
        );

        result = {
          answer: agenticResult.answer,
          strategy: agenticResult.strategy,
          pagesUsed: agenticResult.pagesUsed,
        };

      } else {
        // STRATEGY 2: Smart Chunking (for larger docs)
        console.log(`🎯 Using Strategy 2: SMART CHUNKING`);
        
        const firstFilePages = Array.from(pagesMap.values())[0];
        const firstFileName = searchResults.metadatas.find(m => m.fileId === fileIds[0])?.fileName || 'Document';
        
        const chunkingResult = await geminiService.queryWithSmartChunking(
          query,
          firstFilePages,
          language,
          chatHistory,
          { fileName: firstFileName }
        );

        result = {
          answer: chunkingResult.answer,
          strategy: chunkingResult.strategy,
          pagesUsed: chunkingResult.pagesUsed,
        };
      }

      // 6. Build sources from search results
      let sources = searchResults.documents.slice(0, 5).map((doc, idx) => ({
        pdfName: searchResults.metadatas[idx].fileName,
        pageNo: searchResults.metadatas[idx].page || 1,
        snippet: doc.substring(0, 100),
      }));

      // 7. Intelligent source filtering: Remove sources if answer indicates "not found in document"
      if (this.isNotFoundInDocument(result.answer)) {
        console.log(`⚠️  Answer indicates information not in document - removing sources`);
        sources = [];
      }

      console.log(`✅ Answer generated using ${result.strategy}`);

      return {
        answer: result.answer,
        sources,
        strategy: result.strategy,
      };

    } catch (error: any) {
      console.error('❌ Complex query handler error:', error.message);
      
      // Graceful fallback to Layer 2 (ChromaDB RAG)
      console.log('🔄 Falling back to Layer 2 (ChromaDB RAG)...');
      return await this.handleDocumentQuery(query, language, chatHistory, chromaCollectionName);
    }
  }

  /**
   * Helper: Determine if query is complex (needs decomposition)
   */
  private isComplexQuery(query: string): boolean {
    const complexPatterns = [
      /compare.*and/i,
      /difference.*between/i,
      /summarize.*chapter.*and/i,
      /explain.*considering/i,
      /relate.*to/i,
      /contrast/i,
      /both.*and/i,
      /first.*then/i,
    ];

    return complexPatterns.some(pattern => pattern.test(query));
  }

  /**
   * Helper: Remove intermediate thinking phrases from answer
   * Last resort cleanup if LLM still generates these despite prompts
   */
  private cleanIntermediateMessages(answer: string): string {
    const intermediatePatterns = [
      /^Let me search.*?\.\s*/i,
      /^I'm searching.*?\.\s*/i,
      /^I'm analyzing.*?\.\s*/i,
      /^I'm looking.*?\.\s*/i,
      /^Searching the document.*?\.\s*/i,
      /^Looking through.*?\.\s*/i,
      /^Let me check.*?\.\s*/i,
      /^मुझे खोजने दें.*?\.\s*/i, // Hindi
      /^मैं खोज रहा हूं.*?\.\s*/i, // Hindi
    ];

    let cleaned = answer;
    for (const pattern of intermediatePatterns) {
      cleaned = cleaned.replace(pattern, '');
    }
    
    return cleaned.trim();
  }

  /**
   * Helper: Detect if answer indicates information not found in documents
   */
  private isNotFoundInDocument(answer: string): boolean {
    const notFoundPatterns = [
      /not mentioned in.*document/i,
      /cannot find.*in.*document/i,
      /not available in.*document/i,
      /couldn't find.*in.*document/i,
      /no information.*in.*document/i,
      /not.*in the provided document/i,
      /not discussed in.*document/i,
      /not covered in.*document/i,
      /दस्तावेज़ में नहीं मिला/i, // Hindi: not found in document
      /दस्तावेज़ में उल्लेख नहीं/i, // Hindi: not mentioned in document
    ];

    return notFoundPatterns.some(pattern => pattern.test(answer));
  }

  /**
   * Helper: Combine documents from pagesMap into single string
   */
  private combineDocuments(pagesMap: Map<string, Array<{ pageNumber: number; content: string }>>): string {
    const allContent: string[] = [];

    for (const [fileId, pages] of pagesMap.entries()) {
      const sortedPages = pages.sort((a, b) => a.pageNumber - b.pageNumber);
      const fileContent = sortedPages
        .map(p => `[Page ${p.pageNumber}]\n${p.content}`)
        .join('\n\n');
      allContent.push(fileContent);
    }

    return allContent.join('\n\n=== DOCUMENT BREAK ===\n\n');
  }

  /**
   * Main routing method
   */
  async routeQuery(
    query: string,
    chatHistory: ChatMessage[],
    chromaCollectionName: string
  ): Promise<{ answer: string; sources: any[]; layer: string; reasoning: string }> {
    // 1. Detect language first
    const detectedLang = languageService.detectLanguage(query);
    const language = detectedLang.languageCode as LanguageCode;
    
    console.log(`🌐 Detected language: ${detectedLang.language} (${language})`);

    // 2. Analyze query to decide routing
    const decision = await this.analyzeQuery(query, chatHistory);
    
    console.log(`🎯 Routing decision: ${decision.shouldStopAtLayer1 ? 'LAYER1' : 'LAYER2/3'} - ${decision.reason}`);

    let result: { answer: string; sources: any[] };
    let usedLayer: string;

    // 3. Route to appropriate layer
    if (decision.shouldStopAtLayer1) {
      // LAYER 1: Simple/fast response
      const simpleAnswer = await this.handleSimpleQuery(query, language, chatHistory);
      result = { answer: simpleAnswer, sources: [] };
      usedLayer = 'LAYER1-GROQ-FAST';
    } else {
      // LAYER 2/3: Document search with Gemini
      result = await this.handleComplexQuery(query, language, chatHistory, chromaCollectionName);
      usedLayer = 'LAYER3-GEMINI';
    }

    // 4. Clean any intermediate messages (last resort failsafe)
    const cleanedAnswer = this.cleanIntermediateMessages(result.answer);
    if (cleanedAnswer !== result.answer) {
      console.log(`🧹 Cleaned intermediate message from answer`);
    }

    return {
      answer: cleanedAnswer,
      sources: result.sources,
      layer: usedLayer,
      reasoning: decision.reason,
    };
  }
}

export const queryRouterService = new QueryRouterService();

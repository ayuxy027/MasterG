import axios from 'axios';
import { SUPPORTED_LANGUAGES, LanguageCode } from '../config/constants';
import { ChatMessage, SourceCitation } from '../types';
import env from '../config/env';

/**
 * GEMINI-STYLE DOCUMENT ORCHESTRATION SERVICE
 * 
 * This service handles documents like Gemini does:
 * 1. Upload Phase: Ingest full document (not just chunks)
 * 2. Query Phase: Model has FULL document context
 * 3. No explicit retrieval - model already knows the document
 * 
 * Benefits:
 * - Better understanding (full context, not just chunks)
 * - Graceful handling of complex queries
 * - Can answer "compare chapter 1 and 3" easily
 * - Maintains document structure awareness
 */

export class GeminiService {
  private apiKey: string;
  private apiUrl: string = 'https://generativelanguage.googleapis.com/v1beta';
  private model: string = 'gemini-2.0-flash-exp';

  constructor() {
    this.apiKey = env.GEMINI_API_KEY;
  }

  /**
   * STRATEGY 1: Full Document Context (Gemini-style)
   * Best for: Queries requiring full document understanding
   * Context: Up to 1M tokens (can fit entire books)
   */
  async queryWithFullDocument(
    query: string,
    fullDocumentContent: string,
    language: LanguageCode,
    chatHistory: ChatMessage[],
    documentMetadata?: {
      fileName: string;
      totalPages: number;
      language?: string;
    }
  ): Promise<{ answer: string; strategy: string }> {
    const languageName = SUPPORTED_LANGUAGES[language];

    // Build chat context
    const chatContext = chatHistory.length > 0
      ? chatHistory.slice(-10).map(m => `${m.role === 'user' ? 'Student' : 'Assistant'}: ${m.content}`).join('\n')
      : '';

    // Build comprehensive prompt with FULL document
    const prompt = `You are an expert educational tutor. Answer the question directly based on the complete document provided.

📚 DOCUMENT CONTENT:
${documentMetadata ? `File: ${documentMetadata.fileName} (${documentMetadata.totalPages} pages)` : ''}

${fullDocumentContent}

${'='.repeat(80)}

${chatContext ? `Previous conversation:\n${chatContext}\n` : ''}

Question: ${query}

CRITICAL - DO NOT:
- Say "Let me search", "Let me analyze", "I'm looking", "Searching"
- Provide intermediate thinking steps
- Explain your process

CRITICAL - DO:
- Start IMMEDIATELY with the answer
- Answer in ${languageName}
- Cite page numbers when relevant
- Be direct and thorough

Start your answer NOW in ${languageName}:`;

    try {
      const response = await axios.post(
        `${this.apiUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
            topP: 0.95,
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_NONE',
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_NONE',
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_NONE',
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_NONE',
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const answer = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 
        'Unable to generate response. Please try again.';

      return {
        answer,
        strategy: 'FULL_DOCUMENT_CONTEXT',
      };
    } catch (error: any) {
      console.error('❌ Gemini API error:', error.response?.data || error.message);
      throw new Error(`Gemini service failed: ${error.message}`);
    }
  }

  /**
   * STRATEGY 2: Hybrid Approach - Smart Document Chunking
   * When document is too large for single context window
   * 
   * Process:
   * 1. Analyze query to understand what sections are needed
   * 2. Extract only relevant sections (intelligent sampling)
   * 3. Pass focused content to Gemini
   */
  async queryWithSmartChunking(
    query: string,
    documentPages: Array<{ pageNumber: number; content: string }>,
    language: LanguageCode,
    chatHistory: ChatMessage[],
    documentMetadata?: {
      fileName: string;
      language?: string;
    }
  ): Promise<{ answer: string; strategy: string; pagesUsed: number[] }> {
    const languageName = SUPPORTED_LANGUAGES[language];

    // Step 1: Analyze query to determine which pages/sections are relevant
    const relevantPages = await this.identifyRelevantPages(
      query,
      documentPages,
      language
    );

    // Step 2: Build focused context with only relevant pages
    const focusedContent = relevantPages
      .sort((a, b) => a.pageNumber - b.pageNumber)
      .map(p => `[Page ${p.pageNumber}]\n${p.content}`)
      .join('\n\n' + '='.repeat(80) + '\n\n');

    // Step 3: Query with focused content
    const chatContext = chatHistory.length > 0
      ? chatHistory.slice(-10).map(m => `${m.role === 'user' ? 'Student' : 'Assistant'}: ${m.content}`).join('\n')
      : '';

    const prompt = `You are an expert educational tutor. Answer directly based on the relevant pages from the document.

📚 RELEVANT PAGES FROM "${documentMetadata?.fileName || 'Document'}":
${focusedContent}

${chatContext ? `Previous conversation:\n${chatContext}\n` : ''}

Question: ${query}

DO NOT say: "Let me", "I'm searching", "analyzing", "looking"
DO: Start with the answer immediately

Your direct answer in ${languageName}:`;

    try {
      const response = await axios.post(
        `${this.apiUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 3072,
          },
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
        }
      );

      const answer = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 
        'Unable to generate response.';

      return {
        answer,
        strategy: 'SMART_CHUNKING',
        pagesUsed: relevantPages.map(p => p.pageNumber),
      };
    } catch (error: any) {
      console.error('❌ Smart chunking error:', error.response?.data || error.message);
      throw new Error(`Smart chunking failed: ${error.message}`);
    }
  }

  /**
   * STRATEGY 3: Agentic Multi-Step Query Decomposition
   * For complex queries like "compare chapter 1 and 3, then summarize differences"
   * 
   * Process:
   * 1. Break down complex query into sub-queries
   * 2. Execute each sub-query with relevant document sections
   * 3. Synthesize final answer from all sub-answers
   */
  async queryWithAgenticDecomposition(
    query: string,
    documentPages: Array<{ pageNumber: number; content: string }>,
    language: LanguageCode,
    chatHistory: ChatMessage[],
    documentMetadata?: {
      fileName: string;
    }
  ): Promise<{ answer: string; strategy: string; subQueries: string[]; pagesUsed: number[] }> {
    const languageName = SUPPORTED_LANGUAGES[language];

    // Step 1: Decompose complex query into sub-queries
    const decomposition = await this.decomposeQuery(query, documentPages.length, language);

    // Step 2: Execute each sub-query
    const subAnswers: Array<{ query: string; answer: string; pages: number[] }> = [];
    
    for (const subQuery of decomposition.subQueries) {
      const relevantPages = await this.identifyRelevantPages(
        subQuery.query,
        documentPages,
        language
      );

      const pageContent = relevantPages
        .map(p => `[Page ${p.pageNumber}]\n${p.content}`)
        .join('\n\n');

      const subPrompt = `Document Content:\n${pageContent}\n\nQuestion: ${subQuery.query}\n\nAnswer in ${languageName}:`;

      const response = await axios.post(
        `${this.apiUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          contents: [{ parts: [{ text: subPrompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 1536 },
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 20000 }
      );

      const subAnswer = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No answer';
      
      subAnswers.push({
        query: subQuery.query,
        answer: subAnswer,
        pages: relevantPages.map(p => p.pageNumber),
      });
    }

    // Step 3: Synthesize final answer
    const synthesisPrompt = `Combine these sub-answers into ONE comprehensive answer.

ORIGINAL QUESTION: ${query}

SUB-ANSWERS:
${subAnswers.map((sa, idx) => `
Sub-question ${idx + 1}: ${sa.query}
Answer: ${sa.answer}
Pages used: ${sa.pages.join(', ')}
`).join('\n' + '='.repeat(60) + '\n')}

DO NOT: Say "Let me", "I'm analyzing", "Searching"
DO: Provide the final answer immediately in ${languageName}

Final answer NOW in ${languageName}:`;

    const finalResponse = await axios.post(
      `${this.apiUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        contents: [{ parts: [{ text: synthesisPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
    );

    const finalAnswer = finalResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || 
      subAnswers.map(sa => sa.answer).join('\n\n');

    const allPagesUsed = [...new Set(subAnswers.flatMap(sa => sa.pages))].sort((a, b) => a - b);

    return {
      answer: finalAnswer,
      strategy: 'AGENTIC_DECOMPOSITION',
      subQueries: decomposition.subQueries.map(sq => sq.query),
      pagesUsed: allPagesUsed,
    };
  }

  /**
   * Helper: Identify relevant pages for a query
   * Uses semantic understanding to find which pages contain information for the query
   */
  private async identifyRelevantPages(
    query: string,
    documentPages: Array<{ pageNumber: number; content: string }>,
    language: LanguageCode
  ): Promise<Array<{ pageNumber: number; content: string }>> {
    // For short documents, return all pages
    if (documentPages.length <= 5) {
      return documentPages;
    }

    // Quick analysis: Which pages are most relevant?
    const analysisPrompt = `Given this query: "${query}"

And these page summaries:
${documentPages.slice(0, 20).map(p => `Page ${p.pageNumber}: ${p.content.substring(0, 200)}...`).join('\n')}

Return a JSON array of relevant page numbers (maximum 10 pages):
{ "pages": [1, 3, 5] }`;

    try {
      const response = await axios.post(
        `${this.apiUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          contents: [{ parts: [{ text: analysisPrompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 256 },
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
      );

      const resultText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const jsonMatch = resultText.match(/\{[^}]+\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const relevantPageNumbers = parsed.pages || [];
        
        return documentPages.filter(p => relevantPageNumbers.includes(p.pageNumber));
      }
    } catch (error) {
      console.warn('Page identification failed, using first 10 pages');
    }

    // Fallback: Return first 10 pages
    return documentPages.slice(0, 10);
  }

  /**
   * Helper: Decompose complex query into sub-queries
   */
  private async decomposeQuery(
    query: string,
    totalPages: number,
    language: LanguageCode
  ): Promise<{ subQueries: Array<{ query: string; reason: string }> }> {
    const languageName = SUPPORTED_LANGUAGES[language];

    const prompt = `You are a query decomposition expert. Break down this complex query into 2-5 simpler sub-queries.

ORIGINAL QUERY: ${query}
DOCUMENT: ${totalPages} pages

EXAMPLES:
Query: "Compare chapter 1 and 3"
Sub-queries:
1. "Summarize the main points of chapter 1"
2. "Summarize the main points of chapter 3"
3. "What are the key differences between these summaries?"

Query: "Explain the conclusion considering the introduction"
Sub-queries:
1. "What are the key points in the introduction?"
2. "What does the conclusion state?"
3. "How does the conclusion relate to the introduction?"

Now decompose this query into JSON format:
{
  "subQueries": [
    { "query": "...", "reason": "..." },
    { "query": "...", "reason": "..." }
  ]
}`;

    try {
      const response = await axios.post(
        `${this.apiUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
      );

      const resultText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      }
    } catch (error) {
      console.warn('Query decomposition failed, using original query');
    }

    // Fallback: Use original query
    return {
      subQueries: [{ query, reason: 'Original query used as-is' }],
    };
  }
}

export const geminiService = new GeminiService();

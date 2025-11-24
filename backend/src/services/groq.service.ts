import axios from 'axios';
import { SUPPORTED_LANGUAGES, LanguageCode } from '../config/constants';
import { ChatMessage, SourceCitation } from '../types';
import env from '../config/env';

export class GroqService {
  private apiKey: string;
  private model: string;
  private apiUrl: string = 'https://api.groq.com/openai/v1/chat/completions';

  constructor() {
    this.apiKey = env.GROQ_API_KEY;
    this.model = env.GROQ_MODEL;
  }

  /**
   * Build educational prompt for student learning
   * Best practices: RAG with chat context, source awareness, educational tone
   * NOW WITH MULTILINGUAL SUPPORT
   */
  private buildEducationalPrompt(
    documentContext: string,
    chatHistory: ChatMessage[],
    question: string,
    language: LanguageCode,
    sources: SourceCitation[]
  ): string {
    const languageName = SUPPORTED_LANGUAGES[language];
    const hasDocuments = documentContext && documentContext.trim().length > 0;

    // Format chat history (last 10 messages for context)
    const chatContextString = chatHistory.length > 0
      ? chatHistory.slice(-10).map(msg => {
          const role = msg.role === 'user' ? 'Student' : 'You';
          return `${role}: ${msg.content}`;
        }).join('\n')
      : '';

    // Format source citations with page references
    const sourcesString = sources.length > 0
      ? sources.map((s, idx) => 
          `[Source ${idx + 1}] "${s.pdfName}" - Page ${s.pageNo}`
        ).join('\n')
      : '';

    // Build prompt based on whether we have document context
    if (hasDocuments) {
      // Has PDF chunks - provide detailed educational answer
      return `You are an expert educational tutor. Answer the question directly based on the document content.

DOCUMENT CONTENT:
${documentContext}

SOURCES:
${sourcesString}

${chatContextString ? `Previous conversation:\n${chatContextString}\n` : ''}

Question: ${question}

DO NOT say: "Let me search", "Let me analyze", "I'm looking", "Searching the document"
DO: Start IMMEDIATELY with the answer in ${languageName}

Cite sources like: "According to ${sources[0]?.pdfName || 'the document'}, Page X..."

Start your answer NOW in ${languageName}:`;
    } else {
      // No PDF chunks - provide general educational answer or decline
      return `You are an educational assistant. The student has asked a question but no relevant documents were found.

${chatContextString ? `Previous conversation:\n${chatContextString}\n` : ''}

Question: ${question}

DO NOT say: "Let me", "Searching", "Looking", "Analyzing"
DO: Answer immediately in ${languageName}

If educational: Provide answer + note "This is general knowledge as it's not in your documents."
If NOT educational: Politely decline

Answer NOW in ${languageName}:`;
    }
  }

  /**
   * Generate educational answer using RAG + Chat Context
   * Handles both cases: with PDF chunks and without (general educational queries)
   */
  async generateEducationalAnswer(
    documentContext: string,
    chatHistory: ChatMessage[],
    question: string,
    language: LanguageCode,
    sources: SourceCitation[]
  ): Promise<{ answer: string; reasoning?: string }> {
    try {
      const prompt = this.buildEducationalPrompt(
        documentContext,
        chatHistory,
        question,
        language,
        sources
      );

      console.log(`🤖 Generating educational answer with Groq (${this.model})`);

      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert educational tutor specializing in helping students understand academic materials. You explain concepts clearly, provide examples, and ensure deep comprehension.'
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7, // Balanced creativity and accuracy
          max_tokens: 3000, // Longer educational explanations
          top_p: 0.95, // Slightly focused for educational accuracy
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const answer = response.data.choices[0]?.message?.content;

      if (!answer) {
        throw new Error('No response from Groq API');
      }

      return {
        answer: answer.trim(),
        reasoning: this.extractReasoning(answer),
      };
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        console.error('Groq API error:', errorMessage);
        throw new Error(`Groq query failed: ${errorMessage}`);
      }
      console.error('Groq API error:', error.message || error);
      throw new Error(`Groq query failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Generic chat completion method (for router service)
   */
  async chatCompletion(
    messages: Array<{ role: string; content: string }>,
    responseFormat?: 'json_object' | 'text'
  ): Promise<string> {
    try {
      const requestBody: any = {
        model: this.model,
        messages,
        temperature: 0.3,
        max_tokens: 1000,
      };

      if (responseFormat === 'json_object') {
        requestBody.response_format = { type: 'json_object' };
      }

      const response = await axios.post(
        this.apiUrl,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const answer = response.data.choices[0]?.message?.content;

      if (!answer) {
        throw new Error('No response from Groq API');
      }

      return answer.trim();
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        console.error('Groq API error:', errorMessage);
        throw new Error(`Groq chat completion failed: ${errorMessage}`);
      }
      throw new Error(`Groq chat completion failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Backward compatibility alias
   */
  async queryWithContextAndHistory(
    documentContext: string,
    chatHistory: ChatMessage[],
    question: string,
    language: LanguageCode,
    sources: SourceCitation[]
  ): Promise<{ answer: string; reasoning?: string }> {
    return this.generateEducationalAnswer(documentContext, chatHistory, question, language, sources);
  }

  /**
   * Legacy method for backward compatibility
   */
  async queryWithContext(
    context: string,
    question: string,
    language: LanguageCode
  ): Promise<{ answer: string; reasoning?: string }> {
    return this.generateEducationalAnswer(context, [], question, language, []);
  }

  /**
   * Extract reasoning from DeepSeek response (if present)
   */
  private extractReasoning(response: string): string | undefined {
    // DeepSeek R1 often includes reasoning in <think> tags or similar
    const reasoningMatch = response.match(/<think>(.*?)<\/think>/s);
    return reasoningMatch ? reasoningMatch[1].trim() : undefined;
  }

  /**
   * Extract keywords from noisy query using LLM (Llama Guard)
   * This is a LIGHTWEIGHT extraction - fast and precise
   */
  async extractKeywords(query: string): Promise<string[]> {
    try {
      const prompt = `Extract ONLY the technical/educational keywords from this query. Ignore filler words and random content.

Query: "${query}"

Return ONLY a comma-separated list of important keywords (3-5 words max). If no meaningful keywords exist, return "NONE".

Example 1:
Query: "there was a farmer have a dog bingo displacement reaction"
Keywords: displacement reaction

Example 2:
Query: "explain redox reaction"
Keywords: redox reaction

Example 3:
Query: "what is photosynthesis and how does it work"
Keywords: photosynthesis

Keywords:`;

      const response = await axios.post(
        this.apiUrl,
        {
          model: 'llama-3.1-8b-instant', // Fast, lightweight model for extraction
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.1, // Low temperature for consistent extraction
          max_tokens: 50, // Short response
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 second timeout
        }
      );

      const extractedText = response.data.choices[0]?.message?.content?.trim() || 'NONE';
      
      if (extractedText === 'NONE' || extractedText.toLowerCase() === 'none') {
        return [];
      }

      // Split by comma and clean
      const keywords = extractedText
        .split(',')
        .map(k => k.trim().toLowerCase())
        .filter(k => k.length > 0);

      console.log(`🤖 LLM extracted keywords: [${keywords.join(', ')}]`);
      return keywords;

    } catch (error: any) {
      console.error('⚠️ LLM keyword extraction failed:', error.response?.data || error.message);
      return []; // Return empty on failure, don't break the flow
    }
  }

  /**
   * Validate language code
   */
  validateLanguage(language: string): language is LanguageCode {
    return language in SUPPORTED_LANGUAGES;
  }
}

export const groqService = new GroqService();

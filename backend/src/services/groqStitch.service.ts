import axios from 'axios';
import { env } from '../config/env';

const KIMI_K2_MODEL = 'moonshotai/kimi-k2-instruct-0905';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

interface GroqStitchStreamChunk {
  type: 'thinking' | 'response' | 'complete' | 'error';
  content?: string;
  thinkingText?: string;
  error?: string;
}

/**
 * Groq Stitch Service - Cloud API for content generation
 * Uses Kimi K2 model via Groq infrastructure
 */
export class GroqStitchService {
  private apiKey: string | null = null;

  private getApiKey(): string {
    if (!this.apiKey) {
      this.apiKey = process.env.GROQ_API_KEY || env.GROQ_API_KEY || '';
      if (!this.apiKey) {
        throw new Error('GROQ_API_KEY is not configured. Set it in environment variables.');
      }
    }
    return this.apiKey;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if Groq API is available
   */
  async checkConnection(): Promise<boolean> {
    try {
      const apiKey = this.getApiKey();
      // Test with a minimal request
      await axios.post(
        GROQ_API_URL,
        {
          model: KIMI_K2_MODEL,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 5,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }
      );
      return true;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        // Rate limit - still consider it "connected" but warn
        console.warn('Groq API rate limit detected during connection check');
        return true; // Still connected, just rate limited
      }
      console.error('Groq connection check failed:', error);
      return false;
    }
  }

  /**
   * Generate content with streaming support
   */
  async *generateStream(
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): AsyncGenerator<GroqStitchStreamChunk, void, unknown> {
    try {
      const apiKey = this.getApiKey();
      const response = await axios.post(
        GROQ_API_URL,
        {
          model: KIMI_K2_MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are an expert Indian educator specializing in NCERT, CBSE, and State Board curricula. You have FULL CAPABILITY to include complex mathematical equations, expressions, scientific notation, chemical formulas, and advanced mathematical symbols. Generate comprehensive, well-structured educational content in perfect markdown format. FREELY use mathematical notation, equations, and expressions when appropriate.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: options?.temperature || 0.7,
          max_tokens: options?.maxTokens || 4096,
          stream: true,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
          timeout: 120000, // 2 minutes for long content
        }
      );

      let accumulatedContent = '';
      let buffer = '';

      for await (const chunk of response.data) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices?.[0]?.delta?.content || '';
              if (content) {
                accumulatedContent += content;
                yield {
                  type: 'response',
                  content,
                };
              }
            } catch (e) {
              // Skip invalid JSON lines
              continue;
            }
          }
        }
      }

      // Send completion
      yield {
        type: 'complete',
        content: accumulatedContent,
        thinkingText: '', // Groq doesn't provide thinking stream
      };
    } catch (error) {
      console.error('Groq stream generation error:', error);
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Content generation failed',
      };
    }
  }

  /**
   * Generate content without streaming
   */
  async generateTextContent(
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    try {
      const apiKey = this.getApiKey();
      const response = await axios.post(
        GROQ_API_URL,
        {
          model: KIMI_K2_MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are an expert Indian educator specializing in NCERT, CBSE, and State Board curricula. You have FULL CAPABILITY to include complex mathematical equations, expressions, scientific notation, chemical formulas, and advanced mathematical symbols. Generate comprehensive, well-structured educational content in perfect markdown format. FREELY use mathematical notation, equations, and expressions when appropriate.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: options?.temperature || 0.7,
          max_tokens: options?.maxTokens || 4096,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 120000, // 2 minutes
        }
      );

      return response.data.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Groq text generation error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Content generation failed'
      );
    }
  }
}

export const groqStitchService = new GroqStitchService();


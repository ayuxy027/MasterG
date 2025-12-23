import axios from 'axios';
import { env } from '../config/env';

const KIMI_K2_MODEL = 'moonshotai/kimi-k2-instruct-0905';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Groq Translation Service - Cloud API for translation
 * Uses Kimi K2 model via Groq infrastructure
 */
export class GroqTranslationService {
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
   * Translate text using Groq/Kimi K2 with retry logic for rate limits
   */
  async translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    retryCount = 0
  ): Promise<string> {
    const MAX_RETRIES = 3;
    const INITIAL_RETRY_DELAY = 2000; // 2 seconds

    try {
      const apiKey = this.getApiKey();

      // Get language names for better prompts
      const sourceLangName = this.getLanguageName(sourceLanguage);
      const targetLangName = this.getLanguageName(targetLanguage);

      const response = await axios.post(
        GROQ_API_URL,
        {
          model: KIMI_K2_MODEL,
          messages: [
            {
              role: 'system',
              content: `You are an expert translator specializing in educational content. Translate the given text accurately while preserving:
- Technical terms and scientific notation
- Mathematical formulas and equations
- Proper formatting and structure
- Educational context and clarity
- Markdown formatting if present`,
            },
            {
              role: 'user',
              content: `Translate the following text from ${sourceLangName} to ${targetLangName}. Preserve all formatting, technical terms, and mathematical expressions exactly as they appear:

${text}`,
            },
          ],
          temperature: 0.3, // Lower temperature for more accurate translation
          max_tokens: 4096,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 120000, // 2 minutes
        }
      );

      return response.data.choices[0]?.message?.content || text;
    } catch (error) {
      // Handle rate limit (429) with exponential backoff retry
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        if (retryCount < MAX_RETRIES) {
          const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
          console.warn(
            `Groq API rate limit hit (429). Retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})...`
          );
          await this.sleep(retryDelay);
          return this.translate(text, sourceLanguage, targetLanguage, retryCount + 1);
        } else {
          throw new Error(
            'Groq API rate limit exceeded. Please try again in a few moments or switch to local mode (NLLB).'
          );
        }
      }

      // Handle other errors
      console.error('Groq translation error:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Groq API authentication failed. Please check your GROQ_API_KEY.');
        } else if (error.response?.status === 403) {
          throw new Error('Groq API access forbidden. Please check your API key permissions.');
        } else if (error.response?.status) {
          throw new Error(
            `Groq API error (${error.response.status}): ${error.response.data?.error?.message || error.message}`
          );
        }
      }

      throw new Error(
        error instanceof Error ? error.message : 'Translation failed'
      );
    }
  }

  /**
   * Get language name from code
   */
  private getLanguageName(code: string): string {
    const languageMap: Record<string, string> = {
      'en': 'English',
      'hi': 'Hindi',
      'bn': 'Bengali',
      'te': 'Telugu',
      'mr': 'Marathi',
      'ta': 'Tamil',
      'ur': 'Urdu',
      'gu': 'Gujarati',
      'kn': 'Kannada',
      'or': 'Odia',
      'pa': 'Punjabi',
      'ml': 'Malayalam',
      'as': 'Assamese',
      'ne': 'Nepali',
      'si': 'Sinhala',
      'my': 'Myanmar',
      'th': 'Thai',
      'lo': 'Lao',
      'km': 'Khmer',
      'vi': 'Vietnamese',
      'id': 'Indonesian',
      'ms': 'Malay',
      'tl': 'Filipino',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean',
      'fr': 'French',
      'de': 'German',
      'es': 'Spanish',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ar': 'Arabic',
    };
    return languageMap[code] || code;
  }
}

export const groqTranslationService = new GroqTranslationService();


/**
 * Language Detection Service
 * Autonomous language detection for multilingual PDF support
 */

// Supported Indian languages (22 official languages + English)
export const SUPPORTED_LANGUAGES = {
  // Major Indian Languages
  hi: 'Hindi',
  mr: 'Marathi',
  gu: 'Gujarati',
  bn: 'Bengali',
  ta: 'Tamil',
  te: 'Telugu',
  kn: 'Kannada',
  ml: 'Malayalam',
  pa: 'Punjabi',
  ur: 'Urdu',
  or: 'Odia',
  as: 'Assamese',
  ks: 'Kashmiri',
  kok: 'Konkani',
  mai: 'Maithili',
  mni: 'Manipuri',
  ne: 'Nepali',
  sa: 'Sanskrit',
  sd: 'Sindhi',
  sat: 'Santali',
  brx: 'Bodo',
  doi: 'Dogri',
  en: 'English',
} as const;

export type SupportedLanguageCode = keyof typeof SUPPORTED_LANGUAGES;

interface LanguageDetectionResult {
  language: string;
  languageCode: SupportedLanguageCode | 'unknown';
  confidence: number;
  isSupported: boolean;
}

class LanguageService {
  /**
   * Detect language from text using simple heuristics
   * This is a lightweight approach - for production, consider using franc or Google Cloud Translation API
   */
  detectLanguage(text: string): LanguageDetectionResult {
    if (!text || text.trim().length === 0) {
      return {
        language: 'Unknown',
        languageCode: 'unknown',
        confidence: 0,
        isSupported: false,
      };
    }

    // Unicode range detection for Indian scripts
    const scriptPatterns = {
      // Devanagari (Hindi, Marathi, Sanskrit, Nepali, Konkani)
      // Check for Devanagari characters - will return 'mr' for Marathi by default
      mr: /[\u0900-\u097F]/,
      // Bengali/Assamese
      bn: /[\u0980-\u09FF]/,
      // Gujarati
      gu: /[\u0A80-\u0AFF]/,
      // Gurmukhi (Punjabi)
      pa: /[\u0A00-\u0A7F]/,
      // Tamil
      ta: /[\u0B80-\u0BFF]/,
      // Telugu
      te: /[\u0C00-\u0C7F]/,
      // Kannada
      kn: /[\u0C80-\u0CFF]/,
      // Malayalam
      ml: /[\u0D00-\u0D7F]/,
      // Odia
      or: /[\u0B00-\u0B7F]/,
      // Urdu (Arabic script)
      ur: /[\u0600-\u06FF]/,
    };

    // First, check for Devanagari and other Indian scripts
    for (const [code, pattern] of Object.entries(scriptPatterns)) {
      if (pattern.test(text)) {
        // Found Indian script - high confidence this is the language
        return {
          language: SUPPORTED_LANGUAGES[code as SupportedLanguageCode] || 'Unknown',
          languageCode: code as SupportedLanguageCode,
          confidence: 0.9, // High confidence for script detection
          isSupported: true,
        };
      }
    }

    // If no Indian script found, it's likely English
    return {
      language: 'English',
      languageCode: 'en',
      confidence: 0.7,
      isSupported: true,
    };
  }

  /**
   * Detect dominant language from multiple chunks
   */
  detectDominantLanguage(texts: string[]): LanguageDetectionResult {
    if (!texts || texts.length === 0) {
      return {
        language: 'Unknown',
        languageCode: 'unknown',
        confidence: 0,
        isSupported: false,
      };
    }

    // Detect language for each chunk
    const detections = texts.map(text => this.detectLanguage(text));

    // Count occurrences of each language
    const languageCounts = new Map<string, { count: number; totalConfidence: number }>();

    detections.forEach(detection => {
      const current = languageCounts.get(detection.languageCode) || { count: 0, totalConfidence: 0 };
      languageCounts.set(detection.languageCode, {
        count: current.count + 1,
        totalConfidence: current.totalConfidence + detection.confidence,
      });
    });

    // Find dominant language
    let dominant: { code: string; count: number; avgConfidence: number } = {
      code: 'en',
      count: 0,
      avgConfidence: 0,
    };

    languageCounts.forEach((data, code) => {
      const avgConfidence = data.totalConfidence / data.count;
      if (data.count > dominant.count || (data.count === dominant.count && avgConfidence > dominant.avgConfidence)) {
        dominant = { code, count: data.count, avgConfidence };
      }
    });

    return {
      language: SUPPORTED_LANGUAGES[dominant.code as SupportedLanguageCode] || 'Unknown',
      languageCode: dominant.code as SupportedLanguageCode,
      confidence: dominant.avgConfidence,
      isSupported: true,
    };
  }

  /**
   * Get language name from code
   */
  getLanguageName(code: string): string {
    return SUPPORTED_LANGUAGES[code as SupportedLanguageCode] || 'Unknown';
  }

  /**
   * Check if language is supported
   */
  isLanguageSupported(code: string): boolean {
    return code in SUPPORTED_LANGUAGES;
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages() {
    return Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => ({
      code,
      name,
    }));
  }

  /**
   * Map common language names to codes
   */
  getLanguageCode(languageName: string): SupportedLanguageCode | null {
    const normalized = languageName.toLowerCase();
    
    for (const [code, name] of Object.entries(SUPPORTED_LANGUAGES)) {
      if (name.toLowerCase() === normalized) {
        return code as SupportedLanguageCode;
      }
    }
    
    return null;
  }
}

export const languageService = new LanguageService();

/**
 * EduLite Mobile AI - Translation Service
 * Handles translation using Sarvam-1 model
 * Supports 10 Indian languages for educational content translation
 */

import { initLlama } from "llama.rn"
import {
  SupportedIndicLanguage,
  TranslationParams,
  TranslationResult,
} from "../../types/ai.types"
import ModelManager from "./ModelManager"

// Define the context type from llama.rn
type LlamaContextType = Awaited<ReturnType<typeof initLlama>>

/**
 * Translation Service using Sarvam-1
 * Purpose: Translate AI-generated responses from English to 10 Indic languages
 * Uses prompt-based translation with Sarvam-1 model
 * NOT for content generation - only for translation
 */
class TranslationService {
  private static instance: TranslationService
  private modelManager: ModelManager

  // Sarvam-1 supports 10 Indian languages + English
  // Languages: Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Odia, Punjabi
  private readonly SUPPORTED_LANGUAGES: Record<
    SupportedIndicLanguage,
    { name: string; script: string; supported: boolean }
  > = {
      // Sarvam-1 SUPPORTED (10 languages)
      eng: { name: "English", script: "Latin", supported: true },
      hin: { name: "Hindi", script: "Devanagari", supported: true },
      ben: { name: "Bengali", script: "Bengali", supported: true },
      tam: { name: "Tamil", script: "Tamil", supported: true },
      tel: { name: "Telugu", script: "Telugu", supported: true },
      mar: { name: "Marathi", script: "Devanagari", supported: true },
      guj: { name: "Gujarati", script: "Gujarati", supported: true },
      kan: { name: "Kannada", script: "Kannada", supported: true },
      mal: { name: "Malayalam", script: "Malayalam", supported: true },
      ori: { name: "Odia", script: "Odia", supported: true },
      pan: { name: "Punjabi", script: "Gurmukhi", supported: true },
      // NOT SUPPORTED by Sarvam-1 (kept for type compatibility)
      asm: { name: "Assamese", script: "Assamese", supported: false },
      brx: { name: "Bodo", script: "Devanagari", supported: false },
      doi: { name: "Dogri", script: "Devanagari", supported: false },
      kas: { name: "Kashmiri", script: "Devanagari", supported: false },
      kok: { name: "Konkani", script: "Devanagari", supported: false },
      mai: { name: "Maithili", script: "Devanagari", supported: false },
      mni: { name: "Manipuri", script: "Bengali", supported: false },
      nep: { name: "Nepali", script: "Devanagari", supported: false },
      san: { name: "Sanskrit", script: "Devanagari", supported: false },
      sat: { name: "Santali", script: "Ol Chiki", supported: false },
      snd: { name: "Sindhi", script: "Arabic", supported: false },
      urd: { name: "Urdu", script: "Arabic", supported: false },
    }

  private constructor() {
    this.modelManager = ModelManager.getInstance()
  }

  static getInstance(): TranslationService {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService()
    }
    return TranslationService.instance
  }

  /**
   * Check if translation model is ready
   */
  isTranslationReady(): boolean {
    return this.modelManager.isTranslationModelReady()
  }

  /**
   * Get list of supported languages (only Sarvam-1 supported ones)
   */
  getSupportedLanguages(): Array<{
    code: SupportedIndicLanguage
    name: string
    script: string
  }> {
    return Object.entries(this.SUPPORTED_LANGUAGES)
      .filter(([_, info]) => info.supported)
      .map(([code, info]) => ({
        code: code as SupportedIndicLanguage,
        name: info.name,
        script: info.script,
      }))
  }

  /**
   * Check if a language is supported by Sarvam-1
   */
  isLanguageSupported(language: string): boolean {
    const langCode = this.normalizeLanguageCode(language)
    if (!langCode) return false
    const langInfo = this.SUPPORTED_LANGUAGES[langCode]
    return langInfo?.supported === true
  }

  /**
   * Normalize language code to ISO 639-2 format
   * Converts 'hindi' -> 'hin', 'tamil' -> 'tam', etc.
   */
  private normalizeLanguageCode(
    language: string
  ): SupportedIndicLanguage | null {
    const langLower = language.toLowerCase()

    // Direct match
    if (langLower in this.SUPPORTED_LANGUAGES) {
      return langLower as SupportedIndicLanguage
    }

    // Common name mappings
    const nameToCode: Record<string, SupportedIndicLanguage> = {
      assamese: "asm",
      bengali: "ben",
      bodo: "brx",
      dogri: "doi",
      english: "eng",
      gujarati: "guj",
      hindi: "hin",
      kannada: "kan",
      kashmiri: "kas",
      konkani: "kok",
      maithili: "mai",
      malayalam: "mal",
      manipuri: "mni",
      marathi: "mar",
      nepali: "nep",
      odia: "ori",
      punjabi: "pan",
      sanskrit: "san",
      santali: "sat",
      sindhi: "snd",
      tamil: "tam",
      telugu: "tel",
      urdu: "urd",
    }

    return nameToCode[langLower] || null
  }

  /**
   * Translate text from English to target Indic language
   * Main method for translating AI-generated responses
   */
  async translate(params: TranslationParams): Promise<TranslationResult> {
    const startTime = Date.now()

    // Validate translation model is loaded
    if (!this.isTranslationReady()) {
      throw new Error(
        "Translation model not initialized. Please load the Sarvam-1 model first."
      )
    }

    const translationModel = this.modelManager.getTranslationModel()
    if (!translationModel) {
      throw new Error("Translation model not available.")
    }

    // Normalize language codes
    const sourceLang =
      this.normalizeLanguageCode(params.sourceLanguage) || "eng"
    const targetLang = this.normalizeLanguageCode(params.targetLanguage)

    if (!targetLang) {
      throw new Error(`Unsupported target language: ${params.targetLanguage}`)
    }

    console.log("🌐 Translating text with Sarvam-1...")
    console.log(
      `  ├── Source: ${sourceLang} (${this.SUPPORTED_LANGUAGES[sourceLang]?.name})`
    )
    console.log(
      `  ├── Target: ${targetLang} (${this.SUPPORTED_LANGUAGES[targetLang]?.name})`
    )
    console.log(`  └── Text length: ${params.text.length} chars`)

    // Check if target language is supported by Sarvam-1
    if (!this.isLanguageSupported(params.targetLanguage)) {
      throw new Error(
        `Language '${params.targetLanguage}' is not supported by Sarvam-1. Supported: Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Odia, Punjabi`
      )
    }

    try {
      // For long content, use chunked translation to prevent cutoffs
      const MAX_CHARS_PER_CHUNK = 500 // ~125 words

      if (params.text.length > MAX_CHARS_PER_CHUNK) {
        console.log("📦 Long content detected, using chunked translation")
        return this.translateLongContent(params, startTime)
      }

      // Build translation prompt optimized for Sarvam-1
      const prompt = this.buildTranslationPrompt(
        params.text,
        sourceLang,
        targetLang,
        params.context
      )

      // Calculate optimal token count for translation
      // Indic scripts need ~3x more tokens than English text
      // Also account for the prompt overhead
      const estimatedTokensNeeded = this.calculateTranslationTokens(params.text, targetLang)

      console.log(`  └── Estimated tokens needed: ${estimatedTokensNeeded}`)

      // Translation-specific inference config for Sarvam-1
      const result = await translationModel.completion(
        {
          prompt: prompt,
          n_predict: estimatedTokensNeeded,
          temperature: 0.2, // Low for accurate translation
          top_p: 0.9,
          top_k: 40,
          stop: ["</s>", "<|end|>", "<|eot_id|>", "\n\n\n", "---", "[/INST]", "\"\"\""],
        },
        () => { }
      )

      const processingTime = Date.now() - startTime
      let translatedText = this.extractTranslation(result.text)

      // Validate translation is complete (not cut off)
      translatedText = this.validateTranslation(translatedText, params.text)

      console.log("✅ Translation completed in", processingTime, "ms")
      console.log(`  └── Output length: ${translatedText.length} chars (input: ${params.text.length})`)

      return {
        originalText: params.text,
        translatedText: translatedText,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        confidence: 0.85, // Sarvam-1 prompt-based translation
        processingTime: processingTime,
        languagePair: `${sourceLang}->${targetLang}`,
        method: "Sarvam-1-2B",
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"
      console.error("❌ Translation failed:", errorMessage)
      throw new Error("Translation failed: " + errorMessage)
    }
  }

  /**
   * Build translation prompt optimized for Sarvam-1
   * Sarvam-1 uses Llama/Mistral instruction format
   */
  private buildTranslationPrompt(
    text: string,
    sourceLang: SupportedIndicLanguage,
    targetLang: SupportedIndicLanguage,
    context?: string
  ): string {
    const sourceName = this.SUPPORTED_LANGUAGES[sourceLang]?.name || sourceLang
    const targetName = this.SUPPORTED_LANGUAGES[targetLang]?.name || targetLang

    // Sarvam-1 uses Llama/Mistral instruction format
    // Format: <s>[INST] <<SYS>> {system} <</SYS>> {prompt} [/INST]
    let prompt = `<s>[INST] <<SYS>>\n`
    prompt += `You are a professional translator. Translate the given text accurately from ${sourceName} to ${targetName}.\n`
    prompt += `Only output the translation, nothing else. Do not explain or add any extra text.\n`
    prompt += `<</SYS>>\n\n`

    if (context) {
      prompt += `Context: ${context}\n\n`
    }

    prompt += `Translate the following ${sourceName} text to ${targetName}:\n\n`
    prompt += `"${text}"\n\n`
    prompt += `${targetName} translation: [/INST]\n`

    return prompt
  }

  /**
   * Extract clean translation from model output
   * Removes artifacts and formatting
   */
  private extractTranslation(rawOutput: string): string {
    let translation = rawOutput.trim()

    // Remove common prefixes
    translation = translation.replace(
      /^(Translation|Translated text|Output|Result):\s*/i,
      ""
    )

    // Remove metadata lines
    translation = translation
      .split("\n")
      .filter((line) => {
        const lower = line.toLowerCase().trim()
        return (
          !lower.startsWith("source:") &&
          !lower.startsWith("target:") &&
          !lower.startsWith("language:") &&
          !lower.startsWith("context:") &&
          line.trim().length > 0
        )
      })
      .join("\n")
      .trim()

    // Remove repeated sentences (anti-repetition)
    const sentences = translation.split(/[।.!?]+/).filter((s) => s.trim())
    const uniqueSentences = [...new Set(sentences)]
    translation = uniqueSentences.join(". ").trim()

    return translation
  }

  /**
   * Calculate optimal token count for translation
   * Indic scripts typically require 2-4x more tokens than Latin scripts
   */
  private calculateTranslationTokens(text: string, targetLang: SupportedIndicLanguage): number {
    const baseTokens = 600 // Minimum tokens for any translation

    // Estimate word count (English averages ~5 chars per word)
    const estimatedWords = Math.ceil(text.length / 5)

    // Different scripts have different token expansion ratios
    const expansionRatios: Record<string, number> = {
      hin: 3.0,  // Hindi - Devanagari script
      ben: 3.0,  // Bengali
      tam: 3.5,  // Tamil - complex script
      tel: 3.5,  // Telugu
      mar: 3.0,  // Marathi - Devanagari
      guj: 3.0,  // Gujarati
      kan: 3.5,  // Kannada
      mal: 3.5,  // Malayalam - complex script
      ori: 3.0,  // Odia
      pan: 3.0,  // Punjabi - Gurmukhi
      eng: 1.0,  // English (no expansion)
    }

    const ratio = expansionRatios[targetLang] || 3.0

    // Calculate tokens: ~1.5 tokens per word for English, multiplied by expansion ratio
    // Add 100 tokens buffer for safety
    const calculatedTokens = Math.ceil(estimatedWords * 1.5 * ratio) + 100

    // Cap at 1200 tokens max to prevent memory issues
    return Math.min(Math.max(baseTokens, calculatedTokens), 1200)
  }

  /**
   * Validate that translation is complete (not cut off)
   * Adds ending if translation appears truncated
   */
  private validateTranslation(translatedText: string, originalText: string): string {
    let validated = translatedText.trim()

    // Check if translation seems too short (less than 40% of original might indicate cutoff)
    const ratio = validated.length / originalText.length
    if (ratio < 0.4 && originalText.length > 100) {
      console.log("⚠️ Translation may be incomplete, ratio:", ratio.toFixed(2))
    }

    // Check for incomplete sentence at end
    const lastChar = validated.slice(-1)
    const validEndings = ['.', '!', '?', '।', '॥', '।।']

    if (!validEndings.some(e => validated.endsWith(e)) && validated.length > 50) {
      // Find last valid ending
      let lastValidEnd = -1
      for (const ending of validEndings) {
        const idx = validated.lastIndexOf(ending)
        if (idx > lastValidEnd) lastValidEnd = idx
      }

      if (lastValidEnd > validated.length * 0.7) {
        // Trim to last complete sentence if we're past 70%
        validated = validated.substring(0, lastValidEnd + 1)
        console.log("✂️ Trimmed incomplete translation ending")
      }
    }

    return validated
  }

  /**
   * Translate long content by splitting into chunks
   * Preserves structure and ensures complete translation
   */
  private async translateLongContent(
    params: TranslationParams,
    startTime: number
  ): Promise<TranslationResult> {
    const sourceLang = this.normalizeLanguageCode(params.sourceLanguage) || "eng"
    const targetLang = this.normalizeLanguageCode(params.targetLanguage)!

    // Split content into manageable chunks by sentences/paragraphs
    const chunks = this.splitIntoChunks(params.text, 400)
    console.log(`  └── Split into ${chunks.length} chunks`)

    const translatedChunks: string[] = []
    const translationModel = this.modelManager.getTranslationModel()

    if (!translationModel) {
      throw new Error("Translation model not available.")
    }

    for (let i = 0; i < chunks.length; i++) {
      console.log(`  📝 Translating chunk ${i + 1}/${chunks.length}...`)

      const prompt = this.buildTranslationPrompt(
        chunks[i],
        sourceLang,
        targetLang,
        params.context
      )

      const tokensNeeded = this.calculateTranslationTokens(chunks[i], targetLang)

      const result = await translationModel.completion(
        {
          prompt: prompt,
          n_predict: tokensNeeded,
          temperature: 0.2,
          top_p: 0.9,
          top_k: 40,
          stop: ["</s>", "<|end|>", "<|eot_id|>", "\n\n\n", "---", "[/INST]"],
        },
        () => { }
      )

      let chunkTranslation = this.extractTranslation(result.text)
      chunkTranslation = this.validateTranslation(chunkTranslation, chunks[i])
      translatedChunks.push(chunkTranslation)
    }

    // Combine translated chunks
    const fullTranslation = translatedChunks.join("\n\n")
    const processingTime = Date.now() - startTime

    console.log("✅ Chunked translation completed in", processingTime, "ms")
    console.log(`  └── Total output: ${fullTranslation.length} chars (input: ${params.text.length})`)

    return {
      originalText: params.text,
      translatedText: fullTranslation,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      confidence: 0.82, // Slightly lower for chunked
      processingTime: processingTime,
      languagePair: `${sourceLang}->${targetLang}`,
      method: "Sarvam-1-2B-Chunked",
    }
  }

  /**
   * Split text into chunks while preserving sentence boundaries
   */
  private splitIntoChunks(text: string, maxChunkSize: number): string[] {
    const chunks: string[] = []

    // Split by paragraphs first
    const paragraphs = text.split(/\n\n+/)

    let currentChunk = ""

    for (const para of paragraphs) {
      if (currentChunk.length + para.length <= maxChunkSize) {
        currentChunk += (currentChunk ? "\n\n" : "") + para
      } else {
        if (currentChunk) {
          chunks.push(currentChunk)
        }

        // If paragraph itself is too long, split by sentences
        if (para.length > maxChunkSize) {
          const sentences = para.split(/(?<=[.!?।])\s+/)
          currentChunk = ""

          for (const sentence of sentences) {
            if (currentChunk.length + sentence.length <= maxChunkSize) {
              currentChunk += (currentChunk ? " " : "") + sentence
            } else {
              if (currentChunk) chunks.push(currentChunk)
              currentChunk = sentence
            }
          }
        } else {
          currentChunk = para
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk)
    }

    return chunks
  }

  /**
   * Batch translate multiple texts (for efficiency)
   */
  async batchTranslate(
    texts: string[],
    sourceLanguage: string,
    targetLanguage: string,
    context?: string
  ): Promise<TranslationResult[]> {
    console.log(`🌐 Batch translating ${texts.length} texts...`)

    const results: TranslationResult[] = []

    for (const text of texts) {
      try {
        const result = await this.translate({
          text,
          sourceLanguage,
          targetLanguage,
          context,
        })
        results.push(result)
      } catch (error) {
        console.error(
          "Batch translation error for text:",
          text.substring(0, 50),
          error
        )
        // Continue with other translations
        results.push({
          originalText: text,
          translatedText: text, // Fallback to original
          sourceLanguage: sourceLanguage,
          targetLanguage: targetLanguage,
          confidence: 0,
          processingTime: 0,
          languagePair: `${sourceLanguage}->${targetLanguage}`,
          method: "failed",
        })
      }
    }

    return results
  }

  /**
   * Translate with quality verification
   * Ensures translation meets quality standards
   */
  async translateWithVerification(
    params: TranslationParams
  ): Promise<TranslationResult> {
    const result = await this.translate(params)

    // Basic quality checks
    const hasContent = result.translatedText.length > 10
    const notTooLong = result.translatedText.length < params.text.length * 3
    const notIdentical = result.translatedText !== params.text

    if (!hasContent || !notTooLong || !notIdentical) {
      console.warn("⚠️ Translation quality concern detected")
      result.confidence = Math.min(result.confidence, 0.7)
    }

    return result
  }
}

export default TranslationService

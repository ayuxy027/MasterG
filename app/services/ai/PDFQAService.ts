/**
 * EduLite Mobile AI - PDF Q&A Service
 * Handles PDF processing and question answering using Gemma 3n
 * Now with RAG (Retrieval-Augmented Generation) support!
 */

import * as FileSystem from "expo-file-system/legacy"
import pako from "pako"
import {
  AnswerSource,
  PageReference,
  PDFAnswer,
  PDFDocument,
  PDFQuestionParams,
  SemanticIndex,
} from "../../types/ai.types"
import {
  detectTopicCategory,
  getGradeConfig,
  getSubjectConfig,
} from "./CBSECurriculumConfig"
import { KEYWORD_EXTRACTION_CONFIG } from "./constants"
import ModelManager from "./ModelManager"
import RAGService, { RAGProgressCallback } from "./rag"

interface PageContent {
  pageNumber: number
  text: string
  keywords: string[]
}

class PDFQAService {
  private static instance: PDFQAService
  private modelManager: ModelManager
  private loadedDocuments: Map<string, PDFDocument> = new Map()
  private pageContents: Map<string, PageContent[]> = new Map()
  private readonly MAX_LOADED_DOCUMENTS = 5 // Limit memory usage
  
  // RAG integration
  private useRAG: boolean = true // Enable RAG by default
  private ragService = RAGService

  private constructor() {
    this.modelManager = ModelManager.getInstance()
  }

  static getInstance(): PDFQAService {
    if (!PDFQAService.instance) {
      PDFQAService.instance = new PDFQAService()
    }
    return PDFQAService.instance
  }

  /**
   * Create a virtual document from pasted text - with RAG support!
   */
  async createFromText(
    text: string,
    docName: string = "Pasted Document",
    onProgress?: RAGProgressCallback
  ): Promise<PDFDocument> {
    const startTime = Date.now()
    console.log("📝 Creating document from pasted text:", docName)

    try {
      // Estimate page count
      const estimatedPages = Math.max(1, Math.ceil(text.length / 3000))

      // Use RAG for indexing if enabled
      if (this.useRAG) {
        console.log("🔮 Using RAG pipeline for document indexing...")
        
        const documentId = await this.ragService.indexDocument(
          text,
          docName,
          estimatedPages,
          onProgress
        )

        // Create document object for compatibility
        const document: PDFDocument = {
          id: documentId,
          name: docName,
          path: "rag-indexed",
          pageCount: estimatedPages,
          size: text.length,
          processedAt: new Date().toISOString(),
          index: {
            keywords: {},
            concepts: {},
            entities: {},
          },
        }

        // Also store in legacy format for backward compatibility
        const pages = this.splitIntoPages(text)
        const pageContents: PageContent[] = pages.map((pageText, i) => ({
          pageNumber: i + 1,
          text: pageText,
          keywords: this.simpleKeywordExtraction(pageText),
        }))
        
        this.storeDocumentWithLimit(documentId, document, pageContents)

        const processingTime = Date.now() - startTime
        console.log("✅ RAG Document created in", processingTime, "ms")
        console.log("  ├── Pages:", estimatedPages)
        console.log("  └── Text length:", text.length, "characters")

        return document
      }

      // Fallback to legacy processing
      const pages = this.splitIntoPages(text)

      // Create page contents with simple keywords
      const pageContents: PageContent[] = []
      for (let i = 0; i < pages.length; i++) {
        const keywords = this.simpleKeywordExtraction(pages[i])
        console.log(`📝 Page ${i + 1} keywords:`, keywords.join(", "))
        pageContents.push({
          pageNumber: i + 1,
          text: pages[i],
          keywords: keywords,
        })
      }

      // Create document object
      const documentId = this.generateDocumentId()
      const document: PDFDocument = {
        id: documentId,
        name: docName,
        path: "pasted-text",
        pageCount: pages.length,
        size: text.length,
        processedAt: new Date().toISOString(),
        index: this.createSemanticIndex(pageContents),
      }

      // Store in memory with limit check
      this.storeDocumentWithLimit(documentId, document, pageContents)

      const processingTime = Date.now() - startTime
      console.log("✅ Document created from text in", processingTime, "ms")
      console.log("  ├── Pages:", pages.length)
      console.log("  └── Total text length:", text.length, "characters")

      return document
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"
      console.error("❌ Text processing failed:", errorMessage)
      throw new Error("Text processing failed: " + errorMessage)
    }
  }

  /**
   * Process a PDF document and create searchable index
   */
  async processPDF(
    pdfPath: string,
    pdfName: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<PDFDocument> {
    const startTime = Date.now()
    console.log("📄 Processing PDF:", pdfName)

    try {
      onProgress?.(10, "Reading PDF file...")

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(pdfPath)
      if (!fileInfo.exists) {
        throw new Error("PDF file not found")
      }

      onProgress?.(20, "Extracting text...")

      // Extract text from PDF (simplified - in production use pdf-lib or similar)
      const extractedText = await this.extractTextFromPDF(pdfPath)
      const pages = this.splitIntoPages(extractedText)

      // Log extracted text for debugging
      console.log("📄 Extracted text preview (first 500 chars):")
      console.log(extractedText.substring(0, 500))
      console.log("---")

      onProgress?.(40, "Creating semantic index...")

      // Create semantic index for each page
      const pageContents: PageContent[] = []
      for (let i = 0; i < pages.length; i++) {
        const progress = 40 + (i / pages.length) * 40
        onProgress?.(progress, `Indexing page ${i + 1} of ${pages.length}...`)

        const keywords = await this.extractKeywords(pages[i])

        // Log keywords for each page
        console.log(`📝 Page ${i + 1} keywords:`, keywords.join(", "))

        pageContents.push({
          pageNumber: i + 1,
          text: pages[i],
          keywords: keywords,
        })
      }

      onProgress?.(90, "Finalizing document...")

      // Create document object
      const documentId = this.generateDocumentId()
      const document: PDFDocument = {
        id: documentId,
        name: pdfName,
        path: pdfPath,
        pageCount: pages.length,
        size: fileInfo.size || 0,
        processedAt: new Date().toISOString(),
        index: this.createSemanticIndex(pageContents),
      }

      // Store in memory with limit check
      this.storeDocumentWithLimit(documentId, document, pageContents)

      const processingTime = Date.now() - startTime
      onProgress?.(100, "Document ready!")
      console.log("✅ PDF processed in", processingTime, "ms")
      console.log("  ├── Pages:", pages.length)
      console.log(
        "  └── Total text length:",
        extractedText.length,
        "characters"
      )

      return document
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"
      console.error("❌ PDF processing failed:", errorMessage)
      throw new Error("PDF processing failed: " + errorMessage)
    }
  }

  /**
   * Extract text from PDF file using pako for FlateDecode decompression
   * Handles compressed PDFs which are most common
   *
   * KNOWN LIMITATIONS:
   * - CID fonts with Identity encoding require ToUnicode mapping (not implemented)
   * - Only FlateDecode compression is supported (not DCTDecode, LZWDecode, etc.)
   * - Complex PDFs may return garbage - users should use Camera Scan or Paste Text
   */
  private async extractTextFromPDF(pdfPath: string): Promise<string> {
    try {
      console.log("📄 Using pako for PDF text extraction...")
      console.log("⚠️ Note: Complex/CID-font PDFs may not extract correctly")

      // Read PDF as base64
      const base64Content = await FileSystem.readAsStringAsync(pdfPath, {
        encoding: FileSystem.EncodingType.Base64,
      })

      // Convert base64 to Uint8Array
      const binaryString = atob(base64Content)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // Check for CID fonts (common cause of extraction failure)
      const hasCIDFonts = /\/Type\s*\/CIDFont|\/Identity-H|\/ToUnicode/.test(
        binaryString
      )
      if (hasCIDFonts) {
        console.log(
          "⚠️ PDF uses CID fonts with Identity encoding - extraction may fail"
        )
        console.log(
          "💡 Recommendation: Use Camera Scan or Paste Text for best results"
        )
      }

      // Extract and decompress text streams
      const extractedText = this.extractTextWithPako(binaryString, bytes)

      console.log(`📝 Extracted ${extractedText.length} characters from PDF`)

      // Quality check: detect garbage output
      const isGarbageOutput = this.isGarbageText(extractedText)

      if (isGarbageOutput) {
        console.log(
          "❌ Extracted text appears to be garbage (PDF metadata/syntax)"
        )
        throw new Error(
          "PDF text extraction failed - this PDF uses advanced font encoding.\n\n" +
            '📷 TIP: Use "Scan with Camera" to photograph the document\n' +
            '📋 OR: Copy text from another app and use "Paste Text Directly"'
        )
      }

      if (extractedText.length < 50) {
        console.log("⚠️ Very little text extracted - PDF may be image-based")
        throw new Error(
          "This PDF appears to be image-based or uses fonts we cannot decode.\n\n" +
            '📷 TIP: Use "Scan with Camera" to photograph the pages\n' +
            '📋 OR: Copy text from another app and use "Paste Text Directly"'
        )
      }

      return extractedText
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"
      console.warn("⚠️ PDF extraction failed:", errorMessage)

      // Re-throw with helpful guidance if it's our custom error
      if (errorMessage.includes("TIP:")) {
        throw error
      }

      throw new Error(
        "Unable to extract text from this PDF.\n\n" +
          '📷 TIP: Use "Scan with Camera" to photograph the document\n' +
          '📋 OR: Copy text from another app and use "Paste Text Directly"'
      )
    }
  }

  /**
   * Detect if extracted text is garbage (PDF syntax, metadata, etc.)
   */
  private isGarbageText(text: string): boolean {
    if (text.length < 100) return false

    // Check for common PDF syntax patterns in output
    const garbagePatterns = [
      /%PDF-\d/, // PDF header in text
      /\d+\s+\d+\s+obj/, // Object definitions
      /\/Type\s*\/\w+/, // Type declarations
      /\/Filter\s*\/FlateDecode/, // Filter declarations
      /\/Length\d*\s+\d+/, // Length specifications
      /endobj|endstream|xref/, // PDF keywords
    ]

    let garbageScore = 0
    for (const pattern of garbagePatterns) {
      if (pattern.test(text)) {
        garbageScore++
      }
    }

    // If 3+ garbage patterns found in first 500 chars, it's likely garbage
    const sample = text.substring(0, 500)
    const letterRatio = (sample.match(/[a-zA-Z]/g) || []).length / sample.length
    const hasNormalWords = /\b[a-zA-Z]{4,}\b/.test(sample)

    // Consider garbage if: many PDF patterns AND (low letter ratio OR no normal words)
    return garbageScore >= 3 && (letterRatio < 0.4 || !hasNormalWords)
  }

  /**
   * Extract text by decompressing FlateDecode streams with pako
   */
  private extractTextWithPako(binaryString: string, bytes: Uint8Array): string {
    const textParts: string[] = []

    // Find all compressed streams (FlateDecode)
    const streamRegex = /stream\s*\n([\s\S]*?)\nendstream/g
    let match
    let streamCount = 0

    while ((match = streamRegex.exec(binaryString)) !== null) {
      streamCount++
      const streamStart = match.index + match[0].indexOf("\n") + 1
      const streamEnd = match.index + match[0].lastIndexOf("\n")

      // Get the stream bytes
      const streamBytes = bytes.slice(streamStart, streamEnd)

      try {
        // Try to decompress with pako (FlateDecode)
        const decompressed = pako.inflate(streamBytes)
        const text = new TextDecoder("utf-8", { fatal: false }).decode(
          decompressed
        )

        console.log(
          `✅ Stream ${streamCount} decompressed: ${
            decompressed.length
          } bytes → ${text.substring(0, 100)}...`
        )

        // Extract readable text from the decompressed content
        const readable = this.extractTextFromStream(text)
        if (readable.length > 20) {
          console.log(
            `   └── Extracted ${readable.length} chars: "${readable.substring(
              0,
              50
            )}..."`
          )
          textParts.push(readable)
        }
      } catch (err) {
        console.log(
          `⚠️ Stream ${streamCount} decompression failed, trying direct extraction`
        )
        // Not a compressed stream or different compression, try direct extraction
        const directText = this.extractTextFromStream(match[1])
        if (directText.length > 20) {
          textParts.push(directText)
        }
      }
    }

    console.log(
      `📦 Processed ${streamCount} streams, found ${textParts.length} text parts`
    )

    // If no text found in streams, try extracting from the whole document
    if (textParts.length === 0) {
      console.log("🔄 No text in streams, trying direct extraction...")
      return this.extractReadableText(binaryString)
    }

    return textParts.join("\n\n")
  }

  /**
   * Extract text content from a PDF stream
   */
  private extractTextFromStream(content: string): string {
    const textItems: string[] = []

    // Extract text between BT and ET markers
    const btEtRegex = /BT[\s\S]*?ET/g
    const blocks = content.match(btEtRegex) || []

    blocks.forEach((block) => {
      // Extract text in parentheses: (text)Tj or (text)TJ
      const textMatches = block.match(/\(([^)]*)\)\s*T[jJ]/g) || []
      textMatches.forEach((m) => {
        const text = m.match(/\(([^)]*)\)/)?.[1] || ""
        const cleaned = text
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "")
          .replace(/\\\(/g, "(")
          .replace(/\\\)/g, ")")
          .replace(/\\\\/g, "\\")
        if (cleaned.trim()) {
          textItems.push(cleaned)
        }
      })

      // Extract hex strings: <hex>Tj
      const hexMatches = block.match(/<([0-9A-Fa-f]+)>\s*T[jJ]/g) || []
      hexMatches.forEach((m) => {
        const hex = m.match(/<([0-9A-Fa-f]+)>/)?.[1] || ""
        const decoded = this.decodeHexString(hex)
        if (decoded.trim()) {
          textItems.push(decoded)
        }
      })
    })

    return textItems.join(" ")
  }

  /**
   * Decode hex string to text
   */
  private decodeHexString(hex: string): string {
    let result = ""
    for (let i = 0; i < hex.length; i += 2) {
      const charCode = parseInt(hex.substr(i, 2), 16)
      if (charCode >= 32 && charCode <= 126) {
        result += String.fromCharCode(charCode)
      }
    }
    return result
  }

  /**
   * Sanitize text to remove problematic characters that crash the AI model
   */
  private sanitizeText(text: string): string {
    return (
      text
        // Remove null bytes and control characters (except newline and tab)
        .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, "")
        // Remove PDF-specific syntax
        .replace(/%PDF-[\d\.]+/g, "")
        .replace(/\d+\s+\d+\s+obj/g, "")
        .replace(/endobj/g, "")
        .replace(/stream|endstream/g, "")
        // Remove excessive whitespace
        .replace(/\s+/g, " ")
        // Trim
        .trim()
    )
  }

  /**
   * Extract any readable ASCII text as fallback
   */
  private extractReadableText(binary: string): string {
    // Extract sequences of printable ASCII characters
    const words: string[] = []
    let currentWord = ""

    for (let i = 0; i < binary.length; i++) {
      const charCode = binary.charCodeAt(i)
      if (charCode >= 32 && charCode <= 126) {
        currentWord += binary[i]
      } else if (currentWord.length > 3) {
        // Only keep words with letters
        if (/[a-zA-Z]{2,}/.test(currentWord)) {
          words.push(currentWord)
        }
        currentWord = ""
      } else {
        currentWord = ""
      }
    }

    // Filter out PDF syntax and keep meaningful text
    const filtered = words.filter((word) => {
      // Exclude PDF operators and short strings
      if (word.length < 4) return false
      if (/^[0-9.]+$/.test(word)) return false
      if (/^(obj|endobj|stream|endstream|xref|trailer)/.test(word)) return false
      return /[a-zA-Z]{3,}/.test(word)
    })

    const result = filtered.join(" ")
    console.log(`📝 Fallback extraction: ${result.length} characters`)
    return result || "Unable to extract text - document may be image-based."
  }

  /**
   * Split text into pages
   */
  private splitIntoPages(text: string): string[] {
    // Split by page breaks or by character count
    const pageBreakPattern = /\f|--- Page \d+ ---/g
    let pages = text.split(pageBreakPattern)

    // If no page breaks found, split by approximate page size
    if (pages.length <= 1 && text.length > 3000) {
      pages = []
      const charsPerPage = 3000
      for (let i = 0; i < text.length; i += charsPerPage) {
        pages.push(text.substring(i, i + charsPerPage))
      }
    }

    return pages.filter((page) => page.trim().length > 0)
  }

  /**
   * Extract keywords from text using AI
   */
  private async extractKeywords(text: string): Promise<string[]> {
    if (!this.modelManager.isReady()) {
      // Fallback to simple keyword extraction
      return this.simpleKeywordExtraction(text)
    }

    const textModel = this.modelManager.getTextModel()
    if (!textModel) {
      return this.simpleKeywordExtraction(text)
    }

    try {
      const prompt = `Extract 10 most important keywords from this educational text. Return only the keywords separated by commas:

Text: ${text.substring(0, 1000)}

Keywords:`

      const result = await textModel.completion(
        {
          prompt: prompt,
          n_predict: KEYWORD_EXTRACTION_CONFIG.maxTokens,
          temperature: KEYWORD_EXTRACTION_CONFIG.temperature,
          stop: KEYWORD_EXTRACTION_CONFIG.stopSequences,
        },
        () => {}
      )

      return result.text
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter((k) => k.length > 2)
    } catch (error) {
      console.warn("AI keyword extraction failed, using fallback")
      return this.simpleKeywordExtraction(text)
    }
  }

  /**
   * Simple keyword extraction without AI
   */
  private simpleKeywordExtraction(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/)
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "can",
      "this",
      "that",
      "these",
      "those",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "and",
      "or",
      "but",
      "not",
    ])

    const wordFreq = new Map<string, number>()
    words.forEach((word) => {
      const cleaned = word.replace(/[^a-z]/g, "")
      if (cleaned.length > 3 && !stopWords.has(cleaned)) {
        wordFreq.set(cleaned, (wordFreq.get(cleaned) || 0) + 1)
      }
    })

    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word)
  }

  /**
   * Extract keywords from a user question for smart searching
   */
  private extractQuestionKeywords(question: string): string[] {
    // Common English stop words to filter out
    const stopWords = new Set([
      "what",
      "who",
      "where",
      "when",
      "why",
      "how",
      "which",
      "is",
      "are",
      "was",
      "were",
      "do",
      "does",
      "did",
      "has",
      "have",
      "had",
      "can",
      "could",
      "should",
      "would",
      "the",
      "a",
      "an",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "tell",
      "me",
      "about",
      "list",
      "show",
      "find",
      "get",
    ])

    // Split, clean, and filter
    return question
      .toLowerCase()
      .replace(/[?.,!;:()]/g, "") // Remove punctuation
      .split(/\s+/)
      .filter((word) => {
        const cleanWord = word.trim()
        return cleanWord.length > 2 && !stopWords.has(cleanWord)
      })
  }

  /**
   * Create semantic index from page contents
   */
  private createSemanticIndex(pageContents: PageContent[]): SemanticIndex {
    const keywords: Record<string, PageReference[]> = {}
    const concepts: Record<string, PageReference[]> = {}
    const entities: Record<string, PageReference[]> = {}

    pageContents.forEach((page) => {
      page.keywords.forEach((keyword) => {
        if (!keywords[keyword]) {
          keywords[keyword] = []
        }
        keywords[keyword].push({
          page: page.pageNumber,
          context: page.text.substring(0, 200),
          confidence: 0.8,
        })
      })
    })

    return { keywords, concepts, entities }
  }

  /**
   * Answer a question about a processed PDF
   */
  async answerQuestion(params: PDFQuestionParams): Promise<PDFAnswer> {
    const startTime = Date.now()
    console.log("❓ Answering question:", params.question)

    if (!this.modelManager.isReady()) {
      throw new Error("Text model not initialized.")
    }

    const textModel = this.modelManager.getTextModel()
    if (!textModel) {
      throw new Error("Text model not available.")
    }

    // Get document and pages
    const document = this.loadedDocuments.get(params.documentId)
    const pages = this.pageContents.get(params.documentId)

    if (!document || !pages) {
      throw new Error("Document not found. Please process the PDF first.")
    }

    // ===== LOG ALL STORED DOCUMENT TEXT =====
    console.log("\n" + "=".repeat(70))
    console.log("📚 DOCUMENT Q&A SESSION")
    console.log("=".repeat(70))
    console.log("📋 Document:", document.name)
    console.log("📋 Document ID:", document.id)
    console.log("📋 Page Count:", pages.length)
    console.log("-".repeat(70))
    console.log("📄 FULL STORED DOCUMENT TEXT:")
    console.log("-".repeat(70))
    pages.forEach((page, idx) => {
      console.log(`\n[Page ${page.pageNumber}]:`)
      console.log(page.text)
    })
    console.log("-".repeat(70))
    console.log("📄 END OF STORED DOCUMENT")
    console.log("=".repeat(70))

    try {
      // Find relevant pages
      const relevantPages = this.findRelevantPages(params.question, pages)

      // Log what was found
      console.log("\n❓ Question:", params.question)
      console.log("📖 Found", relevantPages.length, "relevant pages")
      relevantPages.forEach((p) => {
        console.log(
          `  └── Page ${p.pageNumber}: ${p.text.substring(0, 100)}...`
        )
      })

      // ================================================================
      // SMART CONTEXT SELECTION - COMPREHENSIVE MODE
      // ================================================================
      // Enhanced context extraction for thorough, research-based answers:
      // 1. Find question-relevant sections with higher context window
      // 2. Extract more surrounding context for deeper understanding
      // 3. Allow larger token budget for comprehensive responses
      // ================================================================

      const TOKEN_BUDGET = 1500 // ~1500 chars ≈ 375 tokens (conservative for 2048 context window)
      const questionKeywords = this.extractQuestionKeywords(params.question)

      console.log("🔍 Question keywords:", questionKeywords)

      // Collect all relevant text chunks across all pages
      const relevantChunks: { pageNum: number; text: string; score: number }[] =
        []

      const pagesToSearch = relevantPages.length > 0 ? relevantPages : pages

      pagesToSearch.forEach((page) => {
        // Split page into paragraphs/sections
        const sections = page.text
          .split(/\n{2,}/)
          .filter((s) => s.trim().length > 20)

        sections.forEach((section, idx) => {
          // Score this section based on keyword presence
          let score = 0
          const lowerSection = section.toLowerCase()

          questionKeywords.forEach((keyword) => {
            if (lowerSection.includes(keyword)) {
              score += 10
              // Bonus for exact phrase match
              if (lowerSection.includes(keyword.toLowerCase())) {
                score += 5
              }
            }
          })

          // Also check for section headers that match
          const headerMatch = section.match(/^([A-Z][A-Z\s]+)/)
          if (headerMatch) {
            const header = headerMatch[1].toLowerCase()
            questionKeywords.forEach((keyword) => {
              if (header.includes(keyword)) {
                score += 15 // Headers are very important
              }
            })
          }

          if (score > 0) {
            relevantChunks.push({
              pageNum: page.pageNumber,
              text: section.trim(),
              score: score,
            })
          }
        })
      })

      // Sort by score (highest first)
      relevantChunks.sort((a, b) => b.score - a.score)

      // Build context within token budget
      let finalContext = ""
      let currentLength = 0
      const usedChunks: typeof relevantChunks = []

      for (const chunk of relevantChunks) {
        const chunkWithHeader = `[Page ${chunk.pageNum}]: ${chunk.text} `
        if (currentLength + chunkWithHeader.length <= TOKEN_BUDGET) {
          finalContext += chunkWithHeader
          currentLength += chunkWithHeader.length
          usedChunks.push(chunk)
        }
      }

      // If no relevant chunks found, fall back to beginning of pages
      if (finalContext.length < 100 && pages.length > 0) {
        console.log("⚠️ No keyword matches, using full page strategy")
        const charsPerPage = Math.floor(TOKEN_BUDGET / pages.length)
        finalContext = pages
          .map(
            (p) =>
              `[Page ${p.pageNumber}]: ${p.text.substring(0, charsPerPage)}`
          )
          .join(" ")
      }

      console.log(
        `📊 Smart context: ${usedChunks.length} relevant sections, ${finalContext.length} chars`
      )

      // SANITIZE: Remove garbage characters that might crash the model
      finalContext = this.sanitizeText(finalContext)

      // Check if we have meaningful text
      if (finalContext.length < 50 || !/[a-zA-Z]{10,}/.test(finalContext)) {
        console.error("❌ No meaningful text extracted from PDF")
        throw new Error(
          "Unable to extract readable text from this PDF. The document may be image-based or corrupted. Please try a different PDF or paste the text directly."
        )
      }

      console.log("\n📝 FINAL CONTEXT FOR AI:")
      console.log("-".repeat(70))
      console.log(
        finalContext.substring(0, 1000) +
          (finalContext.length > 1000 ? "..." : "")
      )
      console.log("-".repeat(70))

      // Generate answer
      const prompt = this.buildQAPrompt(params.question, finalContext)

      console.log("🤖 Calling AI model...")
      console.log("📋 Full prompt length:", prompt.length)

      // Safety check: Gemma 3 1B has 2048 token context (~8000 chars)
      // Keep prompt under 3000 chars to leave room for response
      const MAX_PROMPT_LENGTH = 3000
      let safePrompt = prompt
      if (prompt.length > MAX_PROMPT_LENGTH) {
        console.warn(`⚠️ Prompt too long (${prompt.length}), truncating...`)
        // Smart truncation: keep instruction + truncated context + question
        const questionIdx = prompt.indexOf('QUESTION:')
        if (questionIdx > 0) {
          const beforeQuestion = prompt.substring(0, questionIdx)
          const afterQuestion = prompt.substring(questionIdx)
          const availableForContext = MAX_PROMPT_LENGTH - afterQuestion.length - 200
          safePrompt = beforeQuestion.substring(0, availableForContext) + '\n[...]\n\n' + afterQuestion
        } else {
          safePrompt = prompt.substring(0, MAX_PROMPT_LENGTH - 50) + '\n<end_of_turn>\n<start_of_turn>model\n'
        }
        console.log("📋 Truncated prompt length:", safePrompt.length)
      }

      let result
      try {
        result = await textModel.completion(
          {
            prompt: safePrompt,
            n_predict: params.maxTokens || 256, // Reduced for faster response
            temperature: 0.7,
            top_p: 0.9,
            top_k: 40,
            stop: ["<end_of_turn>", "</s>", "<|end|>"],
          },
          () => {}
        )
      } catch (completionError) {
        console.error("❌ Model completion failed:", completionError)
        throw new Error(
          `Model completion failed: ${typeof completionError === 'object' ? JSON.stringify(completionError) : String(completionError)}`
        )
      }

      if (!result || !result.text) {
        throw new Error("Model returned empty response")
      }

      const processingTime = Date.now() - startTime

      console.log("📝 Raw model output:", result.text)
      console.log("📝 Output length:", result.text.length)

      // Build answer with sources
      const sources: AnswerSource[] = relevantPages.map((page) => ({
        page: page.pageNumber,
        excerpt: page.text.substring(0, 150) + "...",
        relevance: 0.8,
      }))

      console.log("✅ Answer generated in", processingTime, "ms")

      // Clean the answer - remove any special tokens
      let cleanAnswer = result.text.trim()
      cleanAnswer = cleanAnswer.replace(/<[^>]+>/g, "") // Remove any remaining tokens
      cleanAnswer = cleanAnswer.replace(/\n{3,}/g, "\n\n") // Limit newlines

      if (cleanAnswer.length < 5) {
        cleanAnswer =
          "I was unable to generate a proper response. Please try asking the question differently or provide more context."
      }

      return {
        answer: cleanAnswer,
        confidence: 0.85,
        sources: sources,
        processingTime: processingTime,
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"
      console.error("❌ Q&A failed:", errorMessage)
      throw new Error("Failed to answer question: " + errorMessage)
    }
  }

  /**
   * Find pages relevant to the question
   */
  private findRelevantPages(
    question: string,
    pages: PageContent[]
  ): PageContent[] {
    const questionWords = question.toLowerCase().split(/\s+/)

    const scoredPages = pages.map((page) => {
      let score = 0
      questionWords.forEach((word) => {
        if (page.text.toLowerCase().includes(word)) {
          score += 1
        }
        if (page.keywords.includes(word)) {
          score += 2
        }
      })
      return { page, score }
    })

    return scoredPages
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .filter((item) => item.score > 0)
      .map((item) => item.page)
  }

  /**
   * Build Q&A prompt with hybrid "Document + General Knowledge" strategy
   */
  /**
   * Detect Grade and Subject from document text
   */
  private detectDocumentContext(text: string): {
    grade: string
    subject: string
  } {
    const lowerText = text.toLowerCase().substring(0, 5001) // Check first 5001 chars

    // defaults
    let detectedGrade = "10" // Default to secondary
    let detectedSubject = "science" // Default to general science

    // Detect Grade (look for "Class X", "Grade Y", "Standard Z")
    // Matching patterns like "Class 10", "Grade XII", "Std 5"
    const gradeMatch = lowerText.match(
      /(?:class|grade|standard|std)[\s\.:-]*([0-9]{1,2}|xi{0,3}|iv|v?i{0,3})/i
    )
    if (gradeMatch) {
      const rawGrade = gradeMatch[1].toLowerCase()
      // Normalize Roman numerals or numbers to '1'-'12'
      const romanMap: Record<string, string> = {
        i: "1",
        ii: "2",
        iii: "3",
        iv: "4",
        v: "5",
        vi: "6",
        vii: "7",
        viii: "8",
        ix: "9",
        x: "10",
        xi: "11",
        xii: "12",
      }
      detectedGrade = romanMap[rawGrade] || rawGrade

      // Validate against our config range
      if (!getGradeConfig(detectedGrade)) detectedGrade = "10"
    }

    // Detect Subject using keyword density
    const subjectKeywords = {
      mathematics: [
        "math",
        "algebra",
        "geometry",
        "calculus",
        "formula",
        "theorem",
      ],
      physics: ["physics", "force", "energy", "velocity", "motion"],
      chemistry: ["chemistry", "reaction", "acid", "molecule", "atom"],
      biology: ["biology", "cell", "plant", "organism", "body"],
      history: ["history", "war", "empire", "culture", "civilization"],
      geography: ["geography", "climate", "earth", "map", "soil"],
      computer_science: [
        "computer",
        "programming",
        "code",
        "data",
        "algorithm",
      ],
      english: ["english", "grammar", "literature", "poem", "story"],
    }

    for (const [subject, keywords] of Object.entries(subjectKeywords)) {
      if (keywords.some((k) => lowerText.includes(k))) {
        detectedSubject = subject
        break
      }
    }

    // Also try specialized topic detection if generic subject fails
    if (detectedSubject === "science") {
      const topicCategory = detectTopicCategory(lowerText)
      if (topicCategory) detectedSubject = topicCategory // e.g., 'mechanics' -> physics-like
    }

    console.log(
      `🎓 Detected Context: Grade ${detectedGrade} | Subject: ${detectedSubject}`
    )
    return { grade: detectedGrade, subject: detectedSubject }
  }

  /**
   * Build Q&A prompt - OPTIMIZED for small context windows (2048 tokens)
   */
  private buildQAPrompt(question: string, context: string): string {
    // Detect subject for appropriate response style
    const { grade, subject } = this.detectDocumentContext(context)

    // CONCISE prompt optimized for Gemma 3 1B (2048 token context)
    return `<start_of_turn>user
You are a helpful ${subject} tutor. Answer based on the document below.

DOCUMENT:
${context}

QUESTION: ${question}

Instructions:
- Answer directly and clearly from the document
- Use bullet points for multiple items
- If the document doesn't contain the answer, say so
- Keep the answer focused and relevant
<end_of_turn>
<start_of_turn>model
`
  }

  /**
   * Store document with automatic cleanup of old documents
   */
  private storeDocumentWithLimit(
    documentId: string,
    document: PDFDocument,
    pageContents: PageContent[]
  ): void {
    // Check if we're at the limit
    if (this.loadedDocuments.size >= this.MAX_LOADED_DOCUMENTS) {
      // Remove oldest document (first entry in Map)
      const oldestId = Array.from(this.loadedDocuments.keys())[0]
      console.log(
        `🧹 Memory limit reached, removing oldest document: ${oldestId}`
      )
      this.removeDocument(oldestId)
    }

    // Store new document
    this.loadedDocuments.set(documentId, document)
    this.pageContents.set(documentId, pageContents)
    console.log(
      `📚 Stored document. Total loaded: ${this.loadedDocuments.size}/${this.MAX_LOADED_DOCUMENTS}`
    )
  }

  /**
   * Generate unique document ID
   */
  private generateDocumentId(): string {
    return "doc_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
  }

  /**
   * Get a loaded document
   */
  getDocument(documentId: string): PDFDocument | undefined {
    return this.loadedDocuments.get(documentId)
  }

  /**
   * Get all loaded documents
   */
  getAllDocuments(): PDFDocument[] {
    return Array.from(this.loadedDocuments.values())
  }

  /**
   * Remove a document from memory
   */
  removeDocument(documentId: string): boolean {
    this.loadedDocuments.delete(documentId)
    this.pageContents.delete(documentId)
    return true
  }

  /**
   * Clear all loaded documents
   */
  clearAllDocuments(): void {
    this.loadedDocuments.clear()
    this.pageContents.clear()
    this.ragService.clearActiveDocument()
  }

  // ============================================
  // RAG-Enhanced Methods
  // ============================================

  /**
   * Enable or disable RAG mode
   */
  setRAGMode(enabled: boolean): void {
    this.useRAG = enabled
    console.log(`🔮 RAG mode: ${enabled ? 'ENABLED' : 'DISABLED'}`)
  }

  /**
   * Check if RAG is enabled
   */
  isRAGEnabled(): boolean {
    return this.useRAG
  }

  /**
   * Answer question using RAG pipeline (recommended for large documents)
   */
  async answerWithRAG(params: PDFQuestionParams): Promise<PDFAnswer> {
    const startTime = Date.now()
    console.log('\n' + '='.repeat(60))
    console.log('🔮 RAG-ENHANCED Q&A')
    console.log('='.repeat(60))
    console.log('❓ Question:', params.question)

    if (!this.modelManager.isReady()) {
      throw new Error('Text model not initialized. Please load the AI model first.')
    }

    const textModel = this.modelManager.getTextModel()
    if (!textModel) {
      throw new Error('Text model not available.')
    }

    // Get retrieval context from RAG
    const retrieval = this.ragService.getRetrievalContext(params.question)
    
    if (!retrieval || retrieval.context.length < 50) {
      console.log('⚠️ No relevant context found, falling back to legacy method')
      return this.answerQuestion(params)
    }

    console.log(`📚 Retrieved ${retrieval.results.length} relevant chunks`)
    console.log(`📄 Pages: ${retrieval.metadata.pages.join(', ')}`)
    console.log(`📝 Context length: ${retrieval.context.length} chars`)

    // Log top results
    console.log('\n📋 Top relevant chunks:')
    retrieval.results.slice(0, 3).forEach((r, i) => {
      console.log(`  ${i + 1}. Page ${r.chunk.pageNumber} (score: ${r.score.toFixed(2)}):`)
      console.log(`     "${r.chunk.text.substring(0, 100)}..."`)
    })

    try {
      // Build enhanced prompt with RAG context
      const prompt = this.buildRAGPrompt(params.question, retrieval.context, retrieval.metadata)

      console.log('\n🤖 Generating answer...')
      console.log(`📋 Prompt length: ${prompt.length} chars`)

      // Safety check: Gemma 3 1B has 2048 token context
      const MAX_PROMPT_LENGTH = 3000
      let safePrompt = prompt
      if (prompt.length > MAX_PROMPT_LENGTH) {
        console.warn(`⚠️ Prompt too long (${prompt.length}), truncating...`)
        const questionIdx = prompt.indexOf('QUESTION:')
        if (questionIdx > 0) {
          const beforeQuestion = prompt.substring(0, questionIdx)
          const afterQuestion = prompt.substring(questionIdx)
          const availableForContext = MAX_PROMPT_LENGTH - afterQuestion.length - 200
          safePrompt = beforeQuestion.substring(0, availableForContext) + '\n[...]\n\n' + afterQuestion
        } else {
          safePrompt = prompt.substring(0, MAX_PROMPT_LENGTH - 50) + '\n<end_of_turn>\n<start_of_turn>model\n'
        }
        console.log('📋 Truncated prompt length:', safePrompt.length)
      }

      let result
      try {
        result = await textModel.completion(
          {
            prompt: safePrompt,
            n_predict: params.maxTokens || 256, // Reduced for faster response
            temperature: 0.5,
            top_p: 0.9,
            top_k: 40,
            stop: ['<end_of_turn>', '<start_of_turn>'],
          },
          () => {}
        )
      } catch (completionError) {
        console.error('❌ Model completion failed:', completionError)
        throw new Error(
          `Model completion failed: ${typeof completionError === 'object' ? JSON.stringify(completionError) : String(completionError)}`
        )
      }

      if (!result || !result.text) {
        throw new Error('Model returned empty response')
      }

      const processingTime = Date.now() - startTime

      // Clean the answer
      let cleanAnswer = result.text.trim()
      cleanAnswer = cleanAnswer.replace(/<[^>]+>/g, '')
      cleanAnswer = cleanAnswer.replace(/\n{3,}/g, '\n\n')

      if (cleanAnswer.length < 10) {
        cleanAnswer = 'I was unable to generate a proper response. Please try rephrasing your question.'
      }

      // Build sources from retrieval results
      const sources: AnswerSource[] = retrieval.results.slice(0, 5).map(r => ({
        page: r.chunk.pageNumber,
        excerpt: r.chunk.text.substring(0, 150) + '...',
        relevance: Math.min(r.score / 10, 1), // Normalize score to 0-1
      }))

      console.log('\n✅ Answer generated in', processingTime, 'ms')
      console.log('='.repeat(60) + '\n')

      return {
        answer: cleanAnswer,
        confidence: Math.min(0.9, (retrieval.results[0]?.score || 0) / 5 + 0.5),
        sources,
        processingTime,
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ RAG Q&A failed:', errorMessage)
      throw new Error('Failed to answer question: ' + errorMessage)
    }
  }

  /**
   * Build prompt optimized for RAG context - CONCISE for small context window
   */
  private buildRAGPrompt(
    question: string,
    context: string,
    metadata: { documentName: string; pages: number[]; relevantChunks: number }
  ): string {
    // Limit context size to prevent overflow
    const maxContextChars = 2000
    const trimmedContext = context.length > maxContextChars 
      ? context.substring(0, maxContextChars) + '\n[...]'
      : context

    return `<start_of_turn>user
Answer based on this document excerpt:

${trimmedContext}

QUESTION: ${question}

Instructions:
- Answer from the document content above
- Be concise and direct
- If not in document, say "Not found in document"
<end_of_turn>
<start_of_turn>model
`
  }

  /**
   * Get RAG statistics
   */
  async getRAGStats(): Promise<{
    enabled: boolean
    totalDocuments: number
    totalChunks: number
    activeDocument: string | null
  }> {
    const stats = await this.ragService.getStats()
    return {
      enabled: this.useRAG,
      ...stats,
    }
  }

  /**
   * List all RAG-indexed documents
   */
  async listRAGDocuments() {
    return this.ragService.listDocuments()
  }
}

export default PDFQAService

import { ollamaChatService } from "./ollamaChat.service";
import { vectorDBService } from "./vectordb.service";
import { documentService } from "./document.service";
import { nllbService } from "./nllb.service";
import { languageService, SupportedLanguageCode } from "./language.service";
import { LanguageCode, SUPPORTED_LANGUAGES } from "../config/constants";
import { env } from "../config/env";

// Enhanced key topic with description for quick recall
export interface KeyTopic {
  name: string;
  description: string;
}

// Enhanced important concept with 5 bullet point descriptions
export interface ImportantConcept {
  name: string;
  points: string[];
}

export interface LMRSummary {
  // Structured summary format for last-minute revision
  introduction: string; // Short intro paragraph (2-3 sentences)
  summaryPoints: string[]; // Bullet points with descriptions
  conclusion: string; // Conclusion paragraph (1-2 sentences)
  // Legacy field for backward compatibility
  summary?: string;
  // Enhanced fields with descriptions
  keyTopics: KeyTopic[];
  importantConcepts: ImportantConcept[];
  language: string;
}

export interface LMRQuestion {
  id: number;
  question: string;
  answer: string;
  subject: string;
  difficulty: "Easy" | "Medium" | "Hard";
  pageReference?: number;
}

export interface LMRQuiz {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: "Easy" | "Medium" | "Hard";
  subject: string;
}

export interface LMRRecallNote {
  topic: string;
  keyPoints: string[];
  quickFacts: string[];
  mnemonics?: string[];
}

/**
 * Task types for the two-layer AI approach
 */
type LMRTaskType = "summary" | "questions" | "quiz" | "recallNotes";

/**
 * Compressed context from Layer 1
 */
interface CompressedContext {
  mainTopics: string[];
  keyFacts: string[];
  importantConcepts: string[];
  relevantExamples?: string[];
  pageReferences?: { topic: string; page: number }[];
}

/**
 * Document metrics for dynamic content quantity calculation
 */
interface DocumentMetrics {
  wordCount: number;
  charCount: number;
  pageCount: number;
  paragraphCount: number;
  estimatedTopics: number;
  contentDensity: "light" | "medium" | "dense";
  // Dynamic quantities based on document analysis
  recommendedConceptCount: number; // 5-15 based on content
  recommendedRecallTopicCount: number; // 6-15 based on content
  recommendedQuestionCount: number; // 10-15 based on content
  recommendedQuizCount: number; // 10-15 based on content
}

export class LMRService {
  /**
   * Helper: Sanitize JSON string from AI responses
   * Handles Python-style syntax (None, True, False) and malformed JSON
   */
  private sanitizeJSON(jsonString: string): string {
    let cleaned = jsonString;

    // Remove any markdown code block markers
    cleaned = cleaned.replace(/```json\s*/g, "");
    cleaned = cleaned.replace(/```\s*/g, "");

    // Replace Python-style None with null (multiple patterns)
    cleaned = cleaned.replace(/:\s*None\s*([,\}\]])/g, ": null$1");
    cleaned = cleaned.replace(/\[\s*None\s*([,\]])/g, "[null$1");
    cleaned = cleaned.replace(/,\s*None\s*([,\}\]])/g, ", null$1");

    // Replace Python-style True/False with lowercase
    cleaned = cleaned.replace(/:\s*True\s*([,\}\]])/g, ": true$1");
    cleaned = cleaned.replace(/:\s*False\s*([,\}\]])/g, ": false$1");
    cleaned = cleaned.replace(/,\s*True\s*([,\}\]])/g, ", true$1");
    cleaned = cleaned.replace(/,\s*False\s*([,\}\]])/g, ", false$1");

    // Remove trailing commas before closing brackets/braces (multiple passes)
    // This needs to run multiple times to handle nested structures
    for (let i = 0; i < 3; i++) {
      cleaned = cleaned.replace(/,(\s*[\}\]])/g, "$1");
    }

    // Fix specific pattern: ],} -> }] (remove comma between array close and object close)
    cleaned = cleaned.replace(/\],(\s*)\}/g, "]$1}");

    // Fix specific pattern: },] -> }] (remove comma between object close and array close)
    cleaned = cleaned.replace(/\},(\s*)\]/g, "}$1]");

    // Fix missing commas between array elements (common DeepSeek issue)
    cleaned = cleaned.replace(/\}(\s*)\{/g, "},$1{");
    cleaned = cleaned.replace(/\](\s*)\[/g, "],$1[");

    // Fix missing commas between string values (but not within strings)
    cleaned = cleaned.replace(/"\s*\n\s*"/g, '",\n"');

    return cleaned;
  }

  /**
   * Helper: Extract and parse JSON from AI response
   * Handles truncated responses, trailing text, and malformed structures
   */
  private extractAndParseJSON(response: string, isArray: boolean = false): any {
    try {
      // Remove DeepSeek thinking tags if present
      let cleanedResponse = response.replace(/<think>[\s\S]*?<\/think>/g, "");

      // Remove any text before the JSON starts
      const jsonStartChar = isArray ? "[" : "{";
      const jsonStartIndex = cleanedResponse.indexOf(jsonStartChar);
      if (jsonStartIndex === -1) {
        throw new Error(
          `No JSON ${isArray ? "array" : "object"} found in response`
        );
      }
      cleanedResponse = cleanedResponse.substring(jsonStartIndex);

      // Find the proper end of JSON by counting brackets
      const openChar = isArray ? "[" : "{";
      const closeChar = isArray ? "]" : "}";
      let depth = 0;
      let inString = false;
      let escapeNext = false;
      let jsonEndIndex = -1;

      for (let i = 0; i < cleanedResponse.length; i++) {
        const char = cleanedResponse[i];

        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (char === "\\") {
          escapeNext = true;
          continue;
        }

        if (char === '"') {
          inString = !inString;
          continue;
        }

        if (!inString) {
          if (char === openChar) {
            depth++;
          } else if (char === closeChar) {
            depth--;
            if (depth === 0) {
              jsonEndIndex = i + 1;
              break;
            }
          }
        }
      }

      let jsonStr: string;

      if (jsonEndIndex === -1) {
        // JSON is truncated - try to repair by closing open brackets
        console.warn("⚠️ JSON appears truncated, attempting repair...");
        jsonStr = cleanedResponse;

        // Count unclosed brackets
        let openBraces = 0;
        let openBrackets = 0;
        inString = false;
        escapeNext = false;

        for (const char of jsonStr) {
          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          if (char === "\\") {
            escapeNext = true;
            continue;
          }
          if (char === '"') {
            inString = !inString;
            continue;
          }
          if (!inString) {
            if (char === "{") openBraces++;
            else if (char === "}") openBraces--;
            else if (char === "[") openBrackets++;
            else if (char === "]") openBrackets--;
          }
        }

        // Close any unclosed strings (if we're in a string, add closing quote)
        if (inString) {
          jsonStr += '"';
        }

        // Remove any trailing incomplete values
        jsonStr = jsonStr.replace(/,\s*$/, "");
        jsonStr = jsonStr.replace(/:\s*$/, ": null");
        jsonStr = jsonStr.replace(/:\s*"[^"]*$/, ': ""');

        // Close unclosed brackets
        for (let i = 0; i < openBrackets; i++) jsonStr += "]";
        for (let i = 0; i < openBraces; i++) jsonStr += "}";

        console.log(
          `🔧 Repaired JSON: closed ${openBrackets} brackets, ${openBraces} braces`
        );
      } else {
        jsonStr = cleanedResponse.substring(0, jsonEndIndex);
      }

      // Sanitize the JSON
      const sanitized = this.sanitizeJSON(jsonStr);

      // Log for debugging if sanitization changed anything
      if (jsonStr !== sanitized) {
        console.log(
          "🔧 JSON sanitized - original length:",
          jsonStr.length,
          "→ sanitized:",
          sanitized.length
        );
      }

      return JSON.parse(sanitized);
    } catch (error) {
      console.error("❌ JSON extraction/parsing failed:", error);
      console.error(
        "Raw response (first 1000 chars):",
        response.substring(0, 1000)
      );
      throw new Error(
        `Failed to parse AI response: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * DOCUMENT METRICS CALCULATOR
   * Analyzes document to dynamically determine content quantities
   * ═══════════════════════════════════════════════════════════════════════════
   */
  private calculateDocumentMetrics(
    content: string,
    pageCount: number = 1
  ): DocumentMetrics {
    // Basic text analysis
    const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;
    const charCount = content.length;
    const paragraphCount = content
      .split(/\n\n+/)
      .filter((p) => p.trim().length > 0).length;

    // Estimate topics based on content structure
    const headingMatches = content.match(/^#+\s+.+$|^[A-Z][^.!?]*:$/gm) || [];
    const estimatedTopics = Math.max(
      3,
      Math.min(12, headingMatches.length || Math.ceil(paragraphCount / 3))
    );

    // Determine content density
    let contentDensity: "light" | "medium" | "dense";
    const wordsPerPage = pageCount > 0 ? wordCount / pageCount : wordCount;

    if (wordsPerPage < 300 || wordCount < 500) {
      contentDensity = "light";
    } else if (wordsPerPage < 600 || wordCount < 2000) {
      contentDensity = "medium";
    } else {
      contentDensity = "dense";
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DYNAMIC QUANTITY CALCULATION
    // Important Concepts: 5 (min) to 15 (max) - more concepts, fewer bullets per concept
    // Recall Notes Topics: 6 (min) to 15 (max) based on document content
    // Questions: 10 (min) to 15 (max) based on content density
    // ═══════════════════════════════════════════════════════════════════════════

    let recommendedConceptCount: number;
    let recommendedQuestionCount: number;
    let recommendedQuizCount: number;
    let recommendedRecallTopicCount: number;

    switch (contentDensity) {
      case "light":
        // Smaller documents
        recommendedConceptCount = 8; // Fixed at 8
        recommendedRecallTopicCount = 10; // Min 10
        recommendedQuestionCount = 10;
        recommendedQuizCount = 10;
        break;
      case "medium":
        // Medium documents
        recommendedConceptCount = 8; // Fixed at 8
        recommendedRecallTopicCount = 12;
        recommendedQuestionCount = 12;
        recommendedQuizCount = 12;
        break;
      case "dense":
        // Large documents
        recommendedConceptCount = 8; // Fixed at 8
        recommendedRecallTopicCount = 15; // Max 15
        recommendedQuestionCount = 15;
        recommendedQuizCount = 15;
        break;
    }

    // Fine-tune based on estimated topics (only for recall topics and questions)
    if (estimatedTopics >= 8) {
      recommendedRecallTopicCount = Math.min(
        15,
        recommendedRecallTopicCount + 3
      );
      recommendedQuestionCount = Math.min(15, recommendedQuestionCount + 2);
    }

    console.log(
      `📊 Document Metrics: ${wordCount} words, ${paragraphCount} paragraphs, ~${estimatedTopics} topics, density: ${contentDensity}`
    );
    console.log(
      `📊 Dynamic Quantities: ${recommendedConceptCount} concepts, ${recommendedRecallTopicCount} recall topics, ${recommendedQuestionCount} questions`
    );

    return {
      wordCount,
      charCount,
      pageCount,
      paragraphCount,
      estimatedTopics,
      contentDensity,
      recommendedConceptCount,
      recommendedRecallTopicCount,
      recommendedQuestionCount,
      recommendedQuizCount,
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * TWO-LAYER AI APPROACH FOR RELIABLE JSON GENERATION
   * Layer 1: Context Compression - Extracts relevant info from full document
   * Layer 2: JSON Generation - Generates structured JSON from compressed context
   * ═══════════════════════════════════════════════════════════════════════════
   */

  /**
   * LAYER 1: Context Compressor
   * Takes the full document and task type, extracts only the most relevant information
   * Creates a concise, structured context for Layer 2 to process
   */
  private async compressContextForTask(
    documentContent: string,
    taskType: LMRTaskType,
    language: string,
    additionalParams?: { count?: number }
  ): Promise<CompressedContext> {
    const taskInstructions: Record<LMRTaskType, string> = {
      summary: `Extract information needed for a comprehensive summary:
- Identify 5-8 main topics covered in the document
- Extract 10-15 key facts and details
- List important concepts that students must understand
- Note any significant examples or case studies`,

      questions: `Extract information needed to generate ${
        additionalParams?.count || 10
      } Q&A pairs:
- Identify all factual statements that can be converted to questions
- Note specific details, definitions, and explanations
- List concepts that require deeper understanding
- Include any numerical data or specific facts`,

      quiz: `Extract information needed to generate ${
        additionalParams?.count || 10
      } MCQ questions:
- Identify facts that have clear correct/incorrect options
- Note definitions with possible confusing alternatives
- List concepts that students often misunderstand
- Include specific details that make good distractors`,

      recallNotes: `Extract information for last-minute revision notes:
- Identify the key topics that need to be remembered
- Extract bullet-point worthy facts
- Note any formulas, dates, or specific data
- Identify patterns that could become mnemonics`,
    };

    const prompt = `You are an expert content analyzer. Your task is to extract and compress the most relevant information from a document for educational content generation.

DOCUMENT CONTENT:
${documentContent.substring(0, 15001)}${
      documentContent.length > 15001
        ? "\n\n[... document truncated for processing ...]"
        : ""
    }

TASK: ${taskInstructions[taskType]}

Extract a structured analysis in ${language}. Focus ONLY on extractable facts and information.

Respond with a JSON object (NO markdown, NO code blocks):
{
  "mainTopics": ["topic1", "topic2", ...],
  "keyFacts": ["fact1", "fact2", ...],
  "importantConcepts": ["concept1", "concept2", ...],
  "relevantExamples": ["example1", "example2", ...]
}

CRITICAL RULES:
1. Output ONLY valid JSON - no text before or after
2. Use double quotes for all strings
3. No trailing commas
4. Use "null" not "None", "true" not "True"
5. Keep each array item concise (1-2 sentences max)`;

    try {
      const result = await ollamaChatService.generateWithMaxOutput(
        prompt,
        2000
      );
      const response = result.answer;

      const parsed = this.extractAndParseJSON(
        response,
        false
      ) as CompressedContext;
      console.log(
        `✅ Layer 1 complete: Extracted ${
          parsed.mainTopics?.length || 0
        } topics, ${parsed.keyFacts?.length || 0} facts`
      );
      return parsed;
    } catch (error) {
      console.error("❌ Layer 1 (Context Compression) failed:", error);
      // Return a minimal fallback context
      return {
        mainTopics: ["General Content"],
        keyFacts: ["Document content available for analysis"],
        importantConcepts: ["Main concepts from the document"],
      };
    }
  }

  /**
   * LAYER 2: JSON Generator
   * Takes the compressed context from Layer 1 and generates the exact JSON structure needed
   * Works with a smaller, focused input for better JSON generation reliability
   */
  private async generateJSONFromContext<T>(
    compressedContext: CompressedContext,
    taskType: LMRTaskType,
    language: string,
    schema: {
      description: string;
      jsonTemplate: string;
      isArray: boolean;
    },
    additionalParams?: { count?: number }
  ): Promise<T> {
    const contextSummary = `
EXTRACTED CONTENT:
Main Topics: ${(compressedContext.mainTopics || []).join(", ")}

Key Facts:
${(compressedContext.keyFacts || []).map((f, i) => `${i + 1}. ${f}`).join("\n")}

Important Concepts:
${(compressedContext.importantConcepts || [])
  .map((c, i) => `${i + 1}. ${c}`)
  .join("\n")}

${
  compressedContext.relevantExamples?.length
    ? `Examples:\n${compressedContext.relevantExamples
        .map((e, i) => `${i + 1}. ${e}`)
        .join("\n")}`
    : ""
}`;

    const prompt = `You are a precise JSON generator. Generate EXACTLY ${
      schema.isArray ? "a JSON array" : "a JSON object"
    } based on the provided content.

${contextSummary}

TASK: ${schema.description}

${
  additionalParams?.count
    ? `Generate exactly ${additionalParams.count} items.`
    : ""
}

Language: ${language}

EXACT JSON FORMAT REQUIRED:
${schema.jsonTemplate}

CRITICAL RULES:
1. Output ONLY valid JSON - absolutely NO text before or after the JSON
2. Use double quotes for ALL strings
3. NO trailing commas anywhere (not after arrays, objects, or properties)
4. Use "null" NOT "None", "true" NOT "True", "false" NOT "False"
5. Ensure the JSON is complete and properly closed
6. Each string value must be properly escaped
7. DO NOT include any explanation, markdown, or code blocks
8. Array closing format: ["item1", "item2"] NOT ["item1", "item2"],
9. Object closing format: {"key": "value"} NOT {"key": "value",}

OUTPUT THE JSON NOW:`;

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await ollamaChatService.generateWithMaxOutput(
          prompt,
          3000
        );
        const response = result.answer;

        const parsed = this.extractAndParseJSON(response, schema.isArray);
        console.log(
          `✅ Layer 2 complete (attempt ${attempt}): Generated ${
            schema.isArray ? (parsed as any[]).length + " items" : "object"
          }`
        );
        return parsed as T;
      } catch (error) {
        console.warn(
          `⚠️ Layer 2 attempt ${attempt}/${maxRetries} failed:`,
          error
        );
        lastError = error instanceof Error ? error : new Error("Unknown error");

        // Wait briefly before retry
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    throw new Error(
      `Layer 2 (JSON Generation) failed after ${maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Helper: Get full document content from fileId
   */
  private async getFullDocumentContent(fileId: string): Promise<{
    fileName: string;
    fullContent: string;
    pages: number;
  }> {
    // Try to get pages
    const pages = await documentService.getAllPages(fileId);

    if (pages && pages.length > 0) {
      const fullContent = pages
        .sort((a, b) => a.pageNumber - b.pageNumber)
        .map((p) => p.content)
        .join("\n\n");

      // Get filename from vector DB or default
      const fileName = "Document";

      return {
        fileName,
        fullContent,
        pages: pages.length,
      };
    }

    // Fallback to legacy document
    const legacyContent = await documentService.getDocument(fileId);
    if (legacyContent) {
      return {
        fileName: "Document",
        fullContent: legacyContent,
        pages: 1,
      };
    }

    throw new Error("Document not found");
  }

  /**
   * Generate comprehensive summary from document
   * Uses TWO-LAYER AI approach for reliable JSON generation
   * DYNAMIC: Generates 6-10 important concepts based on document length/complexity
   */
  async generateSummary(
    fileId: string,
    language: LanguageCode,
    tone: string = "professional"
  ): Promise<LMRSummary> {
    try {
      console.log(
        "📝 Starting Summary Generation (Two-Layer AI with Dynamic Quantities)..."
      );

      // Retrieve full document content
      const document = await this.getFullDocumentContent(fileId);
      const languageName = SUPPORTED_LANGUAGES[language];

      // ═══════════════════════════════════════════════════════════════
      // CALCULATE DOCUMENT METRICS FOR DYNAMIC CONTENT QUANTITIES
      // ═══════════════════════════════════════════════════════════════
      const metrics = this.calculateDocumentMetrics(
        document.fullContent,
        document.pages
      );
      const conceptCount = metrics.recommendedConceptCount; // 6-10 based on document

      // ═══════════════════════════════════════════════════════════════
      // LAYER 1: Compress document context for summary generation
      // ═══════════════════════════════════════════════════════════════
      console.log("🔄 Layer 1: Compressing document context...");
      const compressedContext = await this.compressContextForTask(
        document.fullContent,
        "summary",
        languageName
      );

      // ═══════════════════════════════════════════════════════════════
      // LAYER 2: Generate structured summary JSON from compressed context
      // Enhanced prompt for BEST-OF-BEST last-minute revision content
      // ═══════════════════════════════════════════════════════════════
      console.log(
        `🔄 Layer 2: Generating structured summary with ${conceptCount} important concepts...`
      );

      // 3 bullet points per concept (not 5) - more concepts, fewer bullets

      // Calculate dynamic key topic count (6-11)
      const keyTopicCount = Math.min(11, Math.max(6, metrics.estimatedTopics));

      const summarySchema = {
        description: `You are an NCERT/CBSE educational expert. Generate LAST-MINUTE REVISION content from the document.

MANDATORY COUNTS:
• keyTopics: Generate EXACTLY ${keyTopicCount} topics with UNIQUE names from the document
• importantConcepts: Generate EXACTLY ${conceptCount} concepts with UNIQUE names
• Each concept must have EXACTLY 3 bullet points

STRUCTURE REQUIREMENTS:
• introduction: Write 2-3 SENTENCES (a proper paragraph, not one line!)
• conclusion: Write 2 sentences summarizing key takeaways

CRITICAL: Replace ALL placeholder text with ACTUAL content from the document!
DO NOT use generic names like "Topic 1" or "Concept 1" - use REAL topic names!

LANGUAGE: ${languageName} | TONE: ${tone} | NO EMOJIS`,

        jsonTemplate: `{
  "introduction": "Brief 2-3 sentence introduction paragraph about the main subject.",
  "summaryPoints": [
    "Key fact or concept 1",
    "Key fact or concept 2",
    "Key fact or concept 3",
    "Key fact or concept 4",
    "Key fact or concept 5",
    "Key fact or concept 6"
  ],
  "conclusion": "Brief 1-2 sentence conclusion summarizing key takeaways.",
  "keyTopics": [
    {"name": "Topic Name 1", "description": "Brief description of topic 1"},
    {"name": "Topic Name 2", "description": "Brief description of topic 2"},
    {"name": "Topic Name 3", "description": "Brief description of topic 3"},
    {"name": "Topic Name 4", "description": "Brief description of topic 4"},
    {"name": "Topic Name 5", "description": "Brief description of topic 5"},
    {"name": "Topic Name 6", "description": "Brief description of topic 6"}
  ],
  "importantConcepts": [
    {"name": "Concept 1", "points": ["Point 1", "Point 2", "Point 3"]},
    {"name": "Concept 2", "points": ["Point 1", "Point 2", "Point 3"]},
    {"name": "Concept 3", "points": ["Point 1", "Point 2", "Point 3"]},
    {"name": "Concept 4", "points": ["Point 1", "Point 2", "Point 3"]},
    {"name": "Concept 5", "points": ["Point 1", "Point 2", "Point 3"]},
    {"name": "Concept 6", "points": ["Point 1", "Point 2", "Point 3"]},
    {"name": "Concept 7", "points": ["Point 1", "Point 2", "Point 3"]},
    {"name": "Concept 8", "points": ["Point 1", "Point 2", "Point 3"]}
  ]
}

YOU MUST generate exactly 8 importantConcepts and ${keyTopicCount} keyTopics. Do NOT stop early!`,
        isArray: false,
      };

      const result = await this.generateJSONFromContext<{
        introduction: string;
        summaryPoints: string[];
        conclusion: string;
        keyTopics: { name: string; description: string }[];
        importantConcepts: { name: string; points: string[] }[];
      }>(compressedContext, "summary", languageName, summarySchema);

      console.log("✅ Structured summary generation complete!");

      // Build backward-compatible summary string from structured data
      const legacySummary = `${result.introduction} \n\n${result.summaryPoints
        .map((p) => `• ${p}`)
        .join("\n")} \n\n${result.conclusion} `;

      return {
        introduction: result.introduction || "",
        summaryPoints: result.summaryPoints || [],
        conclusion: result.conclusion || "",
        summary: legacySummary,
        keyTopics: (result.keyTopics || []).map((t: any) => ({
          name: typeof t === "string" ? t : t.name || "Topic",
          description: typeof t === "string" ? "" : t.description || "",
        })),
        importantConcepts: (result.importantConcepts || []).map((c: any) => ({
          name: typeof c === "string" ? c : c.name || "Concept",
          points: typeof c === "string" ? [c] : c.points || [],
        })),
        language: languageName,
      };
    } catch (error) {
      console.error("❌ Summary generation failed:", error);
      throw new Error(
        `Failed to generate summary: ${
          error instanceof Error ? error.message : "Unknown error"
        } `
      );
    }
  }

  /**
   * Generate Q&A from document
   * Uses TWO-LAYER AI approach for reliable JSON generation
   * DYNAMIC: Generates 10-15 questions based on document length/complexity
   */
  async generateQuestions(
    fileId: string,
    language: LanguageCode,
    count: number = 10
  ): Promise<LMRQuestion[]> {
    try {
      console.log(
        "❓ Starting Q&A Generation (Two-Layer AI with Dynamic Quantities)..."
      );

      const document = await this.getFullDocumentContent(fileId);
      const languageName = SUPPORTED_LANGUAGES[language];

      // ═══════════════════════════════════════════════════════════════
      // CALCULATE DOCUMENT METRICS FOR DYNAMIC QUESTION COUNT
      // ═══════════════════════════════════════════════════════════════
      const metrics = this.calculateDocumentMetrics(
        document.fullContent,
        document.pages
      );
      const dynamicCount = metrics.recommendedQuestionCount; // 10-15 based on document
      const actualCount = Math.max(count, dynamicCount); // Use higher of provided or recommended

      console.log(
        `📊 Dynamic question count: ${actualCount} (provided: ${count}, recommended: ${dynamicCount})`
      );

      // ═══════════════════════════════════════════════════════════════
      // LAYER 1: Compress document context for question generation
      // ═══════════════════════════════════════════════════════════════
      console.log("🔄 Layer 1: Compressing document context...");
      const compressedContext = await this.compressContextForTask(
        document.fullContent,
        "questions",
        languageName,
        { count: actualCount }
      );

      // ═══════════════════════════════════════════════════════════════
      // LAYER 2: Generate questions JSON from compressed context
      // Enhanced prompt for BEST-OF-BEST exam preparation questions
      // ═══════════════════════════════════════════════════════════════
      console.log(
        `🔄 Layer 2: Generating ${actualCount} high - quality questions...`
      );

      // Calculate difficulty distribution
      const easyCount = Math.round(actualCount * 0.3);
      const mediumCount = Math.round(actualCount * 0.5);
      const hardCount = actualCount - easyCount - mediumCount;

      const questionsSchema = {
        description: `You are an expert exam question creator with deep understanding of educational assessment.

        CONTEXT: These questions will help a student prepare for their upcoming exam.The questions should:
      - Cover ALL major topics from the document comprehensively
        - Progress from basic recall to deeper understanding
          - Include questions that are LIKELY to appear in actual exams
            - Have detailed answers that help students learn, not just memorize

      LANGUAGE: ${languageName}

DYNAMIC REQUIREMENTS based on document analysis:
      - Generate EXACTLY ${actualCount} questions(based on document: ${metrics.contentDensity} content density, ~${metrics.wordCount} words)
        - Difficulty distribution:
  • ${easyCount} EASY questions(basic recall, definitions, simple facts)
  • ${mediumCount} MEDIUM questions(understanding, application, relationships)
  • ${hardCount} HARD questions(analysis, synthesis, complex problem - solving)

QUESTION QUALITY STANDARDS:
✅ Each question should test a DIFFERENT concept / topic
✅ Questions should be clear and unambiguous
✅ Answers should be comprehensive but concise
✅ Include specific facts, formulas, examples in answers
✅ Avoid vague or overly broad questions
✅ Make questions that match typical exam patterns

ANSWER QUALITY STANDARDS:
✅ Start with a direct answer to the question
✅ Provide explanation / reasoning
✅ Include relevant examples or formulas
✅ Keep answers exam - appropriate length(not too long)`,

        jsonTemplate: `[
        {
          "question": "Clear, specific question testing basic knowledge (Easy)",
          "answer": "Direct answer followed by brief explanation. Include relevant facts.",
          "subject": "Topic/Subject area",
          "difficulty": "Easy",
          "pageReference": null
        },
        {
          "question": "Question requiring understanding of relationships or processes (Medium)",
          "answer": "Comprehensive answer with explanation and example if applicable.",
          "subject": "Topic/Subject area",
          "difficulty": "Medium",
          "pageReference": null
        },
        {
          "question": "Complex question requiring analysis or application (Hard)",
          "answer": "Detailed answer with step-by-step explanation, formulas if needed.",
          "subject": "Topic/Subject area",
          "difficulty": "Hard",
          "pageReference": null
        }
      ]

      CRITICAL: Generate EXACTLY ${actualCount} questions covering diverse topics from the document.`,
        isArray: true,
      };

      const questions = await this.generateJSONFromContext<any[]>(
        compressedContext,
        "questions",
        languageName,
        questionsSchema,
        { count: actualCount }
      );

      console.log(
        `✅ Q & A generation complete! Generated ${questions.length} questions`
      );

      return questions.map((q: any, index: number) => ({
        id: index + 1,
        question: q.question,
        answer: q.answer,
        subject: q.subject || "General",
        difficulty: q.difficulty || "Medium",
        pageReference: q.pageReference,
      }));
    } catch (error) {
      console.error("❌ Q&A generation failed:", error);
      throw new Error(
        `Failed to generate questions: ${
          error instanceof Error ? error.message : "Unknown error"
        } `
      );
    }
  }

  /**
   * Generate quiz with MCQs
   * Uses TWO-LAYER AI approach for reliable JSON generation
   */
  async generateQuiz(
    fileId: string,
    language: LanguageCode,
    count: number = 10
  ): Promise<LMRQuiz[]> {
    try {
      console.log("📋 Starting Quiz Generation (Two-Layer AI)...");

      const document = await this.getFullDocumentContent(fileId);
      const languageName = SUPPORTED_LANGUAGES[language];

      // ═══════════════════════════════════════════════════════════════
      // LAYER 1: Compress document context for quiz generation
      // ═══════════════════════════════════════════════════════════════
      console.log("🔄 Layer 1: Compressing document context...");
      const compressedContext = await this.compressContextForTask(
        document.fullContent,
        "quiz",
        languageName,
        { count }
      );

      // ═══════════════════════════════════════════════════════════════
      // LAYER 2: Generate quiz JSON from compressed context
      // ═══════════════════════════════════════════════════════════════
      console.log("🔄 Layer 2: Generating quiz JSON...");
      const quizSchema = {
        description: `Generate ${count} multiple-choice questions (MCQs). Each question must have exactly 4 options with one correct answer. Mix difficulty levels and include explanations.

CRITICAL JSON RULES:
1. NO trailing commas after arrays or objects
2. Each object MUST end with } NOT },
3. "options" array ends with ] NOT ],
4. Proper comma placement between object properties
5. correctAnswer must be a NUMBER (0-3), not a string`,
        jsonTemplate: `[
        {
          "question": "Clear question text",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": 0,
          "explanation": "Why this answer is correct",
          "difficulty": "Easy",
          "subject": "Subject name"
        },
        {
          "question": "Another MCQ question",
          "options": ["Choice 1", "Choice 2", "Choice 3", "Choice 4"],
          "correctAnswer": 2,
          "explanation": "Explanation for correct answer",
          "difficulty": "Medium",
          "subject": "Subject name"
        }
      ]

IMPORTANT: Generate EXACTLY ${count} MCQ questions. NO trailing commas!`,
        isArray: true,
      };

      const quizzes = await this.generateJSONFromContext<any[]>(
        compressedContext,
        "quiz",
        languageName,
        quizSchema,
        { count }
      );

      console.log("✅ Quiz generation complete!");

      return quizzes.map((q: any, index: number) => ({
        id: index + 1,
        question: q.question,
        options: q.options || [],
        correctAnswer: q.correctAnswer || 0,
        explanation: q.explanation,
        difficulty: q.difficulty || "Medium",
        subject: q.subject || "General",
      }));
    } catch (error) {
      console.error("❌ Quiz generation failed:", error);
      throw new Error(
        `Failed to generate quiz: ${
          error instanceof Error ? error.message : "Unknown error"
        } `
      );
    }
  }

  /**
   * Generate recall notes for last-minute revision
   * Uses TWO-LAYER AI approach for reliable JSON generation
   * DYNAMIC: Generates 6-15 topics based on document content
   */
  async generateRecallNotes(
    fileId: string,
    language: LanguageCode
  ): Promise<LMRRecallNote[]> {
    try {
      console.log(
        "🧠 Starting Recall Notes Generation (Two-Layer AI with Dynamic Topics)..."
      );

      const document = await this.getFullDocumentContent(fileId);
      const languageName = SUPPORTED_LANGUAGES[language];

      // ═══════════════════════════════════════════════════════════════
      // CALCULATE DOCUMENT METRICS FOR DYNAMIC TOPIC COUNT
      // ═══════════════════════════════════════════════════════════════
      const metrics = this.calculateDocumentMetrics(
        document.fullContent,
        document.pages
      );
      const topicCount = metrics.recommendedRecallTopicCount; // 6-15 based on document

      console.log(`📊 Dynamic recall topic count: ${topicCount}`);

      // ═══════════════════════════════════════════════════════════════
      // LAYER 1: Compress document context for recall notes generation
      // ═══════════════════════════════════════════════════════════════
      console.log("🔄 Layer 1: Compressing document context...");
      const compressedContext = await this.compressContextForTask(
        document.fullContent,
        "recallNotes",
        languageName
      );

      // ═══════════════════════════════════════════════════════════════
      // LAYER 2: Generate comprehensive recall notes JSON from compressed context
      // ═══════════════════════════════════════════════════════════════
      console.log(`🔄 Layer 2: Generating ${topicCount} recall note topics...`);
      const recallNotesSchema = {
        description: `You are an NCERT/CBSE educational expert. Generate LAST-MINUTE REVISION notes.

MANDATORY: Generate EXACTLY ${topicCount} topics from the document.
Each topic MUST have:
- topic: A REAL topic name (like "Mendel's Laws", not "Topic 1")
- keyPoints: Array of 5 STRINGS (actual facts, not objects)
- quickFacts: Array of 5 STRINGS (actual facts, not objects)
- mnemonics: Array of 1 STRING

CRITICAL: keyPoints and quickFacts must be PLAIN STRINGS, not objects!
WRONG: {"point": "text"} 
RIGHT: "text"

NO EMOJIS | Generate ${topicCount} topics`,
        jsonTemplate: `[
  {
    "topic": "Main Topic Name 1",
    "keyPoints": [
      "Important point about this topic",
      "Second key point to remember",
      "Third essential fact",
      "Fourth critical detail",
      "Fifth key concept"
    ],
    "quickFacts": [
      "Quick fact 1",
      "Quick fact 2",
      "Quick fact 3",
      "Quick fact 4",
      "Quick fact 5"
    ],
    "mnemonics": ["Memory aid or mnemonic for this topic"]
  },
  {
    "topic": "Main Topic Name 2",
    "keyPoints": [
      "Important point about this topic",
      "Second key point to remember",
      "Third essential fact",
      "Fourth critical detail",
      "Fifth key concept"
    ],
    "quickFacts": [
      "Quick fact 1",
      "Quick fact 2",
      "Quick fact 3",
      "Quick fact 4",
      "Quick fact 5"
    ],
    "mnemonics": ["Memory aid or mnemonic for this topic"]
  }
]

IMPORTANT: Generate ${topicCount} topics total. The example shows only 2 - you must generate more!
Each keyPoint and quickFact must be a plain STRING, not an object.`,
        isArray: true,
      };

      const notes = await this.generateJSONFromContext<any[]>(
        compressedContext,
        "recallNotes",
        languageName,
        recallNotesSchema
      );

      console.log("✅ Comprehensive recall notes generation complete!");

      // Helper function to normalize array items to strings (fixes [object Object] bug)
      const normalizeToStringArray = (items: any[]): string[] => {
        if (!Array.isArray(items)) return [];
        return items
          .map((item) => {
            if (typeof item === "string") return item;
            if (typeof item === "object" && item !== null) {
              // Extract meaningful string from object - try common property names
              return (
                item.text ||
                item.content ||
                item.point ||
                item.fact ||
                item.value ||
                item.description ||
                JSON.stringify(item)
              );
            }
            return String(item);
          })
          .filter(
            (item) =>
              item && item !== "{}" && item !== "null" && item !== "undefined"
          );
      };

      return notes.map((n: any) => ({
        topic: typeof n.topic === "string" ? n.topic : n.topic?.name || "Topic",
        keyPoints: normalizeToStringArray(n.keyPoints || []),
        quickFacts: normalizeToStringArray(n.quickFacts || []),
        mnemonics: normalizeToStringArray(n.mnemonics || []),
      }));
    } catch (error) {
      console.error("❌ Recall notes generation failed:", error);
      throw new Error(
        `Failed to generate recall notes: ${
          error instanceof Error ? error.message : "Unknown error"
        } `
      );
    }
  }

  /**
   * Get all generated content for a document
   */
  async getAllContent(fileId: string, language: LanguageCode) {
    try {
      const [summary, questions, quiz, recallNotes] = await Promise.all([
        this.generateSummary(fileId, language),
        this.generateQuestions(fileId, language, 10),
        this.generateQuiz(fileId, language, 10),
        this.generateRecallNotes(fileId, language),
      ]);

      return {
        summary,
        questions,
        quiz,
        recallNotes,
      };
    } catch (error) {
      throw new Error(
        `Failed to generate content: ${
          error instanceof Error ? error.message : "Unknown error"
        } `
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NLLB TRANSLATION METHODS
  // Translate generated LMR content to any supported Indian language
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Helper: Translate a single text string using NLLB
   */
  private async translateText(
    text: string,
    targetLang: SupportedLanguageCode
  ): Promise<string> {
    if (!text || text.trim().length === 0) return text;
    if (targetLang === "en") return text; // No translation needed for English

    try {
      const nllbTargetCode = languageService.toNLLBCode(targetLang);
      // Disable caching for LMR to ensure unique translations
      const translated = await nllbService.translate(text, {
        srcLang: "eng_Latn",
        tgtLang: nllbTargetCode,
        useCache: false, // Disable caching to prevent collisions
      });

      // Debug log - show first 50 chars of input/output
      console.log(
        `📝 Translated: "${text.substring(
          0,
          40
        )}..." -> "${translated.substring(0, 40)}..."`
      );

      return translated;
    } catch (error) {
      console.warn(
        `⚠️ Translation failed for text "${text.substring(0, 30)}...":`,
        error
      );
      return text; // Fallback to original if translation fails
    }
  }

  /**
   * Translate LMR Summary to target language
   */
  async translateSummary(
    summary: LMRSummary,
    targetLang: SupportedLanguageCode
  ): Promise<LMRSummary> {
    if (targetLang === "en") return summary;

    console.log(
      `🌐 Translating summary to ${languageService.getLanguageName(
        targetLang
      )}...`
    );

    const [
      translatedIntro,
      translatedConclusion,
      translatedSummary,
      translatedPoints,
      translatedTopics,
      translatedConcepts,
    ] = await Promise.all([
      this.translateText(summary.introduction, targetLang),
      this.translateText(summary.conclusion, targetLang),
      summary.summary
        ? this.translateText(summary.summary, targetLang)
        : Promise.resolve(undefined),
      Promise.all(
        summary.summaryPoints.map((p) => this.translateText(p, targetLang))
      ),
      Promise.all(
        summary.keyTopics.map(async (t) => ({
          name: await this.translateText(t.name, targetLang),
          description: await this.translateText(t.description, targetLang),
        }))
      ),
      Promise.all(
        summary.importantConcepts.map(async (c) => ({
          name: await this.translateText(c.name, targetLang),
          points: await Promise.all(
            c.points.map((p) => this.translateText(p, targetLang))
          ),
        }))
      ),
    ]);

    return {
      ...summary,
      introduction: translatedIntro,
      conclusion: translatedConclusion,
      summary: translatedSummary,
      summaryPoints: translatedPoints,
      keyTopics: translatedTopics,
      importantConcepts: translatedConcepts,
      language: languageService.getLanguageName(targetLang),
    };
  }

  /**
   * Translate LMR Questions to target language
   */
  async translateQuestions(
    questions: LMRQuestion[],
    targetLang: SupportedLanguageCode
  ): Promise<LMRQuestion[]> {
    if (targetLang === "en") return questions;

    console.log(
      `🌐 Translating ${
        questions.length
      } questions to ${languageService.getLanguageName(targetLang)}...`
    );

    return Promise.all(
      questions.map(async (q) => ({
        ...q,
        question: await this.translateText(q.question, targetLang),
        answer: await this.translateText(q.answer, targetLang),
        subject: await this.translateText(q.subject, targetLang),
      }))
    );
  }

  /**
   * Translate LMR Quiz to target language
   */
  async translateQuiz(
    quiz: LMRQuiz[],
    targetLang: SupportedLanguageCode
  ): Promise<LMRQuiz[]> {
    if (targetLang === "en") return quiz;

    console.log(
      `🌐 Translating ${
        quiz.length
      } quiz questions to ${languageService.getLanguageName(targetLang)}...`
    );

    return Promise.all(
      quiz.map(async (q) => ({
        ...q,
        question: await this.translateText(q.question, targetLang),
        options: await Promise.all(
          q.options.map((o) => this.translateText(o, targetLang))
        ),
        explanation: await this.translateText(q.explanation, targetLang),
        subject: await this.translateText(q.subject, targetLang),
      }))
    );
  }

  /**
   * Translate LMR Recall Notes to target language
   */
  async translateRecallNotes(
    notes: LMRRecallNote[],
    targetLang: SupportedLanguageCode
  ): Promise<LMRRecallNote[]> {
    if (targetLang === "en") return notes;

    console.log(
      `🌐 Translating ${
        notes.length
      } recall note topics to ${languageService.getLanguageName(targetLang)}...`
    );

    return Promise.all(
      notes.map(async (n) => ({
        topic: await this.translateText(n.topic, targetLang),
        keyPoints: await Promise.all(
          n.keyPoints.map((p) => this.translateText(p, targetLang))
        ),
        quickFacts: await Promise.all(
          n.quickFacts.map((f) => this.translateText(f, targetLang))
        ),
        mnemonics: n.mnemonics
          ? await Promise.all(
              n.mnemonics.map((m) => this.translateText(m, targetLang))
            )
          : undefined,
      }))
    );
  }

  /**
   * Main translation method - translates all LMR content to target language
   */
  async translateContent(
    content: {
      summary?: LMRSummary;
      questions?: LMRQuestion[];
      quiz?: LMRQuiz[];
      recallNotes?: LMRRecallNote[];
    },
    targetLang: SupportedLanguageCode
  ): Promise<{
    summary?: LMRSummary;
    questions?: LMRQuestion[];
    quiz?: LMRQuiz[];
    recallNotes?: LMRRecallNote[];
  }> {
    if (!env.NLLB_ENABLED) {
      throw new Error(
        "NLLB translation is not enabled. Set NLLB_ENABLED=true in environment."
      );
    }

    if (targetLang === "en") {
      return content; // No translation needed
    }

    console.log(
      `🌐 Translating all LMR content to ${languageService.getLanguageName(
        targetLang
      )}...`
    );

    const [summary, questions, quiz, recallNotes] = await Promise.all([
      content.summary
        ? this.translateSummary(content.summary, targetLang)
        : Promise.resolve(undefined),
      content.questions
        ? this.translateQuestions(content.questions, targetLang)
        : Promise.resolve(undefined),
      content.quiz
        ? this.translateQuiz(content.quiz, targetLang)
        : Promise.resolve(undefined),
      content.recallNotes
        ? this.translateRecallNotes(content.recallNotes, targetLang)
        : Promise.resolve(undefined),
    ]);

    console.log(
      `✅ Translation complete to ${languageService.getLanguageName(
        targetLang
      )}`
    );

    return { summary, questions, quiz, recallNotes };
  }
}

export const lmrService = new LMRService();

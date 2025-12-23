import { ollamaChatService } from "./ollamaChat.service";
import { vectorDBService } from "./vectordb.service";
import { documentService } from "./document.service";
import { LanguageCode, SUPPORTED_LANGUAGES } from "../config/constants";

export interface LMRSummary {
  summary: string;
  keyTopics: string[];
  importantConcepts: string[];
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
type LMRTaskType = 'summary' | 'questions' | 'quiz' | 'recallNotes';

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

export class LMRService {
  /**
   * Helper: Sanitize JSON string from AI responses
   * Handles Python-style syntax (None, True, False) and malformed JSON
   */
  private sanitizeJSON(jsonString: string): string {
    let cleaned = jsonString;

    // Remove any markdown code block markers
    cleaned = cleaned.replace(/```json\s*/g, '');
    cleaned = cleaned.replace(/```\s*/g, '');

    // Replace Python-style None with null (multiple patterns)
    cleaned = cleaned.replace(/:\s*None\s*([,\}\]])/g, ': null$1');
    cleaned = cleaned.replace(/\[\s*None\s*([,\]])/g, '[null$1');
    cleaned = cleaned.replace(/,\s*None\s*([,\}\]])/g, ', null$1');

    // Replace Python-style True/False with lowercase
    cleaned = cleaned.replace(/:\s*True\s*([,\}\]])/g, ': true$1');
    cleaned = cleaned.replace(/:\s*False\s*([,\}\]])/g, ': false$1');
    cleaned = cleaned.replace(/,\s*True\s*([,\}\]])/g, ', true$1');
    cleaned = cleaned.replace(/,\s*False\s*([,\}\]])/g, ', false$1');

    // Remove trailing commas before closing brackets/braces
    cleaned = cleaned.replace(/,(\s*[\}\]])/g, '$1');

    // Fix missing commas between array elements (common DeepSeek issue)
    cleaned = cleaned.replace(/\}(\s*)\{/g, '},$1{');
    cleaned = cleaned.replace(/\](\s*)\[/g, '],$1[');

    // Fix missing commas between string values
    cleaned = cleaned.replace(/"(\s+)"/g, '",$1"');

    return cleaned;
  }

  /**
   * Helper: Extract and parse JSON from AI response
   */
  private extractAndParseJSON(response: string, isArray: boolean = false): any {
    try {
      // Remove DeepSeek thinking tags if present
      let cleanedResponse = response.replace(/<think>[\s\S]*?<\/think>/g, '');

      // Extract JSON pattern
      const pattern = isArray ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
      const jsonMatch = cleanedResponse.match(pattern);

      if (!jsonMatch) {
        console.error("❌ No JSON pattern found in response");
        console.error("Response preview:", response.substring(0, 500));
        throw new Error("No valid JSON found in response");
      }

      // Sanitize and parse
      const raw = jsonMatch[0];
      const sanitized = this.sanitizeJSON(raw);

      // Log for debugging if sanitization changed anything
      if (raw !== sanitized) {
        console.log("🔧 JSON sanitized - original length:", raw.length, "→ sanitized:", sanitized.length);
      }

      return JSON.parse(sanitized);
    } catch (error) {
      console.error("❌ JSON extraction/parsing failed:", error);
      console.error("Raw response (first 1000 chars):", response.substring(0, 1000));
      throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

      questions: `Extract information needed to generate ${additionalParams?.count || 10} Q&A pairs:
- Identify all factual statements that can be converted to questions
- Note specific details, definitions, and explanations
- List concepts that require deeper understanding
- Include any numerical data or specific facts`,

      quiz: `Extract information needed to generate ${additionalParams?.count || 10} MCQ questions:
- Identify facts that have clear correct/incorrect options
- Note definitions with possible confusing alternatives
- List concepts that students often misunderstand
- Include specific details that make good distractors`,

      recallNotes: `Extract information for last-minute revision notes:
- Identify the key topics that need to be remembered
- Extract bullet-point worthy facts
- Note any formulas, dates, or specific data
- Identify patterns that could become mnemonics`
    };

    const prompt = `You are an expert content analyzer. Your task is to extract and compress the most relevant information from a document for educational content generation.

DOCUMENT CONTENT:
${documentContent.substring(0, 15001)}${documentContent.length > 15001 ? '\n\n[... document truncated for processing ...]' : ''}

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
      const response = await ollamaChatService.chatCompletion(
        [{ role: 'user', content: prompt }],
        'json_object'
      );

      const parsed = this.extractAndParseJSON(response, false) as CompressedContext;
      console.log(`✅ Layer 1 complete: Extracted ${parsed.mainTopics?.length || 0} topics, ${parsed.keyFacts?.length || 0} facts`);
      return parsed;
    } catch (error) {
      console.error('❌ Layer 1 (Context Compression) failed:', error);
      // Return a minimal fallback context
      return {
        mainTopics: ['General Content'],
        keyFacts: ['Document content available for analysis'],
        importantConcepts: ['Main concepts from the document']
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
Main Topics: ${compressedContext.mainTopics.join(', ')}

Key Facts:
${compressedContext.keyFacts.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Important Concepts:
${compressedContext.importantConcepts.map((c, i) => `${i + 1}. ${c}`).join('\n')}

${compressedContext.relevantExamples?.length ? `Examples:\n${compressedContext.relevantExamples.map((e, i) => `${i + 1}. ${e}`).join('\n')}` : ''}`;

    const prompt = `You are a precise JSON generator. Generate EXACTLY ${schema.isArray ? 'a JSON array' : 'a JSON object'} based on the provided content.

${contextSummary}

TASK: ${schema.description}

${additionalParams?.count ? `Generate exactly ${additionalParams.count} items.` : ''}

Language: ${language}

EXACT JSON FORMAT REQUIRED:
${schema.jsonTemplate}

CRITICAL RULES:
1. Output ONLY valid JSON - absolutely NO text before or after the JSON
2. Use double quotes for ALL strings
3. NO trailing commas
4. Use "null" NOT "None", "true" NOT "True", "false" NOT "False"
5. Ensure the JSON is complete and properly closed
6. Each string value must be properly escaped
7. DO NOT include any explanation, markdown, or code blocks

OUTPUT THE JSON NOW:`;

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await ollamaChatService.chatCompletion(
          [{ role: 'user', content: prompt }],
          'json_object'
        );

        const parsed = this.extractAndParseJSON(response, schema.isArray);
        console.log(`✅ Layer 2 complete (attempt ${attempt}): Generated ${schema.isArray ? (parsed as any[]).length + ' items' : 'object'}`);
        return parsed as T;
      } catch (error) {
        console.warn(`⚠️ Layer 2 attempt ${attempt}/${maxRetries} failed:`, error);
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Wait briefly before retry
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    throw new Error(`Layer 2 (JSON Generation) failed after ${maxRetries} attempts: ${lastError?.message}`);
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
   */
  async generateSummary(
    fileId: string,
    language: LanguageCode,
    tone: string = "professional"
  ): Promise<LMRSummary> {
    try {
      console.log('📝 Starting Summary Generation (Two-Layer AI)...');

      // Retrieve full document content
      const document = await this.getFullDocumentContent(fileId);
      const languageName = SUPPORTED_LANGUAGES[language];

      // ═══════════════════════════════════════════════════════════════
      // LAYER 1: Compress document context for summary generation
      // ═══════════════════════════════════════════════════════════════
      console.log('🔄 Layer 1: Compressing document context...');
      const compressedContext = await this.compressContextForTask(
        document.fullContent,
        'summary',
        languageName
      );

      // ═══════════════════════════════════════════════════════════════
      // LAYER 2: Generate summary JSON from compressed context
      // ═══════════════════════════════════════════════════════════════
      console.log('🔄 Layer 2: Generating summary JSON...');
      const summarySchema = {
        description: `Generate a comprehensive educational summary with a ${tone} tone. Create a detailed overview covering all major aspects of the content.`,
        jsonTemplate: `{
  "summary": "A comprehensive 3-5 paragraph overview covering the main content, key insights, and overall significance...",
  "keyTopics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5"],
  "importantConcepts": ["Concept 1", "Concept 2", "Concept 3", "Concept 4", "Concept 5"]
}`,
        isArray: false
      };

      const result = await this.generateJSONFromContext<{
        summary: string;
        keyTopics: string[];
        importantConcepts: string[];
      }>(compressedContext, 'summary', languageName, summarySchema);

      console.log('✅ Summary generation complete!');

      return {
        summary: result.summary,
        keyTopics: result.keyTopics || [],
        importantConcepts: result.importantConcepts || [],
        language: languageName,
      };
    } catch (error) {
      console.error('❌ Summary generation failed:', error);
      throw new Error(
        `Failed to generate summary: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Generate Q&A from document
   * Uses TWO-LAYER AI approach for reliable JSON generation
   */
  async generateQuestions(
    fileId: string,
    language: LanguageCode,
    count: number = 10
  ): Promise<LMRQuestion[]> {
    try {
      console.log('❓ Starting Q&A Generation (Two-Layer AI)...');

      const document = await this.getFullDocumentContent(fileId);
      const languageName = SUPPORTED_LANGUAGES[language];

      // ═══════════════════════════════════════════════════════════════
      // LAYER 1: Compress document context for question generation
      // ═══════════════════════════════════════════════════════════════
      console.log('🔄 Layer 1: Compressing document context...');
      const compressedContext = await this.compressContextForTask(
        document.fullContent,
        'questions',
        languageName,
        { count }
      );

      // ═══════════════════════════════════════════════════════════════
      // LAYER 2: Generate questions JSON from compressed context
      // ═══════════════════════════════════════════════════════════════
      console.log('🔄 Layer 2: Generating questions JSON...');
      const questionsSchema = {
        description: `Generate ${count} high-quality educational Q&A pairs. Mix difficulty levels: 30% Easy, 50% Medium, 20% Hard. Each question should test understanding of the content.`,
        jsonTemplate: `[
  {
    "question": "Clear, specific question about the content",
    "answer": "Comprehensive, detailed answer",
    "subject": "Subject/Topic category",
    "difficulty": "Easy",
    "pageReference": null
  },
  {
    "question": "Another question...",
    "answer": "Another answer...",
    "subject": "Subject name",
    "difficulty": "Medium",
    "pageReference": null
  }
]`,
        isArray: true
      };

      const questions = await this.generateJSONFromContext<any[]>(
        compressedContext,
        'questions',
        languageName,
        questionsSchema,
        { count }
      );

      console.log('✅ Q&A generation complete!');

      return questions.map((q: any, index: number) => ({
        id: index + 1,
        question: q.question,
        answer: q.answer,
        subject: q.subject || "General",
        difficulty: q.difficulty || "Medium",
        pageReference: q.pageReference,
      }));
    } catch (error) {
      console.error('❌ Q&A generation failed:', error);
      throw new Error(
        `Failed to generate questions: ${error instanceof Error ? error.message : "Unknown error"}`
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
      console.log('📋 Starting Quiz Generation (Two-Layer AI)...');

      const document = await this.getFullDocumentContent(fileId);
      const languageName = SUPPORTED_LANGUAGES[language];

      // ═══════════════════════════════════════════════════════════════
      // LAYER 1: Compress document context for quiz generation
      // ═══════════════════════════════════════════════════════════════
      console.log('🔄 Layer 1: Compressing document context...');
      const compressedContext = await this.compressContextForTask(
        document.fullContent,
        'quiz',
        languageName,
        { count }
      );

      // ═══════════════════════════════════════════════════════════════
      // LAYER 2: Generate quiz JSON from compressed context
      // ═══════════════════════════════════════════════════════════════
      console.log('🔄 Layer 2: Generating quiz JSON...');
      const quizSchema = {
        description: `Generate ${count} multiple-choice questions (MCQs). Each question must have exactly 4 options with one correct answer. Mix difficulty levels and include explanations.`,
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
]`,
        isArray: true
      };

      const quizzes = await this.generateJSONFromContext<any[]>(
        compressedContext,
        'quiz',
        languageName,
        quizSchema,
        { count }
      );

      console.log('✅ Quiz generation complete!');

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
      console.error('❌ Quiz generation failed:', error);
      throw new Error(
        `Failed to generate quiz: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Generate recall notes for last-minute revision
   * Uses TWO-LAYER AI approach for reliable JSON generation
   */
  async generateRecallNotes(
    fileId: string,
    language: LanguageCode
  ): Promise<LMRRecallNote[]> {
    try {
      console.log('🧠 Starting Recall Notes Generation (Two-Layer AI)...');

      const document = await this.getFullDocumentContent(fileId);
      const languageName = SUPPORTED_LANGUAGES[language];

      // ═══════════════════════════════════════════════════════════════
      // LAYER 1: Compress document context for recall notes generation
      // ═══════════════════════════════════════════════════════════════
      console.log('🔄 Layer 1: Compressing document context...');
      const compressedContext = await this.compressContextForTask(
        document.fullContent,
        'recallNotes',
        languageName
      );

      // ═══════════════════════════════════════════════════════════════
      // LAYER 2: Generate recall notes JSON from compressed context
      // ═══════════════════════════════════════════════════════════════
      console.log('🔄 Layer 2: Generating recall notes JSON...');
      const recallNotesSchema = {
        description: `Generate concise, memorable recall notes organized by topics. Include key points (3-5 per topic), quick facts, and helpful mnemonics for exam preparation.`,
        jsonTemplate: `[
  {
    "topic": "Topic Name",
    "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
    "quickFacts": ["Quick fact 1", "Quick fact 2"],
    "mnemonics": ["Mnemonic to help remember"]
  },
  {
    "topic": "Another Topic",
    "keyPoints": ["Important point 1", "Important point 2"],
    "quickFacts": ["Fact to remember"],
    "mnemonics": []
  }
]`,
        isArray: true
      };

      const notes = await this.generateJSONFromContext<any[]>(
        compressedContext,
        'recallNotes',
        languageName,
        recallNotesSchema
      );

      console.log('✅ Recall notes generation complete!');

      return notes.map((n: any) => ({
        topic: n.topic,
        keyPoints: n.keyPoints || [],
        quickFacts: n.quickFacts || [],
        mnemonics: n.mnemonics || [],
      }));
    } catch (error) {
      console.error('❌ Recall notes generation failed:', error);
      throw new Error(
        `Failed to generate recall notes: ${error instanceof Error ? error.message : "Unknown error"}`
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
        `Failed to generate content: ${error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

export const lmrService = new LMRService();

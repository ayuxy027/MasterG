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
   */
  async generateSummary(
    fileId: string,
    language: LanguageCode,
    tone: string = "professional"
  ): Promise<LMRSummary> {
    try {
      // Retrieve full document content
      const document = await this.getFullDocumentContent(fileId);

      const languageName = SUPPORTED_LANGUAGES[language];

      const prompt = `You are an expert educational content analyzer. Create a comprehensive summary of the following document.

Document: ${document.fileName}
Total Pages: ${document.pages}

DOCUMENT CONTENT:
${document.fullContent}

Generate a structured summary in ${languageName} with:
1. A comprehensive overview (3-5 paragraphs)
2. Key topics covered (list 5-8 main topics)
3. Important concepts that students must understand (list 5-10 concepts)

Tone: ${tone}

Format your response as JSON:
{
  "summary": "comprehensive overview here...",
  "keyTopics": ["topic 1", "topic 2", ...],
  "importantConcepts": ["concept 1", "concept 2", ...]
}

CRITICAL: Respond with valid JSON only. Use "null" not "None", "true" not "True", "false" not "False". No markdown, no code blocks, just pure JSON.`;

      const response = await ollamaChatService.queryWithFullDocument(
        prompt,
        document.fullContent,
        language,
        [],
        {
          fileName: document.fileName,
          totalPages: document.pages,
        }
      );

      // Parse JSON response using sanitized extraction
      const result = this.extractAndParseJSON(response.answer, false);

      return {
        summary: result.summary,
        keyTopics: result.keyTopics || [],
        importantConcepts: result.importantConcepts || [],
        language: languageName,
      };
    } catch (error) {

      throw new Error(
        `Failed to generate summary: ${error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Generate Q&A from document
   */
  async generateQuestions(
    fileId: string,
    language: LanguageCode,
    count: number = 10
  ): Promise<LMRQuestion[]> {
    try {
      const document = await this.getFullDocumentContent(fileId);

      const languageName = SUPPORTED_LANGUAGES[language];

      const prompt = `You are an expert question generator for educational content. Generate ${count} high-quality questions and answers from the document.

Document: ${document.fileName}

DOCUMENT CONTENT:
${document.fullContent}

Generate ${count} questions in ${languageName} with:
- Mix of Easy (30%), Medium (50%), and Hard (20%) difficulty
- Clear, specific questions
- Comprehensive answers
- Subject categorization
- Page references if possible

Format as JSON array:
[
  {
    "question": "question text",
    "answer": "detailed answer",
    "subject": "subject name",
    "difficulty": "Easy|Medium|Hard",
    "pageReference": 1
  },
  ...
]

CRITICAL: Respond with valid JSON only. Use "null" not "None", "true" not "True", "false" not "False". No markdown, no code blocks, just pure JSON array.`;

      const response = await ollamaChatService.queryWithFullDocument(
        prompt,
        document.fullContent,
        language,
        [],
        {
          fileName: document.fileName,
          totalPages: document.pages,
        }
      );

      // Parse JSON response using sanitized extraction
      const questions = this.extractAndParseJSON(response.answer, true);

      return questions.map((q: any, index: number) => ({
        id: index + 1,
        question: q.question,
        answer: q.answer,
        subject: q.subject || "General",
        difficulty: q.difficulty || "Medium",
        pageReference: q.pageReference,
      }));
    } catch (error) {

      throw new Error(
        `Failed to generate questions: ${error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Generate quiz with MCQs
   */
  async generateQuiz(
    fileId: string,
    language: LanguageCode,
    count: number = 10
  ): Promise<LMRQuiz[]> {
    try {
      const document = await this.getFullDocumentContent(fileId);

      const languageName = SUPPORTED_LANGUAGES[language];

      const prompt = `You are an expert quiz generator. Create ${count} multiple-choice questions from the document.

Document: ${document.fileName}

DOCUMENT CONTENT:
${document.fullContent}

Generate ${count} MCQ questions in ${languageName} with:
- 4 options per question (A, B, C, D)
- One correct answer (index 0-3)
- Mix of difficulty levels
- Clear explanations for correct answers
- Subject categorization

Format as JSON array:
[
  {
    "question": "question text",
    "options": ["option A", "option B", "option C", "option D"],
    "correctAnswer": 0,
    "explanation": "why this answer is correct",
    "difficulty": "Easy|Medium|Hard",
    "subject": "subject name"
  },
  ...
]

CRITICAL: Respond with valid JSON only. Use "null" not "None", "true" not "True", "false" not "False". No markdown, no code blocks, just pure JSON array.`;

      const response = await ollamaChatService.queryWithFullDocument(
        prompt,
        document.fullContent,
        language,
        [],
        {
          fileName: document.fileName,
          totalPages: document.pages,
        }
      );

      // Parse JSON response using sanitized extraction
      const quizzes = this.extractAndParseJSON(response.answer, true);

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

      throw new Error(
        `Failed to generate quiz: ${error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Generate recall notes for last-minute revision
   */
  async generateRecallNotes(
    fileId: string,
    language: LanguageCode
  ): Promise<LMRRecallNote[]> {
    try {
      const document = await this.getFullDocumentContent(fileId);

      const languageName = SUPPORTED_LANGUAGES[language];

      const prompt = `You are an expert at creating last-minute revision notes. Create concise, memorable recall notes from the document.

Document: ${document.fileName}

DOCUMENT CONTENT:
${document.fullContent}

Generate recall notes in ${languageName} organized by topics with:
- Key points (3-5 bullet points per topic)
- Quick facts and figures
- Mnemonic devices where helpful
- Focus on exam-relevant information

Format as JSON array:
[
  {
    "topic": "topic name",
    "keyPoints": ["point 1", "point 2", ...],
    "quickFacts": ["fact 1", "fact 2", ...],
    "mnemonics": ["mnemonic 1", ...]
  },
  ...
]

CRITICAL: Respond with valid JSON only. Use "null" not "None", "true" not "True", "false" not "False". No markdown, no code blocks, just pure JSON array.`;

      const response = await ollamaChatService.queryWithFullDocument(
        prompt,
        document.fullContent,
        language,
        [],
        {
          fileName: document.fileName,
          totalPages: document.pages,
        }
      );

      // Parse JSON response using sanitized extraction
      const notes = this.extractAndParseJSON(response.answer, true);

      return notes.map((n: any) => ({
        topic: n.topic,
        keyPoints: n.keyPoints || [],
        quickFacts: n.quickFacts || [],
        mnemonics: n.mnemonics || [],
      }));
    } catch (error) {

      throw new Error(
        `Failed to generate recall notes: ${error instanceof Error ? error.message : "Unknown error"
        }`
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

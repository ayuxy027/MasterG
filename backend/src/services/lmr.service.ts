import { geminiService } from "./gemini.service";
import { vectorDBService } from "./vectordb.service";
import { documentService } from "./document.service";
import { embeddingService } from "./embedding.service";
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

Respond ONLY with valid JSON, no additional text.`;

      const response = await geminiService.queryWithFullDocument(
        prompt,
        document.fullContent,
        language,
        [],
        {
          fileName: document.fileName,
          totalPages: document.pages,
        }
      );

      // Parse JSON response
      const jsonMatch = response.answer.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Invalid response format from AI");
      }

      const result = JSON.parse(jsonMatch[0]);

      return {
        summary: result.summary,
        keyTopics: result.keyTopics || [],
        importantConcepts: result.importantConcepts || [],
        language: languageName,
      };
    } catch (error) {
      console.error("❌ Generate summary error:", error);
      throw new Error(
        `Failed to generate summary: ${
          error instanceof Error ? error.message : "Unknown error"
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

Respond ONLY with valid JSON array, no additional text.`;

      const response = await geminiService.queryWithFullDocument(
        prompt,
        document.fullContent,
        language,
        [],
        {
          fileName: document.fileName,
          totalPages: document.pages,
        }
      );

      // Parse JSON response
      const jsonMatch = response.answer.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("Invalid response format from AI");
      }

      const questions = JSON.parse(jsonMatch[0]);

      return questions.map((q: any, index: number) => ({
        id: index + 1,
        question: q.question,
        answer: q.answer,
        subject: q.subject || "General",
        difficulty: q.difficulty || "Medium",
        pageReference: q.pageReference,
      }));
    } catch (error) {
      console.error("❌ Generate questions error:", error);
      throw new Error(
        `Failed to generate questions: ${
          error instanceof Error ? error.message : "Unknown error"
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

Respond ONLY with valid JSON array, no additional text.`;

      const response = await geminiService.queryWithFullDocument(
        prompt,
        document.fullContent,
        language,
        [],
        {
          fileName: document.fileName,
          totalPages: document.pages,
        }
      );

      // Parse JSON response
      const jsonMatch = response.answer.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("Invalid response format from AI");
      }

      const quizzes = JSON.parse(jsonMatch[0]);

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
      console.error("❌ Generate quiz error:", error);
      throw new Error(
        `Failed to generate quiz: ${
          error instanceof Error ? error.message : "Unknown error"
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

Respond ONLY with valid JSON array, no additional text.`;

      const response = await geminiService.queryWithFullDocument(
        prompt,
        document.fullContent,
        language,
        [],
        {
          fileName: document.fileName,
          totalPages: document.pages,
        }
      );

      // Parse JSON response
      const jsonMatch = response.answer.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("Invalid response format from AI");
      }

      const notes = JSON.parse(jsonMatch[0]);

      return notes.map((n: any) => ({
        topic: n.topic,
        keyPoints: n.keyPoints || [],
        quickFacts: n.quickFacts || [],
        mnemonics: n.mnemonics || [],
      }));
    } catch (error) {
      console.error("❌ Generate recall notes error:", error);
      throw new Error(
        `Failed to generate recall notes: ${
          error instanceof Error ? error.message : "Unknown error"
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
      console.error("❌ Get all content error:", error);
      throw new Error(
        `Failed to generate content: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

export const lmrService = new LMRService();

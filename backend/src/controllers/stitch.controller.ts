import { Request, Response } from "express";
import { ollamaService } from "../services/ollama.service";
import { languageService } from "../services/language.service";
import { indicTrans2Service } from "../services/indictrans2.service";
import { env } from "../config/env";

export class StitchController {
  /**
   * Check Ollama connection status
   */
  async checkConnection(req: Request, res: Response): Promise<void> {
    try {
      const isConnected = await ollamaService.checkConnection();
      const models = isConnected ? await ollamaService.listModels() : [];

      res.json({
        success: true,
        connected: isConnected,
        models: models.map((m) => ({
          name: m.name,
          size: m.size,
          modified: m.modified_at,
        })),
      });
    } catch (error) {
      console.error("Connection check error:", error);
      res.status(500).json({
        success: false,
        connected: false,
        error: error instanceof Error ? error.message : "Connection check failed",
      });
    }
  }

  /**
   * Generate educational content with streaming support for thinking text
   */
  async generateContent(req: Request, res: Response): Promise<void> {
    try {
      const {
        topic,
        language,
        grade,
        subject,
        curriculum,
        culturalContext,
        stream,
      } = req.body;

      if (!topic) {
        res.status(400).json({
          success: false,
          error: "Topic is required",
        });
        return;
      }

      // Build comprehensive prompt
      const prompt = this.buildContentPrompt({
        topic,
        language: language || "hi",
        grade: grade || "8",
        subject: subject || "mathematics",
        curriculum: curriculum || "ncert",
        culturalContext: culturalContext || false,
      });

      // If streaming requested, use SSE
      if (stream) {
        // Set CORS headers for streaming (allow all origins)
        res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no"); // Disable buffering for nginx

        let thinkingText = "";
        let responseText = "";

        try {
          for await (const chunk of ollamaService.generateStream(prompt, {
            temperature: 0.7,
          })) {
            if (chunk.type === "thinking") {
              thinkingText += chunk.content;
              // Send thinking chunk to client
              res.write(`data: ${JSON.stringify({ type: "thinking", content: chunk.content })}\n\n`);
            } else if (chunk.type === "response") {
              responseText += chunk.content;
              // Send response chunk to client (this is the actual content output)
              res.write(`data: ${JSON.stringify({ type: "response", content: chunk.content })}\n\n`);
            }
          }

          // After streaming completes, send final result with complete content
          const content = responseText || thinkingText;
          res.write(`data: ${JSON.stringify({ type: "complete", content, thinkingText })}\n\n`);
          res.end();
        } catch (error) {
          res.write(
            `data: ${JSON.stringify({ type: "error", error: error instanceof Error ? error.message : "Generation failed" })}\n\n`
          );
          res.end();
        }
        return;
      }

      // Non-streaming: Generate plain text content using Ollama
      const content = await ollamaService.generateTextContent(prompt, {
        temperature: 0.7,
        maxTokens: 4096,
      });

      res.json({
        success: true,
        content,
        metadata: {
          topic,
          language,
          grade,
          subject,
          curriculum,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Content generation error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Content generation failed",
      });
    }
  }

  /**
   * Generate PDF from content (not implemented in current version)
   */
  async generatePDF(req: Request, res: Response): Promise<void> {
    try {
      // For now, PDF generation is not implemented to keep the stack simple.
      // Frontend can still display / copy content; PDF compile can be added later.
      res.status(501).json({
        success: false,
        error:
          "PDF generation is not yet implemented. Generated content is available for manual formatting/export.",
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "PDF generation failed",
      });
    }
  }

  /**
   * List available models
   */
  async listModels(req: Request, res: Response): Promise<void> {
    try {
      const models = await ollamaService.listModels();
      res.json({
        success: true,
        models: models.map((m) => ({
          name: m.name,
          size: m.size,
          modified: m.modified_at,
          details: m.details,
        })),
      });
    } catch (error) {
      console.error("List models error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to list models",
      });
    }
  }

  /**
   * Translate generated content using IndicTrans2
   */
  async translateContent(req: Request, res: Response): Promise<void> {
    try {
      if (!env.INDICTRANS2_ENABLED) {
        res.status(503).json({
          success: false,
          error: "IndicTrans2 translation is not enabled. Set INDICTRANS2_ENABLED=true in your environment.",
        });
        return;
      }

      const { text, sourceLanguage, targetLanguage } = req.body as {
        text?: string;
        sourceLanguage?: string;
        targetLanguage?: string;
      };

      if (!text || !text.trim()) {
        res.status(400).json({
          success: false,
          error: "Text is required for translation",
        });
        return;
      }

      const srcCode =
        (sourceLanguage as keyof typeof languageService) || "en";
      const tgtCode =
        (targetLanguage as keyof typeof languageService) || "hi";

      const srcIndic = languageService.toIndicTrans2Code(
        srcCode as any
      );
      const tgtIndic = languageService.toIndicTrans2Code(
        tgtCode as any
      );

      const translated = await indicTrans2Service.translate(text, {
        srcLang: srcIndic,
        tgtLang: tgtIndic,
      });

      res.json({
        success: true,
        translated,
      });
    } catch (error) {
      console.error("IndicTrans2 translation error:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Translation failed",
      });
    }
  }

  /**
   * Build comprehensive content generation prompt
   */
  private buildContentPrompt(params: {
    topic: string;
    language: string;
    grade: string;
    subject: string;
    curriculum: string;
    culturalContext: boolean;
  }): string {
    const languageNames: Record<string, string> = {
      hi: "Hindi (हिंदी)",
      bn: "Bengali (বাংলা)",
      ta: "Tamil (தமிழ்)",
      te: "Telugu (తెలుగు)",
      kn: "Kannada (ಕನ್ನಡ)",
      ml: "Malayalam (മലയാളം)",
      mr: "Marathi (मराठी)",
      gu: "Gujarati (ગુજરાતી)",
      pa: "Punjabi (ਪੰਜਾਬੀ)",
      ur: "Urdu (اردو)",
      or: "Odia (ଓଡ଼ିଆ)",
      as: "Assamese (অসমীয়া)",
      en: "English",
    };

    const subjectNames: Record<string, string> = {
      mathematics: "Mathematics",
      science: "Science",
      social: "Social Studies",
      language: "Language",
    };

    const curriculumNames: Record<string, string> = {
      ncert: "NCERT",
      cbse: "CBSE",
      state: "State Board",
    };

    const languageName = languageNames[params.language] || params.language;
    const subjectName = subjectNames[params.subject] || params.subject;
    const curriculumName = curriculumNames[params.curriculum] || params.curriculum;

    let prompt = `
You are an expert Indian educator and curriculum designer.

Generate educational content with the following details:

Topic: ${params.topic}
Subject: ${subjectName}
Grade Level: Class ${params.grade}
Curriculum: ${curriculumName}
Target Language: ${languageName}

Primary Goal:
Create accurate, age-appropriate, curriculum-aligned educational content that is easy to translate into Indian languages without loss of meaning.

Content Guidelines:
- Write in clear, simple, and direct sentences.
- Avoid complex grammar, idioms, metaphors, or poetic language.
- Prefer short sentences over long or compound sentences.
- Do NOT use unnecessary conjunctions such as "although", "however", "therefore", or "whereas".
- Keep factual accuracy extremely high (NCERT-safe).

Pedagogical Requirements:
- Adjust depth, vocabulary, and examples strictly according to Class ${params.grade}.
- Explain concepts step-by-step.
- Use definitions, explanations, and examples where appropriate.
- Maintain a neutral, teacher-friendly tone suitable for textbooks, worksheets, and lesson plans.

Structure Requirements:
- Use clear section headings.
- Use bullet points where helpful.
- Keep paragraphs short (2–4 lines max).
- Ensure logical flow between sections.

Scientific & Mathematical Accuracy:
- Use correct scientific and mathematical terminology.
- Preserve symbols, formulas, units, and notation exactly.
- Do NOT invent facts or simplify incorrectly.

Translation & Multilingual Safety Rules:
- Avoid ambiguous pronouns.
- Repeat key nouns instead of using "it", "this", or "that".
- Keep terminology consistent throughout the content.
- Prefer explicit statements over implied meaning.

${params.culturalContext ? `
Cultural Context Instructions:
- Include simple, relevant regional or Indian examples (festivals, daily life, local environment).
- Ensure cultural references support learning and do not distract from the core concept.
- Keep cultural examples optional and clearly separated from core explanations.
` : ``}

Output Expectations:
- Content must be easy to copy into lesson plans or worksheets.
- Output must be suitable for offline use.
- Avoid emojis, slang, or informal expressions.
- Do not include meta explanations about how the content was generated.

Begin generating the content now.
`;

    return prompt.trim();
  }
}

export const stitchController = new StitchController();


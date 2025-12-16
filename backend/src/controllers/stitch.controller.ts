import { Request, Response } from "express";
import { ollamaService } from "../services/ollama.service";
import { languageService } from "../services/language.service";
import { nllbService } from "../services/nllb.service";
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
   * Translate generated content using NLLB-200 (only translation service)
   */
  async translateContent(req: Request, res: Response): Promise<void> {
    try {
      if (!env.NLLB_ENABLED) {
        res.status(503).json({
          success: false,
          error: "NLLB-200 translation is not enabled. Set NLLB_ENABLED=true in your environment.",
        });
        return;
      }

      const { text, sourceLanguage, targetLanguage } = req.body as {
        text?: string;
        sourceLanguage?: string;
        targetLanguage?: string;
        stream?: boolean;
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

      // NLLB uses FLORES-200 language code format (eng_Latn, hin_Deva, etc.)
      const srcLang = languageService.toNLLBCode(
        srcCode as any
      );
      const tgtLang = languageService.toNLLBCode(
        tgtCode as any
      );

      // If stream flag is set, use Server-Sent Events for sentence-by-sentence streaming
      if (req.body && (req.body as any).stream) {
        // Set CORS + SSE headers
        res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader(
          "Access-Control-Allow-Headers",
          "Content-Type, Authorization"
        );
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");

        try {
          await nllbService.streamTranslate(
            text,
            {
              srcLang: srcLang,
              tgtLang: tgtLang,
            },
            (chunk) => {
              // Forward chunk as SSE event
              res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            }
          );

          // End SSE stream
          res.end();
        } catch (error) {
          res.write(
            `data: ${JSON.stringify({
              success: false,
              type: "error",
              error:
                error instanceof Error
                  ? error.message
                  : "Streaming translation failed",
            })}\n\n`
          );
          res.end();
        }

        return;
      }

      // Non-streaming: single-shot translation
      const translated = await nllbService.translate(text, {
        srcLang: srcLang,
        tgtLang: tgtLang,
      });

      res.json({
        success: true,
        translated,
      });
    } catch (error) {
      console.error("Translation error:", error);
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
   * Check NLLB-200 connection status
   */
  async checkNLLBStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!env.NLLB_ENABLED) {
        res.json({
          success: true,
          connected: false,
          enabled: false,
          message: "NLLB-200 is not enabled. Set NLLB_ENABLED=true to enable.",
        });
        return;
      }

      // Test with a simple translation
      const testResult = await nllbService.translate(
        "Photosynthesis is a biological process.",
        {
          srcLang: "eng_Latn",
          tgtLang: "hin_Deva",
        }
      );

      res.json({
        success: true,
        connected: true,
        enabled: true,
        message: "NLLB-200 model loaded and ready",
        testTranslation: testResult.substring(0, 50), // First 50 chars for verification
      });
    } catch (error) {
      res.json({
        success: false,
        connected: false,
        enabled: env.NLLB_ENABLED,
        error: error instanceof Error ? error.message : "NLLB service unavailable",
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

STRICT LINE-BY-LINE OUTPUT FORMAT (VERY IMPORTANT):
- Output MUST be plain text only. Do NOT use markdown, bullets, numbering, or special formatting.
- Each logical sentence MUST be written on its own line.
- Do NOT break one sentence across multiple lines.
- Do NOT put more than one sentence on the same line.
- Leave a completely blank line between major sections (like Definition, Raw Materials, Importance).
- Each line MUST make sense on its own when read independently.
- Do NOT refer to previous lines using words like "this", "that", or "it" without repeating the noun.

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


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
        grade,
        subject,
        stream,
      } = req.body;

      // Input validation and sanitization
      if (!topic || typeof topic !== "string") {
        res.status(400).json({
          success: false,
          error: "Topic is required and must be a string",
        });
        return;
      }

      // Sanitize topic (remove excessive whitespace, limit length)
      const sanitizedTopic = topic.trim().slice(0, 500);
      if (!sanitizedTopic) {
        res.status(400).json({
          success: false,
          error: "Topic cannot be empty",
        });
        return;
      }

      // Validate grade
      if (grade && (typeof grade !== "string" || grade.length > 50)) {
        res.status(400).json({
          success: false,
          error: "Invalid grade format",
        });
        return;
      }

      // Validate subject
      if (subject && (typeof subject !== "string" || subject.length > 100)) {
        res.status(400).json({
          success: false,
          error: "Invalid subject format",
        });
        return;
      }

      // Build comprehensive prompt (content is always generated in English)
      const prompt = this.buildContentPrompt({
        topic: sanitizedTopic,
        grade: grade || "8",
        subject: subject || "mathematics",
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
          grade,
          subject,
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

      const { text, sourceLanguage, targetLanguage, batchSize } = req.body as {
        text?: string;
        sourceLanguage?: string;
        targetLanguage?: string;
        stream?: boolean;
        batchSize?: number;
      };

      // Input validation and sanitization
      if (!text || typeof text !== "string" || !text.trim()) {
        res.status(400).json({
          success: false,
          error: "Text is required for translation and must be a non-empty string",
        });
        return;
      }

      // Limit text length to prevent memory issues
      const MAX_TEXT_LENGTH = 50000;
      if (text.length > MAX_TEXT_LENGTH) {
        res.status(400).json({
          success: false,
          error: `Text too long. Maximum length is ${MAX_TEXT_LENGTH} characters.`,
        });
        return;
      }

      // Validate batch size if provided
      if (batchSize !== undefined && (typeof batchSize !== "number" || batchSize < 1 || batchSize > 32)) {
        res.status(400).json({
          success: false,
          error: "Batch size must be between 1 and 32",
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
              batchSize: batchSize, // Auto-detected if not provided (CPU vs GPU optimized)
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

      // Non-streaming: single-shot translation with batch processing
      const translated = await nllbService.translate(text, {
        srcLang: srcLang,
        tgtLang: tgtLang,
        batchSize: batchSize, // Auto-detected if not provided (CPU vs GPU optimized)
        useCache: true, // Enable caching for repeated translations
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
   * Content is always generated in English for translation
   */
  private buildContentPrompt(params: {
    topic: string;
    grade: string;
    subject: string;
  }): string {
    const subjectNames: Record<string, string> = {
      mathematics: "Mathematics",
      science: "Science",
      social: "Social Studies",
    };

    // Use subject name if it's a known subject, otherwise use the custom value directly
    const subjectName = subjectNames[params.subject] || params.subject;

    let prompt = `
You are an expert Indian educator and curriculum designer specializing in NCERT, CBSE, and State Board curricula.

Generate comprehensive educational content with the following details:

Topic: ${params.topic}
Subject: ${subjectName}
Grade Level: Class ${params.grade}
Curriculum Alignment: Follow NCERT, CBSE, and State Board standards

IMPORTANT: This content will be translated into multiple Indian languages. Write in clear, translation-friendly English.

Content Requirements:
- Provide comprehensive, detailed explanations suitable for Class ${params.grade} level
- Use clear, simple sentences that are easy to translate
- Include sufficient context and detail - aim for thorough coverage of the topic
- Maintain high factual accuracy aligned with NCERT, CBSE, and State Board curricula
- Structure content with clear sections and logical flow

Formatting Rules:
- Output MUST be plain text only - NO markdown, bullets, numbering, asterisks, or special formatting characters
- Use simple line breaks to separate sentences and paragraphs
- Do NOT use any markdown syntax (no #, *, -, [], (), etc.)
- Write naturally but ensure each major idea is clearly separated

Pedagogical Approach:
- Adjust depth and complexity appropriately for Class ${params.grade}
- Include relevant examples and real-world applications
- Explain concepts thoroughly with adequate detail
- Use definitions, step-by-step explanations, and illustrative examples
- Maintain an educational, teacher-friendly tone suitable for classroom use

Scientific & Mathematical Accuracy:
- Use correct scientific and mathematical terminology
- Preserve all symbols, formulas, units, and notation exactly
- Ensure all facts are accurate and curriculum-aligned
- Do NOT simplify or modify established scientific facts

Content Scope:
- Generate comprehensive content that thoroughly covers the topic
- Include multiple aspects, examples, and explanations
- Provide enough detail for students to understand the concept fully
- Cover the topic from introduction through key concepts to applications

Educational Guardrails:
- ONLY generate content related to educational topics
- Reject any requests for non-educational content
- Focus strictly on curriculum-aligned educational material
- Maintain professional, appropriate tone throughout

Output Style:
- Write in clear, professional English
- Avoid emojis, slang, or overly casual expressions
- Do not include meta-commentary about the generation process
- Ensure content is ready for direct use in educational contexts

Begin generating the comprehensive educational content now.
`;

    return prompt.trim();
  }
}

export const stitchController = new StitchController();


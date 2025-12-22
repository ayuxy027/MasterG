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

      // Input validation: Keep it cool - validate but don't restrict unnecessarily
      if (!topic || typeof topic !== "string") {
        res.status(400).json({
          success: false,
          error: "Topic is required and must be a string",
        });
        return;
      }

      // Sanitize topic (remove excessive whitespace, but allow any reasonable length)
      const sanitizedTopic = topic.trim();
      if (!sanitizedTopic) {
        res.status(400).json({
          success: false,
          error: "Topic cannot be empty",
        });
        return;
      }

      // Validate grade (be lenient - allow any string)
      if (grade && typeof grade !== "string") {
        res.status(400).json({
          success: false,
          error: "Grade must be a string",
        });
        return;
      }

      // Validate subject (be lenient - allow any string)
      if (subject && typeof subject !== "string") {
        res.status(400).json({
          success: false,
          error: "Subject must be a string",
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

      // Input validation: Keep it cool - validate but don't restrict
      if (!text || typeof text !== "string" || !text.trim()) {
        res.status(400).json({
          success: false,
          error: "Text is required for translation and must be a non-empty string",
        });
        return;
      }

      // REMOVED: Text length limit - system can handle any length
      // The batch processing and streaming are designed to handle large texts gracefully
      // Just log a warning for very long texts
      if (text.length > 100000) {
        console.warn(`Very long text detected (${text.length} chars). Translation may take longer.`);
      }

      // Validate batch size if provided (be more lenient)
      if (batchSize !== undefined) {
        if (typeof batchSize !== "number" || batchSize < 1) {
          res.status(400).json({
            success: false,
            error: "Batch size must be a positive number",
          });
          return;
        }
        // Allow larger batch sizes - system will auto-optimize if needed
        if (batchSize > 64) {
          console.warn(`Large batch size requested (${batchSize}). System will auto-optimize.`);
        }
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
You are an expert Indian educator creating educational content for students.

Generate comprehensive, ready-to-use educational content with these specifications:

Topic: ${params.topic}
Subject: ${subjectName}
Grade Level: Class ${params.grade}

CRITICAL INSTRUCTIONS:
- Generate the ACTUAL CONTENT that students will read - not assessments, not instructions, not meta-commentary
- Write directly what should appear in the final output - the content itself
- Focus on GENERATING educational material, not evaluating or assessing
- The output should be the final content, ready to be displayed to students
- Write in clear, translation-friendly English (will be translated to Indian languages)

Content Generation Guidelines:
- Create comprehensive explanations suitable for Class ${params.grade} students
- Use clear, simple sentences that translate well
- Include detailed explanations, examples, and real-world applications
- Structure with clear headings and sections using markdown format
- Provide thorough coverage of the topic from basics to advanced concepts
- Maintain factual accuracy aligned with NCERT, CBSE, and State Board standards

Formatting:
- Use markdown formatting: # for main headings, ## for subheadings, **bold** for emphasis
- Use bullet points (-) and numbered lists (1.) where appropriate
- Use line breaks between paragraphs
- Format code, formulas, and technical terms clearly
- The output should be markdown-formatted and ready to render

Content Focus:
- Generate the actual educational content (explanations, concepts, examples)
- Do NOT generate assessment questions, quizzes, or evaluation criteria
- Do NOT include instructions like "explain this" or "describe that"
- Write the content directly: "Photosynthesis is..." not "You should explain photosynthesis..."
- Focus on teaching and explaining, not on creating assignments

Pedagogical Approach:
- Start with clear introduction of the topic
- Break down complex concepts into understandable parts
- Use examples relevant to Class ${params.grade} level
- Include step-by-step explanations where needed
- Connect concepts to real-world applications
- Use appropriate terminology for the grade level

Scientific & Mathematical Accuracy:
- Use correct scientific and mathematical terminology
- Preserve formulas, symbols, units, and notation accurately
- Ensure all facts are curriculum-aligned and accurate

Output Requirements:
- Generate comprehensive content covering the topic thoroughly
- Write in a clear, professional, educational tone
- Make content engaging and easy to understand
- Ensure content is versatile and can be used directly by teachers
- Output should be the final educational material, not a template or instructions

Begin generating the educational content now. Write the actual content that students will read.
`;

    return prompt.trim();
  }
}

export const stitchController = new StitchController();


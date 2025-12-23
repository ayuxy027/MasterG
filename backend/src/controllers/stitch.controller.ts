import { Request, Response } from "express";
import { ollamaService } from "../services/ollama.service";
import { languageService } from "../services/language.service";
import { nllbService } from "../services/nllb.service";
import { stitchService } from "../services/stitch.service";
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
        length,
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

      // Validate length
      const validLengths = ["short", "medium", "long"];
      const contentLength = length && validLengths.includes(length) ? length : "medium";

      // Build comprehensive prompt (content is always generated in English)
      const prompt = this.buildContentPrompt({
        topic: sanitizedTopic,
        grade: grade || "8",
        subject: subject || "mathematics",
        length: contentLength as "short" | "medium" | "long",
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
      const MAX_TEXT_LENGTH = 50010;
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
    length: "short" | "medium" | "long";
  }): string {
    const subjectNames: Record<string, string> = {
      mathematics: "Mathematics",
      science: "Science",
      social: "Social Studies",
    };

    // Use subject name if it's a known subject, otherwise use the custom value directly
    const subjectName = subjectNames[params.subject] || params.subject;

    // Enhanced prompt for mathematics with battle-tested math handling
    const isMathematics = params.subject.toLowerCase().includes("math") || 
                          params.subject.toLowerCase() === "mathematics";
    
    const mathSpecificInstructions = isMathematics ? `
CRITICAL MATHEMATICAL REQUIREMENTS (BATTLE-TESTED):
- ALWAYS use proper mathematical notation: Use LaTeX-style math syntax for ALL formulas
  * Inline math: Use $formula$ syntax (e.g., $x^2 + y^2 = z^2$, $\\frac{a}{b}$, $\\sqrt{x}$)
  * Display math: Use $$formula$$ for centered equations (e.g., $$E = mc^2$$, $$\\int_{a}^{b} f(x)dx$$)
- Preserve ALL mathematical symbols EXACTLY:
  * Powers: Use ^ for superscripts ($x^2$, $a^{n+1}$)
  * Subscripts: Use _ for subscripts ($H_2O$, $x_i$, $a_{n-1}$)
  * Fractions: Use \\frac{numerator}{denominator} ($\\frac{a}{b}$, $\\frac{x+1}{x-1}$)
  * Roots: Use \\sqrt{} or \\sqrt[n]{} ($\\sqrt{x}$, $\\sqrt[3]{8}$)
  * Summation: Use \\sum_{i=1}^{n} ($\\sum_{i=1}^{n} x_i$)
  * Integrals: Use \\int, \\int_{a}^{b} ($\\int f(x)dx$, $\\int_{0}^{\\infty} e^{-x}dx$)
  * Greek letters: Use \\alpha, \\beta, \\gamma, \\pi, \\theta, \\lambda, etc.
  * Operators: Use \\times, \\div, \\pm, \\leq, \\geq, \\neq, \\approx
  * Sets: Use \\in, \\notin, \\subset, \\cup, \\cap, \\emptyset
  * Logic: Use \\forall, \\exists, \\implies, \\iff
- For complex equations, break down step-by-step:
  * Show each algebraic manipulation clearly
  * Explain WHY each step is valid (e.g., "Using the distributive property...")
  * Include intermediate steps, don't skip calculations
- Always provide WORKED EXAMPLES with complete solutions:
  * Show the problem statement
  * Show ALL steps of the solution
  * Explain each step's reasoning
  * Provide the final answer clearly
- Handle multi-line equations properly:
  * Use $$...$$ for display equations that span multiple lines
  * Use align environment syntax: $$\\begin{align} ... \\end{align}$$
- Preserve units and measurements exactly:
  * Use proper unit notation (m/s, kg·m², °C, etc.)
  * Don't convert units unless explicitly requested
- For word problems:
  * Translate word problems into mathematical expressions accurately
  * Identify all given information and what needs to be found
  * Set up equations correctly before solving
- Common mathematical concepts to handle perfectly:
  * Quadratic equations: $ax^2 + bx + c = 0$ with discriminant $\\Delta = b^2 - 4ac$
  * Trigonometry: $\\sin$, $\\cos$, $\\tan$, identities, unit circle
  * Calculus: derivatives $\\frac{d}{dx}$, integrals $\\int$, limits $\\lim_{x \\to a}$
  * Linear algebra: matrices, vectors, determinants
  * Geometry: area formulas, volume formulas, theorems
  * Statistics: mean $\\bar{x}$, standard deviation $\\sigma$, probability $P(A)$
- NEVER:
  * Simplify or approximate mathematical constants (use exact values: $\\pi$, $e$, $\\sqrt{2}$)
  * Round numbers unnecessarily in mathematical derivations
  * Skip steps in proofs or solutions
  * Use ambiguous notation (always be explicit)
  * Mix up mathematical concepts or formulas

` : '';

    // Length-specific instructions (BATTLE-TESTED)
    const lengthInstructions = params.length === "short" ? `
CRITICAL LENGTH REQUIREMENT: SHORT CONTENT (200-400 words)
- Generate a BRIEF, CONCISE overview of the topic
- Focus on ESSENTIAL concepts only - no deep dives
- Structure: Introduction → Key Points (3-5 main points) → Brief Summary
- Keep explanations SHORT and DIRECT - maximum 2-3 sentences per concept
- Include ONE simple example only (no complex worked examples)
- NO extensive background or historical context
- NO multiple examples or practice problems
- Target word count: 200-400 words (STRICTLY enforce this limit)
- Every sentence must be HIGH-VALUE - no filler or repetition
- Use bullet points or numbered lists for key concepts to save space
- Be PRECISE and CONCISE - quality over quantity

` : params.length === "long" ? `
CRITICAL LENGTH REQUIREMENT: LONG COMPREHENSIVE CONTENT (1000+ words)
- Generate EXTENSIVE, THOROUGH coverage of the topic
- Include COMPLETE explanations with full context and background
- Structure: Introduction → Detailed Background → Core Concepts (with sub-concepts) → Multiple Examples → Applications → Practice Problems → Summary
- Provide MULTIPLE worked examples (at least 3-4) with complete step-by-step solutions
- Include historical context, real-world applications, and connections to other topics
- Cover edge cases, common misconceptions, and advanced insights
- Include practice problems with solutions
- Use detailed explanations - 4-6 sentences per major concept
- Target word count: 1000+ words (ensure comprehensive coverage)
- Include visual descriptions, analogies, and multiple perspectives
- Cover the topic from multiple angles: theoretical, practical, and applied
- Provide extensive examples and counter-examples where relevant

` : `
CRITICAL LENGTH REQUIREMENT: MEDIUM CONTENT (500-800 words)
- Generate BALANCED, STANDARD explanation of the topic
- Structure: Introduction → Core Concepts → Examples → Applications → Summary
- Include 2-3 worked examples with complete solutions
- Provide sufficient detail for understanding without overwhelming
- Include relevant context and real-world connections
- Use 3-4 sentences per major concept
- Target word count: 500-800 words (maintain this range)
- Balance between brevity and completeness
- Include practice problems (1-2) with solutions
- Cover main aspects thoroughly with moderate depth

`;

    let prompt = `
You are an expert Indian educator and curriculum designer specializing in NCERT, CBSE, and State Board curricula.

Generate educational content with the following details:

Topic: ${params.topic}
Subject: ${subjectName}
Grade Level: Class ${params.grade}
Content Length: ${params.length.toUpperCase()} (${params.length === "short" ? "200-400 words" : params.length === "long" ? "1000+ words" : "500-800 words"})
Curriculum Alignment: Follow NCERT, CBSE, and State Board standards

IMPORTANT: This content will be translated into multiple Indian languages using NLLB-200. Write in clear, translation-friendly English.

TRANSLATION COMPATIBILITY REQUIREMENTS:
- LaTeX math formulas ($...$ and $$...$$) will be preserved exactly during translation - format them correctly
- Use simple sentence structures that translate well across languages
- Avoid complex nested clauses - break into shorter sentences
- Keep mathematical expressions separate from explanatory text when possible
- Ensure formulas are self-contained and don't rely on surrounding text context

${lengthInstructions}

Content Requirements:
- Provide explanations suitable for Class ${params.grade} level
- Use clear, simple sentences that are easy to translate
- Maintain high factual accuracy aligned with NCERT, CBSE, and State Board curricula
- Structure content with clear sections and logical flow
- STRICTLY adhere to the specified length requirement above

Formatting Rules:
- Output MUST use proper markdown formatting for readability
- Use markdown syntax for structure: # for headings, - or * for lists, **bold** for emphasis
- For mathematics: Use LaTeX-style math notation ($...$ for inline, $$...$$ for display)
- CRITICAL FOR TRANSLATION: LaTeX math formulas ($...$ and $$...$$) will be preserved exactly during translation
- Use proper formatting: headings, bullet points, numbered lists, code blocks for formulas
- Separate major sections clearly with headings
- IMPORTANT: Keep LaTeX formulas separate from surrounding text for better translation quality

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
- For science: Preserve chemical formulas, equations, and scientific notation exactly

${mathSpecificInstructions}

Content Scope (Length-Adjusted):
${params.length === "short" 
  ? "- Focus on ESSENTIAL concepts only - no deep dives\n- Include ONE simple example\n- NO extensive background or multiple examples\n- Keep it BRIEF and CONCISE"
  : params.length === "long"
  ? "- Generate EXTENSIVE coverage with full context\n- Include MULTIPLE worked examples (3-4+)\n- Cover historical context, applications, and edge cases\n- Include practice problems with solutions\n- Provide comprehensive depth from multiple angles"
  : "- Generate BALANCED coverage with sufficient detail\n- Include 2-3 worked examples\n- Cover main aspects thoroughly\n- Include 1-2 practice problems\n- Balance between brevity and completeness"}

Educational Guardrails:
- ONLY generate content related to educational topics
- Reject any requests for non-educational content
- Focus strictly on curriculum-aligned educational material
- Maintain professional, appropriate tone throughout

Output Style:
- Write in clear, professional English
- Use proper markdown formatting for structure
- Include mathematical formulas using LaTeX syntax
- Avoid emojis, slang, or overly casual expressions
- Do not include meta-commentary about the generation process
- Ensure content is ready for direct use in educational contexts

Begin generating the comprehensive educational content now.
`;

    return prompt.trim();
  }

  /**
   * Get all Stitch sessions for a user
   */
  async getAllSessions(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: "userId is required",
        });
        return;
      }

      const sessions = await stitchService.getAllSessionsForUser(userId);

      res.json({
        success: true,
        sessions,
      });
    } catch (error) {
      console.error("Error getting Stitch sessions:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get sessions",
      });
    }
  }

  /**
   * Get a specific Stitch session
   */
  async getSession(req: Request, res: Response): Promise<void> {
    try {
      const { userId, sessionId } = req.params;

      if (!userId || !sessionId) {
        res.status(400).json({
          success: false,
          error: "userId and sessionId are required",
        });
        return;
      }

      const session = await stitchService.getSession(userId, sessionId);

      if (!session) {
        res.status(404).json({
          success: false,
          error: "Session not found",
        });
        return;
      }

      res.json({
        success: true,
        session,
      });
    } catch (error) {
      console.error("Error getting Stitch session:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get session",
      });
    }
  }

  /**
   * Save or update a Stitch session
   */
  async saveSession(req: Request, res: Response): Promise<void> {
    try {
      const { userId, sessionId } = req.params;
      const sessionData = req.body;

      if (!userId || !sessionId) {
        res.status(400).json({
          success: false,
          error: "userId and sessionId are required",
        });
        return;
      }

      // Validate session data
      if (sessionData && typeof sessionData !== 'object') {
        res.status(400).json({
          success: false,
          error: "Invalid session data",
        });
        return;
      }

      const session = await stitchService.saveSession(userId, sessionId, sessionData);

      res.json({
        success: true,
        session,
      });
    } catch (error) {
      console.error("Error saving Stitch session:", error);
      // Always return success for graceful degradation (session might be saved in memory)
      res.json({
        success: true,
        session: {
          userId: req.params.userId,
          sessionId: req.params.sessionId,
          ...req.body,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }
  }

  /**
   * Delete a Stitch session
   */
  async deleteSession(req: Request, res: Response): Promise<void> {
    try {
      const { userId, sessionId } = req.params;

      if (!userId || !sessionId) {
        res.status(400).json({
          success: false,
          error: "userId and sessionId are required",
        });
        return;
      }

      await stitchService.deleteSession(userId, sessionId);

      res.json({
        success: true,
        message: "Session deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting Stitch session:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete session",
      });
    }
  }

  /**
   * Update session name
   */
  async updateSessionName(req: Request, res: Response): Promise<void> {
    try {
      const { userId, sessionId } = req.params;
      const { sessionName } = req.body;

      if (!userId || !sessionId) {
        res.status(400).json({
          success: false,
          error: "userId and sessionId are required",
        });
        return;
      }

      if (!sessionName || typeof sessionName !== "string") {
        res.status(400).json({
          success: false,
          error: "sessionName is required and must be a string",
        });
        return;
      }

      await stitchService.updateSessionName(userId, sessionId, sessionName);

      res.json({
        success: true,
        message: "Session name updated successfully",
      });
    } catch (error) {
      console.error("Error updating Stitch session name:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to update session name",
      });
    }
  }
}

export const stitchController = new StitchController();


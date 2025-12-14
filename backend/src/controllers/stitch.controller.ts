import { Request, Response } from "express";
import { ollamaService } from "../services/ollama.service";

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
   * Generate LaTeX content with streaming support for thinking text
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
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        let thinkingText = "";
        let latexCode = "";

        try {
          for await (const chunk of ollamaService.generateStream(prompt, {
            temperature: 0.7,
          })) {
            thinkingText += chunk;
            
            // Send thinking chunk
            res.write(`data: ${JSON.stringify({ type: "thinking", content: chunk })}\n\n`);
          }

          // After streaming, extract LaTeX from thinking text
          // DeepSeek R1 format: thinking text is marked, final answer is after
          latexCode = this.extractLatexFromThinking(thinkingText) || thinkingText;

          // Send final result
          res.write(`data: ${JSON.stringify({ type: "complete", latexCode })}\n\n`);
          res.end();
        } catch (error) {
          res.write(
            `data: ${JSON.stringify({ type: "error", error: error instanceof Error ? error.message : "Generation failed" })}\n\n`
          );
          res.end();
        }
        return;
      }

      // Non-streaming: Generate LaTeX using Ollama
      const latexCode = await ollamaService.generateLatexContent(prompt, {
        temperature: 0.7,
        maxTokens: 4096,
      });

      res.json({
        success: true,
        latexCode,
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
   * Extract LaTeX code from thinking text (DeepSeek R1 format)
   */
  private extractLatexFromThinking(thinkingText: string): string {
    // DeepSeek R1 typically has thinking marked, then final answer
    // Look for LaTeX document markers
    const latexStart = thinkingText.indexOf("\\documentclass");
    if (latexStart !== -1) {
      return thinkingText.substring(latexStart);
    }
    
    // If no clear marker, return full text (might be pure LaTeX)
    return thinkingText;
  }

  /**
   * Generate PDF from LaTeX
   */
  async generatePDF(req: Request, res: Response): Promise<void> {
    try {
      const { latexCode } = req.body;

      if (!latexCode) {
        res.status(400).json({
          success: false,
          error: "LaTeX code is required",
        });
        return;
      }

      // TODO: Implement LaTeX to PDF compilation
      // This would require a LaTeX compiler like pdflatex or xelatex
      // For now, return error indicating it's not implemented
      res.status(501).json({
        success: false,
        error: "PDF generation not yet implemented. Requires LaTeX compiler setup.",
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

    let prompt = `Generate educational content in LaTeX format for:

Topic: ${params.topic}
Language: ${languageName}
Grade Level: Class ${params.grade}
Subject: ${subjectName}
Curriculum: ${curriculumName}`;

    if (params.culturalContext) {
      prompt += `\nInclude cultural context: Yes (add regional examples, festivals, local references)`;
    }

    prompt += `\n\nRequirements:
- Create age-appropriate content for Class ${params.grade} students
- Use proper ${languageName} script and fonts
- Include mathematical notation if needed (for mathematics/science)
- Follow ${curriculumName} curriculum standards
- Structure content with clear sections and subsections
- Use proper LaTeX formatting for all elements`;

    return prompt;
  }
}

export const stitchController = new StitchController();


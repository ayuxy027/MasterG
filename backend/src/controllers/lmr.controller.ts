import { Request, Response } from "express";
import { lmrService } from "../services/lmr.service";
import { pdfGeneratorService } from "../services/pdfGenerator.service";
import { LanguageCode } from "../config/constants";
import { uploadController } from "./upload.controller";
import { LMRHistoryModel } from "../models/lmr.model";
import { SupportedLanguageCode } from "../services/language.service";

export class LMRController {
  /**
   * Upload and process document for LMR
   * Reuses the existing upload functionality
   */
  async uploadDocument(req: Request, res: Response): Promise<void> {
    try {
      // Store original json function
      const originalJson = res.json.bind(res);

      // Override json to intercept response and save history
      res.json = function (body: any) {
        if (body.success && body.fileId) {
          // Save to history in background
          LMRHistoryModel.create({
            fileId: body.fileId,
            fileName: body.fileName || req.file?.originalname || "Unknown",
            userId: req.body.userId,
            sessionId: req.body.sessionId,
            language: "english",
            tone: "professional",
          }).catch(() => { });
        }
        return originalJson(body);
      };

      // Delegate to existing upload controller
      await uploadController.uploadFile(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to upload document",
      });
    }
  }

  /**
   * Generate summary for a document
   */
  async generateSummary(req: Request, res: Response): Promise<void> {
    try {
      const { fileId, language = "english", tone = "professional" } = req.body;

      if (!fileId) {
        res.status(400).json({
          success: false,
          error: "fileId is required",
        });
        return;
      }

      // Check if we have cached content in history
      const history = await LMRHistoryModel.findOne({ fileId });
      if (
        history?.hasSummary &&
        history.summary &&
        history.language === language &&
        history.tone === tone
      ) {
        res.status(200).json({
          success: true,
          data: history.summary,
        });
        return;
      }

      const summary = await lmrService.generateSummary(
        fileId,
        language as LanguageCode,
        tone
      );

      // Update history with content
      await LMRHistoryModel.findOneAndUpdate(
        { fileId },
        { hasSummary: true, summary, language, tone, updatedAt: new Date() },
        { upsert: false }
      ).catch(() => { });

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate summary",
      });
    }
  }

  /**
   * Generate questions for a document
   */
  async generateQuestions(req: Request, res: Response): Promise<void> {
    try {
      const { fileId, language = "english", count = 10 } = req.body;

      if (!fileId) {
        res.status(400).json({
          success: false,
          error: "fileId is required",
        });
        return;
      }

      // Check if we have cached content in history
      const history = await LMRHistoryModel.findOne({ fileId });
      if (
        history?.hasQuestions &&
        history.questions &&
        history.questions.length > 0 &&
        history.language === language
      ) {
        res.status(200).json({
          success: true,
          data: history.questions,
        });
        return;
      }

      const questions = await lmrService.generateQuestions(
        fileId,
        language as LanguageCode,
        parseInt(count)
      );

      // Update history with content
      await LMRHistoryModel.findOneAndUpdate(
        { fileId },
        { hasQuestions: true, questions, language, updatedAt: new Date() },
        { upsert: false }
      ).catch(() => { });

      res.status(200).json({
        success: true,
        data: questions,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate questions",
      });
    }
  }

  /**
   * Generate quiz for a document
   */
  async generateQuiz(req: Request, res: Response): Promise<void> {
    try {
      const { fileId, language = "english", count = 10 } = req.body;

      if (!fileId) {
        res.status(400).json({
          success: false,
          error: "fileId is required",
        });
        return;
      }

      // Check if we have cached content in history
      const history = await LMRHistoryModel.findOne({ fileId });
      if (
        history?.hasQuiz &&
        history.quiz &&
        history.quiz.length > 0 &&
        history.language === language
      ) {
        res.status(200).json({
          success: true,
          data: history.quiz,
        });
        return;
      }

      const quiz = await lmrService.generateQuiz(
        fileId,
        language as LanguageCode,
        parseInt(count)
      );

      // Update history with content
      await LMRHistoryModel.findOneAndUpdate(
        { fileId },
        { hasQuiz: true, quiz, language, updatedAt: new Date() },
        { upsert: false }
      ).catch(() => { });

      res.status(200).json({
        success: true,
        data: quiz,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate quiz",
      });
    }
  }

  /**
   * Generate recall notes for a document
   */
  async generateRecallNotes(req: Request, res: Response): Promise<void> {
    try {
      const { fileId, language = "english" } = req.body;

      if (!fileId) {
        res.status(400).json({
          success: false,
          error: "fileId is required",
        });
        return;
      }

      // Check if we have cached content in history
      const history = await LMRHistoryModel.findOne({ fileId });
      if (
        history?.hasRecallNotes &&
        history.recallNotes &&
        history.recallNotes.length > 0 &&
        history.language === language
      ) {
        res.status(200).json({
          success: true,
          data: history.recallNotes,
        });
        return;
      }

      const recallNotes = await lmrService.generateRecallNotes(
        fileId,
        language as LanguageCode
      );

      // Update history with content
      await LMRHistoryModel.findOneAndUpdate(
        { fileId },
        { hasRecallNotes: true, recallNotes, language, updatedAt: new Date() },
        { upsert: false }
      ).catch(() => { });

      res.status(200).json({
        success: true,
        data: recallNotes,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate recall notes",
      });
    }
  }

  /**
   * Generate all content at once
   */
  async generateAllContent(req: Request, res: Response): Promise<void> {
    try {
      const { fileId, language = "english" } = req.body;

      if (!fileId) {
        res.status(400).json({
          success: false,
          error: "fileId is required",
        });
        return;
      }



      const content = await lmrService.getAllContent(
        fileId,
        language as LanguageCode
      );

      res.status(200).json({
        success: true,
        data: content,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate content",
      });
    }
  }

  /**
   * Download PDF with all generated content
   */
  async downloadPDF(req: Request, res: Response): Promise<void> {
    try {
      const { fileId, language = "english", fileName = "LMR-Notes" } = req.body;

      if (!fileId) {
        res.status(400).json({
          success: false,
          error: "fileId is required",
        });
        return;
      }



      // Generate all content
      const content = await lmrService.getAllContent(
        fileId,
        language as LanguageCode
      );

      // Generate PDF
      const pdfBuffer = await pdfGeneratorService.generateLMRPDF(
        fileName,
        content.summary,
        content.questions,
        content.quiz,
        content.recallNotes
      );

      // Set headers for PDF download
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}-LMR-${Date.now()}.pdf"`
      );
      res.setHeader("Content-Length", pdfBuffer.length);

      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate PDF",
      });
    }
  }

  /**
   * Get LMR history for a user or session
   */
  async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const { userId, sessionId, limit = 10 } = req.query;

      if (!userId && !sessionId) {
        res.status(400).json({
          success: false,
          error: "userId or sessionId is required",
        });
        return;
      }

      const query: any = {};
      if (userId) query.userId = userId;
      if (sessionId) query.sessionId = sessionId;

      const history = await LMRHistoryModel.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit as string))
        .lean();

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch history",
      });
    }
  }

  /**
   * Delete a history entry
   */
  async deleteHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: "History ID is required",
        });
        return;
      }

      const result = await LMRHistoryModel.findByIdAndDelete(id);

      if (!result) {
        res.status(404).json({
          success: false,
          error: "History entry not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "History entry deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete history",
      });
    }
  }

  /**
   * Translate LMR content to target language using NLLB-200
   */
  async translateContent(req: Request, res: Response): Promise<void> {
    try {
      const { content, targetLanguage } = req.body;

      if (!content) {
        res.status(400).json({
          success: false,
          error: "content is required",
        });
        return;
      }

      if (!targetLanguage) {
        res.status(400).json({
          success: false,
          error: "targetLanguage is required",
        });
        return;
      }

      // English doesn't need translation
      if (targetLanguage === 'en' || targetLanguage === 'english') {
        res.status(200).json({
          success: true,
          data: content,
        });
        return;
      }

      console.log(`🌐 Translating LMR content to ${targetLanguage}...`);

      const translated = await lmrService.translateContent(
        content,
        targetLanguage as SupportedLanguageCode
      );

      res.status(200).json({
        success: true,
        data: translated,
      });
    } catch (error) {
      console.error("Translation error:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to translate content",
      });
    }
  }
}

export const lmrController = new LMRController();

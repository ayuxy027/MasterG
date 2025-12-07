import { Request, Response } from "express";
import { lmrService } from "../services/lmr.service";
import { pdfGeneratorService } from "../services/pdfGenerator.service";
import { LanguageCode } from "../config/constants";
import { uploadController } from "./upload.controller";
import { LMRHistoryModel } from "../models/lmr.model";

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
          }).catch((err) => console.error("Failed to save LMR history:", err));
        }
        return originalJson(body);
      };

      // Delegate to existing upload controller
      await uploadController.uploadFile(req, res);
    } catch (error) {
      console.error("❌ LMR upload error:", error);
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

      console.log(
        `📝 Generating summary for fileId: ${fileId}, language: ${language}`
      );

      // Check if we have cached content in history
      const history = await LMRHistoryModel.findOne({ fileId });
      if (
        history?.hasSummary &&
        history.summary &&
        history.language === language &&
        history.tone === tone
      ) {
        console.log("✅ Returning cached summary from history");
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
      ).catch((err) => console.error("Failed to update LMR history:", err));

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error("❌ Generate summary error:", error);
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

      console.log(
        `❓ Generating questions for fileId: ${fileId}, language: ${language}`
      );

      // Check if we have cached content in history
      const history = await LMRHistoryModel.findOne({ fileId });
      if (
        history?.hasQuestions &&
        history.questions &&
        history.questions.length > 0 &&
        history.language === language
      ) {
        console.log("✅ Returning cached questions from history");
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
      ).catch((err) => console.error("Failed to update LMR history:", err));

      res.status(200).json({
        success: true,
        data: questions,
      });
    } catch (error) {
      console.error("❌ Generate questions error:", error);
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

      console.log(
        `📝 Generating quiz for fileId: ${fileId}, language: ${language}`
      );

      // Check if we have cached content in history
      const history = await LMRHistoryModel.findOne({ fileId });
      if (
        history?.hasQuiz &&
        history.quiz &&
        history.quiz.length > 0 &&
        history.language === language
      ) {
        console.log("✅ Returning cached quiz from history");
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
      ).catch((err) => console.error("Failed to update LMR history:", err));

      res.status(200).json({
        success: true,
        data: quiz,
      });
    } catch (error) {
      console.error("❌ Generate quiz error:", error);
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

      console.log(
        `🎯 Generating recall notes for fileId: ${fileId}, language: ${language}`
      );

      // Check if we have cached content in history
      const history = await LMRHistoryModel.findOne({ fileId });
      if (
        history?.hasRecallNotes &&
        history.recallNotes &&
        history.recallNotes.length > 0 &&
        history.language === language
      ) {
        console.log("✅ Returning cached recall notes from history");
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
      ).catch((err) => console.error("Failed to update LMR history:", err));

      res.status(200).json({
        success: true,
        data: recallNotes,
      });
    } catch (error) {
      console.error("❌ Generate recall notes error:", error);
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

      console.log(
        `🚀 Generating all content for fileId: ${fileId}, language: ${language}`
      );

      const content = await lmrService.getAllContent(
        fileId,
        language as LanguageCode
      );

      res.status(200).json({
        success: true,
        data: content,
      });
    } catch (error) {
      console.error("❌ Generate all content error:", error);
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

      console.log(`📥 Generating PDF for fileId: ${fileId}`);

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
      console.error("❌ Download PDF error:", error);
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
      console.error("❌ Get history error:", error);
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
      console.error("❌ Delete history error:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete history",
      });
    }
  }
}

export const lmrController = new LMRController();

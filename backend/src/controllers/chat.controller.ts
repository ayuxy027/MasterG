import { Request, Response } from "express";
import { chatService } from "../services/chat.service";
import { vectorDBService } from "../services/vectordb.service";
import { asyncRAGOrchestratorService } from "../services/asyncRAGOrchestrator.service";


export class ChatController {
  /**
   * Get all chat sessions for a user
   */
  async getChatSessions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.userId as string;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: "userId is required",
        });
        return;
      }

      const sessions = await chatService.getAllSessionsForUser(userId);

      res.status(200).json({
        success: true,
        sessions,
      });
    } catch (error: any) {

      res.status(500).json({
        success: false,
        error: error.message || "Failed to get chat sessions",
      });
    }
  }

  /**
   * Get chat session details (messages + documents)
   */
  async getSessionDetails(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.userId as string;
      const sessionId = req.params.sessionId;

      if (!userId || !sessionId) {
        res.status(400).json({
          success: false,
          error: "userId and sessionId are required",
        });
        return;
      }

      // Get session from MongoDB
      const session = await chatService.getOrCreateSession(userId, sessionId);

      // Get files uploaded to this chat session
      const collectionName = session.chromaCollectionName;
      const files = await vectorDBService.getUniqueFiles(collectionName);

      res.status(200).json({
        success: true,
        session: {
          sessionId: session.sessionId,
          messages: session.messages,
          chromaCollectionName: session.chromaCollectionName,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          language: session.language,
          grade: session.grade,
        },
        files,
        documentCount: files.length,
      });
    } catch (error: any) {

      res.status(500).json({
        success: false,
        error: error.message || "Failed to get session details",
      });
    }
  }

  /**
   * Delete a chat session
   */
  async deleteSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.userId as string;
      const sessionId = req.params.sessionId;

      if (!userId || !sessionId) {
        res.status(400).json({
          success: false,
          error: "userId and sessionId are required",
        });
        return;
      }

      await chatService.deleteSession(userId, sessionId);

      res.status(200).json({
        success: true,
        message: "Chat session deleted successfully",
      });
    } catch (error: any) {

      res.status(500).json({
        success: false,
        error: error.message || "Failed to delete chat session",
      });
    }
  }

  /**
   * Update chat name/title
   */
  async updateChatName(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.userId as string;
      const sessionId = req.params.sessionId;
      const { chatName } = req.body;

      if (!userId || !sessionId) {
        res.status(400).json({
          success: false,
          error: "userId and sessionId are required",
        });
        return;
      }

      if (!chatName || typeof chatName !== "string") {
        res.status(400).json({
          success: false,
          error: "chatName is required",
        });
        return;
      }

      await chatService.updateChatName(userId, sessionId, chatName.trim());

      res.status(200).json({
        success: true,
        message: "Chat name updated successfully",
      });
    } catch (error: any) {

      res.status(500).json({
        success: false,
        error: error.message || "Failed to update chat name",
      });
    }
  }

  /**
   * Process chat query with RAG
   */
  async queryChat(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      const { query, userId, sessionId } = req.body;

      if (!query || !userId || !sessionId) {
        res.status(400).json({
          success: false,
          error: "query, userId, and sessionId are required",
        });
        return;
      }

      // Get or create session with full chat history
      const session = await chatService.getOrCreateSession(userId, sessionId);
      const chromaCollectionName = session.chromaCollectionName;

      // Get recent chat history for context (last 10 messages)
      const chatHistory = await chatService.getRecentMessages(
        userId,
        sessionId,
        10
      );



      const result = await asyncRAGOrchestratorService.processQuery(
        query,
        chatHistory,
        chromaCollectionName
      );

      // Save user message
      await chatService.addMessage(userId, sessionId, {
        role: "user",
        content: query,
      });

      // Save assistant response
      await chatService.addMessage(userId, sessionId, {
        role: "assistant",
        content: result.answer,
        sources: result.sources,
      });



      res.status(200).json({
        success: true,
        answer: result.answer,
        sources: result.sources,
        metadata: result.metadata,
      });
    } catch (error: any) {


      res.status(500).json({
        success: false,
        error: error.message || "Failed to process query",
      });
    }
  }

  /**
   * Get system health status
   */
  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await asyncRAGOrchestratorService.getHealthStatus();

      res.status(200).json({
        success: true,
        health,
      });
    } catch (error: any) {

      res.status(500).json({
        success: false,
        error: error.message || "Health check failed",
      });
    }
  }
  /**
   * Update session settings (language, grade)
   */
  async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.userId as string;
      const sessionId = req.params.sessionId;
      const { language, grade } = req.body;

      if (!userId || !sessionId) {
        res.status(400).json({
          success: false,
          error: "userId and sessionId are required",
        });
        return;
      }

      await chatService.updateSessionSettings(userId, sessionId, {
        language,
        grade,
      });

      res.status(200).json({
        success: true,
        message: "Session settings updated successfully",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || "Failed to update session settings",
      });
    }
  }

  /**
   * Translate a message using NLLB and persist to MongoDB
   */
  async translateMessage(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.userId as string;
      const sessionId = req.params.sessionId;
      const { text, sourceLanguage, targetLanguage } = req.body;

      if (!userId || !sessionId) {
        res.status(400).json({
          success: false,
          error: "userId and sessionId are required",
        });
        return;
      }

      if (!text || !text.trim()) {
        res.status(400).json({
          success: false,
          error: "text is required for translation",
        });
        return;
      }

      // Import NLLB and language services
      const { nllbService } = await import("../services/nllb.service");
      const { languageService } = await import("../services/language.service");
      const { env } = await import("../config/env");

      // Check if NLLB is enabled
      if (!env.NLLB_ENABLED) {
        res.status(503).json({
          success: false,
          error: "Translation service is not enabled",
        });
        return;
      }

      const srcCode = (sourceLanguage as keyof typeof languageService) || "en";
      const tgtCode = (targetLanguage as keyof typeof languageService) || "hi";

      // Convert to NLLB language codes
      const srcLang = languageService.toNLLBCode(srcCode as any);
      const tgtLang = languageService.toNLLBCode(tgtCode as any);

      // Translate using NLLB
      const translated = await nllbService.translate(text, {
        srcLang: srcLang,
        tgtLang: tgtLang,
      });

      // Persist translation to MongoDB in background
      chatService.saveMessageTranslation(
        userId,
        sessionId,
        text,
        translated,
        targetLanguage || "hi"
      ).catch(err => console.error("Background save translation error:", err));

      res.json({
        success: true,
        translated,
      });
    } catch (error: any) {
      console.error("Translation error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Translation failed",
      });
    }
  }
}

export const chatController = new ChatController();

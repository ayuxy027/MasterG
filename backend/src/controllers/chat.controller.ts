import { Request, Response } from "express";
import { chatService } from "../services/chat.service";
import { vectorDBService } from "../services/vectordb.service";
import { asyncRAGOrchestratorService } from "../services/asyncRAGOrchestrator.service";
import { monitoringService } from "../services/monitoring.service";
import logger from "../services/logger.service";

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
      console.error("Get chat sessions error:", error);
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
        },
        files,
        documentCount: files.length,
      });
    } catch (error: any) {
      console.error("Get session details error:", error);
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
      console.error("Delete chat session error:", error);
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
      console.error("Update chat name error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to update chat name",
      });
    }
  }

  /**
   * Query chat with async RAG pipeline
   */
  async queryChat(req: Request, res: Response): Promise<void> {
    const startTime = monitoringService.trackRequestStart("query");

    try {
      const { query, userId, sessionId } = req.body;

      if (!query || !userId || !sessionId) {
        res.status(400).json({
          success: false,
          error: "query, userId, and sessionId are required",
        });
        monitoringService.trackError("VALIDATION_ERROR");
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

      logger.info(
        `🔍 Processing query for session: ${sessionId} with ${chatHistory.length} context messages`
      );

      // Process query through async RAG pipeline with chat context
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

      // Track metrics
      monitoringService.trackRequestComplete(
        result.metadata.correlationId,
        startTime,
        result.metadata.strategy,
        result.metadata.language,
        true,
        result.metadata.cached
      );

      res.status(200).json({
        success: true,
        answer: result.answer,
        sources: result.sources,
        metadata: result.metadata,
      });
    } catch (error: any) {
      logger.error("Query chat error:", error);
      monitoringService.trackError("QUERY_ERROR");
      monitoringService.trackRequestComplete(
        "unknown",
        startTime,
        "ERROR",
        "en",
        false,
        false
      );

      res.status(500).json({
        success: false,
        error: error.message || "Failed to process query",
      });
    }
  }

  /**
   * Get system health and metrics
   */
  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await asyncRAGOrchestratorService.getHealthStatus();
      const metrics = monitoringService.getMetrics();

      res.status(200).json({
        success: true,
        health,
        metrics,
      });
    } catch (error: any) {
      logger.error("Health check error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Health check failed",
      });
    }
  }
}

export const chatController = new ChatController();

import { Request, Response } from 'express';
import { chatService } from '../services/chat.service';
import { vectorDBService } from '../services/vectordb.service';

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
          error: 'userId is required',
        });
        return;
      }

      const sessions = await chatService.getAllSessionsForUser(userId);

      res.status(200).json({
        success: true,
        sessions,
      });
    } catch (error: any) {
      console.error('Get chat sessions error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get chat sessions',
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
          error: 'userId and sessionId are required',
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
      console.error('Get session details error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get session details',
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
          error: 'userId and sessionId are required',
        });
        return;
      }

      await chatService.deleteSession(userId, sessionId);

      res.status(200).json({
        success: true,
        message: 'Chat session deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete chat session error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete chat session',
      });
    }
  }
}

export const chatController = new ChatController();

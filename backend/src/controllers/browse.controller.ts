import { Request, Response } from 'express';
import { vectorDBService } from '../services/vectordb.service';
import { chatService } from '../services/chat.service';

export class BrowseController {
  /**
   * Get all documents from vector database for a specific chat session
   */
  async getAllDocuments(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 50, offset = 0, userId, sessionId } = req.query;
      
      if (!userId || !sessionId) {
        res.status(400).json({
          success: false,
          error: 'userId and sessionId are required',
        });
        return;
      }

      // Get the chat-specific collection name
      const collectionName = await chatService.getChromaCollectionName(
        userId as string,
        sessionId as string
      );
      
      const documents = await vectorDBService.getAllDocuments(
        Number(limit),
        Number(offset),
        collectionName
      );

      res.status(200).json({
        success: true,
        ...documents,
      });
    } catch (error) {
      console.error('Browse controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch documents',
      });
    }
  }

  /**
   * Get unique files in the database for a specific chat session
   */
  async getFiles(req: Request, res: Response): Promise<void> {
    try {
      const { userId, sessionId } = req.query;

      if (!userId || !sessionId) {
        res.status(400).json({
          success: false,
          error: 'userId and sessionId are required',
        });
        return;
      }

      // Get the chat-specific collection name
      const collectionName = await chatService.getChromaCollectionName(
        userId as string,
        sessionId as string
      );

      const files = await vectorDBService.getUniqueFiles(collectionName);

      res.status(200).json({
        success: true,
        files,
      });
    } catch (error) {
      console.error('Get files error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch files',
      });
    }
  }

  /**
   * Search documents by file ID in a specific chat session
   */
  async getDocumentsByFile(req: Request, res: Response): Promise<void> {
    try {
      const { fileId } = req.params;
      const { userId, sessionId } = req.query;
      
      if (!userId || !sessionId) {
        res.status(400).json({
          success: false,
          error: 'userId and sessionId are required',
        });
        return;
      }

      // Get the chat-specific collection name
      const collectionName = await chatService.getChromaCollectionName(
        userId as string,
        sessionId as string
      );
      
      const result = await vectorDBService.getDocumentsByFileId(fileId, collectionName);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error('Get documents by file error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch documents for file',
      });
    }
  }
}

export const browseController = new BrowseController();

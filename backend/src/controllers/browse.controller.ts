import { Request, Response } from 'express';
import { vectorDBService } from '../services/vectordb.service';
import { chatService } from '../services/chat.service';
import { fileStorageService } from '../services/fileStorage.service';
import { documentService } from '../services/document.service';

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

  /**
   * Delete a file from the session
   * Performs complete cleanup:
   * 1. Delete from ChromaDB (vector embeddings)
   * 2. Delete from MongoDB (document content)
   * 3. Delete physical file from uploads folder
   */
  async deleteFile(req: Request, res: Response): Promise<void> {
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

      console.log(`🗑️ Deleting file: ${fileId} (user: ${userId}, session: ${sessionId})`);

      // 1. Get the chat-specific ChromaDB collection name
      const collectionName = await chatService.getChromaCollectionName(
        userId as string,
        sessionId as string
      );

      // 2. Delete from ChromaDB (vector embeddings)
      try {
        await vectorDBService.deleteByFileId(fileId, collectionName);
        console.log(`✅ Deleted embeddings from ChromaDB for file: ${fileId}`);
      } catch (chromaError) {
        console.error('ChromaDB deletion error:', chromaError);
        // Continue with other deletions
      }

      // 3. Delete from MongoDB (document content)
      try {
        await documentService.deleteDocument(fileId);
        console.log(`✅ Deleted document from MongoDB for file: ${fileId}`);
      } catch (mongoError) {
        console.error('MongoDB deletion error:', mongoError);
        // Continue with file deletion
      }

      // 4. Delete physical file from uploads folder
      try {
        const filePath = await fileStorageService.getFilePath(
          userId as string,
          sessionId as string,
          fileId
        );
        if (filePath) {
          await fileStorageService.deleteFile(filePath);
          console.log(`✅ Deleted physical file: ${filePath}`);
        }
      } catch (fileError) {
        console.error('File deletion error:', fileError);
        // File might already be deleted
      }

      res.status(200).json({
        success: true,
        message: `File ${fileId} deleted successfully`,
      });
    } catch (error) {
      console.error('Delete file error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete file',
      });
    }
  }
}

export const browseController = new BrowseController();

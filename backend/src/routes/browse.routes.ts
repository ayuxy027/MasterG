import { Router } from 'express';
import { browseController } from '../controllers/browse.controller';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

/**
 * GET /api/browse
 * Get all documents with pagination
 */
router.get(
  '/',
  asyncHandler(browseController.getAllDocuments.bind(browseController))
);

/**
 * GET /api/browse/files
 * Get list of unique files
 */
router.get(
  '/files',
  asyncHandler(browseController.getFiles.bind(browseController))
);

/**
 * GET /api/browse/file/:fileId
 * Get documents for a specific file
 */
router.get(
  '/file/:fileId',
  asyncHandler(browseController.getDocumentsByFile.bind(browseController))
);

/**
 * DELETE /api/browse/files/:fileId
 * Delete a file and all associated data
 * Cleans up: ChromaDB embeddings, MongoDB documents, physical files
 */
router.delete(
  '/files/:fileId',
  asyncHandler(browseController.deleteFile.bind(browseController))
);

export default router;

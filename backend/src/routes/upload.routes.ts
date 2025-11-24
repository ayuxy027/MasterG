import { Router } from 'express';
import { upload } from '../middleware/multer.middleware';
import { uploadController } from '../controllers/upload.controller';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

/**
 * POST /api/upload
 * Upload and process a document
 */
router.post(
  '/',
  upload.single('file'),
  asyncHandler(uploadController.uploadFile.bind(uploadController))
);

/**
 * GET /api/upload/stats
 * Get upload statistics
 */
router.get(
  '/stats',
  asyncHandler(uploadController.getStats.bind(uploadController))
);

export default router;

import { Router } from 'express';
import { posterController } from '../controllers/poster.controller';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

/**
 * POST /api/posters/generate
 * Generate educational poster(s)
 */
router.post(
  '/generate',
  asyncHandler(posterController.generatePoster.bind(posterController))
);

/**
 * GET /api/posters/categories
 * Get available poster categories
 */
router.get(
  '/categories',
  asyncHandler(posterController.getCategories.bind(posterController))
);

/**
 * GET /api/posters/languages
 * Get supported languages
 */
router.get(
  '/languages',
  asyncHandler(posterController.getLanguages.bind(posterController))
);

export default router;

import { Router } from 'express';
import { queryController } from '../controllers/query.controller';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

/**
 * POST /api/query
 * Process a user query with RAG
 */
router.post(
  '/',
  asyncHandler(queryController.query.bind(queryController))
);

/**
 * GET /api/query/health
 * Health check endpoint
 */
router.get(
  '/health',
  asyncHandler(queryController.health.bind(queryController))
);

export default router;

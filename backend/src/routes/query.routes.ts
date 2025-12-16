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
 * POST /api/query/stream
 * Process a user query with streaming response (SSE)
 * Returns Server-Sent Events for real-time word-by-word streaming
 */
router.post(
  '/stream',
  asyncHandler(queryController.streamQuery.bind(queryController))
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


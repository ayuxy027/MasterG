import { Router } from "express";
import { stitchController } from "../controllers/stitch.controller";
import { asyncHandler } from "../middleware/error.middleware";

const router = Router();

/**
 * GET /api/stitch/status
 * Check Ollama connection status
 */
router.get(
  "/status",
  asyncHandler(stitchController.checkConnection.bind(stitchController))
);

/**
 * GET /api/stitch/models
 * List available Ollama models
 */
router.get(
  "/models",
  asyncHandler(stitchController.listModels.bind(stitchController))
);

/**
 * POST /api/stitch/generate
 * Generate educational content (always in English)
 * Body: { topic, grade, subject, culturalContext, stream? }
 */
router.post(
  "/generate",
  asyncHandler(stitchController.generateContent.bind(stitchController))
);

/**
 * POST /api/stitch/pdf
 * Generate PDF from content (not yet implemented)
 * Body: { content }
 */
router.post(
  "/pdf",
  asyncHandler(stitchController.generatePDF.bind(stitchController))
);

/**
 * POST /api/stitch/translate
 * Translate generated content using NLLB-200
 * Body: { text, sourceLanguage, targetLanguage, stream? }
 */
router.post(
  "/translate",
  asyncHandler(stitchController.translateContent.bind(stitchController))
);

/**
 * GET /api/stitch/status/nllb
 * Check NLLB-200 connection status
 */
router.get(
  "/status/nllb",
  asyncHandler(stitchController.checkNLLBStatus.bind(stitchController))
);

/**
 * GET /api/stitch/sessions/:userId
 * Get all Stitch sessions for a user
 */
router.get(
  "/sessions/:userId",
  asyncHandler(stitchController.getAllSessions.bind(stitchController))
);

/**
 * GET /api/stitch/sessions/:userId/:sessionId
 * Get a specific Stitch session
 */
router.get(
  "/sessions/:userId/:sessionId",
  asyncHandler(stitchController.getSession.bind(stitchController))
);

/**
 * POST /api/stitch/sessions/:userId/:sessionId
 * Save or update a Stitch session
 */
router.post(
  "/sessions/:userId/:sessionId",
  asyncHandler(stitchController.saveSession.bind(stitchController))
);

/**
 * DELETE /api/stitch/sessions/:userId/:sessionId
 * Delete a Stitch session
 */
router.delete(
  "/sessions/:userId/:sessionId",
  asyncHandler(stitchController.deleteSession.bind(stitchController))
);

/**
 * PATCH /api/stitch/sessions/:userId/:sessionId/name
 * Update session name
 */
router.patch(
  "/sessions/:userId/:sessionId/name",
  asyncHandler(stitchController.updateSessionName.bind(stitchController))
);

export default router;


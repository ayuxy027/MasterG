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
 * Generate educational content
 * Body: { topic, language, grade, subject, curriculum, culturalContext, stream? }
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

export default router;


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
 * Generate LaTeX content
 * Body: { topic, language, grade, subject, curriculum, culturalContext }
 */
router.post(
  "/generate",
  asyncHandler(stitchController.generateContent.bind(stitchController))
);

/**
 * POST /api/stitch/pdf
 * Generate PDF from LaTeX
 * Body: { latexCode }
 */
router.post(
  "/pdf",
  asyncHandler(stitchController.generatePDF.bind(stitchController))
);

export default router;


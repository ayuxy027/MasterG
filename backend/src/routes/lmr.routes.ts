import { Router } from "express";
import { lmrController } from "../controllers/lmr.controller";
import { upload } from "../middleware/multer.middleware";

const router = Router();

/**
 * POST /api/lmr/upload
 * Upload document for LMR processing
 */
router.post(
  "/upload",
  upload.single("file"),
  lmrController.uploadDocument.bind(lmrController)
);

/**
 * POST /api/lmr/generate/summary
 * Generate summary from uploaded document
 * Body: { fileId: string, language?: string, tone?: string }
 */
router.post(
  "/generate/summary",
  lmrController.generateSummary.bind(lmrController)
);

/**
 * POST /api/lmr/generate/questions
 * Generate Q&A from uploaded document
 * Body: { fileId: string, language?: string, count?: number }
 */
router.post(
  "/generate/questions",
  lmrController.generateQuestions.bind(lmrController)
);

/**
 * POST /api/lmr/generate/quiz
 * Generate quiz from uploaded document
 * Body: { fileId: string, language?: string, count?: number }
 */
router.post("/generate/quiz", lmrController.generateQuiz.bind(lmrController));

/**
 * POST /api/lmr/generate/notes
 * Generate recall notes from uploaded document
 * Body: { fileId: string, language?: string }
 */
router.post(
  "/generate/notes",
  lmrController.generateRecallNotes.bind(lmrController)
);

/**
 * POST /api/lmr/generate/all
 * Generate all content (summary, questions, quiz, notes)
 * Body: { fileId: string, language?: string }
 */
router.post(
  "/generate/all",
  lmrController.generateAllContent.bind(lmrController)
);

/**
 * POST /api/lmr/download/pdf
 * Download PDF with all generated content
 * Body: { fileId: string, language?: string, fileName?: string }
 */
router.post("/download/pdf", lmrController.downloadPDF.bind(lmrController));

/**
 * GET /api/lmr/history
 * Get LMR history for a user or session
 * Query: { userId?: string, sessionId?: string, limit?: number }
 */
router.get("/history", lmrController.getHistory.bind(lmrController));

/**
 * DELETE /api/lmr/history/:id
 * Delete a specific history entry
 * Params: { id: string }
 */
router.delete("/history/:id", lmrController.deleteHistory.bind(lmrController));

/**
 * POST /api/lmr/translate
 * Translate LMR content to target language using NLLB-200
 * Body: { content: { summary?, questions?, quiz?, recallNotes? }, targetLanguage: string }
 */
router.post("/translate", lmrController.translateContent.bind(lmrController));

export default router;

import { Router } from 'express';
import { weaveController } from '../controllers/weave.controller';

const router = Router();

// Generate presentation
router.post('/generate', weaveController.generatePresentation);

// Get presentation by ID
router.get('/:id', weaveController.getPresentation);

// Save presentation
router.post('/save', weaveController.savePresentation);

// Export presentation
router.get('/:id/export/:format', weaveController.exportPresentation);

export default router;
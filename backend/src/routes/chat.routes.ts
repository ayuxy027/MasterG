import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';

const router = Router();

// Get all chat sessions for a user
router.get('/', chatController.getChatSessions.bind(chatController));

// Get session details (messages + documents)
router.get('/:sessionId', chatController.getSessionDetails.bind(chatController));

// Delete a chat session
router.delete('/:sessionId', chatController.deleteSession.bind(chatController));

export default router;

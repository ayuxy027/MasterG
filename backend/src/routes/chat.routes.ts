import { Router } from "express";
import { chatController } from "../controllers/chat.controller";

const router = Router();

// Get all chat sessions for a user
router.get("/", chatController.getChatSessions.bind(chatController));

// Get session details (messages + documents)
router.get(
  "/:sessionId",
  chatController.getSessionDetails.bind(chatController)
);

// Query chat with async RAG pipeline
router.post("/query", chatController.queryChat.bind(chatController));

// Get system health and metrics
router.get("/health/status", chatController.getHealth.bind(chatController));

// Delete a chat session
router.delete("/:sessionId", chatController.deleteSession.bind(chatController));

// Update chat name/title
router.patch("/:sessionId/name", chatController.updateChatName.bind(chatController));

// Update session settings
router.patch("/:sessionId/settings", chatController.updateSettings.bind(chatController));

// Translate a message
router.post("/:sessionId/translate", chatController.translateMessage.bind(chatController));

export default router;


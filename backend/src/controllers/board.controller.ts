import { Request, Response } from "express";
import { boardService, BoardSessionData } from "../services/board.service";

export class BoardController {
  /**
   * Get all Board sessions for a user
   * GET /api/board/sessions/:userId
   */
  async getAllSessions(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: "User ID is required",
        });
        return;
      }

      const sessions = await boardService.getAllSessionsForUser(userId);

      res.status(200).json({
        success: true,
        sessions: sessions.map((s) => ({
          sessionId: s.sessionId,
          sessionName: s.sessionName || `Board ${s.sessionId.slice(-8)}`,
          updatedAt: s.updatedAt,
          cardCount: s.cards.length,
          stickyNoteCount: s.stickyNotes.length,
          drawingPathCount: s.drawingPaths.length,
        })),
      });
    } catch (error: any) {
      console.error("Error getting Board sessions:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get Board sessions",
      });
    }
  }

  /**
   * Get a specific Board session
   * GET /api/board/sessions/:userId/:sessionId
   */
  async getSession(req: Request, res: Response): Promise<void> {
    try {
      const { userId, sessionId } = req.params;

      if (!userId || !sessionId) {
        res.status(400).json({
          success: false,
          error: "User ID and Session ID are required",
        });
        return;
      }

      const session = await boardService.getSession(userId, sessionId);

      if (!session) {
        res.status(404).json({
          success: false,
          error: "Session not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        session,
      });
    } catch (error: any) {
      console.error("Error getting Board session:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get Board session",
      });
    }
  }

  /**
   * Save Board session
   * POST /api/board/sessions/:userId/:sessionId
   */
  async saveSession(req: Request, res: Response): Promise<void> {
    try {
      const { userId, sessionId } = req.params;
      const {
        sessionName,
        drawingPaths,
        cards,
        stickyNotes,
        viewOffset,
        zoom,
      } = req.body;

      if (!userId || !sessionId) {
        res.status(400).json({
          success: false,
          error: "User ID and Session ID are required",
        });
        return;
      }

      const session = await boardService.saveSession(userId, sessionId, {
        sessionName,
        drawingPaths,
        cards,
        stickyNotes,
        viewOffset,
        zoom,
      });

      res.status(200).json({
        success: true,
        session,
      });
    } catch (error: any) {
      console.error("Error saving Board session:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to save Board session",
      });
    }
  }

  /**
   * Delete Board session
   * DELETE /api/board/sessions/:userId/:sessionId
   */
  async deleteSession(req: Request, res: Response): Promise<void> {
    try {
      const { userId, sessionId } = req.params;

      if (!userId || !sessionId) {
        res.status(400).json({
          success: false,
          error: "User ID and Session ID are required",
        });
        return;
      }

      const deleted = await boardService.deleteSession(userId, sessionId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: "Session not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Session deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting Board session:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to delete Board session",
      });
    }
  }

  /**
   * Update session name
   * PATCH /api/board/sessions/:userId/:sessionId/name
   */
  async updateSessionName(req: Request, res: Response): Promise<void> {
    try {
      const { userId, sessionId } = req.params;
      const { sessionName } = req.body;

      if (!userId || !sessionId) {
        res.status(400).json({
          success: false,
          error: "User ID and Session ID are required",
        });
        return;
      }

      if (!sessionName || typeof sessionName !== "string") {
        res.status(400).json({
          success: false,
          error: "Session name is required",
        });
        return;
      }

      const updated = await boardService.updateSessionName(
        userId,
        sessionId,
        sessionName
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          error: "Session not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Session name updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating Board session name:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to update session name",
      });
    }
  }
}

export const boardController = new BoardController();


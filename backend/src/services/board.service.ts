import mongoose, { Schema, Document } from "mongoose";

export interface BoardSessionData {
  userId: string;
  sessionId: string;
  sessionName?: string;
  drawingPaths: Array<{
    points: Array<{ x: number; y: number }>;
    color: string;
    strokeWidth: number;
    tool: string;
  }>;
  cards: Array<{
    id: string;
    title: string;
    content: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  stickyNotes: Array<{
    id: string;
    x: number;
    y: number;
    text: string;
    color: string;
    width: number;
    height: number;
    enableMarkdown?: boolean;
    ruled?: boolean;
    fontSize?: number;
    fontFamily?: string;
    isBold?: boolean;
    isItalic?: boolean;
    isUnderline?: boolean;
  }>;
  viewOffset: { x: number; y: number };
  zoom: number;
  createdAt: Date;
  updatedAt: Date;
}

interface BoardSessionDocument extends Document {
  userId: string;
  sessionId: string;
  sessionName?: string;
  drawingPaths: Array<{
    points: Array<{ x: number; y: number }>;
    color: string;
    strokeWidth: number;
    tool: string;
  }>;
  cards: Array<{
    id: string;
    title: string;
    content: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  stickyNotes: Array<{
    id: string;
    x: number;
    y: number;
    text: string;
    color: string;
    width: number;
    height: number;
    enableMarkdown?: boolean;
    ruled?: boolean;
    fontSize?: number;
    fontFamily?: string;
    isBold?: boolean;
    isItalic?: boolean;
    isUnderline?: boolean;
  }>;
  viewOffset: { x: number; y: number };
  zoom: number;
  createdAt: Date;
  updatedAt: Date;
}

const boardSessionSchema: any = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    sessionName: {
      type: String,
      default: null,
    },
    drawingPaths: {
      type: [
        {
          points: [{ x: Number, y: Number }],
          color: String,
          strokeWidth: Number,
          tool: String,
        },
      ],
      default: [],
    },
    cards: {
      type: [
        {
          id: String,
          title: String,
          content: String,
          x: Number,
          y: Number,
          width: Number,
          height: Number,
        },
      ],
      default: [],
    },
    stickyNotes: {
      type: [
        {
          id: String,
          x: Number,
          y: Number,
          text: String,
          color: String,
          width: Number,
          height: Number,
          enableMarkdown: { type: Boolean, default: false },
          ruled: { type: Boolean, default: false },
          fontSize: { type: Number, default: 14 },
          fontFamily: { type: String, default: 'Inter' },
          isBold: { type: Boolean, default: false },
          isItalic: { type: Boolean, default: false },
          isUnderline: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    viewOffset: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
    zoom: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

// Create unique index on userId + sessionId
boardSessionSchema.index({ userId: 1, sessionId: 1 }, { unique: true });

const BoardSessionModel =
  (mongoose.models.BoardSession as any) ||
  mongoose.model("BoardSession", boardSessionSchema);

export class BoardService {
  /**
   * Get or create a Board session
   */
  async getOrCreateSession(
    userId: string,
    sessionId: string
  ): Promise<BoardSessionData> {
    try {
      if (mongoose.connection.readyState !== 1) {
        console.warn("MongoDB not connected. Returning empty session.");
        throw new Error("MongoDB not connected");
      }

      let session = await BoardSessionModel.findOne({
        userId,
        sessionId,
      }).lean();

      if (!session) {
        const newSession = await BoardSessionModel.create({
          userId,
          sessionId,
          drawingPaths: [],
          cards: [],
          stickyNotes: [],
          viewOffset: { x: 0, y: 0 },
          zoom: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        console.log(`📁 Created new Board session (${userId}/${sessionId})`);
        session = newSession.toObject();
      }

      return {
        userId: session.userId,
        sessionId: session.sessionId,
        sessionName: session.sessionName || undefined,
        drawingPaths: session.drawingPaths || [],
        cards: session.cards || [],
        stickyNotes: session.stickyNotes || [],
        viewOffset: session.viewOffset || { x: 0, y: 0 },
        zoom: session.zoom || 1,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      };
    } catch (error) {
      console.error("Error getting/creating Board session:", error);
      throw new Error("Failed to access Board session");
    }
  }

  /**
   * Save Board session
   */
  async saveSession(
    userId: string,
    sessionId: string,
    data: {
      sessionName?: string;
      drawingPaths?: Array<{
        points: Array<{ x: number; y: number }>;
        color: string;
        strokeWidth: number;
        tool: string;
      }>;
      cards?: Array<{
        id: string;
        title: string;
        content: string;
        x: number;
        y: number;
        width: number;
        height: number;
      }>;
      stickyNotes?: Array<{
        id: string;
        x: number;
        y: number;
        text: string;
        color: string;
        width: number;
        height: number;
        enableMarkdown?: boolean;
        ruled?: boolean;
        fontSize?: number;
        fontFamily?: string;
        isBold?: boolean;
        isItalic?: boolean;
        isUnderline?: boolean;
      }>;
      viewOffset?: { x: number; y: number };
      zoom?: number;
    }
  ): Promise<BoardSessionData> {
    try {
      if (mongoose.connection.readyState !== 1) {
        console.warn("MongoDB not connected. Cannot save session.");
        throw new Error("MongoDB not connected");
      }

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (data.sessionName !== undefined) updateData.sessionName = data.sessionName;
      if (data.drawingPaths !== undefined) updateData.drawingPaths = data.drawingPaths;
      if (data.cards !== undefined) updateData.cards = data.cards;
      if (data.stickyNotes !== undefined) updateData.stickyNotes = data.stickyNotes;
      if (data.viewOffset !== undefined) updateData.viewOffset = data.viewOffset;
      if (data.zoom !== undefined) updateData.zoom = data.zoom;

      const session = await BoardSessionModel.findOneAndUpdate(
        { userId, sessionId },
        updateData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();

      console.log(`💾 Saved Board session (${userId}/${sessionId})`);

      return {
        userId: session.userId,
        sessionId: session.sessionId,
        sessionName: session.sessionName || undefined,
        drawingPaths: session.drawingPaths || [],
        cards: session.cards || [],
        stickyNotes: session.stickyNotes || [],
        viewOffset: session.viewOffset || { x: 0, y: 0 },
        zoom: session.zoom || 1,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      };
    } catch (error) {
      console.error("Error saving Board session:", error);
      throw new Error("Failed to save Board session");
    }
  }

  /**
   * Get Board session
   */
  async getSession(
    userId: string,
    sessionId: string
  ): Promise<BoardSessionData | null> {
    try {
      if (mongoose.connection.readyState !== 1) {
        console.warn("MongoDB not connected. Cannot get session.");
        return null;
      }

      const session = await BoardSessionModel.findOne({
        userId,
        sessionId,
      }).lean();

      if (!session) {
        return null;
      }

      return {
        userId: session.userId,
        sessionId: session.sessionId,
        sessionName: session.sessionName || undefined,
        drawingPaths: session.drawingPaths || [],
        cards: session.cards || [],
        stickyNotes: session.stickyNotes || [],
        viewOffset: session.viewOffset || { x: 0, y: 0 },
        zoom: session.zoom || 1,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      };
    } catch (error) {
      console.error("Error getting Board session:", error);
      return null;
    }
  }

  /**
   * Get all Board sessions for a user
   */
  async getAllSessionsForUser(userId: string): Promise<BoardSessionData[]> {
    try {
      if (mongoose.connection.readyState !== 1) {
        console.warn("MongoDB not connected. Cannot get sessions.");
        return [];
      }

      const sessions = await BoardSessionModel.find({ userId })
        .sort({ updatedAt: -1 })
        .lean();

      return sessions.map((session) => ({
        userId: session.userId,
        sessionId: session.sessionId,
        sessionName: session.sessionName || undefined,
        drawingPaths: session.drawingPaths || [],
        cards: session.cards || [],
        stickyNotes: session.stickyNotes || [],
        viewOffset: session.viewOffset || { x: 0, y: 0 },
        zoom: session.zoom || 1,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      }));
    } catch (error) {
      console.error("Error getting Board sessions:", error);
      return [];
    }
  }

  /**
   * Delete Board session
   */
  async deleteSession(userId: string, sessionId: string): Promise<boolean> {
    try {
      if (mongoose.connection.readyState !== 1) {
        console.warn("MongoDB not connected. Cannot delete session.");
        return false;
      }

      const result = await BoardSessionModel.deleteOne({ userId, sessionId });
      console.log(`🗑️ Deleted Board session (${userId}/${sessionId})`);
      return result.deletedCount > 0;
    } catch (error) {
      console.error("Error deleting Board session:", error);
      return false;
    }
  }

  /**
   * Update session name
   */
  async updateSessionName(
    userId: string,
    sessionId: string,
    sessionName: string
  ): Promise<boolean> {
    try {
      if (mongoose.connection.readyState !== 1) {
        console.warn("MongoDB not connected. Cannot update session name.");
        return false;
      }

      const result = await BoardSessionModel.updateOne(
        { userId, sessionId },
        { sessionName, updatedAt: new Date() }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      console.error("Error updating Board session name:", error);
      return false;
    }
  }
}

export const boardService = new BoardService();


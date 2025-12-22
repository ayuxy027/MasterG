import mongoose, { Schema, Document } from "mongoose";

export interface StitchSessionData {
  userId: string;
  sessionId: string;
  sessionName?: string;
  topic: string;
  grade: string;
  subject: string;
  customGrade?: string;
  customSubject?: string;
  englishContent: string;
  thinkingText?: string;
  translatedContent: Record<string, string>;
  markdownEnabled?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface StitchSessionDocument extends Document {
  userId: string;
  sessionId: string;
  sessionName?: string;
  topic: string;
  grade: string;
  subject: string;
  customGrade?: string;
  customSubject?: string;
  englishContent: string;
  thinkingText?: string;
  translatedContent: Record<string, string>;
  markdownEnabled?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const stitchSessionSchema: any = new Schema(
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
    topic: {
      type: String,
      required: true,
    },
    grade: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    customGrade: {
      type: String,
      default: null,
    },
    customSubject: {
      type: String,
      default: null,
    },
    englishContent: {
      type: String,
      required: true,
      default: "",
    },
    thinkingText: {
      type: String,
      default: null,
    },
    translatedContent: {
      type: Map,
      of: String,
      default: {},
    },
    markdownEnabled: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Create unique index on userId + sessionId
stitchSessionSchema.index({ userId: 1, sessionId: 1 }, { unique: true });

const StitchSessionModel =
  (mongoose.models.StitchSession as any) ||
  mongoose.model("StitchSession", stitchSessionSchema);

export class StitchService {
  /**
   * Get or create a Stitch session
   */
  async getOrCreateSession(
    userId: string,
    sessionId: string
  ): Promise<StitchSessionData> {
    try {
      // Check if MongoDB is connected
      if (mongoose.connection.readyState !== 1) {
        console.warn("MongoDB not connected. Returning empty session.");
        throw new Error("MongoDB not connected");
      }

      let session = await StitchSessionModel.findOne({
        userId,
        sessionId,
      }).lean();

      if (!session) {
        const newSession = await StitchSessionModel.create({
          userId,
          sessionId,
          topic: "",
          grade: "",
          subject: "",
          englishContent: "",
          translatedContent: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        console.log(`📁 Created new Stitch session (${userId}/${sessionId})`);
        session = newSession.toObject();
      }

      return {
        userId: session.userId,
        sessionId: session.sessionId,
        sessionName: session.sessionName || undefined,
        topic: session.topic || "",
        grade: session.grade || "",
        subject: session.subject || "",
        customGrade: session.customGrade || undefined,
        customSubject: session.customSubject || undefined,
        englishContent: session.englishContent || "",
        thinkingText: session.thinkingText || undefined,
        translatedContent: session.translatedContent
          ? Object.fromEntries(
              session.translatedContent instanceof Map
                ? session.translatedContent
                : Object.entries(session.translatedContent)
            )
          : {},
        markdownEnabled: session.markdownEnabled || false,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      };
    } catch (error) {
      console.error("Error getting/creating Stitch session:", error);
      throw new Error("Failed to access Stitch session");
    }
  }

  /**
   * Save or update a Stitch session
   */
  async saveSession(
    userId: string,
    sessionId: string,
    data: Partial<Omit<StitchSessionData, "userId" | "sessionId" | "createdAt" | "updatedAt">>
  ): Promise<StitchSessionData> {
    try {
      // Check if MongoDB is connected
      if (mongoose.connection.readyState !== 1) {
        console.warn("MongoDB not connected. Session not saved.");
        // Return a mock session instead of throwing to allow graceful degradation
        return {
          userId,
          sessionId,
          sessionName: data.sessionName,
          topic: data.topic || "",
          grade: data.grade || "",
          subject: data.subject || "",
          customGrade: data.customGrade,
          customSubject: data.customSubject,
          englishContent: data.englishContent || "",
          thinkingText: data.thinkingText,
          translatedContent: data.translatedContent || {},
          markdownEnabled: data.markdownEnabled || false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      // Validate required fields
      if (!userId || !sessionId) {
        throw new Error("userId and sessionId are required");
      }

      // Auto-generate session name if not provided
      let sessionName = data.sessionName;
      if (!sessionName && data.topic) {
        const gradeLabel = data.customGrade || (data.grade ? `Class ${data.grade}` : "");
        const subjectLabel = data.customSubject || data.subject || "General";
        sessionName = `${data.topic}${gradeLabel ? ` - ${gradeLabel}` : ""} - ${subjectLabel}`;
      }

      const updateData: any = {
        ...data,
        sessionName,
        updatedAt: new Date(),
      };

      // Convert translatedContent object to Map format for MongoDB
      if (data.translatedContent && typeof data.translatedContent === 'object') {
        updateData.translatedContent = new Map(Object.entries(data.translatedContent));
      }

      const session = await StitchSessionModel.findOneAndUpdate(
        { userId, sessionId },
        { $set: updateData },
        { upsert: true, new: true, lean: true }
      );

      console.log(`💾 Stitch session saved (${userId}/${sessionId})`);

      return {
        userId: session.userId,
        sessionId: session.sessionId,
        sessionName: session.sessionName || undefined,
        topic: session.topic || "",
        grade: session.grade || "",
        subject: session.subject || "",
        customGrade: session.customGrade || undefined,
        customSubject: session.customSubject || undefined,
        englishContent: session.englishContent || "",
        thinkingText: session.thinkingText || undefined,
        translatedContent: session.translatedContent
          ? Object.fromEntries(
              session.translatedContent instanceof Map
                ? session.translatedContent
                : Object.entries(session.translatedContent)
            )
          : {},
        markdownEnabled: session.markdownEnabled || false,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      };
    } catch (error) {
      console.error("Error saving Stitch session:", error);
      // Return mock session on error for graceful degradation
      return {
        userId,
        sessionId,
        sessionName: data.sessionName,
        topic: data.topic || "",
        grade: data.grade || "",
        subject: data.subject || "",
        customGrade: data.customGrade,
        customSubject: data.customSubject,
        englishContent: data.englishContent || "",
        thinkingText: data.thinkingText,
        translatedContent: data.translatedContent || {},
        markdownEnabled: data.markdownEnabled || false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  /**
   * Get a Stitch session
   */
  async getSession(
    userId: string,
    sessionId: string
  ): Promise<StitchSessionData | null> {
    try {
      // Check if MongoDB is connected
      if (mongoose.connection.readyState !== 1) {
        console.warn("MongoDB not connected. Returning null.");
        return null;
      }

      const session = await StitchSessionModel.findOne({
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
        topic: session.topic || "",
        grade: session.grade || "",
        subject: session.subject || "",
        customGrade: session.customGrade || undefined,
        customSubject: session.customSubject || undefined,
        englishContent: session.englishContent || "",
        thinkingText: session.thinkingText || undefined,
        translatedContent: session.translatedContent
          ? Object.fromEntries(
              session.translatedContent instanceof Map
                ? session.translatedContent
                : Object.entries(session.translatedContent)
            )
          : {},
        markdownEnabled: session.markdownEnabled || false,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      };
    } catch (error) {
      console.error("Error getting Stitch session:", error);
      return null;
    }
  }

  /**
   * Get all sessions for a user
   */
  async getAllSessionsForUser(userId: string): Promise<
    Array<{
      sessionId: string;
      sessionName?: string;
      topic: string;
      grade: string;
      subject: string;
      hasContent: boolean;
      translationCount: number;
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
    try {
      // Check if MongoDB is connected
      if (mongoose.connection.readyState !== 1) {
        console.warn("MongoDB not connected. Returning empty sessions list.");
        return [];
      }

      const sessions = await StitchSessionModel.find({ userId })
        .sort({ updatedAt: -1 })
        .lean();

      return sessions.map((s: any) => ({
        sessionId: s.sessionId,
        sessionName: s.sessionName || undefined,
        topic: s.topic || "",
        grade: s.grade || "",
        subject: s.subject || "",
        hasContent: !!(s.englishContent && s.englishContent.trim()),
        translationCount: s.translatedContent
          ? Object.keys(
              s.translatedContent instanceof Map
                ? Object.fromEntries(s.translatedContent)
                : s.translatedContent
            ).length
          : 0,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }));
    } catch (error) {
      console.error("Error getting all user Stitch sessions:", error);
      return [];
    }
  }

  /**
   * Delete a Stitch session
   */
  async deleteSession(userId: string, sessionId: string): Promise<void> {
    try {
      // Validate inputs
      if (!userId || !sessionId) {
        throw new Error("userId and sessionId are required");
      }

      // Check if MongoDB is connected
      if (mongoose.connection.readyState !== 1) {
        console.warn("MongoDB not connected. Session not deleted.");
        return;
      }

      const result = await StitchSessionModel.deleteOne({ userId, sessionId });
      
      if (result.deletedCount === 0) {
        console.warn(`Session not found for deletion (${userId}/${sessionId})`);
      } else {
        console.log(`🗑️  Stitch session deleted (${userId}/${sessionId})`);
      }
    } catch (error) {
      console.error("Error deleting Stitch session:", error);
      throw new Error("Failed to delete Stitch session");
    }
  }

  /**
   * Update session name
   */
  async updateSessionName(
    userId: string,
    sessionId: string,
    sessionName: string
  ): Promise<void> {
    try {
      // Check if MongoDB is connected
      if (mongoose.connection.readyState !== 1) {
        console.warn("MongoDB not connected. Session name not saved.");
        return;
      }

      await StitchSessionModel.findOneAndUpdate(
        { userId, sessionId },
        { $set: { sessionName, updatedAt: new Date() } },
        { upsert: false }
      );

      console.log(
        `📝 Stitch session name updated: "${sessionName}" (${userId}/${sessionId})`
      );
    } catch (error) {
      console.error("Error updating Stitch session name:", error);
      throw new Error("Failed to update Stitch session name");
    }
  }
}

export const stitchService = new StitchService();


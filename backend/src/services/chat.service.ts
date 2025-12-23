import mongoose, { Schema, Document, Model } from "mongoose";
import { ChatHistory, ChatMessage } from "../types";

// Extended interface with ChromaDB collection name
interface ChatHistoryDocument extends Document {
  userId: string;
  sessionId: string;
  chromaCollectionName: string;
  messages: ChatMessage[];
  language?: string;
  grade?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Simple schema without generic type parameter to avoid TS2590
const chatMessageSchema = new Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    sources: [
      {
        pdfName: String,
        pageNo: Number,
        snippet: String,
      },
    ],
    translatedContent: {
      type: String,
      default: null,
    },
    translatedLanguage: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

// @ts-ignore - TypeScript has inference issues with nested schemas
const chatHistorySchema: any = new Schema(
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
    chromaCollectionName: {
      type: String,
      required: true,
    },
    chatName: {
      type: String,
      default: null,
    },
    language: {
      type: String,
      default: "hi",
    },
    grade: {
      type: String,
      default: "12",
    },
    messages: [chatMessageSchema],
  },
  { timestamps: true }
);

// Create unique index on userId + sessionId
chatHistorySchema.index({ userId: 1, sessionId: 1 }, { unique: true });

const ChatHistoryModel =
  (mongoose.models.ChatHistory as any) ||
  mongoose.model("ChatHistory", chatHistorySchema);

export class ChatService {
  /**
   * Get or create a chat session with dedicated ChromaDB collection
   */
  async getOrCreateSession(
    userId: string,
    sessionId: string
  ): Promise<ChatHistory & { chromaCollectionName: string }> {
    try {
      let chatHistory = await ChatHistoryModel.findOne({
        userId,
        sessionId,
      }).lean();

      if (!chatHistory) {
        // Create unique ChromaDB collection name for this chat
        const chromaCollectionName = `chat_${userId}_${sessionId}`.replace(
          /[^a-zA-Z0-9_-]/g,
          "_"
        );

        const newHistory = await ChatHistoryModel.create({
          userId,
          sessionId,
          chromaCollectionName,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        console.log(
          `📁 Created new chat session with ChromaDB collection: ${chromaCollectionName}`
        );

        chatHistory = newHistory.toObject();
      }

      // Ensure messages array exists and has timestamp
      const result = {
        ...chatHistory,
        messages: (chatHistory.messages || []).map((msg) => ({
          ...msg,
          timestamp: msg.timestamp || new Date(),
        })),
        language: chatHistory.language || "hi",
        grade: chatHistory.grade || "12",
      } as any;


      return result;
    } catch (error) {
      console.error("Error getting/creating chat session:", error);
      throw new Error("Failed to access chat history");
    }
  }

  /**
   * Get ChromaDB collection name for a chat session
   */
  async getChromaCollectionName(
    userId: string,
    sessionId: string
  ): Promise<string> {
    try {
      // Check if MongoDB is connected
      if (mongoose.connection.readyState !== 1) {
        console.warn("MongoDB not connected. Using default collection name.");
        return `chat_${userId}_${sessionId}`.replace(/[^a-zA-Z0-9_-]/g, "_");
      }

      const chatHistory = await ChatHistoryModel.findOne({ userId, sessionId });

      if (!chatHistory) {
        // Create session if it doesn't exist
        const session = await this.getOrCreateSession(userId, sessionId);
        return session.chromaCollectionName;
      }

      return chatHistory.chromaCollectionName;
    } catch (error) {
      console.error("Error getting ChromaDB collection name:", error);
      // Fallback to generated name
      return `chat_${userId}_${sessionId}`.replace(/[^a-zA-Z0-9_-]/g, "_");
    }
  }

  /**
   * Get last N messages from chat history (for context)
   */
  async getRecentMessages(
    userId: string,
    sessionId: string,
    limit: number = 10
  ): Promise<ChatMessage[]> {
    try {
      // Check if MongoDB is connected
      if (mongoose.connection.readyState !== 1) {
        console.warn("MongoDB not connected. Returning empty chat history.");
        return [];
      }

      const chatHistory = await ChatHistoryModel.findOne(
        { userId, sessionId },
        { messages: { $slice: -limit } } // Get last N messages
      );

      if (!chatHistory) {
        return [];
      }

      return chatHistory.messages;
    } catch (error) {
      console.error("Error getting recent messages:", error);
      // Don't throw - return empty array to allow RAG to work without chat history
      return [];
    }
  }

  /**
   * Add a message to chat history
   */
  async addMessage(
    userId: string,
    sessionId: string,
    message: Omit<ChatMessage, "timestamp">
  ): Promise<void> {
    try {
      // Check if MongoDB is connected
      if (mongoose.connection.readyState !== 1) {
        console.warn("MongoDB not connected. Message not saved to history.");
        return;
      }

      const chatMessage: ChatMessage = {
        ...message,
        timestamp: new Date(),
      };

      await ChatHistoryModel.findOneAndUpdate(
        { userId, sessionId },
        {
          $push: { messages: chatMessage },
          $set: { updatedAt: new Date() },
        },
        { upsert: true, new: true }
      );

      // Message added to chat history
    } catch (error) {
      console.error("Error adding message to chat history:", error);
      // Don't throw - allow RAG to work without chat history
    }
  }

  /**
   * Add both user query and assistant response to chat history
   */
  async addConversation(
    userId: string,
    sessionId: string,
    userQuery: string,
    assistantResponse: string,
    sources?: Array<{ pdfName: string; pageNo: number; snippet?: string }>
  ): Promise<void> {
    try {
      // Check if MongoDB is connected
      if (mongoose.connection.readyState !== 1) {
        console.warn(
          "MongoDB not connected. Conversation not saved to history."
        );
        return;
      }

      const messages: ChatMessage[] = [
        {
          role: "user",
          content: userQuery,
          timestamp: new Date(),
        },
        {
          role: "assistant",
          content: assistantResponse,
          timestamp: new Date(),
          sources,
        },
      ];

      await ChatHistoryModel.findOneAndUpdate(
        { userId, sessionId },
        {
          $push: { messages: { $each: messages } },
          $set: { updatedAt: new Date() },
        },
        { upsert: true, new: true }
      );

      console.log(
        `💬 Conversation saved to chat history (${userId}/${sessionId})`
      );
    } catch (error) {
      console.error("Error adding conversation to chat history:", error);
      // Don't throw - allow RAG to work without chat history
    }
  }

  /**
   * Get all sessions for a user with details
   */
  async getAllSessionsForUser(userId: string): Promise<
    Array<{
      sessionId: string;
      chromaCollectionName: string;
      chatName?: string;
      messageCount: number;
      lastMessage?: string;
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

      const sessions = await ChatHistoryModel.find({ userId }).sort({
        updatedAt: -1,
      });

      return sessions.map((s: any) => ({
        sessionId: s.sessionId,
        chromaCollectionName: s.chromaCollectionName,
        chatName: s.chatName || undefined,
        messageCount: s.messages?.length || 0,
        lastMessage: s.messages?.[s.messages.length - 1]?.content?.substring(
          0,
          100
        ),
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }));
    } catch (error) {
      console.error("Error getting all user sessions:", error);
      return [];
    }
  }

  /**
   * Update chat name for a session
   */
  async updateChatName(
    userId: string,
    sessionId: string,
    chatName: string
  ): Promise<void> {
    try {
      // Check if MongoDB is connected
      if (mongoose.connection.readyState !== 1) {
        console.warn("MongoDB not connected. Chat name not saved.");
        return;
      }

      await ChatHistoryModel.findOneAndUpdate(
        { userId, sessionId },
        { $set: { chatName, updatedAt: new Date() } },
        { upsert: false }
      );

      console.log(`📝 Chat name updated: "${chatName}" (${userId}/${sessionId})`);
    } catch (error) {
      console.error("Error updating chat name:", error);
      throw new Error("Failed to update chat name");
    }
  }

  /**
   * Get all sessions for a user (legacy method)
   */
  async getUserSessions(
    userId: string
  ): Promise<Array<{ sessionId: string; lastUpdate: Date }>> {
    try {
      const sessions = await ChatHistoryModel.find(
        { userId },
        { sessionId: 1, updatedAt: 1, _id: 0 }
      ).sort({ updatedAt: -1 });

      return sessions.map((s: any) => ({
        sessionId: s.sessionId,
        lastUpdate: s.updatedAt,
      }));
    } catch (error) {
      console.error("Error getting user sessions:", error);
      return [];
    }
  }

  /**
   * Get all messages from a chat session
   */
  async getMessages(userId: string, sessionId: string): Promise<ChatMessage[]> {
    return this.getRecentMessages(userId, sessionId, 1000); // Get all messages
  }

  /**
   * Clear chat history (alias for clearSession)
   */
  async clearHistory(userId: string, sessionId: string): Promise<void> {
    return this.clearSession(userId, sessionId);
  }

  /**
   * Delete a chat session and all associated files
   */
  async deleteSession(userId: string, sessionId: string): Promise<void> {
    try {
      // Get session info first (for ChromaDB collection name)
      const session = await ChatHistoryModel.findOne({ userId, sessionId });
      const chromaCollectionName = session?.chromaCollectionName;

      // Delete from MongoDB
      await ChatHistoryModel.deleteOne({ userId, sessionId });
      console.log(`🗑️  Chat session deleted from MongoDB (${userId}/${sessionId})`);

      // Delete uploaded files from disk
      try {
        const { fileStorageService } = await import('./fileStorage.service');
        await fileStorageService.deleteSessionFiles(userId, sessionId);
        console.log(`🗑️  Session files deleted from disk (${userId}/${sessionId})`);
      } catch (fileError) {
        console.error("Error deleting session files:", fileError);
        // Don't throw - continue with deletion
      }

      // Delete ChromaDB collection
      if (chromaCollectionName) {
        try {
          const { vectorDBService } = await import('./vectordb.service');
          await vectorDBService.deleteCollection(chromaCollectionName);
          console.log(`🗑️  ChromaDB collection deleted: ${chromaCollectionName}`);
        } catch (chromaError) {
          console.error("Error deleting ChromaDB collection:", chromaError);
          // Don't throw - consider this a warning
        }
      }

    } catch (error) {
      console.error("Error deleting chat session:", error);
      throw new Error("Failed to delete chat session");
    }
  }

  /**
   * Clear all messages in a session (but keep the session)
   */
  async clearSession(userId: string, sessionId: string): Promise<void> {
    try {
      await ChatHistoryModel.findOneAndUpdate(
        { userId, sessionId },
        {
          $set: { messages: [], updatedAt: new Date() },
        }
      );
      console.log(`🧹 Chat session cleared (${userId}/${sessionId})`);
    } catch (error) {
      console.error("Error clearing chat session:", error);
      throw new Error("Failed to clear chat session");
    }
  }

  /**
   * Save translation for a specific message
   * Identifies message by content since we don't expose stable IDs to frontend yet
   */
  async saveMessageTranslation(
    userId: string,
    sessionId: string,
    originalContent: string,
    translatedContent: string,
    translatedLanguage: string
  ): Promise<void> {
    try {
      if (mongoose.connection.readyState !== 1) {
        return;
      }

      // We need to find the specific message in the array and update it.
      // Since we don't have a unique ID for the message available here easily (frontend uses generated IDs),
      // we'll match by content. For robustness, we check the last 20 messages.

      const chatHistory = await ChatHistoryModel.findOne({ userId, sessionId });
      if (!chatHistory || !chatHistory.messages) return;

      // Find the message index (searching backwards)
      let messageIndex = -1;
      for (let i = chatHistory.messages.length - 1; i >= 0; i--) {
        if (chatHistory.messages[i].content === originalContent) {
          messageIndex = i;
          break;
        }
      }

      if (messageIndex !== -1) {
        // Update using the positional operator logic, but since we have the index, we can target it directly
        const updatePath = `messages.${messageIndex}.translatedContent`;
        const langUpdatePath = `messages.${messageIndex}.translatedLanguage`;

        const updateQuery: any = { $set: {} };
        updateQuery.$set[updatePath] = translatedContent;
        updateQuery.$set[langUpdatePath] = translatedLanguage;

        await ChatHistoryModel.updateOne(
          { userId, sessionId },
          updateQuery
        );


      } else {
        console.warn(`⚠️ Message not found for translation update (${userId}/${sessionId})`);
      }
    } catch (error) {
      console.error("Error saving translation:", error);
      // Don't throw to avoid breaking the UI flow
    }
  }

  /**
   * Update session settings (language, grade)
   */
  async updateSessionSettings(
    userId: string,
    sessionId: string,
    settings: { language?: string; grade?: string }
  ): Promise<void> {
    try {
      if (mongoose.connection.readyState !== 1) {
        return;
      }

      const update: any = { updatedAt: new Date() };
      if (settings.language) update.language = settings.language;
      if (settings.grade) update.grade = settings.grade;

      await ChatHistoryModel.findOneAndUpdate(
        { userId, sessionId },
        { $set: update }
      );


    } catch (error) {
      console.error("Error updating session settings:", error);
      throw new Error("Failed to update session settings");
    }
  }
}

export const chatService = new ChatService();

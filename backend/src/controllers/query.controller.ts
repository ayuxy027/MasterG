import { Request, Response } from 'express';
import { queryRouterService } from '../services/queryRouter.service';
import { offlineQueryRouterService } from '../services/offlineQueryRouter.service';
import { serviceFactory } from '../services/serviceFactory';
import { chatService } from '../services/chat.service';
import { vectorDBService } from '../services/vectordb.service';
import { ollamaChatService } from '../services/ollamaChat.service';
import { ollamaEmbeddingService } from '../services/ollamaEmbedding.service';
import { QueryRequest, QueryResponse } from '../types';
import env from '../config/env';


export class QueryController {
  /**
   * 🎯 OPTIMIZED 3-LAYER QUERY HANDLER
   * Layer 1: Groq (fast responses for simple queries)
   * Layer 2: ChromaDB RAG (document-specific queries)
   * Layer 3: Gemini Flash (complex queries with large context)
   * 
   * Multilingual: Detected at Layer 1, maintained throughout all layers
   */
  async query(req: Request, res: Response): Promise<void> {
    try {
      const {
        query,
        userId = 'default-user',
        sessionId = 'default-session'
      } = req.body as QueryRequest;

      // Validate inputs
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Query is required',
        });
        return;
      }

      console.log(`\n${'='.repeat(80)}`);
      console.log(`💬 NEW QUERY: "${query}"`);
      console.log(`👤 User: ${userId} | Session: ${sessionId}`);
      console.log(`${'='.repeat(80)}\n`);

      // ========== GET CHAT-SPECIFIC CHROMADB COLLECTION ==========
      const chromaCollectionName = await chatService.getChromaCollectionName(userId, sessionId);
      console.log(`📚 ChromaDB Collection: ${chromaCollectionName}`);

      // ========== GET CHAT HISTORY ==========
      const chatHistory = await chatService.getMessages(userId, sessionId);
      console.log(`📜 Chat History: ${chatHistory.length} messages loaded`);

      // ========== SAVE USER MESSAGE ==========
      await chatService.addMessage(userId, sessionId, {
        role: 'user',
        content: query,
      });

      // ========== 🎯 INTELLIGENT ROUTING (ONLINE/OFFLINE) ==========
      const startTime = Date.now();
      const isOfflineMode = env.USE_OFFLINE_MODE === 'offline' || env.USE_OFFLINE_MODE === 'true';

      console.log(`🔧 Mode: ${isOfflineMode ? 'OFFLINE (Ollama)' : 'ONLINE (Groq/Gemini)'}`);

      let result: { answer: string; sources: any[]; layer: string; reasoning: string };

      if (isOfflineMode) {
        // Use Ollama-based offline router
        result = await offlineQueryRouterService.routeQuery(
          query,
          chatHistory,
          chromaCollectionName
        );
      } else {
        // Use online router (Groq/Gemini)
        result = await queryRouterService.routeQuery(
          query,
          chatHistory,
          chromaCollectionName
        );
      }

      const responseTime = Date.now() - startTime;

      console.log(`\n${'─'.repeat(80)}`);
      console.log(`✅ RESPONSE GENERATED`);
      console.log(`🔀 Layer Used: ${result.layer.toUpperCase()}`);
      console.log(`💭 Reasoning: ${result.reasoning}`);
      console.log(`📊 Sources: ${result.sources.length}`);
      console.log(`⏱️  Response Time: ${responseTime}ms`);
      console.log(`${'─'.repeat(80)}\n`);

      // ========== SAVE AI RESPONSE WITH SOURCES ==========
      await chatService.addMessage(userId, sessionId, {
        role: 'assistant',
        content: result.answer,
        sources: result.sources, // Save sources in MongoDB
      });

      // ========== SEND RESPONSE ==========
      const response: QueryResponse = {
        success: true,
        answer: result.answer,
        sources: result.sources,
        metadata: {
          layer: result.layer,
          reasoning: result.reasoning,
          responseTimeMs: responseTime,
          messageCount: chatHistory.length + 2, // +2 for user query and AI response
        }
      };

      res.json(response);
    } catch (error: any) {
      console.error('❌ Query processing error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to process query',
        answer: '',
        sources: [],
      });
    }
  }

  /**
   * Clear chat history for a specific session
   */
  async clearHistory(req: Request, res: Response): Promise<void> {
    try {
      const { userId = 'default-user', sessionId } = req.body;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'sessionId is required',
        });
        return;
      }

      await chatService.clearHistory(userId, sessionId);

      console.log(`🗑️  Cleared chat history for user: ${userId}, session: ${sessionId}`);

      res.json({
        success: true,
        message: 'Chat history cleared',
      });
    } catch (error: any) {
      console.error('Error clearing chat history:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to clear chat history',
      });
    }
  }

  /**
   * Get chat sessions for a user
   */
  async getSessions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.userId as string || 'default-user';

      const sessions = await chatService.getUserSessions(userId);

      res.json({
        success: true,
        sessions,
      });
    } catch (error: any) {
      console.error('Error fetching sessions:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch sessions',
      });
    }
  }

  /**
   * Get messages for a specific session
   */
  async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const { userId = 'default-user', sessionId } = req.query;

      if (!sessionId || typeof sessionId !== 'string') {
        res.status(400).json({
          success: false,
          error: 'sessionId is required',
        });
        return;
      }

      const messages = await chatService.getMessages(userId as string, sessionId);

      res.json({
        success: true,
        messages,
      });
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch messages',
      });
    }
  }

  /**
   * Health check endpoint - includes Ollama status
   */
  async health(req: Request, res: Response): Promise<void> {
    try {
      const stats = await vectorDBService.getStats();
      const isOfflineMode = env.USE_OFFLINE_MODE === 'offline' || env.USE_OFFLINE_MODE === 'true';

      // Check Ollama status if in offline mode
      let ollamaStatus = { chat: false, embedding: false };
      if (isOfflineMode) {
        try {
          ollamaStatus.chat = await ollamaChatService.checkConnection();
          ollamaStatus.embedding = await ollamaEmbeddingService.checkConnection();
        } catch (e) {
          console.warn('Ollama health check failed:', e);
        }
      }

      res.status(200).json({
        success: true,
        status: 'healthy',
        mode: isOfflineMode ? 'offline' : 'online',
        vectorDB: 'connected',
        documentsIndexed: stats.count,
        ollama: isOfflineMode ? {
          available: ollamaStatus.chat && ollamaStatus.embedding,
          chatModel: ollamaStatus.chat ? env.OLLAMA_CHAT_MODEL : 'not available',
          embedModel: ollamaStatus.embedding ? env.OLLAMA_EMBED_MODEL : 'not available',
        } : 'not used (online mode)',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        status: 'unhealthy',
        error: 'Vector database connection failed',
      });
    }
  }
}

export const queryController = new QueryController();

import { Request, Response } from 'express';
import { chatService } from '../services/chat.service';
import { syncRAGPipelineService } from '../services/syncRAGPipeline.service';
import { ollamaChatService } from '../services/ollamaChat.service';
import { ollamaEmbeddingService } from '../services/ollamaEmbedding.service';
import { vectorDBService } from '../services/vectordb.service';
import { QueryRequest } from '../types';

export class QueryController {
  async query(req: Request, res: Response): Promise<void> {
    try {
      const {
        query,
        userId = 'default-user',
        sessionId = 'default-session',
        grade = '10'
      } = req.body as QueryRequest & { grade?: string };

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        res.status(400).json({ success: false, error: 'Query is required' });
        return;
      }

      const startTime = Date.now();

      const chromaCollectionName = await chatService.getChromaCollectionName(userId, sessionId);
      const chatHistory = await chatService.getMessages(userId, sessionId);

      await chatService.addMessage(userId, sessionId, { role: 'user', content: query });

      const result = await syncRAGPipelineService.process(
        query,
        chatHistory,
        chromaCollectionName,
        grade
      );

      await chatService.addMessage(userId, sessionId, {
        role: 'assistant',
        content: result.answer,
        sources: result.sources,
      });

      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        answer: result.answer,
        sources: result.sources,
        thinking: result.thinking,
        metadata: {
          ...result.metadata,
          responseTimeMs: responseTime
        }
      });

    } catch (error: any) {
      console.error('Query error:', error);
      res.status(500).json({ success: false, error: error.message || 'Query failed' });
    }
  }

  async streamQuery(req: Request, res: Response): Promise<void> {
    try {
      const {
        query,
        userId = 'default-user',
        sessionId = 'default-session',
        grade = '10'
      } = req.body as QueryRequest & { grade?: string };

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        res.status(400).json({ error: 'Query is required' });
        return;
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      const chromaCollectionName = await chatService.getChromaCollectionName(userId, sessionId);
      const chatHistory = await chatService.getMessages(userId, sessionId);

      await chatService.addMessage(userId, sessionId, { role: 'user', content: query });

      res.write(`data: ${JSON.stringify({ type: 'layer', layer: 'processing' })}\n\n`);

      const result = await syncRAGPipelineService.process(
        query,
        chatHistory,
        chromaCollectionName,
        grade
      );

      res.write(`data: ${JSON.stringify({ type: 'layer', layer: result.metadata.layer })}\n\n`);

      if (result.thinking) {
        res.write(`data: ${JSON.stringify({ type: 'thinking', thinking: result.thinking })}\n\n`);
      }

      const words = result.answer.split(' ');
      for (let i = 0; i < words.length; i += 3) {
        const chunk = words.slice(i, i + 3).join(' ') + ' ';
        res.write(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`);
        await new Promise(r => setTimeout(r, 20));
      }

      for (const source of result.sources) {
        res.write(`data: ${JSON.stringify({ type: 'source', source })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);

      await chatService.addMessage(userId, sessionId, {
        role: 'assistant',
        content: result.answer,
        sources: result.sources,
      });

      res.end();

    } catch (error: any) {
      console.error('Streaming error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message || 'Streaming failed' })}\n\n`);
      res.end();
    }
  }

  async clearHistory(req: Request, res: Response): Promise<void> {
    try {
      const { userId = 'default-user', sessionId } = req.body;
      if (!sessionId) {
        res.status(400).json({ success: false, error: 'sessionId is required' });
        return;
      }
      await chatService.clearHistory(userId, sessionId);
      res.json({ success: true, message: 'Chat history cleared' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getSessions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.userId as string || 'default-user';
      const sessions = await chatService.getUserSessions(userId);
      res.json({ success: true, sessions });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const { userId = 'default-user', sessionId } = req.query;
      if (!sessionId || typeof sessionId !== 'string') {
        res.status(400).json({ success: false, error: 'sessionId is required' });
        return;
      }
      const messages = await chatService.getMessages(userId as string, sessionId);
      res.json({ success: true, messages });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async health(req: Request, res: Response): Promise<void> {
    try {
      const stats = await vectorDBService.getStats();
      const ollamaChat = await ollamaChatService.checkConnection();
      const ollamaEmbed = await ollamaEmbeddingService.checkConnection();

      res.json({
        success: true,
        status: ollamaChat && ollamaEmbed ? 'healthy' : 'degraded',
        vectorDB: { connected: true, documents: stats.count },
        ollama: {
          chat: ollamaChat,
          embedding: ollamaEmbed,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, status: 'unhealthy' });
    }
  }
}

export const queryController = new QueryController();

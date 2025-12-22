import { Request, Response } from 'express';
import { chatService } from '../services/chat.service';
import { vectorDBService } from '../services/vectordb.service';
import { ollamaChatService } from '../services/ollamaChat.service';
import { ollamaEmbeddingService } from '../services/ollamaEmbedding.service';
import { QueryRequest, QueryResponse } from '../types';


/**
 * Query Controller with AI-Powered Classification
 * Uses Ollama (DeepSeek R1) for intelligent query routing
 */
export class QueryController {

  /**
   * Handle greeting query - quick response
   */
  private async handleGreeting(query: string, chatHistory: any[]): Promise<string> {
    try {
      return await ollamaChatService.handleSimpleQuery(query, "en", chatHistory);
    } catch (error) {
      console.error("Greeting handler error:", error);
      return "Hello! How can I help you today? Feel free to upload documents and ask me questions about them.";
    }
  }

  /**
   * Handle simple query (no RAG needed)
   */
  private async handleSimple(query: string, chatHistory: any[]): Promise<string> {
    try {
      return await ollamaChatService.handleSimpleQuery(query, "en", chatHistory);
    } catch (error) {
      console.error("Simple query handler error:", error);
      return "I'm an AI assistant that helps you understand your documents. Upload PDFs or images and ask me questions about them!";
    }
  }

  /**
   * Handle RAG query - document search + AI response
   */
  private async handleRAG(
    query: string,
    chatHistory: any[],
    chromaCollectionName: string,
    mentionedFileIds?: string[]
  ): Promise<{ answer: string; sources: any[] }> {

    // Check for documents first
    const collection = await vectorDBService.initCollection(chromaCollectionName);
    const docCount = await collection.count();

    if (docCount === 0) {
      return {
        answer: "Please upload some documents first, then ask me questions about them.",
        sources: []
      };
    }

    // Generate embedding and search

    const queryEmbedding = await ollamaEmbeddingService.generateEmbedding(query);


    const searchResults = await vectorDBService.queryChunksWithFilter(
      queryEmbedding, 8, chromaCollectionName, mentionedFileIds
    );

    if (searchResults.documents.length === 0) {
      return {
        answer: "I couldn't find relevant information in your documents. Try rephrasing your question.",
        sources: []
      };
    }

    // Build context and sources
    const context = searchResults.documents.slice(0, 5).join("\n\n---\n\n");
    const sources = searchResults.metadatas.slice(0, 3).map((m: any, idx: number) => ({
      pdfName: m.fileName || "Document",
      pageNo: m.page || 1,
      snippet: searchResults.documents[idx]?.substring(0, 100) || ""
    }));

    // Generate answer

    const result = await ollamaChatService.generateEducationalAnswer(
      context, chatHistory, query, "en", sources
    );

    return { answer: result.answer, sources };
  }

  /**
   * Non-streaming query handler with AI classification
   */
  async query(req: Request, res: Response): Promise<void> {
    try {
      const {
        query,
        userId = 'default-user',
        sessionId = 'default-session',
        mentionedFileIds
      } = req.body as QueryRequest;

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        res.status(400).json({ success: false, error: 'Query is required' });
        return;
      }

      const startTime = Date.now();
      // Query received

      // Get chat context
      const chromaCollectionName = await chatService.getChromaCollectionName(userId, sessionId);
      const chatHistory = await chatService.getMessages(userId, sessionId);

      // Check document count for classification context
      const collection = await vectorDBService.initCollection(chromaCollectionName);
      const docCount = await collection.count();
      const hasDocuments = docCount > 0;

      // Save user message first
      await chatService.addMessage(userId, sessionId, { role: 'user', content: query });

      const classification = await ollamaChatService.classifyQuery(query, hasDocuments, chatHistory);
      // Classification completed

      let answer: string;
      let sources: any[] = [];

      if (classification.type === "GREETING") {

        answer = await this.handleGreeting(query, chatHistory);
      } else if (classification.type === "SIMPLE") {

        answer = await this.handleSimple(query, chatHistory);
      } else {

        const ragResult = await this.handleRAG(query, chatHistory, chromaCollectionName, mentionedFileIds);
        answer = ragResult.answer;
        sources = ragResult.sources;
      }

      // Save response
      await chatService.addMessage(userId, sessionId, {
        role: 'assistant',
        content: answer,
        sources: sources,
      });

      const responseTime = Date.now() - startTime;
      // Response generated

      res.json({
        success: true,
        answer,
        sources,
        metadata: {
          layer: classification.type,
          reason: classification.reason,
          responseTimeMs: responseTime
        }
      });

    } catch (error: any) {
      console.error('Query error:', error);
      res.status(500).json({ success: false, error: error.message || 'Query failed' });
    }
  }

  /**
   * Streaming query handler with AI classification
   */
  async streamQuery(req: Request, res: Response): Promise<void> {
    try {
      const {
        query,
        userId = 'default-user',
        sessionId = 'default-session',
        mentionedFileIds
      } = req.body as QueryRequest;

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        res.status(400).json({ error: 'Query is required' });
        return;
      }

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // Stream query initiated

      // Get chat context
      const chromaCollectionName = await chatService.getChromaCollectionName(userId, sessionId);
      const chatHistory = await chatService.getMessages(userId, sessionId);

      // Check document count
      const collection = await vectorDBService.initCollection(chromaCollectionName);
      const docCount = await collection.count();
      const hasDocuments = docCount > 0;

      // Save user message
      await chatService.addMessage(userId, sessionId, { role: 'user', content: query });

      // Send "analyzing" status
      res.write(`data: ${JSON.stringify({ type: 'layer', layer: 'classifying' })}\n\n`);

      const classification = await ollamaChatService.classifyQuery(query, hasDocuments, chatHistory);
      // Classification completed

      // Send classification result
      res.write(`data: ${JSON.stringify({ type: 'layer', layer: classification.type })}\n\n`);

      let fullAnswer = '';
      let sources: any[] = [];

      if (classification.type === "GREETING" || classification.type === "SIMPLE") {
        try {
          const answer = classification.type === "GREETING"
            ? await this.handleGreeting(query, chatHistory)
            : await this.handleSimple(query, chatHistory);

          // Stream the answer
          const words = answer.split(' ');
          for (let i = 0; i < words.length; i += 2) {
            const chunk = words.slice(i, i + 2).join(' ') + ' ';
            fullAnswer += chunk;
            res.write(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`);
            await new Promise(r => setTimeout(r, 15));
          }
        } catch (error: any) {
          console.error('Handler error:', error);
          fullAnswer = "Hello! How can I help you today?";
          res.write(`data: ${JSON.stringify({ type: 'text', content: fullAnswer })}\n\n`);
        }

        // NO sources for greetings/simple queries
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);

      } else {
        // RAG path
        res.write(`data: ${JSON.stringify({ type: 'layer', layer: 'searching' })}\n\n`);

        if (!hasDocuments) {
          fullAnswer = "Please upload some documents first, then ask me questions about them.";
          res.write(`data: ${JSON.stringify({ type: 'text', content: fullAnswer })}\n\n`);
          res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        } else {
          // Generate embedding and search
          const queryEmbedding = await ollamaEmbeddingService.generateEmbedding(query);
          const searchResults = await vectorDBService.queryChunksWithFilter(
            queryEmbedding, 8, chromaCollectionName, mentionedFileIds
          );

          if (searchResults.documents.length === 0) {
            fullAnswer = "I couldn't find relevant information in your documents.";
            res.write(`data: ${JSON.stringify({ type: 'text', content: fullAnswer })}\n\n`);
            res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
          } else {
            // Build context and sources
            const context = searchResults.documents.slice(0, 5).join("\n\n---\n\n");
            sources = searchResults.metadatas.slice(0, 3).map((m: any, idx: number) => ({
              pdfName: m.fileName || "Document",
              pageNo: m.page || 1,
              snippet: searchResults.documents[idx]?.substring(0, 100) || ""
            }));

            res.write(`data: ${JSON.stringify({ type: 'layer', layer: 'generating' })}\n\n`);

            // Generate answer
            try {
              const result = await ollamaChatService.generateEducationalAnswer(
                context, chatHistory, query, "en", sources
              );

              // Stream the answer
              const words = result.answer.split(' ');
              for (let i = 0; i < words.length; i += 3) {
                const chunk = words.slice(i, i + 3).join(' ') + ' ';
                fullAnswer += chunk;
                res.write(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`);
                await new Promise(r => setTimeout(r, 20));
              }

              // Send sources
              for (const source of sources) {
                res.write(`data: ${JSON.stringify({ type: 'source', source })}\n\n`);
              }

              res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);

            } catch (ollamaError: any) {
              console.error('Ollama error:', ollamaError);
              res.write(`data: ${JSON.stringify({ type: 'error', error: ollamaError.message })}\n\n`);
            }
          }
        }
      }

      // Save response
      if (fullAnswer) {
        await chatService.addMessage(userId, sessionId, {
          role: 'assistant',
          content: fullAnswer,
          sources: sources,
        });
      }

      // Stream complete
      res.end();

    } catch (error: any) {
      console.error('Streaming error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message || 'Streaming failed' })}\n\n`);
      res.end();
    }
  }

  /**
   * Clear chat history
   */
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

  /**
   * Get sessions for user
   */
  async getSessions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.userId as string || 'default-user';
      const sessions = await chatService.getUserSessions(userId);
      res.json({ success: true, sessions });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get messages for session
   */
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

  /**
   * Health check
   */
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

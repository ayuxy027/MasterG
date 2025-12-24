import { ollamaChatService } from "./ollamaChat.service";
import { ollamaEmbeddingService } from "./ollamaEmbedding.service";
import { vectorDBService } from "./vectordb.service";
import { ChatMessage, SourceCitation } from "../types";
import { RAG_CONSTANTS } from "../config/ragConstants";
import { countTokens } from "../utils/tokenCounter";

interface PipelineResult {
  answer: string;
  sources: SourceCitation[];
  thinking?: string;
  metadata: {
    layer: string;
    inputTokens: number;
    outputTokens: number;
    numPredict: number;
    chunksRetrieved: number;
    chunksUsed: number;
  };
}

export class SyncRAGPipelineService {
  async process(
    query: string,
    chatHistory: ChatMessage[],
    chromaCollectionName: string,
    grade: string = "10"
  ): Promise<PipelineResult> {
    // LAYER 1: Classification - Decides query type AND output tokens
    const docCount = await this.getDocumentCount(chromaCollectionName);
    const hasDocuments = docCount > 0;

    const classification = await ollamaChatService.classifyQuery(
      query,
      hasDocuments,
      chatHistory
    );

    console.log(
      `📊 Classification: ${classification.type}, Estimated Output: ${classification.estimatedOutputTokens} tokens`
    );

    // Handle non-RAG queries (GREETING/SIMPLE)
    if (classification.type !== "RAG") {
      const simpleAnswer = await ollamaChatService.handleSimpleQuery(
        query,
        "en",
        chatHistory
      );

      return {
        answer: simpleAnswer,
        sources: [],
        metadata: {
          layer: classification.type,
          inputTokens: countTokens(query),
          outputTokens: countTokens(simpleAnswer),
          numPredict: classification.estimatedOutputTokens,
          chunksRetrieved: 0,
          chunksUsed: 0,
        },
      };
    }

    // LAYER 2: Retrieval - Get relevant chunks
    const queryTokens = countTokens(query);
    const dynamicK = this.calculateDynamicK(queryTokens);

    let contextChunks: Array<{ content: string; metadata: any }> = [];
    let sources: SourceCitation[] = [];

    if (hasDocuments) {
      const queryEmbedding = await ollamaEmbeddingService.generateEmbedding(
        query
      );

      const searchResults = await vectorDBService.queryChunks(
        queryEmbedding,
        dynamicK,
        chromaCollectionName
      );

      if (searchResults.documents && searchResults.documents.length > 0) {
        contextChunks = searchResults.documents.map((doc, idx) => ({
          content: doc,
          metadata: searchResults.metadatas[idx],
        }));

        sources = contextChunks.map((chunk, idx) => ({
          pdfName: chunk.metadata.fileName || "Document",
          pageNo: chunk.metadata.page || 1,
          snippet: chunk.content.substring(0, 150),
        }));
      }
    }

    // LAYER 3: Build prompt with context, using pre-calculated output tokens
    const { prompt, inputTokens } = this.buildOptimizedPrompt(
      query,
      contextChunks,
      chatHistory,
      grade,
      classification.estimatedOutputTokens
    );

    // Validate we have enough space for estimated output
    const availableForOutput =
      RAG_CONSTANTS.LLM_CTX - inputTokens - RAG_CONSTANTS.SAFETY_MARGIN;
    const finalOutputTokens = Math.min(
      classification.estimatedOutputTokens,
      availableForOutput,
      RAG_CONSTANTS.MAX_OUT_MAX
    );

    console.log(
      `📊 Tokens: Input=${inputTokens}, Output=${finalOutputTokens}/${classification.estimatedOutputTokens}, Available=${availableForOutput}`
    );

    // LAYER 4: Generate answer
    const result = await ollamaChatService.generateWithMaxOutput(
      prompt,
      finalOutputTokens
    );

    return {
      answer: result.answer,
      sources,
      thinking: result.thinking,
      metadata: {
        layer: "RAG_FULL",
        inputTokens,
        outputTokens: countTokens(result.answer),
        numPredict: finalOutputTokens,
        chunksRetrieved: contextChunks.length,
        chunksUsed: contextChunks.length,
      },
    };
  }

  private calculateDynamicK(queryTokens: number): number {
    // More aggressive retrieval for complex queries
    // With 32k window, we can afford more chunks for better context
    if (queryTokens < 15) return 4; // Simple questions - fewer chunks
    if (queryTokens < 40) return 8; // Medium questions - moderate chunks
    if (queryTokens < 80) return 12; // Complex questions - more chunks
    return 15; // Very complex - maximum chunks
  }

  private buildOptimizedPrompt(
    query: string,
    chunks: Array<{ content: string; metadata: any }>,
    chatHistory: ChatMessage[],
    grade: string,
    estimatedOutputTokens: number
  ): {
    prompt: string;
    inputTokens: number;
  } {
    const gradeLevel = this.getGradeContext(grade);

    // Calculate available token budget based on estimated output
    const maxPromptTokens =
      RAG_CONSTANTS.LLM_CTX -
      estimatedOutputTokens -
      RAG_CONSTANTS.SAFETY_MARGIN;

    // Build components with token awareness
    const systemPrompt = `You are MasterJi, an educational AI tutor for ${gradeLevel}. Answer comprehensively and explain clearly.`;

    // Recent history (last 3 turns max, ~200 tokens)
    const recentHistory = chatHistory.slice(-3);
    const historyStr =
      recentHistory.length > 0
        ? recentHistory
            .map(
              (m) =>
                `${m.role === "user" ? "Q" : "A"}: ${m.content.substring(
                  0,
                  150
                )}`
            )
            .join("\n")
        : "";

    // Context with token limit (~80% of available space)
    let contextStr = "";
    if (chunks.length > 0) {
      const maxContextTokens = Math.floor(maxPromptTokens * 0.75);
      let contextTokens = 0;
      const selectedChunks: string[] = [];

      for (const chunk of chunks) {
        const chunkText = chunk.content;
        const chunkTokens = countTokens(chunkText);

        if (contextTokens + chunkTokens <= maxContextTokens) {
          selectedChunks.push(chunkText);
          contextTokens += chunkTokens;
        } else {
          // Add partial chunk if space remains
          const remainingTokens = maxContextTokens - contextTokens;
          if (remainingTokens > 100) {
            const partialText = chunkText.substring(0, remainingTokens * 4);
            selectedChunks.push(partialText + "...");
          }
          break;
        }
      }

      contextStr = selectedChunks.join("\n\n");
    }

    // Build final prompt - QUERY AT THE END (most important)
    let basePrompt = "";

    if (contextStr) {
      basePrompt = `${systemPrompt}

CONTEXT:
${contextStr}

${historyStr ? `RECENT:\n${historyStr}\n\n` : ""}QUESTION: ${query}

Answer thoroughly using the context above. Be clear and educational.

ANSWER:`;
    } else {
      basePrompt = `${systemPrompt}

${historyStr ? `RECENT:\n${historyStr}\n\n` : ""}QUESTION: ${query}

Answer this educational question clearly and thoroughly.

ANSWER:`;
    }

    const promptTokens = countTokens(basePrompt);

    console.log(
      `📊 Prompt: ${promptTokens} tokens, Context: ${chunks.length} chunks`
    );

    return {
      prompt: basePrompt,
      inputTokens: promptTokens,
    };
  }

  private getGradeContext(grade: string): string {
    const gradeNum = parseInt(grade);

    if (gradeNum >= 1 && gradeNum <= 5)
      return "Grade " + grade + " (Elementary)";
    if (gradeNum >= 6 && gradeNum <= 8)
      return "Grade " + grade + " (Middle School)";
    if (gradeNum >= 9 && gradeNum <= 12)
      return "Grade " + grade + " (High School)";
    if (grade.toLowerCase() === "undergrad") return "Undergraduate level";
    if (grade.toLowerCase() === "grad") return "Graduate level";

    return "Grade 10 (High School)";
  }

  private async getDocumentCount(collectionName: string): Promise<number> {
    try {
      const collection = await vectorDBService.initCollection(collectionName);
      return await collection.count();
    } catch (error) {
      return 0;
    }
  }
}

export const syncRAGPipelineService = new SyncRAGPipelineService();

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

        const docCount = await this.getDocumentCount(chromaCollectionName);
        const hasDocuments = docCount > 0;

        const classification = await ollamaChatService.classifyQuery(
            query,
            hasDocuments,
            chatHistory
        );

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
                    numPredict: 150,
                    chunksRetrieved: 0,
                    chunksUsed: 0,
                },
            };
        }

        const queryTokens = countTokens(query);
        const dynamicK = this.calculateDynamicK(queryTokens);

        let contextChunks: Array<{ content: string; metadata: any }> = [];
        let sources: SourceCitation[] = [];

        if (hasDocuments) {
            const queryEmbedding = await ollamaEmbeddingService.generateEmbedding(query);

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

        const { prompt, inputTokens, maxOutputTokens } = this.buildOptimizedPrompt(
            query,
            contextChunks,
            chatHistory,
            grade
        );

        const result = await ollamaChatService.generateWithMaxOutput(
            prompt,
            maxOutputTokens
        );

        return {
            answer: result.answer,
            sources,
            thinking: result.thinking,
            metadata: {
                layer: "RAG_FULL",
                inputTokens,
                outputTokens: countTokens(result.answer),
                numPredict: maxOutputTokens,
                chunksRetrieved: contextChunks.length,
                chunksUsed: contextChunks.length,
            },
        };
    }

    private calculateDynamicK(queryTokens: number): number {
        if (queryTokens < 20) return 3;
        if (queryTokens < 50) return 6;
        if (queryTokens < 100) return 10;
        return 15;
    }

    private buildOptimizedPrompt(
        query: string,
        chunks: Array<{ content: string; metadata: any }>,
        chatHistory: ChatMessage[],
        grade: string
    ): {
        prompt: string;
        inputTokens: number;
        maxOutputTokens: number;
    } {
        const gradeContext = this.getGradeContext(grade);

        const historyLimit = RAG_CONSTANTS.HISTORY_TURNS;
        const recentHistory = chatHistory.slice(-historyLimit);
        const historyStr = recentHistory.length > 0
            ? recentHistory.map(m => `${m.role === "user" ? "Student" : "MasterJi"}: ${m.content}`).join("\n")
            : "";

        let contextStr = "";
        if (chunks.length > 0) {
            contextStr = chunks
                .map((chunk, idx) => `[Source ${idx + 1}: ${chunk.metadata.fileName}]\n${chunk.content}`)
                .join("\n\n---\n\n");
        }

        let basePrompt = "";

        if (chunks.length > 0) {
            basePrompt = `<|User|>You are MasterJi, an expert educational AI tutor for ${gradeContext}.

DOCUMENT CONTEXT:
${contextStr}

${historyStr ? `CONVERSATION HISTORY:\n${historyStr}\n\n` : ""}STUDENT QUESTION: ${query}

CRITICAL INSTRUCTIONS - FOLLOW ALL OF THESE:
1. Provide a COMPREHENSIVE, DETAILED, and THOROUGH answer
2. Explain ALL relevant concepts from the document context in depth
3. Include examples, explanations, and elaborations
4. Write AT LEAST 500 words - this should be a detailed explanation
5. Break down complex ideas into clear, digestible parts
6. Use the document context extensively
7. DO NOT mention page numbers or source numbers
8. Be educational, engaging, and complete
9. Do NOT stop until you've fully explained everything
10. Think of this as writing a detailed study guide

BEGIN YOUR COMPREHENSIVE, DETAILED ANSWER (aim for 500+ words):<|Assistant|>`;
        } else {
            basePrompt = `<|User|>You are MasterJi, an expert educational AI tutor for ${gradeContext}.

${historyStr ? `CONVERSATION HISTORY:\n${historyStr}\n\n` : ""}STUDENT QUESTION: ${query}

CRITICAL INSTRUCTIONS - FOLLOW ALL OF THESE:
1. Provide a COMPREHENSIVE, DETAILED, and THOROUGH answer
2. Explain the topic in depth with examples and context
3. Write AT LEAST 500 WORDS - this should be a detailed explanation
4. Break down concepts clearly for ${gradeContext}
5. Be educational, engaging, and complete
6. Do NOT stop until you've fully covered the topic
7. Include background, explanations, and applications

BEGIN YOUR COMPREHENSIVE, DETAILED ANSWER (aim for 500+ words):<|Assistant|>`;
        }

        let promptTokens = countTokens(basePrompt);

        if (promptTokens > RAG_CONSTANTS.LLM_CTX - RAG_CONSTANTS.MAX_OUT_MIN - RAG_CONSTANTS.SAFETY_MARGIN) {
            const reducedContext = chunks.slice(0, Math.min(3, chunks.length))
                .map((chunk, idx) => `[Source ${idx + 1}]\n${chunk.content.substring(0, 1000)}`)
                .join("\n\n---\n\n");

            basePrompt = `<|User|>You are MasterJi. Grade: ${gradeContext}

${reducedContext ? `CONTEXT:\n${reducedContext}\n\n` : ""}${historyStr ? `HISTORY:\n${historyStr.substring(0, 500)}\n\n` : ""}QUESTION: ${query}

Provide a DETAILED, COMPREHENSIVE answer (500+ words). DO NOT mention page/source numbers.

DETAILED ANSWER:<|Assistant|>`;

            promptTokens = countTokens(basePrompt);
        }

        const finalMaxOutput = Math.max(
            RAG_CONSTANTS.MAX_OUT_MIN,
            Math.min(
                RAG_CONSTANTS.MAX_OUT_MAX,
                RAG_CONSTANTS.LLM_CTX - promptTokens - RAG_CONSTANTS.SAFETY_MARGIN
            )
        );

        console.log(`📊 Token Budget: Prompt=${promptTokens}, Available=${RAG_CONSTANTS.LLM_CTX - promptTokens - RAG_CONSTANTS.SAFETY_MARGIN}, Final num_predict=${finalMaxOutput}`);

        return {
            prompt: basePrompt,
            inputTokens: promptTokens,
            maxOutputTokens: finalMaxOutput,
        };
    }

    private getGradeContext(grade: string): string {
        const gradeNum = parseInt(grade);

        if (gradeNum >= 1 && gradeNum <= 5) return "Grade " + grade + " (Elementary)";
        if (gradeNum >= 6 && gradeNum <= 8) return "Grade " + grade + " (Middle School)";
        if (gradeNum >= 9 && gradeNum <= 12) return "Grade " + grade + " (High School)";
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

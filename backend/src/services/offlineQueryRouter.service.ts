import { ollamaChatService } from "./ollamaChat.service";
import { ollamaEmbeddingService } from "./ollamaEmbedding.service";
import { vectorDBService } from "./vectordb.service";
import { documentService } from "./document.service";
import { languageService } from "./language.service";
import { ChatMessage } from "../types";
import { LanguageCode, SUPPORTED_LANGUAGES } from "../config/constants";

export interface QueryDecision {
    shouldStopAtLayer1: boolean;
    isAbusive: boolean;
    isChatHistoryOnly: boolean;
    hasPageNumber: boolean;
    pageNumber?: number;
    isGreeting: boolean;
    reason: string;
}

/**
 * Offline Query Router Service
 * Uses Ollama (DeepSeek R1 + EmbeddingGemma) for completely offline operation
 * 
 * Architecture:
 * - Layer 1: Simple queries → DeepSeek R1 (fast)
 * - Layer 2: RAG queries → ChromaDB + DeepSeek R1
 */
export class OfflineQueryRouterService {
    /**
     * LAYER 1: Gate Keeper & Intent Analyzer
     * Uses local DeepSeek R1 for classification
     */
    async analyzeQuery(
        query: string,
        chatHistory: ChatMessage[]
    ): Promise<QueryDecision> {
        try {
            const prompt = `Analyze this user query and classify it:

Query: "${query}"

Recent Chat: ${chatHistory
                    .slice(-3)
                    .map((m) => `${m.role}: ${m.content}`)
                    .join("\n")}

Classify and extract information (JSON format):
{
  "isGreeting": true/false,
  "isAbusive": true/false,
  "isChatHistoryOnly": true/false,
  "hasPageNumber": true/false,
  "pageNumber": number or null,
  "needsDocuments": true/false,
  "reason": "brief explanation"
}

Examples:
- "hi" → isGreeting: true, needsDocuments: false
- "you idiot" → isAbusive: true
- "what did you just say?" → isChatHistoryOnly: true
- "what is on page 5?" → hasPageNumber: true, pageNumber: 5
- "explain photosynthesis" → needsDocuments: true

Response (JSON only):`;

            const response = await ollamaChatService.chatCompletion(
                [{ role: "user", content: prompt }],
                "json_object"
            );

            const analysis = JSON.parse(response);

            const shouldStop =
                (analysis.isGreeting ||
                    analysis.isAbusive ||
                    analysis.isChatHistoryOnly) &&
                !analysis.needsDocuments;

            return {
                shouldStopAtLayer1: shouldStop,
                isAbusive: analysis.isAbusive || false,
                isChatHistoryOnly: analysis.isChatHistoryOnly || false,
                hasPageNumber: analysis.hasPageNumber || false,
                pageNumber: analysis.pageNumber || undefined,
                isGreeting: analysis.isGreeting || false,
                reason: analysis.reason || "Query analysis complete",
            };
        } catch (error) {
            console.error("Query analysis error:", error);
            return {
                shouldStopAtLayer1: false,
                isAbusive: false,
                isChatHistoryOnly: false,
                hasPageNumber: false,
                isGreeting: false,
                reason: "Analysis failed, proceeding to document search",
            };
        }
    }

    /**
     * LAYER 1 Handler: Simple/fast response using DeepSeek R1
     */
    async handleSimpleQuery(
        query: string,
        language: LanguageCode,
        chatHistory: ChatMessage[]
    ): Promise<string> {
        return ollamaChatService.handleSimpleQuery(query, language, chatHistory);
    }

    /**
     * LAYER 2 Handler: RAG with ChromaDB + DeepSeek R1
     * Document-specific queries with vector search
     */
    async handleDocumentQuery(
        query: string,
        language: LanguageCode,
        chatHistory: ChatMessage[],
        chromaCollectionName: string
    ): Promise<{ answer: string; sources: any[] }> {
        const languageName = SUPPORTED_LANGUAGES[language];

        // 1. Generate query embedding using Ollama
        console.log("🔍 Generating query embedding with Ollama...");
        console.log(`   Query: "${query}"`);
        console.log(`   Collection: ${chromaCollectionName}`);

        let queryEmbedding: number[];
        try {
            queryEmbedding = await ollamaEmbeddingService.generateEmbedding(query);
            console.log(`   ✅ Embedding generated (${queryEmbedding.length} dimensions)`);
        } catch (embeddingError: any) {
            console.error("❌ Embedding generation failed:", embeddingError.message);
            return {
                answer: "Failed to generate embedding. Please ensure Ollama is running with the embedding model.",
                sources: [],
            };
        }

        // 2. Search ChromaDB
        console.log("📚 Searching ChromaDB...");
        let searchResults;
        try {
            searchResults = await vectorDBService.queryChunks(
                queryEmbedding,
                10, // Get more results to debug
                chromaCollectionName
            );
            console.log(`   📊 Found ${searchResults.documents.length} chunks in ChromaDB`);
        } catch (searchError: any) {
            console.error("❌ ChromaDB search failed:", searchError.message);
            return {
                answer: "Failed to search documents. Please check ChromaDB connection.",
                sources: [],
            };
        }

        // Debug: Log all distances
        if (searchResults.documents.length > 0) {
            console.log("   📏 Distances:");
            searchResults.documents.forEach((doc, idx) => {
                const distance = searchResults.distances[idx];
                const fileName = searchResults.metadatas[idx]?.fileName || "unknown";
                const page = searchResults.metadatas[idx]?.page || 1;
                console.log(`      [${idx + 1}] ${fileName} Page ${page}: distance=${distance.toFixed(4)}`);
            });

            // Check for embedding mismatch (all distances very high)
            const avgDistance = searchResults.distances.reduce((a, b) => a + b, 0) / searchResults.distances.length;
            if (avgDistance > 1.5) {
                console.warn("\n   ⚠️ WARNING: High distances detected!");
                console.warn("   This may indicate embedding dimension mismatch.");
                console.warn("   Documents may have been uploaded with a different embedding model.");
                console.warn("   Try re-uploading your documents in offline mode.\n");
            }
        } else {
            console.log("   ⚠️ No documents found in collection!");
            console.log("   Either upload a PDF or check if the collection name is correct.");
            return {
                answer: language === "en"
                    ? "No documents found in this session. Please upload a PDF first."
                    : "इस सत्र में कोई दस्तावेज़ नहीं मिला। कृपया पहले एक PDF अपलोड करें।",
                sources: [],
            };
        }

        // 3. Use ALL results (no distance filtering for now - let's see what we get)
        // Different embedding models produce different distance scales
        const allChunks = searchResults.documents
            .map((doc, idx) => ({
                document: doc,
                metadata: searchResults.metadatas[idx],
                distance: searchResults.distances[idx],
            }))
            .slice(0, 5); // Take top 5

        console.log(`   ✅ Using ${allChunks.length} chunks (no distance filter for debugging)`);

        if (allChunks.length === 0) {
            return {
                answer:
                    language === "en"
                        ? "I couldn't find relevant information in your documents. Could you rephrase your question?"
                        : `मुझे आपके दस्तावेज़ों में प्रासंगिक जानकारी नहीं मिली। क्या आप अपना प्रश्न दोबारा लिख सकते हैं?`,
                sources: [],
            };
        }

        // 4. Build context
        const documentContext = allChunks
            .map((r) => r.document)
            .join("\n\n---\n\n");

        console.log(`   📄 Context length: ${documentContext.length} characters`);

        // 5. Get sources - SORTED by distance (lowest = most relevant = first)
        const sources = allChunks
            .slice(0, 3)
            .sort((a, b) => a.distance - b.distance) // Sort by distance: lowest first
            .map((r) => ({
                pdfName: r.metadata.fileName || "Unknown",
                pageNo: r.metadata.page || 1,
                snippet: r.document.substring(0, 100),
                score: (1 - r.distance).toFixed(2),
            }));

        console.log(
            `📖 Top ${sources.length} Sources (most relevant first): ${sources
                .map(
                    (s, i) =>
                        `[${i + 1}] ${s.pdfName} Page ${s.pageNo} (${Math.round(
                            parseFloat(s.score) * 100
                        )}%)`
                )
                .join(", ")}`
        );

        // 6. Generate answer with DeepSeek R1
        console.log("🤖 Generating answer with DeepSeek R1...");
        const answer = await ollamaChatService.generateEducationalAnswer(
            documentContext,
            chatHistory,
            query,
            language,
            sources
        );

        return {
            answer: answer.answer,
            sources,
        };
    }

    /**
     * LAYER 2+ Handler: Complex queries with full document context
     * For larger documents or complex queries
     */
    async handleComplexQuery(
        query: string,
        language: LanguageCode,
        chatHistory: ChatMessage[],
        chromaCollectionName: string
    ): Promise<{ answer: string; sources: any[]; strategy?: string }> {
        try {
            // 1. Get query embedding
            console.log("🔍 Generating query embedding for complex query...");
            const queryEmbedding = await ollamaEmbeddingService.generateEmbedding(query);

            // 2. Search ChromaDB
            const searchResults = await vectorDBService.queryChunks(
                queryEmbedding,
                10,
                chromaCollectionName
            );

            // 3. Get unique fileIds
            const fileIds = [
                ...new Set(searchResults.metadatas.map((m) => m.fileId)),
            ];

            if (fileIds.length === 0) {
                return {
                    answer:
                        language === "en"
                            ? "I couldn't find any relevant documents. Please upload documents first."
                            : "मुझे कोई प्रासंगिक दस्तावेज़ नहीं मिला। कृपया पहले दस्तावेज़ अपलोड करें।",
                    sources: [],
                    strategy: "NO_DOCUMENTS",
                };
            }

            // 4. Get full document content
            const pagesMap = await documentService.getPagesByFileIds(fileIds);

            const totalPages = Array.from(pagesMap.values()).reduce(
                (sum, pages) => sum + pages.length,
                0
            );

            console.log(`📊 Document Stats: ${fileIds.length} files, ${totalPages} total pages`);

            // 5. Combine documents for full context
            const fullContent = this.combineDocuments(pagesMap);
            const firstFileId = fileIds[0];
            const firstFileName =
                searchResults.metadatas.find((m) => m.fileId === firstFileId)?.fileName ||
                "Document";

            // 6. Query with full document context using DeepSeek R1
            console.log("🧠 Querying with full document context...");
            const result = await ollamaChatService.queryWithFullDocument(
                query,
                fullContent,
                language,
                chatHistory,
                {
                    fileName: firstFileName,
                    totalPages,
                }
            );

            // 7. Build sources
            const sources = searchResults.documents
                .map((doc, idx) => ({
                    pdfName: searchResults.metadatas[idx].fileName,
                    pageNo: searchResults.metadatas[idx].page || 1,
                    snippet: doc.substring(0, 100),
                    distance: searchResults.distances[idx],
                    score: (1 - searchResults.distances[idx]).toFixed(2),
                }))
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 3)
                .reverse()
                .map(({ distance, ...rest }) => rest);

            // 8. Check if answer indicates "not found"
            if (this.isNotFoundInDocument(result.answer)) {
                console.log(`⚠️ Answer indicates information not in document - removing sources`);
                return {
                    answer: result.answer,
                    sources: [],
                    strategy: result.strategy,
                };
            }

            console.log(`✅ Answer generated using ${result.strategy}`);

            return {
                answer: result.answer,
                sources,
                strategy: result.strategy,
            };
        } catch (error: any) {
            console.error("❌ Complex query handler error:", error.message);

            // Fallback to simple RAG
            console.log("🔄 Falling back to simple RAG...");
            return await this.handleDocumentQuery(
                query,
                language,
                chatHistory,
                chromaCollectionName
            );
        }
    }

    /**
     * Helper: Combine documents into single string
     */
    private combineDocuments(
        pagesMap: Map<string, Array<{ pageNumber: number; content: string }>>
    ): string {
        const allContent: string[] = [];

        for (const [fileId, pages] of pagesMap.entries()) {
            const sortedPages = pages.sort((a, b) => a.pageNumber - b.pageNumber);
            const fileContent = sortedPages
                .map((p) => `[Page ${p.pageNumber}]\n${p.content}`)
                .join("\n\n");
            allContent.push(fileContent);
        }

        return allContent.join("\n\n=== DOCUMENT BREAK ===\n\n");
    }

    /**
     * Helper: Detect if answer indicates information not found
     */
    private isNotFoundInDocument(answer: string): boolean {
        const notFoundPatterns = [
            /not mentioned in.*document/i,
            /cannot find.*in.*document/i,
            /not available in.*document/i,
            /couldn't find.*in.*document/i,
            /no information.*in.*document/i,
            /not.*in the provided document/i,
            /दस्तावेज़ में नहीं मिला/i,
            /दस्तावेज़ में उल्लेख नहीं/i,
        ];

        return notFoundPatterns.some((pattern) => pattern.test(answer));
    }

    /**
     * Helper: Check if query is complex
     */
    private isComplexQuery(query: string): boolean {
        const complexPatterns = [
            /compare.*and/i,
            /difference.*between/i,
            /summarize.*chapter.*and/i,
            /explain.*considering/i,
            /relate.*to/i,
            /contrast/i,
            /both.*and/i,
            /first.*then/i,
        ];

        return complexPatterns.some((pattern) => pattern.test(query));
    }

    /**
     * Main routing method - OFFLINE VERSION (SIMPLIFIED)
     * Skip slow LLM-based analysis, use simple heuristics instead
     */
    async routeQuery(
        query: string,
        chatHistory: ChatMessage[],
        chromaCollectionName: string
    ): Promise<{
        answer: string;
        sources: any[];
        layer: string;
        reasoning: string;
    }> {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📥 OFFLINE QUERY: "${query}"`);
        console.log(`   Collection: ${chromaCollectionName}`);
        console.log(`${'='.repeat(60)}`);

        // 1. Detect language
        const detectedLang = languageService.detectLanguage(query);
        const language = detectedLang.languageCode as LanguageCode;
        console.log(`🌐 Language: ${detectedLang.language} (${language})`);

        // 2. Simple greeting detection (no LLM needed - much faster!)
        const greetingPatterns = [
            /^(hi|hello|hey|hola|namaste|namaskar)\b/i,
            /^(good\s*(morning|afternoon|evening|night))/i,
            /^(thanks|thank\s*you|thx)\b/i,
            /^(bye|goodbye|see\s*you)\b/i,
        ];
        const isSimpleGreeting = greetingPatterns.some(p => p.test(query.trim()));

        let result: { answer: string; sources: any[] };
        let usedLayer: string;
        let reasoning: string;

        if (isSimpleGreeting) {
            // Layer 1: Handle greetings quickly
            console.log(`🎯 Routing: LAYER1 (greeting detected)`);
            const simpleAnswer = await this.handleSimpleQuery(query, language, chatHistory);
            result = { answer: simpleAnswer, sources: [] };
            usedLayer = "LAYER1-DEEPSEEK-FAST";
            reasoning = "Simple greeting detected";
        } else {
            // Layer 2: ALWAYS search documents for educational queries
            console.log(`🎯 Routing: LAYER2 (document search)`);
            reasoning = "Educational query - searching documents";

            try {
                result = await this.handleDocumentQuery(
                    query,
                    language,
                    chatHistory,
                    chromaCollectionName
                );
                usedLayer = "LAYER2-DEEPSEEK-RAG";
            } catch (error: any) {
                console.error("❌ Document query failed:", error.message);
                // Fallback to simple response
                const fallbackAnswer = await this.handleSimpleQuery(query, language, chatHistory);
                result = { answer: fallbackAnswer, sources: [] };
                usedLayer = "LAYER1-FALLBACK";
                reasoning = `Document search failed: ${error.message}`;
            }
        }

        // 3. Clean any intermediate messages
        const cleanedAnswer = this.cleanIntermediateMessages(result.answer);

        console.log(`\n${'─'.repeat(60)}`);
        console.log(`✅ Response ready (${usedLayer})`);
        console.log(`   Sources: ${result.sources.length}`);
        console.log(`${'─'.repeat(60)}\n`);

        return {
            answer: cleanedAnswer,
            sources: result.sources,
            layer: usedLayer,
            reasoning,
        };
    }

    /**
     * Helper: Clean intermediate thinking from response
     */
    private cleanIntermediateMessages(answer: string): string {
        const intermediatePatterns = [
            /^Let me search.*?\.\s*/i,
            /^I'm searching.*?\.\s*/i,
            /^I'm analyzing.*?\.\s*/i,
            /^I'm looking.*?\.\s*/i,
            /^Searching the document.*?\.\s*/i,
            /^Looking through.*?\.\s*/i,
            /^Let me check.*?\.\s*/i,
            /^मुझे खोजने दें.*?\.\s*/i,
            /^मैं खोज रहा हूं.*?\.\s*/i,
        ];

        let cleaned = answer;
        for (const pattern of intermediatePatterns) {
            cleaned = cleaned.replace(pattern, "");
        }

        return cleaned.trim();
    }
}

export const offlineQueryRouterService = new OfflineQueryRouterService();

import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import env from "../config/env";
import type { Topic, DocumentAnalysis } from "../types/topic.types";
import { DocumentAnalysisModel } from "../models/documentAnalysis.model";
import { TopicProgressModel } from "../models/topicProgress.model";
import { chatService } from "./chat.service";
import { vectorDBService } from "./vectordb.service";

// Ollama API Configuration (offline)
const OLLAMA_URL = env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = env.OLLAMA_CHAT_MODEL || "deepseek-r1:1.5b";

// Simpler prompt for smaller models
const TOPIC_EXTRACTION_PROMPT = `TASK: Extract learning topics from this document as a JSON array.

RESPONSE FORMAT (return ONLY this JSON, nothing else):
[{"title":"Topic Name","description":"Brief description","difficulty":"easy|medium|hard","estimatedMinutes":30}]

Rules:
- Return 3-8 topics
- Each topic needs: title, description, difficulty, estimatedMinutes
- difficulty must be "easy", "medium", or "hard"
- estimatedMinutes must be a number between 15-120
- Output ONLY valid JSON array, no other text

DOCUMENT:
`;

/**
 * Generate fallback topics from document content when AI fails
 * Uses simple heuristics to identify section headings and key content
 */
function generateFallbackTopics(documentContent: string, documentName: string): Topic[] {
    console.log("📊 Generating fallback topics from document structure...");

    // Try to find section headings (patterns like "Chapter X", "Section X", numbered headings, etc.)
    const headingPatterns = [
        /^#+\s*(.+)$/gm,                           // Markdown headings
        /^(Chapter|Section|Unit|Module|Part)\s*[\d.:]+\s*[:\-–]?\s*(.+)/gim,  // Chapter/Section formats
        /^\d+[.\)]\s*([A-Z][^.!?\n]{10,60})$/gm,  // Numbered headings
        /^([A-Z][A-Z\s]{5,40})$/gm,                // ALL CAPS headings
    ];

    const topics: Topic[] = [];
    const foundHeadings: string[] = [];

    // Extract headings from content
    for (const pattern of headingPatterns) {
        const matches = documentContent.matchAll(pattern);
        for (const match of matches) {
            const heading = (match[2] || match[1] || "").trim();
            if (heading && heading.length > 3 && heading.length < 100) {
                // Avoid duplicates
                if (!foundHeadings.some(h => h.toLowerCase() === heading.toLowerCase())) {
                    foundHeadings.push(heading);
                }
            }
        }
        if (foundHeadings.length >= 8) break;
    }

    // If we found headings, create topics from them
    if (foundHeadings.length >= 2) {
        foundHeadings.slice(0, 8).forEach((heading, idx) => {
            topics.push({
                id: uuidv4(),
                title: heading.substring(0, 50),
                description: `Learn about ${heading.toLowerCase()}`,
                difficulty: idx < 2 ? "easy" : idx < 5 ? "medium" : "hard",
                estimatedMinutes: 30 + (idx * 10),
                pageRange: { start: idx + 1, end: idx + 3 },
                keyConceptsList: [],
                suggestedPrompts: [
                    `Explain ${heading}`,
                    `What are the key concepts in ${heading}?`,
                    `Summarize ${heading}`
                ],
                prerequisites: idx > 0 ? [foundHeadings[idx - 1].substring(0, 50)] : []
            });
        });
    } else {
        // No headings found - create generic topics based on document name and content
        const docBaseName = documentName.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");

        topics.push(
            {
                id: uuidv4(),
                title: `Introduction to ${docBaseName}`,
                description: `Overview and foundational concepts of ${docBaseName}`,
                difficulty: "easy",
                estimatedMinutes: 25,
                pageRange: { start: 1, end: 3 },
                keyConceptsList: ["basics", "introduction", "overview"],
                suggestedPrompts: [
                    `What is ${docBaseName} about?`,
                    "Explain the main concepts",
                    "Give an overview"
                ],
                prerequisites: []
            },
            {
                id: uuidv4(),
                title: `Core Concepts`,
                description: `Main topics and detailed explanations`,
                difficulty: "medium",
                estimatedMinutes: 45,
                pageRange: { start: 4, end: 10 },
                keyConceptsList: ["core", "concepts", "details"],
                suggestedPrompts: [
                    "Explain the core concepts in detail",
                    "What are the main topics covered?",
                    "How do these concepts relate?"
                ],
                prerequisites: [`Introduction to ${docBaseName}`]
            },
            {
                id: uuidv4(),
                title: `Practice & Applications`,
                description: `Exercises, examples, and practical applications`,
                difficulty: "medium",
                estimatedMinutes: 40,
                pageRange: { start: 11, end: 15 },
                keyConceptsList: ["practice", "examples", "applications"],
                suggestedPrompts: [
                    "Show me some examples",
                    "How to apply these concepts?",
                    "What are some practice problems?"
                ],
                prerequisites: ["Core Concepts"]
            },
            {
                id: uuidv4(),
                title: `Summary & Review`,
                description: `Review of key points and important takeaways`,
                difficulty: "easy",
                estimatedMinutes: 20,
                pageRange: { start: 16, end: 20 },
                keyConceptsList: ["summary", "review", "key points"],
                suggestedPrompts: [
                    "Summarize the key points",
                    "What should I remember?",
                    "Review the main concepts"
                ],
                prerequisites: ["Practice & Applications"]
            }
        );
    }

    console.log(`✅ Generated ${topics.length} fallback topics`);
    return topics;
}

/**
 * Get document chunks from ChromaDB using the proper service methods
 */
async function getDocumentChunks(
    userId: string,
    sessionId: string,
    fileId: string
): Promise<{ text: string; pageNo: number }[]> {
    try {
        // Get the correct collection name using chatService (same as browse controller)
        const collectionName = await chatService.getChromaCollectionName(userId, sessionId);

        console.log(`🔍 Looking for document ${fileId} in collection ${collectionName}`);

        // Use vectorDBService.getDocumentsByFileId which is proven to work
        const result = await vectorDBService.getDocumentsByFileId(fileId, collectionName);

        console.log(`📦 Found ${result.documents?.length || 0} chunks for fileId ${fileId}`);

        if (!result.documents || result.documents.length === 0) {
            console.log(`No chunks found for fileId ${fileId} in collection ${collectionName}`);
            return [];
        }

        // Combine documents with metadata
        const chunks: { text: string; pageNo: number }[] = [];
        for (let i = 0; i < result.documents.length; i++) {
            const doc = result.documents[i];
            const metadata = result.metadatas?.[i];
            if (doc) {
                chunks.push({
                    text: doc,
                    // Try different page number field names
                    pageNo: (metadata as any)?.pageNo || (metadata as any)?.page || 1,
                });
            }
        }

        // Sort by page number
        chunks.sort((a, b) => a.pageNo - b.pageNo);

        return chunks;
    } catch (error) {
        console.error("Error fetching document chunks:", error);
        throw error;
    }
}

/**
 * Parse response from Ollama/DeepSeek - removes thinking tags if present
 */
function parseOllamaResponse(response: string): string {
    // Check for <think> tags (DeepSeek R1 format)
    const thinkMatch = response.match(/<think>[\s\S]*?<\/think>/);
    if (thinkMatch) {
        return response.replace(/<think>[\s\S]*?<\/think>/, "").trim();
    }
    return response.trim();
}

/**
 * Extract topics from document content using Ollama (offline)
 */
async function extractTopicsWithAI(
    documentContent: string,
    documentName: string
): Promise<Topic[]> {
    try {
        // Truncate content if too long (local models have smaller context)
        const maxContentLength = 15000; // Smaller for local models
        const truncatedContent = documentContent.length > maxContentLength
            ? documentContent.substring(0, maxContentLength) + "\n\n[Content truncated for analysis...]"
            : documentContent;

        const prompt = TOPIC_EXTRACTION_PROMPT + truncatedContent;

        console.log(`🤖 Extracting topics using Ollama (${OLLAMA_MODEL})...`);
        console.log(`📝 Prompt length: ${prompt.length} characters`);

        const response = await axios.post(
            `${OLLAMA_URL}/api/generate`,
            {
                model: OLLAMA_MODEL,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.7,
                    num_predict: 4096,
                    top_p: 0.95,
                },
            },
            {
                headers: { "Content-Type": "application/json" },
                timeout: 300000, // 5 minutes for local model (large documents take time)
            }
        );

        // Debug: Log what we received
        console.log(`📡 Ollama response status: ${response.status}`);
        console.log(`📡 Ollama response keys:`, Object.keys(response.data));

        // Try multiple ways to get the response text
        let responseText = response.data.response || response.data.content || response.data.message?.content;

        if (!responseText && response.data.choices && response.data.choices[0]) {
            responseText = response.data.choices[0].message?.content || response.data.choices[0].text;
        }

        if (!responseText) {
            console.error("❌ Full Ollama response:", JSON.stringify(response.data, null, 2).substring(0, 500));
            throw new Error("No response from Ollama - check if model is loaded");
        }

        console.log(`✅ Got response from Ollama (${responseText.length} chars)`);

        // Parse response and remove thinking tags
        let text = parseOllamaResponse(responseText);

        // Parse JSON response
        let topics: Topic[];
        try {
            // Clean up response - remove markdown code blocks if present
            let cleanText = text.trim();
            if (cleanText.startsWith("```json")) {
                cleanText = cleanText.slice(7);
            }
            if (cleanText.startsWith("```")) {
                cleanText = cleanText.slice(3);
            }
            if (cleanText.endsWith("```")) {
                cleanText = cleanText.slice(0, -3);
            }
            cleanText = cleanText.trim();

            // Try to find JSON array in the response
            const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                cleanText = jsonMatch[0];
            }

            topics = JSON.parse(cleanText);
        } catch (parseError) {
            console.warn("⚠️ AI did not return valid JSON, using fallback topic extraction");
            console.log("AI response was:", text.substring(0, 200) + "...");
            // Use fallback when AI doesn't return proper JSON
            return generateFallbackTopics(documentContent, documentName);
        }

        // Ensure topics is an array
        if (!Array.isArray(topics)) {
            console.warn("⚠️ AI response was not an array, using fallback");
            return generateFallbackTopics(documentContent, documentName);
        }

        // If empty array, use fallback
        if (topics.length === 0) {
            console.warn("⚠️ AI returned empty topics array, using fallback");
            return generateFallbackTopics(documentContent, documentName);
        }

        // Add unique IDs to topics
        topics = topics.map((topic) => ({
            ...topic,
            id: uuidv4(),
        }));

        // Validate and normalize topics
        topics = topics.map((topic) => ({
            id: topic.id,
            title: topic.title || "Untitled Topic",
            description: topic.description || "",
            difficulty: ["easy", "medium", "hard"].includes(topic.difficulty)
                ? topic.difficulty
                : "medium",
            estimatedMinutes: Math.min(Math.max(topic.estimatedMinutes || 30, 15), 120),
            pageRange: {
                start: topic.pageRange?.start || 1,
                end: topic.pageRange?.end || 1,
            },
            keyConceptsList: Array.isArray(topic.keyConceptsList)
                ? topic.keyConceptsList.slice(0, 5)
                : [],
            suggestedPrompts: Array.isArray(topic.suggestedPrompts)
                ? topic.suggestedPrompts.slice(0, 3)
                : [`Explain ${topic.title}`, `What are the key concepts of ${topic.title}?`, `How does ${topic.title} apply in practice?`],
            prerequisites: Array.isArray(topic.prerequisites)
                ? topic.prerequisites
                : [],
        }));

        console.log(`✅ Extracted ${topics.length} topics using Ollama`);

        return topics;
    } catch (error: any) {
        if (error.code === "ECONNREFUSED") {
            throw new Error("Ollama is not running. Please start Ollama service.");
        }
        if (error.code === "ETIMEDOUT") {
            throw new Error("Ollama request timed out. The model may be processing.");
        }
        console.error("Error extracting topics with Ollama:", error.message);
        throw error;
    }
}

/**
 * Analyze a document and extract topics
 */
export async function analyzeDocument(
    userId: string,
    sessionId: string,
    documentId: string,
    documentName: string
): Promise<DocumentAnalysis> {
    try {
        // Check if analysis already exists
        const existingAnalysis = await DocumentAnalysisModel.findOne({
            sessionId,
            documentId,
        });

        // Get document chunks from ChromaDB
        const chunks = await getDocumentChunks(userId, sessionId, documentId);

        if (chunks.length === 0) {
            throw new Error("Document not found or has no content");
        }

        // Combine chunks into full document content
        const documentContent = chunks.map((c) => c.text).join("\n\n");

        // Extract topics using AI
        const topics = await extractTopicsWithAI(documentContent, documentName);

        // Calculate total estimated time
        const totalEstimatedMinutes = topics.reduce(
            (sum, topic) => sum + topic.estimatedMinutes,
            0
        );

        // Save or update analysis
        const analysisData = {
            userId,
            sessionId,
            documentId,
            documentName,
            topics,
            totalEstimatedMinutes,
            analyzedAt: new Date(),
        };

        let savedAnalysis;
        if (existingAnalysis) {
            savedAnalysis = await DocumentAnalysisModel.findByIdAndUpdate(
                existingAnalysis._id,
                analysisData,
                { new: true }
            );
        } else {
            savedAnalysis = await DocumentAnalysisModel.create(analysisData);
        }

        // Initialize topic progress entries
        for (const topic of topics) {
            await TopicProgressModel.findOneAndUpdate(
                { userId, sessionId, topicId: topic.id },
                {
                    userId,
                    sessionId,
                    documentId,
                    topicId: topic.id,
                    status: "pending",
                },
                { upsert: true, new: true }
            );
        }

        return savedAnalysis as unknown as DocumentAnalysis;
    } catch (error) {
        console.error("Error analyzing document:", error);
        throw error;
    }
}

/**
 * Get analysis for a specific document
 */
export async function getDocumentAnalysis(
    sessionId: string,
    documentId: string
): Promise<DocumentAnalysis | null> {
    try {
        const analysis = await DocumentAnalysisModel.findOne({
            sessionId,
            documentId,
        });
        return analysis as unknown as DocumentAnalysis | null;
    } catch (error) {
        console.error("Error getting document analysis:", error);
        throw error;
    }
}

/**
 * Get all analyses for a session
 */
export async function getSessionAnalyses(
    userId: string,
    sessionId: string
): Promise<DocumentAnalysis[]> {
    try {
        const analyses = await DocumentAnalysisModel.find({
            userId,
            sessionId,
        }).sort({ analyzedAt: -1 });
        return analyses as unknown as DocumentAnalysis[];
    } catch (error) {
        console.error("Error getting session analyses:", error);
        throw error;
    }
}

/**
 * Get all topic progress for a session
 */
export async function getSessionProgress(
    userId: string,
    sessionId: string
): Promise<any[]> {
    try {
        const progress = await TopicProgressModel.find({
            userId,
            sessionId,
        });
        return progress;
    } catch (error) {
        console.error("Error getting session progress:", error);
        throw error;
    }
}

/**
 * Update topic progress
 */
export async function updateTopicProgress(
    userId: string,
    sessionId: string,
    topicId: string,
    status: 'pending' | 'in-progress' | 'completed',
    timeSpentMinutes?: number,
    confidenceRating?: number
): Promise<any> {
    try {
        const updateData: any = {
            status,
            updatedAt: new Date(),
        };

        if (status === 'in-progress') {
            updateData.startedAt = new Date();
        }
        if (status === 'completed') {
            updateData.completedAt = new Date();
        }
        if (timeSpentMinutes !== undefined) {
            updateData.timeSpentMinutes = timeSpentMinutes;
        }
        if (confidenceRating !== undefined) {
            updateData.confidenceRating = confidenceRating;
        }

        const progress = await TopicProgressModel.findOneAndUpdate(
            { userId, sessionId, topicId },
            updateData,
            { new: true, upsert: true }
        );

        return progress;
    } catch (error) {
        console.error("Error updating topic progress:", error);
        throw error;
    }
}

/**
 * Get session statistics
 */
export async function getSessionStats(
    userId: string,
    sessionId: string
): Promise<{
    totalDocuments: number;
    totalTopics: number;
    completedTopics: number;
    inProgressTopics: number;
    overallProgress: number;
    totalTimeEstimate: number;
    timeSpent: number;
}> {
    try {
        const analyses = await DocumentAnalysisModel.find({ userId, sessionId });
        const progress = await TopicProgressModel.find({ userId, sessionId });

        const totalTopics = analyses.reduce((sum, a) => sum + a.topics.length, 0);
        const completedTopics = progress.filter(p => p.status === 'completed').length;
        const inProgressTopics = progress.filter(p => p.status === 'in-progress').length;
        const totalTimeEstimate = analyses.reduce((sum, a) => sum + a.totalEstimatedMinutes, 0);
        const timeSpent = progress.reduce((sum, p) => sum + (p.timeSpentMinutes || 0), 0);

        return {
            totalDocuments: analyses.length,
            totalTopics,
            completedTopics,
            inProgressTopics,
            overallProgress: totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0,
            totalTimeEstimate,
            timeSpent,
        };
    } catch (error) {
        console.error("Error getting session stats:", error);
        throw error;
    }
}

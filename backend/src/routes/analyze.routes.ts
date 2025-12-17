import express, { Request, Response } from "express";
import axios from "axios";
import { chatService } from "../services/chat.service";
import { vectorDBService } from "../services/vectordb.service";
import env from "../config/env";

const router = express.Router();

// Ollama config
const OLLAMA_URL = env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = env.OLLAMA_MODEL || "deepseek-r1:1.5b";

/**
 * GET /api/analyze/documents
 * Get all documents for a session (just list, not analyzed yet)
 */
router.get("/documents", async (req: Request, res: Response) => {
    try {
        const { userId, sessionId } = req.query;

        if (!userId || !sessionId) {
            return res.status(400).json({
                success: false,
                message: "Missing required query parameters: userId, sessionId",
            });
        }

        const collectionName = await chatService.getChromaCollectionName(
            userId as string,
            sessionId as string
        );

        const files = await vectorDBService.getUniqueFiles(collectionName);

        const documents = files.map((file) => ({
            id: file.fileId,
            fileName: file.fileName,
            title: file.fileName.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "),
            chunkCount: file.count,
        }));

        res.json({ success: true, documents });
    } catch (error) {
        console.error("Error getting documents:", error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to get documents",
        });
    }
});

/**
 * POST /api/analyze/extract-topics
 * Analyze a document and extract main topics using AI
 */
router.post("/extract-topics", async (req: Request, res: Response) => {
    try {
        const { userId, sessionId, documentId, documentName } = req.body;

        if (!userId || !sessionId || !documentId) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields",
            });
        }

        console.log(`📊 Analyzing document: ${documentName}`);

        // Get collection and chunks
        const collectionName = await chatService.getChromaCollectionName(userId, sessionId);
        const result = await vectorDBService.getDocumentsByFileId(documentId, collectionName);

        if (!result.documents || result.documents.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No content found for this document",
            });
        }

        // Combine chunks (limit to avoid token overflow)
        const content = result.documents
            .slice(0, 15)
            .join("\n\n")
            .substring(0, 10000);

        console.log(`🤖 Extracting topics with Ollama...`);

        // Simple prompt for topic extraction
        const prompt = `Analyze this educational content and list the main topics/concepts.

CONTENT:
${content}

Return a JSON array with 3-8 main topics. Each topic needs: title, description, difficulty (easy/medium/hard), estimatedMinutes (number).

Example: [{"title":"Topic Name","description":"Brief description","difficulty":"medium","estimatedMinutes":20}]

Return ONLY the JSON array:`;

        const response = await axios.post(
            `${OLLAMA_URL}/api/generate`,
            {
                model: OLLAMA_MODEL,
                prompt,
                stream: false,
                options: { temperature: 0.7, num_predict: 2000 },
            },
            { timeout: 120000 }
        );

        let topics = [];
        const aiResponse = response.data.response || "";

        // Try to parse JSON from response
        try {
            // Remove thinking tags if present
            let cleanResponse = aiResponse.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

            // Find JSON array
            const match = cleanResponse.match(/\[[\s\S]*\]/);
            if (match) {
                topics = JSON.parse(match[0]);
            }
        } catch (e) {
            console.log("AI response parse failed, generating fallback topics");
        }

        // Fallback if AI failed
        if (!Array.isArray(topics) || topics.length === 0) {
            const docTitle = documentName.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
            topics = [
                { title: `Introduction to ${docTitle}`, description: "Overview and basics", difficulty: "easy", estimatedMinutes: 15 },
                { title: "Core Concepts", description: "Main topics covered", difficulty: "medium", estimatedMinutes: 30 },
                { title: "Key Details", description: "Important points", difficulty: "medium", estimatedMinutes: 25 },
                { title: "Summary", description: "Review and takeaways", difficulty: "easy", estimatedMinutes: 15 },
            ];
        }

        // Normalize topics
        topics = topics.slice(0, 8).map((t: any, idx: number) => ({
            id: `${documentId}-topic-${idx}`,
            title: t.title || `Topic ${idx + 1}`,
            description: t.description || "",
            difficulty: ["easy", "medium", "hard"].includes(t.difficulty) ? t.difficulty : "medium",
            estimatedMinutes: Math.min(90, Math.max(10, t.estimatedMinutes || 20)),
        }));

        console.log(`✅ Extracted ${topics.length} topics`);

        res.json({
            success: true,
            documentId,
            documentName,
            topics,
        });
    } catch (error: any) {
        console.error("Error extracting topics:", error.message);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to extract topics",
        });
    }
});

export default router;

import express, { Request, Response } from "express";
import axios from "axios";
import mongoose from "mongoose";
import { chatService } from "../services/chat.service";
import { vectorDBService } from "../services/vectordb.service";
import env from "../config/env";

const router = express.Router();

// Ollama config
const OLLAMA_URL = env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = env.OLLAMA_MODEL || "deepseek-r1:1.5b";

// MongoDB Schema for saving document trees
const documentTreeSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, index: true },
        sessionId: { type: String, required: true, index: true },
        documentId: { type: String, required: true, index: true },
        documentName: { type: String, required: true },
        rootNodes: { type: mongoose.Schema.Types.Mixed, required: true },
        totalWeight: { type: Number, default: 0 },
        totalEstimatedMinutes: { type: Number, default: 0 },
        analyzedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

// Create unique compound index
documentTreeSchema.index({ userId: 1, sessionId: 1, documentId: 1 }, { unique: true });

const DocumentTreeModel = mongoose.model("DocumentTree", documentTreeSchema);

interface TreeNode {
    id: string;
    title: string;
    description: string;
    type: "chapter" | "section" | "topic";
    difficulty: "easy" | "medium" | "hard";
    weight: number;
    estimatedMinutes: number;
    children?: TreeNode[];
    keywords?: string[];
}

/**
 * GET /api/document-tree/get
 * Retrieve saved document tree from MongoDB
 */
router.get("/get", async (req: Request, res: Response) => {
    try {
        const { userId, sessionId, documentId } = req.query;

        if (!userId || !sessionId || !documentId) {
            return res.status(400).json({
                success: false,
                message: "Missing required query params: userId, sessionId, documentId",
            });
        }

        const savedTree = await DocumentTreeModel.findOne({
            userId: String(userId),
            sessionId: String(sessionId),
            documentId: String(documentId),
        });

        if (!savedTree) {
            return res.status(404).json({
                success: false,
                message: "No saved tree found for this document",
            });
        }

        res.json({
            success: true,
            tree: {
                documentId: savedTree.documentId,
                documentName: savedTree.documentName,
                rootNodes: savedTree.rootNodes,
                totalWeight: savedTree.totalWeight,
                totalEstimatedMinutes: savedTree.totalEstimatedMinutes,
                analyzedAt: savedTree.analyzedAt,
            },
        });
    } catch (error: any) {
        console.error("Error getting document tree:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve document tree",
        });
    }
});

/**
 * POST /api/document-tree/extract
 * Extract hierarchical knowledge tree from a document and save to MongoDB
 */
router.post("/extract", async (req: Request, res: Response) => {
    try {
        const { userId, sessionId, documentId, documentName } = req.body;

        if (!userId || !sessionId || !documentId) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: userId, sessionId, documentId",
            });
        }

        console.log(`🌳 Extracting knowledge tree for: ${documentName}`);

        // Get collection and document chunks
        const collectionName = await chatService.getChromaCollectionName(
            userId,
            sessionId
        );
        const result = await vectorDBService.getDocumentsByFileId(
            documentId,
            collectionName
        );

        if (!result.documents || result.documents.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No content found for this document",
            });
        }

        // Combine chunks for analysis (increased limit for better tree extraction)
        const content = result.documents
            .slice(0, 20)
            .join("\n\n")
            .substring(0, 15001);

        console.log(`🤖 Analyzing document structure with AI...`);

        // Enhanced prompt for hierarchical tree extraction
        const prompt = `Analyze this educational document and create a hierarchical knowledge tree structure.

DOCUMENT CONTENT:
${content}

Create a JSON structure with chapters/sections/topics. For each node include:
- title: The ACTUAL title from the document content (NOT placeholders like "Chapter Name")
- description: 1-2 sentence summary of what that section covers
- type: "chapter" (main sections), "section" (subsections), or "topic" (specific concepts)
- difficulty: "easy", "medium", or "hard"
- weight: importance score 1-100 (higher = more important to learn)
- estimatedMinutes: time to study this node
- keywords: 2-4 key terms from that section
- children: nested array for sub-items (optional)

IMPORTANT RULES:
1. Create 2-5 main chapters based on the ACTUAL content
2. Each chapter can have 2-6 sections/topics
3. Use REAL titles and descriptions from the document - DO NOT use generic placeholders
4. Total weights should reflect relative importance
5. Extract actual topic names like "Chemical Reactions", "Combination Reactions", etc.

Return ONLY valid JSON. Example structure (replace with ACTUAL content):
{
  "tree": [
    {
      "title": "Actual Topic Title From Document",
      "description": "What this section actually covers",
      "type": "chapter",
      "difficulty": "medium",
      "weight": 30,
      "estimatedMinutes": 45,
      "keywords": ["actual", "keywords"],
      "children": [
        {
          "title": "Actual Subtopic Name",
          "description": "Description of subtopic",
          "type": "section",
          "difficulty": "easy",
          "weight": 15,
          "estimatedMinutes": 20,
          "keywords": ["term1"]
        }
      ]
    }
  ]
}`;

        const response = await axios.post(
            `${OLLAMA_URL}/api/generate`,
            {
                model: OLLAMA_MODEL,
                prompt,
                stream: false,
                options: { temperature: 0.5, num_predict: 4000 },
            },
            { timeout: 180000 }
        );

        let tree: TreeNode[] = [];
        const aiResponse = response.data.response || "";

        // Parse JSON from response
        try {
            // Remove thinking tags if present
            let cleanResponse = aiResponse
                .replace(/<think>[\s\S]*?<\/think>/g, "")
                .trim();

            // Find JSON object
            const jsonMatch = cleanResponse.match(/\{[\s\S]*"tree"[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                tree = parsed.tree || [];
            } else {
                // Try to find just the array
                const arrayMatch = cleanResponse.match(/\[[\s\S]*\]/);
                if (arrayMatch) {
                    tree = JSON.parse(arrayMatch[0]);
                }
            }
        } catch (e) {
            console.log("⚠️ AI response parse failed, generating fallback tree");
        }

        // Fallback if AI failed
        if (!Array.isArray(tree) || tree.length === 0) {
            const docTitle = documentName
                .replace(/\.[^.]+$/, "")
                .replace(/[_-]/g, " ");
            tree = [
                {
                    id: `${documentId}-ch1`,
                    title: `Introduction to ${docTitle}`,
                    description: "Overview and fundamental concepts",
                    type: "chapter",
                    difficulty: "easy",
                    weight: 25,
                    estimatedMinutes: 20,
                    keywords: ["introduction", "basics"],
                    children: [
                        {
                            id: `${documentId}-ch1-s1`,
                            title: "Key Concepts",
                            description: "Essential terms and definitions",
                            type: "section",
                            difficulty: "easy",
                            weight: 15,
                            estimatedMinutes: 15,
                            keywords: ["concepts", "definitions"],
                        },
                    ],
                },
                {
                    id: `${documentId}-ch2`,
                    title: "Core Content",
                    description: "Main subject matter and detailed explanations",
                    type: "chapter",
                    difficulty: "medium",
                    weight: 45,
                    estimatedMinutes: 40,
                    keywords: ["core", "main content"],
                    children: [
                        {
                            id: `${documentId}-ch2-s1`,
                            title: "Detailed Analysis",
                            description: "In-depth exploration of main topics",
                            type: "section",
                            difficulty: "medium",
                            weight: 25,
                            estimatedMinutes: 25,
                            keywords: ["analysis", "details"],
                        },
                        {
                            id: `${documentId}-ch2-s2`,
                            title: "Practical Examples",
                            description: "Real-world applications and examples",
                            type: "section",
                            difficulty: "medium",
                            weight: 20,
                            estimatedMinutes: 15,
                            keywords: ["examples", "applications"],
                        },
                    ],
                },
                {
                    id: `${documentId}-ch3`,
                    title: "Summary & Key Takeaways",
                    description: "Review of important points and conclusions",
                    type: "chapter",
                    difficulty: "easy",
                    weight: 20,
                    estimatedMinutes: 15,
                    keywords: ["summary", "takeaways"],
                },
            ];
        }

        // Normalize and add IDs to tree nodes
        const normalizeTree = (
            nodes: any[],
            parentId: string = documentId,
            depth: number = 0
        ): TreeNode[] => {
            return nodes.slice(0, depth === 0 ? 5 : 6).map((node, idx) => {
                const nodeId = `${parentId}-${depth}-${idx}`;
                const normalized: TreeNode = {
                    id: nodeId,
                    title: node.title || `Section ${idx + 1}`,
                    description: node.description || "",
                    type: node.type || (depth === 0 ? "chapter" : "section"),
                    difficulty: ["easy", "medium", "hard"].includes(node.difficulty)
                        ? node.difficulty
                        : "medium",
                    weight: Math.min(100, Math.max(1, node.weight || 20)),
                    estimatedMinutes: Math.min(
                        120,
                        Math.max(5, node.estimatedMinutes || 20)
                    ),
                    keywords: Array.isArray(node.keywords)
                        ? node.keywords.slice(0, 5)
                        : [],
                };

                if (node.children && Array.isArray(node.children) && depth < 2) {
                    normalized.children = normalizeTree(node.children, nodeId, depth + 1);
                }

                return normalized;
            });
        };

        const normalizedTree = normalizeTree(tree);

        // Calculate totals
        const calculateTotals = (
            nodes: TreeNode[]
        ): { totalWeight: number; totalMinutes: number } => {
            let totalWeight = 0;
            let totalMinutes = 0;

            for (const node of nodes) {
                totalWeight += node.weight;
                totalMinutes += node.estimatedMinutes;
                if (node.children) {
                    const childTotals = calculateTotals(node.children);
                    totalWeight += childTotals.totalWeight;
                    totalMinutes += childTotals.totalMinutes;
                }
            }

            return { totalWeight, totalMinutes };
        };

        const totals = calculateTotals(normalizedTree);

        // Save to MongoDB (upsert)
        await DocumentTreeModel.findOneAndUpdate(
            { userId, sessionId, documentId },
            {
                userId,
                sessionId,
                documentId,
                documentName,
                rootNodes: normalizedTree,
                totalWeight: totals.totalWeight,
                totalEstimatedMinutes: totals.totalMinutes,
                analyzedAt: new Date(),
            },
            { upsert: true, new: true }
        );

        console.log(
            `✅ Extracted and saved tree with ${normalizedTree.length} root nodes, ${totals.totalMinutes} total minutes`
        );

        res.json({
            success: true,
            documentId,
            documentName,
            rootNodes: normalizedTree,
            totalWeight: totals.totalWeight,
            totalEstimatedMinutes: totals.totalMinutes,
            analyzedAt: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error("❌ Error extracting document tree:", error.message);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to extract document tree",
        });
    }
});

/**
 * POST /api/document-tree/generate-learning-path
 * Generate ordered learning path from tree
 */
router.post("/generate-learning-path", async (req: Request, res: Response) => {
    try {
        const { documentId, rootNodes } = req.body;

        if (!documentId || !rootNodes) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields",
            });
        }

        interface PathItem {
            nodeId: string;
            nodePath: string[];
            title: string;
            priority: number;
            estimatedMinutes: number;
            difficulty: string;
        }

        const items: PathItem[] = [];

        // Flatten tree and calculate priority
        const flattenTree = (
            nodes: TreeNode[],
            path: string[] = []
        ): void => {
            for (const node of nodes) {
                const currentPath = [...path, node.title];

                // Priority = weight * difficulty multiplier
                const difficultyMultiplier =
                    node.difficulty === "easy"
                        ? 0.8
                        : node.difficulty === "hard"
                            ? 1.2
                            : 1.0;
                const priority = node.weight * difficultyMultiplier;

                items.push({
                    nodeId: node.id,
                    nodePath: currentPath,
                    title: node.title,
                    priority,
                    estimatedMinutes: node.estimatedMinutes,
                    difficulty: node.difficulty,
                });

                if (node.children && node.children.length > 0) {
                    flattenTree(node.children, currentPath);
                }
            }
        };

        flattenTree(rootNodes);

        // Sort by: difficulty (easy first), then priority (high first within same difficulty)
        const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
        items.sort((a, b) => {
            const diffA = difficultyOrder[a.difficulty as keyof typeof difficultyOrder] || 2;
            const diffB = difficultyOrder[b.difficulty as keyof typeof difficultyOrder] || 2;
            if (diffA !== diffB) return diffA - diffB;
            return b.priority - a.priority;
        });

        const totalMinutes = items.reduce(
            (sum, item) => sum + item.estimatedMinutes,
            0
        );

        res.json({
            success: true,
            documentId,
            items,
            totalMinutes,
            generatedAt: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error("Error generating learning path:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to generate learning path",
        });
    }
});

export default router;

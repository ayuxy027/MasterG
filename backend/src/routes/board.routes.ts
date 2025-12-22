import express, { Request, Response } from "express";
import axios from "axios";
import env from "../config/env";
import { ollamaService } from "../services/ollama.service";

const router = express.Router();

// Ollama config
const OLLAMA_URL = env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = env.OLLAMA_MODEL || "deepseek-r1:1.5b";

interface GenerateRequest {
  prompt: string;
  cardCount?: number;
}

/**
 * GET /api/board/ollama/status
 * Check Ollama connection status
 */
router.get("/ollama/status", async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 3000 });
    const models = response.data?.models || [];
    const hasModel = models.some((m: any) => m.name?.includes("deepseek"));
    
    res.json({
      connected: true,
      model: hasModel ? OLLAMA_MODEL : "No model loaded",
    });
  } catch (error: any) {
    res.json({ connected: false });
  }
});

interface CardActionRequest {
  action: "summarize" | "actionPoints" | "mindMap" | "flashcards";
  cardContents: string[];
}

/**
 * POST /api/board/generate
 * Generate educational cards from a query/prompt (with streaming thinking text)
 */
router.post("/generate", async (req: Request, res: Response) => {
  try {
    const { prompt, cardCount = 3, stream = true }: GenerateRequest & { stream?: boolean } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        message: "Prompt is required",
      });
    }

    console.log(`📝 Board: Generating ${cardCount} cards for query: "${prompt}"...`);

    // Updated prompt to generate results based on query, not prompts
    const systemPrompt = `You are an educational content creator. The user has asked a question or provided a topic. Generate exactly ${cardCount} educational cards that answer their query or explain the topic.

RULES:
1. Each card must have a clear, descriptive title (3-8 words)
2. Content should directly address the user's query/topic (20-50 words per card)
3. Content should be informative, educational, and well-structured
4. Use simple, clear language suitable for students
5. Each card should cover a different aspect or subtopic related to the query
6. Return ONLY valid JSON array, no other text

OUTPUT FORMAT (strict JSON):
[
  {"title": "Card Title 1", "content": "Content that answers the query (20-50 words)..."},
  {"title": "Card Title 2", "content": "Content that answers the query (20-50 words)..."},
  {"title": "Card Title 3", "content": "Content that answers the query (20-50 words)..."}
]

User's query/topic: ${prompt}

Generate exactly ${cardCount} cards as JSON array:`;

    // Set up streaming headers
    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
    }

    let thinkingText = "";
    let responseText = "";

    try {
      // Use streaming generation
      for await (const chunk of ollamaService.generateStream(systemPrompt, {
        model: OLLAMA_MODEL,
        temperature: 0.7,
      })) {
        if (chunk.type === "thinking") {
          thinkingText += chunk.content;
          if (stream) {
            res.write(`data: ${JSON.stringify({ type: "thinking", content: chunk.content })}\n\n`);
          }
        } else if (chunk.type === "response") {
          responseText += chunk.content;
        }
      }

      // Parse JSON from response
      let cards: any[] = [];
      try {
        let cleanResponse = responseText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
        const match = cleanResponse.match(/\[[\s\S]*\]/);
        if (match) {
          cards = JSON.parse(match[0]);
        }
      } catch (e) {
        console.log("Failed to parse AI response, using fallback");
      }

      // Fallback if parsing failed
      if (!Array.isArray(cards) || cards.length === 0) {
        cards = Array.from({ length: cardCount }, (_, idx) => ({
          title: `Key Point ${idx + 1}`,
          content: `Information about: ${prompt.slice(0, 50)}...`,
        }));
      }

      // Normalize cards
      cards = cards.slice(0, cardCount).map((c: any, idx: number) => ({
        id: `card-${Date.now()}-${idx}`,
        title: c.title || `Card ${idx + 1}`,
        content: c.content || "",
      }));

      console.log(`✅ Board: Generated ${cards.length} cards`);

      if (stream) {
        res.write(`data: ${JSON.stringify({ type: "complete", cards, thinkingText })}\n\n`);
        res.end();
      } else {
        res.json({ success: true, cards, thinkingText });
      }
    } catch (streamError: any) {
      console.error("Streaming error:", streamError.message);
      if (stream) {
        res.write(`data: ${JSON.stringify({ type: "error", error: streamError.message })}\n\n`);
        res.end();
      } else {
        throw streamError;
      }
    }
  } catch (error: any) {
    console.error("Board generate error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to generate cards",
      });
    }
  }
});

/**
 * POST /api/board/action
 * Perform AI action on selected cards (summarize, explain, quiz, keypoints)
 */
router.post("/action", async (req: Request, res: Response) => {
  try {
    const { action, cardContents }: CardActionRequest = req.body;

    if (!action || !cardContents || cardContents.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Action and card contents are required",
      });
    }

    if (cardContents.length > 4) {
      return res.status(400).json({
        success: false,
        message: "Maximum 4 cards can be selected",
      });
    }

    console.log(`🎯 Board: Performing "${action}" on ${cardContents.length} cards`);

    const combinedContent = cardContents.join("\n\n---\n\n");
    
    // Actions that generate cards
    const cardGeneratingActions = ["mindMap", "flashcards"];
    
    if (cardGeneratingActions.includes(action)) {
      // Generate cards for mind map or flashcards
      const actionPrompts: Record<string, string> = {
        mindMap: `Create a mind map from this content. Generate exactly 4 concept cards in JSON format.\n\nRULES:\n1. Each card represents a key concept or idea\n2. Title: short concept name (2-5 words)\n3. Content: brief explanation (30-50 words)\n4. Return ONLY valid JSON array\n\nContent:\n${combinedContent}\n\nGenerate JSON array of 4 cards:`,
        flashcards: `Create flashcards from this content. Generate exactly 4 Q&A flashcards in JSON format.\n\nRULES:\n1. Title: Question (as a question)\n2. Content: Clear answer (30-50 words)\n3. Make it educational and memorable\n4. Return ONLY valid JSON array\n\nContent:\n${combinedContent}\n\nGenerate JSON array of 4 flashcards:`,
      };

      const prompt = actionPrompts[action] || actionPrompts.mindMap;

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

      let cards = [];
      let aiResponse = response.data.response || "";
      aiResponse = aiResponse.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

      // Parse JSON from response
      try {
        const match = aiResponse.match(/\[[\s\S]*\]/);
        if (match) {
          cards = JSON.parse(match[0]);
        }
      } catch (e) {
        console.log("Failed to parse AI response for cards");
      }

      // Fallback if parsing failed
      if (!Array.isArray(cards) || cards.length === 0) {
        cards = [
          { title: "Concept 1", content: "Key idea from the selected cards." },
          { title: "Concept 2", content: "Another important point." },
          { title: "Concept 3", content: "Supporting detail or example." },
          { title: "Concept 4", content: "Summary or conclusion." },
        ];
      }

      // Normalize cards
      cards = cards.slice(0, 4).map((c: any, idx: number) => ({
        id: `${action}-${Date.now()}-${idx}`,
        title: c.title || `Card ${idx + 1}`,
        content: c.content || "",
      }));

      console.log(`✅ Board: Action "${action}" generated ${cards.length} cards`);

      res.json({
        success: true,
        action,
        cards,
      });
    } else {
      // Text-based actions (summarize, actionPoints)
      const actionPrompts: Record<string, string> = {
        summarize: `Summarize the following content in 2-3 concise, well-structured sentences. Focus on the main ideas and key takeaways.\n\nContent:\n${combinedContent}\n\nSummary:`,
        actionPoints: `Extract 4-5 clear, actionable bullet points from this content. Each point should be specific and useful for a student.\n\nContent:\n${combinedContent}\n\nAction Points:\n•`,
      };

      const prompt = actionPrompts[action] || actionPrompts.summarize;

      const response = await axios.post(
        `${OLLAMA_URL}/api/generate`,
        {
          model: OLLAMA_MODEL,
          prompt,
          stream: false,
          options: { temperature: 0.5, num_predict: 1500 },
        },
        { timeout: 90000 }
      );

      let result = response.data.response || "";
      // Clean thinking tags
      result = result.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

      // For action points, ensure bullet format
      if (action === "actionPoints" && !result.startsWith("•")) {
        result = "• " + result;
      }

      console.log(`✅ Board: Action "${action}" completed`);

      res.json({
        success: true,
        action,
        result,
      });
    }
  } catch (error: any) {
    console.error("Board action error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to perform action",
    });
  }
});

export default router;


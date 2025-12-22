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

    // Simplified, clearer prompt for card generation
    const systemPrompt = `Generate ${cardCount} cards about: ${prompt}

Rules:
- Title: exactly 3 words
- Content: max 3 sentences
- JSON only

[
  {"title": "Three Word Title", "content": "Sentence one. Sentence two. Sentence three."}
]`;

    // Set up streaming headers
    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
    }

    let thinkingText = "";
    let responseText = "";
    let accumulatedResponse = "";

    // Helper function to extract and parse JSON from text
    const extractJSON = (text: string): any[] | null => {
      // Strategy 1: Try to find JSON array directly
      try {
        const directMatch = text.match(/\[[\s\S]*\]/);
        if (directMatch) {
          return JSON.parse(directMatch[0]);
        }
      } catch (e) {
        // Continue to next strategy
      }

      // Strategy 2: Look for JSON in markdown code blocks
      try {
        const codeBlockMatch = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
        if (codeBlockMatch) {
          return JSON.parse(codeBlockMatch[1]);
        }
      } catch (e) {
        // Continue to next strategy
      }

      // Strategy 3: Try to find JSON after common prefixes
      try {
        const prefixMatch = text.match(/(?:cards?|result|output|json):?\s*(\[[\s\S]*?\])/i);
        if (prefixMatch) {
          return JSON.parse(prefixMatch[1]);
        }
      } catch (e) {
        // Continue to next strategy
      }

      // Strategy 4: Try to extract individual card objects and combine
      try {
        const cardMatches = text.matchAll(/\{\s*"title"\s*:\s*"([^"]+)"\s*,\s*"content"\s*:\s*"([^"]+)"\s*\}/g);
        const cards: any[] = [];
        for (const match of cardMatches) {
          cards.push({ title: match[1], content: match[2] });
        }
        if (cards.length > 0) {
          return cards;
        }
      } catch (e) {
        // Continue to next strategy
      }

      // Strategy 5: Try to fix common JSON issues (trailing commas, unquoted keys)
      try {
        let fixedText = text
          .replace(/,\s*}/g, '}')  // Remove trailing commas in objects
          .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
          .replace(/(\w+):/g, '"$1":'); // Quote unquoted keys
        
        const match = fixedText.match(/\[[\s\S]*\]/);
        if (match) {
          return JSON.parse(match[0]);
        }
      } catch (e) {
        // All strategies failed
      }

      return null;
    };

    // Helper function to parse partial JSON and extract cards incrementally
    const parsePartialCards = (text: string): any[] => {
      const cards: any[] = [];
      try {
        // Look for complete card objects in the text
        const cardPattern = /\{\s*"title"\s*:\s*"([^"]+)"\s*,\s*"content"\s*:\s*"([^"]+)"\s*\}/g;
        let match;
        while ((match = cardPattern.exec(text)) !== null) {
          cards.push({
            title: match[1],
            content: match[2]
          });
        }
      } catch (e) {
        // Ignore parsing errors for partial content
      }
      return cards;
    };

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
          accumulatedResponse += chunk.content;

          // Try to parse partial cards as they stream in
          if (stream) {
            const partialCards = parsePartialCards(accumulatedResponse);
            if (partialCards.length > 0) {
              // Send partial cards for real-time updates
              const normalizedPartial = partialCards.map((c: any, idx: number) => ({
                id: `card-partial-${Date.now()}-${idx}`,
                title: c.title || `Card ${idx + 1}`,
                content: c.content || "",
              }));
              res.write(`data: ${JSON.stringify({ type: "card", cards: normalizedPartial, partial: true })}\n\n`);
            }
          }
        }
      }

      // Final JSON parsing with multiple strategies
      let cards: any[] = [];
      let cleanResponse = responseText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      
      // Try extraction strategies
      const extracted = extractJSON(cleanResponse);
      if (extracted && Array.isArray(extracted) && extracted.length > 0) {
        cards = extracted;
        console.log(`✅ Board: Successfully parsed ${cards.length} cards from AI response`);
      } else {
        // Log the response for debugging
        console.log("⚠️ Board: Failed to parse JSON. Response preview:", cleanResponse.slice(0, 200));
        console.log("⚠️ Board: Full response length:", cleanResponse.length);
        
        // Fallback: create cards from prompt
        cards = Array.from({ length: cardCount }, (_, idx) => ({
          title: `Key Point ${idx + 1}`,
          content: `Information about: ${prompt.slice(0, 50)}...`,
        }));
        console.log("⚠️ Board: Using fallback cards");
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
    const cardTitles = cardContents.map((_, idx) => `Card ${idx + 1}`).join(", ");
    
    // Helper function to parse partial JSON and extract cards incrementally
    const parsePartialCards = (text: string): any[] => {
      const cards: any[] = [];
      try {
        // Look for complete card objects in the text (handle escaped quotes)
        const cardPattern = /\{\s*"title"\s*:\s*"((?:[^"\\]|\\.)+)"\s*,\s*"content"\s*:\s*"((?:[^"\\]|\\.)+)"\s*\}/g;
        let match;
        while ((match = cardPattern.exec(text)) !== null) {
          cards.push({
            title: match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'),
            content: match[2].replace(/\\"/g, '"').replace(/\\n/g, '\n')
          });
        }
      } catch (e) {
        // Ignore parsing errors for partial content
      }
      return cards;
    };
    
    // Enhanced prompts for each action
    const actionPrompts: Record<string, string> = {
      summarize: `You are an expert educational content summarizer. Analyze the following educational content and create a comprehensive, well-structured summary.

CONTENT TO SUMMARIZE:
${combinedContent}

REQUIREMENTS:
1. Create a concise yet comprehensive summary (3-5 sentences)
2. Capture the main ideas, key concepts, and essential takeaways
3. Maintain logical flow and coherence
4. Use clear, educational language suitable for students
5. Highlight the most important information
6. Ensure the summary stands alone as a complete understanding

OUTPUT FORMAT:
Write only the summary text. No prefixes, no labels, just the summary itself.

Summary:`,
      
      actionPoints: `You are an expert at extracting actionable insights from educational content. Analyze the following content and extract clear, specific, actionable points.

CONTENT TO ANALYZE:
${combinedContent}

REQUIREMENTS:
1. Extract 5-7 key actionable points
2. Each point should be:
   - Specific and concrete (not vague)
   - Actionable (something a student can actually do)
   - Directly related to the content
   - Clear and concise (one sentence per point)
3. Format as bullet points using "•" symbol
4. Prioritize points by importance
5. Make each point independent and valuable

OUTPUT FORMAT:
• First actionable point
• Second actionable point
• Third actionable point
(Continue with 5-7 total points)

Action Points:`,
      
      mindMap: `You are an expert at creating educational mind maps. Analyze the following content and create a conceptual mind map with interconnected ideas.

CONTENT TO ANALYZE:
${combinedContent}

REQUIREMENTS:
1. Identify 4-6 core concepts or themes from the content
2. Each concept should be:
   - A distinct, important idea
   - Related to other concepts in the map
   - Clearly explained (40-60 words)
3. Create a logical hierarchy or relationship structure
4. Ensure concepts cover different aspects of the content
5. Make titles concise (2-4 words) and descriptive

OUTPUT FORMAT (JSON array only):
[
  {"title": "Core Concept 1", "content": "Detailed explanation of this concept and its importance..."},
  {"title": "Core Concept 2", "content": "Detailed explanation of this concept and its relationships..."},
  {"title": "Core Concept 3", "content": "Detailed explanation of this concept and its connections..."},
  {"title": "Core Concept 4", "content": "Detailed explanation of this concept and its role..."}
]

Generate the JSON array:`,
      
      flashcards: `You are an expert at creating effective educational flashcards. Analyze the following content and create high-quality Q&A flashcards for studying.

CONTENT TO ANALYZE:
${combinedContent}

REQUIREMENTS:
1. Create 5-6 flashcards covering key information
2. Each flashcard should have:
   - A clear, specific question (as the title)
   - A comprehensive answer (50-80 words)
   - Focus on important facts, concepts, or applications
   - Be suitable for active recall practice
3. Questions should test understanding, not just recall
4. Answers should be complete and educational
5. Cover different aspects: definitions, processes, examples, applications

OUTPUT FORMAT (JSON array only):
[
  {"title": "What is [key concept]?", "content": "Comprehensive answer explaining the concept, its importance, and relevant details..."},
  {"title": "How does [process] work?", "content": "Step-by-step explanation of the process with key details..."},
  {"title": "Why is [concept] important?", "content": "Explanation of importance, applications, and real-world relevance..."}
]

Generate the JSON array:`,
    };

    const prompt = actionPrompts[action];
    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: `Unknown action: ${action}`,
      });
    }

    // Actions that generate cards
    const cardGeneratingActions = ["mindMap", "flashcards"];
    
    if (cardGeneratingActions.includes(action)) {
      // Use streaming for card-generating actions
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let responseText = "";
      let accumulatedResponse = "";

      try {
        // Use streaming generation
        for await (const chunk of ollamaService.generateStream(prompt, {
          model: OLLAMA_MODEL,
          temperature: 0.7,
        })) {
          if (chunk.type === "response") {
            responseText += chunk.content;
            accumulatedResponse += chunk.content;

            // Try to parse partial cards as they stream in
            const partialCards = parsePartialCards(accumulatedResponse);
            if (partialCards.length > 0) {
              const normalizedPartial = partialCards.map((c: any, idx: number) => ({
                id: `${action}-partial-${Date.now()}-${idx}`,
                title: c.title || `Card ${idx + 1}`,
                content: c.content || "",
              }));
              res.write(`data: ${JSON.stringify({ type: "card", cards: normalizedPartial, partial: true })}\n\n`);
            }
          }
        }

        // Final JSON parsing with multiple strategies (reuse extractJSON from generate endpoint)
        let cards: any[] = [];
        let cleanResponse = responseText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
        
        // Try extraction strategies (same as generate endpoint)
        const extractJSON = (text: string): any[] | null => {
          // Strategy 1: Direct JSON array
          try {
            const directMatch = text.match(/\[[\s\S]*\]/);
            if (directMatch) return JSON.parse(directMatch[0]);
          } catch (e) {}
          
          // Strategy 2: Markdown code blocks
          try {
            const codeBlockMatch = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
            if (codeBlockMatch) return JSON.parse(codeBlockMatch[1]);
          } catch (e) {}
          
          // Strategy 3: After prefixes
          try {
            const prefixMatch = text.match(/(?:cards?|result|output|json):?\s*(\[[\s\S]*?\])/i);
            if (prefixMatch) return JSON.parse(prefixMatch[1]);
          } catch (e) {}
          
          // Strategy 4: Individual card objects
          try {
            const cardMatches = text.matchAll(/\{\s*"title"\s*:\s*"([^"]+)"\s*,\s*"content"\s*:\s*"([^"]+)"\s*\}/g);
            const extracted: any[] = [];
            for (const match of cardMatches) {
              extracted.push({ title: match[1], content: match[2] });
            }
            if (extracted.length > 0) return extracted;
          } catch (e) {}
          
          return null;
        };

        const extracted = extractJSON(cleanResponse);
        if (extracted && Array.isArray(extracted) && extracted.length > 0) {
          cards = extracted;
          console.log(`✅ Board: Successfully parsed ${cards.length} cards for "${action}"`);
        } else {
          console.log(`⚠️ Board: Failed to parse JSON for "${action}". Response preview:`, cleanResponse.slice(0, 200));
          // Fallback
          cards = action === "mindMap" ? [
            { title: "Core Concept 1", content: "Key concept extracted from the selected cards." },
            { title: "Core Concept 2", content: "Another important concept or theme." },
            { title: "Core Concept 3", content: "Supporting concept or related idea." },
            { title: "Core Concept 4", content: "Additional concept or application." },
          ] : [
            { title: "What is the main concept?", content: "Key information from the selected cards." },
            { title: "How does this work?", content: "Explanation based on the content provided." },
            { title: "Why is this important?", content: "Significance and relevance of the topic." },
            { title: "What are the key details?", content: "Important details and examples." },
          ];
        }

        // Normalize cards
        cards = cards.slice(0, action === "mindMap" ? 6 : 6).map((c: any, idx: number) => ({
          id: `${action}-${Date.now()}-${idx}`,
          title: c.title || `${action === "mindMap" ? "Concept" : "Question"} ${idx + 1}`,
          content: c.content || "",
        }));

        console.log(`✅ Board: Action "${action}" generated ${cards.length} cards`);

        res.write(`data: ${JSON.stringify({ type: "complete", cards })}\n\n`);
        res.end();
      } catch (streamError: any) {
        console.error(`Streaming error for ${action}:`, streamError.message);
        res.write(`data: ${JSON.stringify({ type: "error", error: streamError.message })}\n\n`);
        res.end();
      }
    } else {
      // Text-based actions (summarize, actionPoints) - use streaming for better UX
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let responseText = "";
      let accumulatedText = "";

      try {
        // Use streaming generation
        for await (const chunk of ollamaService.generateStream(prompt, {
          model: OLLAMA_MODEL,
          temperature: action === "summarize" ? 0.6 : 0.7,
        })) {
          if (chunk.type === "response") {
            responseText += chunk.content;
            accumulatedText += chunk.content;
            
            // Stream partial results for real-time updates
            res.write(`data: ${JSON.stringify({ type: "partial", content: accumulatedText })}\n\n`);
          }
        }

        let result = responseText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

        // Post-process action points to ensure proper formatting
        if (action === "actionPoints") {
          // Ensure bullet points
          if (!result.includes("•")) {
            // Split by lines and add bullets
            const lines = result.split("\n").filter(line => line.trim().length > 0);
            result = lines.map(line => {
              const trimmed = line.trim();
              if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
                return trimmed;
              }
              return `• ${trimmed}`;
            }).join("\n");
          }
        }

        console.log(`✅ Board: Action "${action}" completed`);

        res.write(`data: ${JSON.stringify({ type: "complete", result })}\n\n`);
        res.end();
      } catch (streamError: any) {
        console.error(`Streaming error for ${action}:`, streamError.message);
        res.write(`data: ${JSON.stringify({ type: "error", error: streamError.message })}\n\n`);
        res.end();
      }
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


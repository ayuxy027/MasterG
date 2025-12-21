import env from "../config/env";
import axios from "axios";
import * as fs from 'fs';
import * as path from 'path';

interface ImageGenerationParams {
  prompt: { positive: string; negative: string };
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  sampleCount?: number;
}

interface EnhanceQueryParams {
  query: string;
  category: string;
  language?: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
}

interface QueryAnalysis {
  topic: string;
  keyElements: string[];
  visualStyle: string;
  textElements: string[];
}

export interface ComfyPrompt {
  positive: string;
  negative: string;
}

// Cache for enhanced prompts (30 min TTL)
const promptCache = new Map<string, { enhanced: ComfyPrompt; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export class PosterService {
  private async analyzeQuery(
    query: string,
    category: string,
    language: string
  ): Promise<QueryAnalysis> {
    try {
      // Use Ollama/Deepseek
      const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
      const ollamaModel = process.env.OLLAMA_CHAT_MODEL || "deepseek-r1:1.5b";

      const prompt = `You are an educational content analyst. Analyze this poster request for Indian students:

Query: "${query}"
Category: ${category}
Language: ${language}

Provide a DETAILED analysis. Think deeply about what students need to learn about this topic.

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "topic": "detailed topic description with context",
  "keyElements": ["specific element 1", "element 2"],
  "visualStyle": "description of visual approach",
  "textElements": ["title in ${language}", "label 1"]
}

Be EXTREMELY specific and educational. Return ONLY the JSON:`;

      const response = await axios.post(
        `${ollamaUrl}/api/generate`,
        {
          model: ollamaModel,
          prompt,
          stream: false,
          options: {
            temperature: 0.4,
            num_predict: 400,
          },
        },
        {
          timeout: 45000,
        }
      );

      if (response.data.response) {
        const analysisText = response.data.response.trim();
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (error) {
      console.error("Query analysis error (Ollama):", error);
    }

    return this.createFallbackAnalysis(query, category, language);
  }

  private createFallbackAnalysis(
    query: string,
    category: string,
    language: string
  ): QueryAnalysis {
    return {
      topic: `${query} - educational topic in ${category}`,
      keyElements: [
        `Main visual representation of ${query}`,
        "Key concepts illustrated",
        "Educational examples"
      ],
      visualStyle: "Clear educational illustration style",
      textElements: [`${query} in ${language}`, "Key labels"]
    };
  }

  /**
   * Step 2: Enhance user query using Deepseek to get Positive and Negative prompts for ComfyUI
   */
  async enhanceQuery(params: EnhanceQueryParams): Promise<ComfyPrompt> {
    const {
      query,
      category,
      language = "English",
      aspectRatio = "1:1",
    } = params;
    const cacheKey = `${query}-${category}-${language}-${aspectRatio}`;

    // Check cache
    const cached = promptCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.enhanced;
    }

    try {
      const analysis = await this.analyzeQuery(query, category, language);
      const educationalContext = this.getEducationalContext(category, language);

      const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
      const ollamaModel = process.env.OLLAMA_CHAT_MODEL || "deepseek-r1:1.5b";

      const enhancementPrompt = `You are an expert prompt engineer for Stable Diffusion/ComfyUI, specializing in educational content.

TOPIC: "${query}"
ANALYSIS: ${JSON.stringify(analysis)}
CONTEXT: ${educationalContext}
LANGUAGE: ${language}
ASPECT RATIO: ${aspectRatio}

Task: Generate the BEST Positive and Negative prompts for an SDXL text-to-image model.

Positive Prompt Requirements:
- High quality, masterpiece, 8k, ultra detailed
- Specific visual elements from analysis
- Clean style, educational poster style, flat design or detailed illustration
- Text descriptions (though SDXL struggles with text, include description of where labels go)

Negative Prompt Requirements:
- Ugly, bad anatomy, blurry, low quality, watermark, text, signature, distortion

Return ONLY valid JSON:
{
  "positive": "your detailed positive prompt string",
  "negative": "your detailed negative prompt string"
}
`;

      const response = await axios.post(
        `${ollamaUrl}/api/generate`,
        {
          model: ollamaModel,
          prompt: enhancementPrompt,
          stream: false,
          options: {
            temperature: 0.6,
            num_predict: 500,
          },
        },
        {
          timeout: 45000,
        }
      );

      if (response.data.response) {
        const jsonMatch = response.data.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.positive && parsed.negative) {
            promptCache.set(cacheKey, { enhanced: parsed, timestamp: Date.now() });
            return parsed;
          }
        }
      }
    } catch (error) {
      console.error("Prompt enhancement error:", error);
    }

    // Fallback
    return {
      positive: `(Masterpiece), educational poster about ${query}, ${category} style, detailed, 8k, sharp focus, nice lighting`,
      negative: "blurry, low quality, ugly, deformed, noisy"
    };
  }

  /**
   * Generate poster using local ComfyUI
   */
  async generateImage(params: ImageGenerationParams): Promise<string> {
    const { prompt, aspectRatio = "1:1" } = params;

    try {
      const comfyUrl = "http://127.0.0.1:8188"; // Local ComfyUI

      // 1. Load Workflow JSON
      const workflowPath = path.join(__dirname, '../workflows/poster.json');
      if (!fs.existsSync(workflowPath)) {
        throw new Error("ComfyUI workflow file not found at " + workflowPath);
      }
      const workflowRaw = fs.readFileSync(workflowPath, 'utf8');
      const workflow = JSON.parse(workflowRaw);

      // 2. Modify Workflow (Inject Prompts & Size)
      const POSITIVE_ID = "6";
      const NEGATIVE_ID = "7";
      const SEED_NODE_ID = "3";
      const SIZE_NODE_ID = "5";

      console.log("----------------------------------------");
      console.log("🎨 Sending Prompt to ComfyUI:");
      console.log("POSITIVE:", prompt.positive);
      console.log("NEGATIVE:", prompt.negative);
      console.log("----------------------------------------");

      // Update Prompts
      if (workflow[POSITIVE_ID] && workflow[POSITIVE_ID].inputs) workflow[POSITIVE_ID].inputs.text = prompt.positive;
      if (workflow[NEGATIVE_ID] && workflow[NEGATIVE_ID].inputs) workflow[NEGATIVE_ID].inputs.text = prompt.negative;

      // Update Seed (Randomize)
      if (workflow[SEED_NODE_ID] && workflow[SEED_NODE_ID].inputs) {
        workflow[SEED_NODE_ID].inputs.seed = Math.floor(Math.random() * 1000000000000);
      }

      // Update Size based on Aspect Ratio
      let width = 1024;
      let height = 1024;
      switch (aspectRatio) {
        case "16:9": width = 1216; height = 832; break; // SDXL optimal
        case "9:16": width = 832; height = 1216; break;
        case "4:3": width = 1152; height = 896; break;
        case "3:4": width = 896; height = 1152; break;
        default: width = 1024; height = 1024;
      }

      if (workflow[SIZE_NODE_ID] && workflow[SIZE_NODE_ID].inputs) {
        workflow[SIZE_NODE_ID].inputs.width = width;
        workflow[SIZE_NODE_ID].inputs.height = height;
      }

      // 3. Send to ComfyUI
      const queueRes = await axios.post(`${comfyUrl}/prompt`, {
        prompt: workflow
      });

      const promptId = queueRes.data.prompt_id;
      if (!promptId) throw new Error("Failed to queue prompt in ComfyUI");
      console.log(`ComfyUI Prompt ID: ${promptId}`);

      // 4. Poll for completion
      let isDone = false;
      let outputFilename = "";
      let outputSubfolder = "";
      let outputType = "";

      // Wait up to 5 minutes (300 seconds)
      const MAX_ATTEMPTS = 300;
      let attempts = 0;

      while (!isDone && attempts < MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, 1000));
        attempts++;

        try {
          const historyRes = await axios.get(`${comfyUrl}/history/${promptId}`);
          const history = historyRes.data[promptId];

          if (history && history.outputs) {
            // Look for Saved Image output
            for (const nodeId in history.outputs) {
              if (history.outputs[nodeId].images && history.outputs[nodeId].images.length > 0) {
                const img = history.outputs[nodeId].images[0];
                outputFilename = img.filename;
                outputSubfolder = img.subfolder;
                outputType = img.type;
                isDone = true;
                break;
              }
            }
          }
        } catch (e) {
          // Ignore polling errors
        }
      }

      if (!outputFilename) {
        // Double check if it's just stuck in queue
        try {
          const queueStatus = await axios.get(`${comfyUrl}/queue`);
          const pending = queueStatus.data.queue_pending || [];
          const running = queueStatus.data.queue_running || [];
          const isPending = pending.some((x: any) => x[1] === promptId);
          const isRunning = running.some((x: any) => x[1] === promptId);

          if (isPending || isRunning) {
            throw new Error(`ComfyUI generation is still ${isRunning ? 'running' : 'pending'} after ${MAX_ATTEMPTS} seconds. Increase timeout.`);
          }
        } catch (e) { }

        throw new Error("ComfyUI generation timed out or failed to produce output. No history found.");
      }

      // 5. Fetch Image
      const viewUrl = `${comfyUrl}/view?filename=${outputFilename}&subfolder=${outputSubfolder}&type=${outputType}`;
      const imageRes = await axios.get(viewUrl, { responseType: 'arraybuffer' });
      const base64 = Buffer.from(imageRes.data, 'binary').toString('base64');

      return base64;
    } catch (error) {
      console.error("ComfyUI Generation Error:", error);
      throw error;
    }
  }

  // --- Helpers ---

  private getEducationalContext(category: string, language: string): string {
    const contexts: Record<string, string> = {
      science: `Create scientifically accurate educational visuals.`,
      mathematics: `Design clear mathematical diagrams.`,
      history: `Illustrate historical events accurately.`,
      geography: `Create accurate maps and geographical features.`,
      "social-studies": `Visualize social concepts and community life.`,
      languages: `Design language learning aids.`,
      "general-knowledge": `Create informative general awareness posters.`,
      motivational: `Design inspirational posters.`,
      arts: `Illustrate artistic concepts.`,
      "health-education": `Create health awareness posters.`,
    };
    return contexts[category.toLowerCase()] || contexts["general-knowledge"];
  }

  async generateMultiplePosters(
    query: string,
    category: string,
    count: number = 4,
    language: string = "English",
    aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" = "1:1"
  ): Promise<Array<{ imageBase64: string; enhancedPrompt: string }>> {
    // Deepseek prompt
    const enhanced = await this.enhanceQuery({
      query,
      category,
      language,
      aspectRatio,
    });

    // Combine for frontend display
    const promptDisplay = `Positive: ${enhanced.positive}\nNegative: ${enhanced.negative}`;

    const results: Array<{ imageBase64: string; enhancedPrompt: string }> = [];

    // Serial generation for ComfyUI
    for (let i = 0; i < count; i++) {
      const imageBase64 = await this.generateImage({ prompt: enhanced, aspectRatio });
      results.push({ imageBase64, enhancedPrompt: promptDisplay });
      // Small delay
      if (i < count - 1) await new Promise(r => setTimeout(r, 500));
    }

    return results;
  }

  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of promptCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        promptCache.delete(key);
      }
    }
  }
}

export const posterService = new PosterService();

setInterval(() => {
  posterService.clearExpiredCache();
}, 30 * 60 * 1000);

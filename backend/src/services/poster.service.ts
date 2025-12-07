import env from "../config/env";
import { GoogleAuth } from "google-auth-library";

interface ImageGenerationParams {
  prompt: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  sampleCount?: number;
}

interface EnhanceQueryParams {
  query: string;
  category: string;
  language?: string;
}

// Cache for enhanced prompts (30 min TTL)
const promptCache = new Map<string, { enhanced: string; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export class PosterService {
  /**
   * Enhance user query with educational context for better image generation
   */
  async enhanceQuery(params: EnhanceQueryParams): Promise<string> {
    const { query, category, language = "English" } = params;
    const cacheKey = `${query}-${category}-${language}`;

    // Check cache
    const cached = promptCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.enhanced;
    }

    try {
      const educationalContext = this.getEducationalContext(category, language);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMMA_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are an expert in creating educational visual content for Indian students.

Context: ${educationalContext}

Task: Transform this basic request into a detailed, vivid image prompt optimized for educational poster generation.

Original request: "${query}"

Requirements:
1. Make it culturally relevant for Indian education
2. Include educational elements (diagrams, labels, clear visuals)
3. Ensure accessibility (high contrast, clear text areas)
4. Add appropriate ${language} text integration cues
5. Keep it educational and age-appropriate
6. Maximum 120 words

Enhanced prompt:`,
                  },
                ],
              },
            ],
            generationConfig: {
              maxOutputTokens: 150,
              temperature: 0.7,
              topP: 0.9,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const enhanced =
          data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (enhanced) {
          promptCache.set(cacheKey, { enhanced, timestamp: Date.now() });
          return enhanced;
        }
      }
    } catch (error) {
      console.error("Prompt enhancement error:", error);
    }

    // Fallback: structured enhancement
    const fallback = this.createFallbackPrompt(query, category, language);
    return fallback;
  }

  /**
   * Generate educational poster image using Gemini Imagen 4.0 API via Vertex AI
   */
  async generateImage(params: ImageGenerationParams): Promise<string> {
    const { prompt, aspectRatio = "1:1", sampleCount = 1 } = params;

    try {
      const auth = new GoogleAuth({
        scopes: "https://www.googleapis.com/auth/cloud-platform",
      });
      const client = await auth.getClient();
      const accessToken = await client.getAccessToken();

      const projectId = env.GOOGLE_PROJECT_ID;
      const locationId = env.GOOGLE_LOCATION_ID;
      const modelId = "imagen-4.0-generate-001";
      const apiEndpoint = `${locationId}-aiplatform.googleapis.com`;

      const response = await fetch(
        `https://${apiEndpoint}/v1/projects/${projectId}/locations/${locationId}/publishers/google/models/${modelId}:predict`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken.token}`,
          },
          body: JSON.stringify({
            instances: [
              {
                prompt: prompt,
              },
            ],
            parameters: {
              aspectRatio: aspectRatio,
              sampleCount: sampleCount,
              negativePrompt: "",
              enhancePrompt: false,
              personGeneration: "allow_all",
              safetySetting: "block_few",
              addWatermark: true,
              includeRaiReason: true,
              language: "auto",
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message ||
            `Image generation failed: ${response.statusText}`
        );
      }

      const result = await response.json();
      // Vertex AI Imagen 4.0 returns images in predictions array
      const imageData = result.predictions?.[0]?.bytesBase64Encoded;

      if (!imageData) {
        throw new Error("No image data received from API");
      }

      return imageData;
    } catch (error) {
      console.error("Image generation error:", error);
      throw error;
    }
  }

  /**
   * Get educational context for different categories
   */
  private getEducationalContext(category: string, language: string): string {
    const contexts: Record<string, string> = {
      science: `Create scientifically accurate educational visuals for Indian school curriculum (CBSE/ICSE/State boards). Include labeled diagrams, clear illustrations of scientific concepts, and culturally relevant examples.`,

      mathematics: `Design clear mathematical diagrams, geometric shapes, number concepts, or formula visualizations suitable for Indian students. Use familiar Indian contexts (currency, measurements, real-world examples).`,

      history: `Illustrate historical events, monuments, freedom fighters, or cultural heritage relevant to Indian history. Ensure historical accuracy and cultural sensitivity.`,

      geography: `Create maps, geographical features, climate zones, or cultural diversity visuals specific to India and world geography as taught in Indian schools.`,

      "social-studies": `Visualize social concepts, civic education, cultural diversity, Indian festivals, traditions, or community life relevant to Indian social studies curriculum.`,

      languages: `Design language learning aids, grammar concepts, literary themes, or ${language} script visualizations. Include bilingual elements where appropriate.`,

      "general-knowledge": `Create informative posters about general awareness topics relevant to Indian students - current affairs, important dates, notable personalities, or educational facts.`,

      motivational: `Design inspirational and motivational posters for students with positive messages, study tips, career guidance, or success stories of Indian achievers.`,

      arts: `Illustrate artistic concepts, Indian art forms (Madhubani, Warli, etc.), color theory, or creative techniques suitable for art education.`,

      "health-education": `Create health awareness posters about nutrition, hygiene, mental health, sports, or wellness topics relevant to Indian student well-being.`,
    };

    return contexts[category.toLowerCase()] || contexts["general-knowledge"];
  }

  /**
   * Create fallback prompt when enhancement fails
   */
  private createFallbackPrompt(
    query: string,
    category: string,
    language: string
  ): string {
    const styleGuide = `educational poster style, clear and vibrant, high quality illustration, suitable for Indian classroom display`;
    const culturalContext = `Indian educational context, culturally appropriate`;
    const technicalRequirements = `high contrast for readability, clean layout, professional design`;

    return `${query}, ${category} themed, ${styleGuide}, ${culturalContext}, ${technicalRequirements}, ${language} text integration, detailed and informative`;
  }

  /**
   * Generate multiple variations
   */
  async generateMultiplePosters(
    query: string,
    category: string,
    count: number = 4,
    language: string = "English"
  ): Promise<Array<{ imageBase64: string; enhancedPrompt: string }>> {
    // Enhance once
    const enhancedPrompt = await this.enhanceQuery({
      query,
      category,
      language,
    });

    // Generate images in parallel (limited concurrency)
    const results: Array<{ imageBase64: string; enhancedPrompt: string }> = [];

    // Generate in batches of 2 to avoid rate limiting
    for (let i = 0; i < count; i += 2) {
      const batchSize = Math.min(2, count - i);
      const promises = Array(batchSize)
        .fill(null)
        .map(() => this.generateImage({ prompt: enhancedPrompt }));

      const images = await Promise.all(promises);
      images.forEach((imageBase64) => {
        results.push({ imageBase64, enhancedPrompt });
      });

      // Small delay between batches
      if (i + batchSize < count) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Clear expired cache entries
   */
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

// Clear cache every 30 minutes
setInterval(() => {
  posterService.clearExpiredCache();
  console.log("🧹 Cleared expired poster cache entries");
}, 30 * 60 * 1000);

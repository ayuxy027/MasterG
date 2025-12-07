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
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
}

interface QueryAnalysis {
  topic: string;
  keyElements: string[];
  visualStyle: string;
  textElements: string[];
}

// Cache for enhanced prompts (30 min TTL)
const promptCache = new Map<string, { enhanced: string; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export class PosterService {
  /**
   * Step 1: Analyze the query to understand topic and requirements
   */
  private async analyzeQuery(
    query: string,
    category: string,
    language: string
  ): Promise<QueryAnalysis> {
    try {
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
                    text: `You are an educational content analyst. Analyze this poster request for Indian students:

Query: "${query}"
Category: ${category}
Language: ${language}

Provide a DETAILED analysis. Think deeply about what students need to learn about this topic.

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "topic": "detailed topic description with context",
  "keyElements": ["specific element 1 with details", "specific element 2 with details", "specific element 3 with details", "specific element 4 with details"],
  "visualStyle": "detailed description of best visual approach for this topic",
  "textElements": ["exact title text in ${language}", "label 1 in ${language}", "label 2 in ${language}", "label 3 in ${language}"]
}

For example, if query is "photosynthesis":
- topic should explain it's "the process by which plants convert sunlight into energy"
- keyElements should list: "chloroplast with detailed structure", "sunlight rays entering leaf", "carbon dioxide molecules entering", "oxygen molecules being released", "glucose/sugar molecules being produced", "water molecules from roots"
- textElements should include specific labels like "Photosynthesis Process", "Sunlight", "Carbon Dioxide (CO2)", "Oxygen (O2)", "Water (H2O)", "Glucose (C6H12O6)"

Be EXTREMELY specific and educational. Return ONLY the JSON:`,
                  },
                ],
              },
            ],
            generationConfig: {
              maxOutputTokens: 400,
              temperature: 0.4,
              responseSchema: {
                type: "object",
                properties: {
                  topic: { type: "string" },
                  keyElements: { type: "array", items: { type: "string" } },
                  visualStyle: { type: "string" },
                  textElements: { type: "array", items: { type: "string" } },
                },
                required: [
                  "topic",
                  "keyElements",
                  "visualStyle",
                  "textElements",
                ],
              },
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const analysisText =
          data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (analysisText) {
          // Try to parse JSON from the response
          const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return parsed;
          }
        }
      }
    } catch (error) {
      console.error("Query analysis error:", error);
    }

    // Fallback analysis - more detailed based on query
    return this.createFallbackAnalysis(query, category, language);
  }

  /**
   * Create detailed fallback analysis
   */
  private createFallbackAnalysis(
    query: string,
    category: string,
    language: string
  ): QueryAnalysis {
    const lowerQuery = query.toLowerCase();

    // More intelligent fallback based on common educational topics
    if (lowerQuery.includes("cycle") || lowerQuery.includes("process")) {
      return {
        topic: `${query} - a cyclical educational process`,
        keyElements: [
          `Main stages of ${query} with arrows showing flow`,
          "Detailed diagram showing each step",
          "Clear labels for each stage",
          "Visual indicators of movement/progression",
          "Supporting elements and conditions",
        ],
        visualStyle:
          "Circular or sequential flow diagram with clear stages and transitions",
        textElements: [
          `${query} - title in ${language}`,
          "Stage labels in sequence",
          "Process arrows with descriptions",
          "Key terms and definitions",
        ],
      };
    }

    if (category.toLowerCase() === "science") {
      return {
        topic: `${query} - scientific concept for educational understanding`,
        keyElements: [
          `Main diagram illustrating ${query}`,
          "Labeled components and parts",
          "Scientific accuracy in representation",
          "Visual examples or demonstrations",
          "Relevant formulas or equations if applicable",
        ],
        visualStyle:
          "Scientific illustration style with clear labels and accurate representation",
        textElements: [
          `${query} - main title in ${language}`,
          "Component labels",
          "Scientific terms",
          "Explanatory notes",
        ],
      };
    }

    // Generic fallback
    return {
      topic: `${query} - educational topic in ${category}`,
      keyElements: [
        `Main visual representation of ${query}`,
        "Key concepts illustrated",
        "Supporting diagrams",
        "Educational examples",
        "Contextual information",
      ],
      visualStyle:
        "Clear educational illustration style suitable for classroom learning",
      textElements: [
        `${query} in ${language}`,
        "Key labels",
        "Descriptive text",
        "Educational notes",
      ],
    };
  }

  /**
   * Step 2: Enhance user query with educational context for better image generation
   */
  async enhanceQuery(params: EnhanceQueryParams): Promise<string> {
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
      // Step 1: Analyze the query
      const analysis = await this.analyzeQuery(query, category, language);

      const educationalContext = this.getEducationalContext(category, language);
      const layoutGuidance = this.getLayoutGuidance(aspectRatio, language);

      // Step 2: Generate detailed prompt based on analysis
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
                    text: `You are an expert educational content creator specializing in visual learning materials for Indian students.

TOPIC: "${query}" (${category} category)
LANGUAGE: ${language}
FORMAT: ${aspectRatio} aspect ratio

TOPIC ANALYSIS:
- Main Subject: ${analysis.topic}
- Key Elements to Show: ${analysis.keyElements.join(", ")}
- Visual Approach: ${analysis.visualStyle}
- Required Text Labels: ${analysis.textElements.join(", ")}

YOUR TASK: Create a comprehensive, detailed image generation prompt that will produce a perfect educational poster.

CRITICAL REQUIREMENTS:

1. TOPIC-SPECIFIC DETAILS (MOST IMPORTANT):
   - Explain EXACTLY what should be shown about "${query}"
   - Include ALL key concepts, processes, or components
   - Specify visual relationships and connections
   - For scientific concepts: include stages, cycles, or processes
   - For mathematical concepts: include formulas, examples, or diagrams
   - For historical topics: include timeline, people, or events
   - Be EXTREMELY SPECIFIC about the educational content

2. TEXT IN ${language} (CRITICAL):
   - Main title: exact text for the poster heading
   - Labels: specific text for each part/component
   - Descriptions: brief explanatory text
   - All text must be in ${language} with perfect spelling
   - Use professional, educational language
   - Suggest specific font styles (bold titles, clear labels)

3. VISUAL COMPOSITION FOR ${aspectRatio}:
   ${this.getDetailedLayoutInstructions(aspectRatio, language)}

4. DESIGN SPECIFICATIONS:
   - High contrast colors for maximum readability
   - Indian educational context (familiar examples, culturally appropriate)
   - Professional illustration style, not cartoonish
   - Clear visual hierarchy
   - Educational accuracy is paramount

5. ESSENTIAL DETAILS:
   ${educationalContext}

Generate a complete, detailed prompt (200-250 words) that includes:
- Exact layout description
- Specific visual elements with their positions
- All text content in ${language}
- Color scheme suggestions
- Style and tone
- Educational accuracy notes

RESPOND WITH ONLY THE PROMPT - no explanations, no meta-commentary, just the detailed image generation prompt:`,
                  },
                ],
              },
            ],
            generationConfig: {
              maxOutputTokens: 300,
              temperature: 0.6,
              topP: 0.85,
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
    const fallback = this.createFallbackPrompt(
      query,
      category,
      language,
      aspectRatio
    );
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
   * Get layout guidance based on aspect ratio
   */
  private getLayoutGuidance(aspectRatio: string, language: string): string {
    const guidance: Record<string, string> = {
      "1:1": `Square format - balanced composition. Place title at top center, main diagram in middle, labels around diagram, footer/notes at bottom. Equal spacing on all sides.`,

      "16:9": `Wide landscape format - horizontal layout. Title spans across top, main visual content in center-left, explanatory text/labels on right side. Use horizontal flow for reading. Perfect for classroom projection.`,

      "9:16": `Tall portrait format - vertical layout. Title at top, stack visual elements vertically down the page, text labels alongside each section. Good for mobile viewing and notice boards.`,

      "4:3": `Standard landscape - title at top, main diagram/visual in center-upper area, detailed labels/explanations in lower portion. Classic poster layout.`,

      "3:4": `Standard portrait - vertical composition with title at top 15%, main visual in middle 50%, detailed text/notes in bottom 35%. Good for A4 printing.`,
    };

    return guidance[aspectRatio] || guidance["1:1"];
  }

  /**
   * Get detailed layout instructions based on aspect ratio
   */
  private getDetailedLayoutInstructions(
    aspectRatio: string,
    language: string
  ): string {
    const instructions: Record<string, string> = {
      "1:1": `- Top 20%: Bold title in ${language}
- Center 60%: Main educational diagram with clear labels
- Bottom 20%: Additional notes/explanation in ${language}
- Margins: Equal on all sides`,

      "16:9": `- Top strip: Title banner in ${language} spanning full width
- Left 60%: Main visual content and diagrams
- Right 40%: Vertical text panel with explanations in ${language}
- Use horizontal reading flow`,

      "9:16": `- Top 15%: Title section in ${language}
- Upper-mid 40%: Main diagram/illustration
- Lower-mid 30%: Labels and descriptions in ${language}
- Bottom 15%: Summary or key points
- Stack elements vertically`,

      "4:3": `- Top 15%: Title banner in ${language}
- Middle 50%: Main educational visual
- Bottom 35%: Detailed labels, steps, or explanation text in ${language}`,

      "3:4": `- Top 15%: Clear title in ${language}
- Upper 50%: Primary diagram/illustration
- Lower 35%: Text explanations and labels in ${language}
- Suitable for vertical printing`,
    };

    return instructions[aspectRatio] || instructions["1:1"];
  }

  /**
   * Create fallback prompt when enhancement fails
   */
  private createFallbackPrompt(
    query: string,
    category: string,
    language: string,
    aspectRatio: string = "1:1"
  ): string {
    const analysis = this.createFallbackAnalysis(query, category, language);
    const layoutGuide = this.getLayoutGuidance(aspectRatio, language);
    const layoutDetails = this.getDetailedLayoutInstructions(
      aspectRatio,
      language
    );

    return `Educational poster about "${query}" in ${aspectRatio} format for Indian students.

TOPIC DETAILS: ${analysis.topic}

VISUAL ELEMENTS TO INCLUDE:
${analysis.keyElements.map((el, i) => `${i + 1}. ${el}`).join("\n")}

TEXT ELEMENTS IN ${language}:
${analysis.textElements.map((el, i) => `- ${el}`).join("\n")}

LAYOUT GUIDANCE: ${layoutGuide}

LAYOUT STRUCTURE:
${layoutDetails}

DESIGN REQUIREMENTS:
- Professional educational poster style with ${analysis.visualStyle}
- High contrast colors for maximum readability
- Clear, legible ${language} text with proper spelling and grammar
- Professional typography suitable for classroom display
- Indian educational context and culturally appropriate imagery
- Clean, organized layout with no overlapping text
- Vibrant colors but professional appearance
- Educational accuracy is critical

Create a detailed, informative poster with all elements clearly labeled in ${language}, organized according to the ${aspectRatio} aspect ratio specifications.`;
  }

  /**
   * Generate multiple variations
   */
  async generateMultiplePosters(
    query: string,
    category: string,
    count: number = 4,
    language: string = "English",
    aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" = "1:1"
  ): Promise<Array<{ imageBase64: string; enhancedPrompt: string }>> {
    // Enhance once with aspect ratio consideration
    const enhancedPrompt = await this.enhanceQuery({
      query,
      category,
      language,
      aspectRatio,
    });

    // Generate images in parallel (limited concurrency)
    const results: Array<{ imageBase64: string; enhancedPrompt: string }> = [];

    // Generate in batches of 2 to avoid rate limiting
    for (let i = 0; i < count; i += 2) {
      const batchSize = Math.min(2, count - i);
      const promises = Array(batchSize)
        .fill(null)
        .map(() => this.generateImage({ prompt: enhancedPrompt, aspectRatio }));

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

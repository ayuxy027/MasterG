import axios from "axios";
import env from "../config/env";

/**
 * Vertex AI Image Generation Service
 * Uses Gemini 2.0 Flash for generating presentation slide images
 *
 * This service generates complete slide images with:
 * - Proper text placement
 * - Template-based styling
 * - Educational visual elements
 */
export class VertexImageService {
  private apiKey: string;
  private projectId: string;
  private location: string;
  private model: string = "gemini-2.0-flash-exp"; // Gemini with image generation capabilities

  constructor() {
    this.apiKey = env.GEMMA_API_KEY;
    this.projectId = env.GOOGLE_PROJECT_ID;
    this.location = env.GOOGLE_LOCATION_ID;
  }

  /**
   * Generate a slide image using Gemini's image generation
   * Creates a complete slide with text, graphics, and proper layout
   */
  async generateSlideImage(
    slideData: {
      title: string;
      content: string;
      slideNumber: number;
      totalSlides: number;
      imagePrompt?: string;
    },
    templateStyle: string,
    presentationStyle: string,
    targetAudience: string
  ): Promise<{ imageBase64: string; imageUrl: string } | null> {
    try {
      console.log(
        `🎨 Generating image for slide ${slideData.slideNumber}/${slideData.totalSlides}`
      );

      // Build the image generation prompt
      const prompt = this.buildSlideImagePrompt(
        slideData,
        templateStyle,
        presentationStyle,
        targetAudience
      );

      // Use Gemini API for image generation via Imagen
      const imageData = await this.generateWithGemini(prompt, slideData);

      if (imageData) {
        return imageData;
      }

      // Fallback: Generate a placeholder or use template-based image
      return await this.generateFallbackSlideImage(slideData, templateStyle);
    } catch (error) {
      console.error(
        `❌ Error generating slide image for slide ${slideData.slideNumber}:`,
        error
      );
      return await this.generateFallbackSlideImage(slideData, templateStyle);
    }
  }

  /**
   * Build a detailed prompt for slide image generation
   */
  private buildSlideImagePrompt(
    slideData: {
      title: string;
      content: string;
      slideNumber: number;
      totalSlides: number;
      imagePrompt?: string;
    },
    templateStyle: string,
    presentationStyle: string,
    targetAudience: string
  ): string {
    // Define template-based styling
    const templateStyles: Record<string, string> = {
      modern:
        "Clean minimalist design with gradient backgrounds, subtle geometric shapes, modern sans-serif typography",
      classic:
        "Traditional professional design with solid colors, classic serif fonts, formal layout",
      creative:
        "Bold vibrant colors, dynamic shapes, artistic elements, creative typography",
      professional:
        "Corporate sleek design, dark themes, subtle accents, professional icons",
      educational:
        "Friendly engaging design, bright colors, illustrated elements, approachable style",
      minimal:
        "Ultra-clean design, lots of whitespace, simple geometric accents, elegant typography",
    };

    // Define audience-appropriate visual style
    const audienceStyles: Record<string, string> = {
      school:
        "colorful, fun illustrations, simple icons, engaging visuals for young learners",
      college:
        "academic diagrams, infographics, balanced visuals for university students",
      professional:
        "data visualizations, charts, corporate imagery, business-appropriate",
      training:
        "step-by-step visuals, instructional graphics, hands-on demonstration style",
    };

    const styleDescription =
      templateStyles[templateStyle] || templateStyles.modern;
    const audienceDescription =
      audienceStyles[targetAudience] || audienceStyles.college;

    // Use custom image prompt if provided, otherwise create one
    const visualContext =
      slideData.imagePrompt ||
      `Educational visual related to: ${slideData.title}`;

    return `Create a professional presentation slide image with the following specifications:

SLIDE LAYOUT:
- Slide number: ${slideData.slideNumber} of ${slideData.totalSlides}
- Aspect ratio: 16:9 (widescreen presentation format)
- Resolution: High quality, suitable for projection

DESIGN STYLE:
${styleDescription}

AUDIENCE: ${audienceDescription}

CONTENT TO VISUALIZE:
Title: "${slideData.title}"

Key Points:
${slideData.content}

VISUAL ELEMENTS:
${visualContext}

REQUIREMENTS:
1. Create a COMPLETE slide design (not just an illustration)
2. Include a prominent title area at the top
3. Use appropriate icons, diagrams, or illustrations that support the content
4. Apply ${templateStyle} template styling throughout
5. Ensure text placeholders are clearly defined areas
6. Make it visually appealing and professional
7. Use colors and typography consistent with the ${templateStyle} template
8. Include subtle branding elements (slide number indicator)

The image should be a complete presentation slide ready to display, with clear visual hierarchy and professional design.`;
  }

  /**
   * Generate image using Google Gemini API with image generation
   */
  private async generateWithGemini(
    prompt: string,
    slideData: { title: string; content: string; slideNumber: number }
  ): Promise<{ imageBase64: string; imageUrl: string } | null> {
    try {
      // Gemini 2.0 Flash with image generation capabilities
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.apiKey}`;

      // Request for visual content generation
      const response = await axios.post(
        apiUrl,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ["image", "text"],
            responseMimeType: "image/png",
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 60000, // 60 second timeout for image generation
        }
      );

      // Check if we got an image response
      const parts = response.data?.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData?.mimeType?.startsWith("image/")) {
            const base64Data = part.inlineData.data;
            return {
              imageBase64: base64Data,
              imageUrl: `data:${part.inlineData.mimeType};base64,${base64Data}`,
            };
          }
        }
      }

      console.log("⚠️ No image in Gemini response, using fallback");
      return null;
    } catch (error: any) {
      console.error(
        "Gemini image generation error:",
        error.response?.data || error.message
      );
      return null;
    }
  }

  /**
   * Generate a fallback slide image using SVG-based template
   * Creates a visually appealing slide without AI image generation
   */
  private async generateFallbackSlideImage(
    slideData: {
      title: string;
      content: string;
      slideNumber: number;
      totalSlides: number;
    },
    templateStyle: string
  ): Promise<{ imageBase64: string; imageUrl: string }> {
    // Template color schemes
    const colorSchemes: Record<
      string,
      {
        primary: string;
        secondary: string;
        bg: string;
        text: string;
        accent: string;
      }
    > = {
      modern: {
        primary: "#F97316",
        secondary: "#FDBA74",
        bg: "#FFF7ED",
        text: "#1F2937",
        accent: "#EA580C",
      },
      classic: {
        primary: "#3B82F6",
        secondary: "#93C5FD",
        bg: "#EFF6FF",
        text: "#1E3A8A",
        accent: "#2563EB",
      },
      creative: {
        primary: "#A855F7",
        secondary: "#E879F9",
        bg: "#FAF5FF",
        text: "#581C87",
        accent: "#9333EA",
      },
      professional: {
        primary: "#374151",
        secondary: "#6B7280",
        bg: "#F3F4F6",
        text: "#111827",
        accent: "#4B5563",
      },
      educational: {
        primary: "#10B981",
        secondary: "#6EE7B7",
        bg: "#ECFDF5",
        text: "#064E3B",
        accent: "#059669",
      },
      minimal: {
        primary: "#64748B",
        secondary: "#94A3B8",
        bg: "#F8FAFC",
        text: "#1E293B",
        accent: "#475569",
      },
    };

    const colors = colorSchemes[templateStyle] || colorSchemes.modern;

    // Format content into bullet points
    const bulletPoints = slideData.content
      .split("\n")
      .filter((line) => line.trim())
      .slice(0, 5) // Max 5 bullet points
      .map((line) => line.replace(/^[-•*]\s*/, "").trim());

    // Create SVG slide
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.bg};stop-opacity:1" />
      <stop offset="100%" style="stop-color:white;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${
        colors.secondary
      };stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="1920" height="1080" fill="url(#bgGradient)"/>
  
  <!-- Decorative elements -->
  <rect x="0" y="0" width="1920" height="8" fill="url(#accentGradient)"/>
  <circle cx="1800" cy="150" r="200" fill="${colors.secondary}" opacity="0.2"/>
  <circle cx="1750" cy="250" r="100" fill="${colors.primary}" opacity="0.15"/>
  
  <!-- Title section -->
  <rect x="80" y="100" width="12" height="100" rx="6" fill="${colors.primary}"/>
  <text x="120" y="170" font-family="system-ui, -apple-system, sans-serif" font-size="64" font-weight="700" fill="${
    colors.text
  }">
    ${this.escapeXml(slideData.title.substring(0, 50))}${
      slideData.title.length > 50 ? "..." : ""
    }
  </text>
  
  <!-- Content area -->
  <g transform="translate(120, 280)">
    ${bulletPoints
      .map(
        (point, index) => `
    <g transform="translate(0, ${index * 120})">
      <circle cx="20" cy="30" r="12" fill="${colors.primary}"/>
      <text x="60" y="40" font-family="system-ui, -apple-system, sans-serif" font-size="36" fill="${
        colors.text
      }">
        ${this.escapeXml(point.substring(0, 80))}${
          point.length > 80 ? "..." : ""
        }
      </text>
    </g>
    `
      )
      .join("")}
  </g>
  
  <!-- Visual placeholder area -->
  <rect x="1200" y="300" width="600" height="500" rx="20" fill="${
    colors.secondary
  }" opacity="0.3"/>
  <text x="1500" y="550" font-family="system-ui, sans-serif" font-size="24" fill="${
    colors.text
  }" opacity="0.6" text-anchor="middle">
    Visual Content
  </text>
  <text x="1500" y="580" font-family="system-ui, sans-serif" font-size="18" fill="${
    colors.text
  }" opacity="0.4" text-anchor="middle">
    Illustration Area
  </text>
  
  <!-- Footer -->
  <rect x="0" y="1040" width="1920" height="40" fill="${
    colors.primary
  }" opacity="0.1"/>
  <text x="1840" y="1060" font-family="system-ui, sans-serif" font-size="24" fill="${
    colors.text
  }" opacity="0.6" text-anchor="end">
    ${slideData.slideNumber} / ${slideData.totalSlides}
  </text>
</svg>`;

    // Convert SVG to base64
    const base64 = Buffer.from(svg).toString("base64");

    return {
      imageBase64: base64,
      imageUrl: `data:image/svg+xml;base64,${base64}`,
    };
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  /**
   * Generate images for all slides in a presentation
   */
  async generateAllSlideImages(
    slides: Array<{
      id: string;
      title: string;
      content: string;
      imagePrompt?: string;
      position: number;
    }>,
    templateStyle: string,
    presentationStyle: string,
    targetAudience: string
  ): Promise<Map<string, { imageBase64: string; imageUrl: string }>> {
    const imageMap = new Map<
      string,
      { imageBase64: string; imageUrl: string }
    >();
    const totalSlides = slides.length;

    console.log(`🖼️ Generating images for ${totalSlides} slides...`);

    // Process slides sequentially to avoid rate limiting
    for (const slide of slides) {
      const imageData = await this.generateSlideImage(
        {
          title: slide.title,
          content: slide.content,
          slideNumber: slide.position,
          totalSlides,
          imagePrompt: slide.imagePrompt,
        },
        templateStyle,
        presentationStyle,
        targetAudience
      );

      if (imageData) {
        imageMap.set(slide.id, imageData);
      }

      // Small delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(`✅ Generated ${imageMap.size}/${totalSlides} slide images`);
    return imageMap;
  }
}

export const vertexImageService = new VertexImageService();

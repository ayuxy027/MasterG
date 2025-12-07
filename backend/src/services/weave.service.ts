import {
  PresentationRequest,
  PresentationResponse,
  Slide,
  Presentation,
} from "../types";
import { groqService } from "./groq.service";
import { vertexImageService } from "./vertexImage.service";
import { v4 as uuidv4 } from "uuid";
import { SUPPORTED_LANGUAGES, LanguageCode } from "../config/constants";

export class WeaveService {
  /**
   * Generate a presentation based on user request
   * Flow:
   * 1. Generate slide content using Groq (text, titles, speaker notes)
   * 2. Generate slide images using template-based SVG
   * 3. Combine into complete presentation
   */
  async generatePresentation(
    request: PresentationRequest
  ): Promise<PresentationResponse> {
    console.log(
      `🌐 Generating presentation in ${
        SUPPORTED_LANGUAGES[request.language] || request.language
      }`
    );
    console.log(
      `📊 Topic: "${request.topic}" | Slides: ${request.numSlides} | Style: ${request.presentationStyle} | Template: ${request.template}`
    );

    try {
      // Step 1: Generate slide content using AI (Groq)
      console.log("📝 Step 1: Generating slide content with AI...");
      const slides = await this.generateSlidesWithAI(request);

      if (!slides || slides.length === 0) {
        throw new Error("Failed to generate slide content");
      }

      console.log(`✅ Generated ${slides.length} slides with content`);

      // Step 2: Generate slide images using template-based approach
      console.log("🎨 Step 2: Generating slide images...");
      const slidesWithImages = await this.generateSlideImages(slides, request);

      // Verify all slides have images
      const slidesWithValidImages = slidesWithImages.filter((s) => s.imageUrl);
      console.log(
        `✅ ${slidesWithValidImages.length}/${slides.length} slides have images`
      );

      // Step 3: Create presentation response
      const presentationResponse: PresentationResponse = {
        id: uuidv4(),
        title: request.topic,
        topic: request.topic,
        language: request.language,
        presentationStyle: request.presentationStyle,
        targetAudience: request.targetAudience,
        template: request.template,
        slides: slidesWithImages,
        createdAt: new Date(),
      };

      console.log(
        `✅ Presentation generated successfully with ${slidesWithImages.length} slides`
      );
      return presentationResponse;
    } catch (error) {
      console.error("❌ Error generating presentation:", error);
      throw new Error(
        `Failed to generate presentation: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Generate images for all slides using template-based SVG approach
   */
  private async generateSlideImages(
    slides: Slide[],
    request: PresentationRequest
  ): Promise<Slide[]> {
    try {
      console.log(`🎨 Generating ${slides.length} slide images...`);

      // Generate images for all slides
      const imageMap = await vertexImageService.generateAllSlideImages(
        slides.map((s) => ({
          id: s.id,
          title: s.title,
          content: s.content,
          imagePrompt: s.imagePrompt,
          position: s.position,
        })),
        request.template,
        request.presentationStyle,
        request.targetAudience
      );

      // Add image URLs to slides
      const slidesWithImages = slides.map((slide) => {
        const imageData = imageMap.get(slide.id);
        if (imageData) {
          return {
            ...slide,
            imageUrl: imageData.imageUrl,
            imageBase64: imageData.imageBase64,
          };
        } else {
          console.warn(
            `⚠️ No image generated for slide ${slide.position}: ${slide.title}`
          );
          return slide;
        }
      });

      const successCount = slidesWithImages.filter((s) => s.imageUrl).length;
      console.log(
        `✅ ${successCount}/${slides.length} slides have images attached`
      );

      return slidesWithImages;
    } catch (error) {
      console.error(
        "⚠️ Image generation failed, returning slides without images:",
        error
      );
      return slides;
    }
  }

  /**
   * Use AI to generate individual slides with titles, content, and speaker notes
   */
  private async generateSlidesWithAI(
    request: PresentationRequest
  ): Promise<Slide[]> {
    const languageName =
      SUPPORTED_LANGUAGES[request.language] || request.language;

    // Build a detailed prompt for the AI to generate a complete presentation
    const prompt = this.buildPresentationPrompt(request, languageName);

    try {
      console.log(
        `🤖 Generating presentation with Groq API for topic: "${request.topic}"`
      );

      // Use the groq service to generate the presentation
      const response = await groqService.chatCompletion(
        [
          {
            role: "system",
            content: `You are an expert presentation creator. Generate comprehensive presentations with well-structured slides, appropriate for the specified audience and style. Create content in ${languageName}.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        "json_object"
      ); // Request JSON format for structured output

      // Parse the AI response
      const aiResponse = this.parseAIResponse(response);

      // Convert to Slide objects
      const slides = this.convertToSlides(aiResponse.slides, request.language);

      return slides;
    } catch (error) {
      console.error("❌ Error generating slides with AI:", error);

      // Fallback: Generate basic slides if AI fails
      return this.generateFallbackSlides(request);
    }
  }

  /**
   * Build the prompt for the presentation generation
   */
  private buildPresentationPrompt(
    request: PresentationRequest,
    languageName: string
  ): string {
    // Define audience-appropriate complexity
    const audienceComplexity = this.getAudienceComplexity(
      request.targetAudience
    );

    // Define style-specific tone
    const styleTone = this.getStyleTone(request.presentationStyle);

    // Build custom criteria string
    const customCriteriaStr =
      request.customCriteria && request.customCriteria.length > 0
        ? `\n\nCUSTOM CRITERIA:\n${request.customCriteria
            .map((c) => `- ${c.label}: ${c.value}`)
            .join("\n")}`
        : "";

    return `Generate a comprehensive educational presentation with EXACTLY ${request.numSlides} slides on the topic: "${request.topic}"

AUDIENCE: ${request.targetAudience} (${audienceComplexity})
STYLE: ${request.presentationStyle} (${styleTone})
LANGUAGE: ${languageName}
TEMPLATE: ${request.template}
NUMBER OF SLIDES: ${request.numSlides}

${customCriteriaStr}

CRITICAL INSTRUCTIONS:
1. Generate EXACTLY ${request.numSlides} slides - no more, no less
2. Each slide must have a clear title, detailed content, and comprehensive speaker notes
3. Content should be in ${languageName} language
4. Format content as bullet points when appropriate
5. Each slide should have 3-5 key points with explanations
6. Speaker notes should provide additional context and talking points

Generate a JSON response with this EXACT structure:
{
  "slides": [
    {
      "title": "Clear, informative slide title",
      "content": "• Bullet point 1 with detailed explanation\n• Bullet point 2 with context\n• Bullet point 3 with examples\n• Additional key point if relevant",
      "speakerNotes": "Detailed presenter notes with talking points, explanations, examples, and additional context that helps the presenter deliver the content effectively",
      "imagePrompt": "Detailed description of an educational diagram or illustration that would enhance this slide"
    }
  ]
}

SLIDE STRUCTURE GUIDELINES:
- Slide 1: Introduction - Overview of the topic, objectives, and what will be covered
- Middle Slides: Core content - Break down the topic into logical sections
- Last Slide: Conclusion - Summary, key takeaways, and call to action

Make each slide informative, engaging, and appropriate for the ${request.targetAudience} audience with ${request.presentationStyle} style.`;
  }

  /**
   * Define audience complexity levels
   */
  private getAudienceComplexity(audience: string): string {
    switch (audience) {
      case "school":
        return "Simple language, basic concepts, age-appropriate examples";
      case "college":
        return "Moderate complexity, detailed explanations, academic tone";
      case "professional":
        return "Advanced terminology, industry-specific examples, results-focused";
      case "training":
        return "Practical applications, step-by-step instructions, hands-on focus";
      default:
        return "Moderate complexity, general audience";
    }
  }

  /**
   * Define style-specific tones
   */
  private getStyleTone(style: string): string {
    switch (style) {
      case "academic":
        return "Formal, research-based, evidence-focused";
      case "business":
        return "Professional, results-oriented, data-driven";
      case "storytelling":
        return "Narrative, engaging, example-rich";
      case "technical":
        return "Detailed, precise, process-focused";
      default:
        return "Balanced, clear, informative";
    }
  }

  /**
   * Parse the AI response and validate structure
   */
  private parseAIResponse(response: string): {
    slides: Array<{
      title: string;
      content: string;
      speakerNotes: string;
      imagePrompt?: string;
    }>;
  } {
    try {
      // Try to extract JSON from response if it's wrapped in text
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let parsed = JSON.parse(jsonMatch[0]);

        // Validate the structure
        if (!parsed.slides || !Array.isArray(parsed.slides)) {
          console.error("Invalid response format: missing slides array");
          throw new Error("Invalid response format: missing slides array");
        }

        // Ensure all slides have required properties
        parsed.slides = parsed.slides.map((slide: any, index: number) => ({
          title: slide.title || `Slide ${index + 1}`,
          content: slide.content || "Content to be added",
          speakerNotes: slide.speakerNotes || "Speaker notes to be added",
          imagePrompt: slide.imagePrompt,
        }));

        console.log(
          `✅ Parsed ${parsed.slides.length} slides from AI response`
        );
        return parsed;
      } else {
        console.error("No valid JSON found in response");
        throw new Error("No valid JSON found in response");
      }
    } catch (error) {
      console.error("Error parsing AI response:", error);
      console.error("Response sample:", response.substring(0, 200));
      throw new Error(
        `Failed to parse AI response: ${
          error instanceof Error ? error.message : "Invalid format"
        }`
      );
    }
  }

  /**
   * Convert AI response to Slide objects
   */
  private convertToSlides(
    aiSlides: Array<{
      title: string;
      content: string;
      speakerNotes: string;
      imagePrompt?: string;
    }>,
    language: LanguageCode
  ): Slide[] {
    return aiSlides.map((slide, index) => ({
      id: uuidv4(),
      title: slide.title,
      content: slide.content,
      speakerNotes: slide.speakerNotes,
      imagePrompt: slide.imagePrompt,
      position: index + 1,
    }));
  }

  /**
   * Generate fallback slides if AI generation fails
   */
  private generateFallbackSlides(request: PresentationRequest): Slide[] {
    console.log("🔄 Using fallback slide generation");

    const slides: Slide[] = [];
    const topic = request.topic;

    // Generate structured slides based on topic
    const slideTemplates = [
      {
        title: `Introduction to ${topic}`,
        content: `• Overview of ${topic}\n• Key concepts and terminology\n• Objectives and learning outcomes\n• What we will cover in this presentation`,
        speakerNotes: `Welcome the audience and introduce the topic of ${topic}. Explain the importance and relevance of this subject. Set clear expectations for what will be covered.`,
      },
      {
        title: `Understanding ${topic}`,
        content: `• Core principles and foundations\n• Key components and elements\n• Historical context and development\n• Current relevance and applications`,
        speakerNotes: `Dive into the fundamental concepts. Explain the core principles that form the foundation of ${topic}. Provide historical context where relevant.`,
      },
      {
        title: `Key Features of ${topic}`,
        content: `• Main characteristics and properties\n• Important aspects to consider\n• Common patterns and approaches\n• Real-world examples`,
        speakerNotes: `Highlight the key features and characteristics. Use concrete examples to illustrate the main points. Relate to audience experience.`,
      },
      {
        title: `Practical Applications`,
        content: `• Real-world use cases\n• Industry examples and case studies\n• Best practices and methodologies\n• Common scenarios and solutions`,
        speakerNotes: `Show practical applications of ${topic}. Provide concrete examples from industry or daily life. Discuss best practices.`,
      },
      {
        title: `Benefits and Advantages`,
        content: `• Key benefits and positive outcomes\n• Advantages over alternatives\n• Success stories and results\n• Value proposition`,
        speakerNotes: `Emphasize the benefits and advantages of understanding ${topic}. Share success stories and positive outcomes.`,
      },
      {
        title: `Challenges and Solutions`,
        content: `• Common challenges and obstacles\n• Potential pitfalls to avoid\n• Problem-solving strategies\n• How to overcome difficulties`,
        speakerNotes: `Address potential challenges honestly. Provide practical solutions and strategies for overcoming obstacles.`,
      },
      {
        title: `Implementation Steps`,
        content: `• Step-by-step approach\n• Getting started guide\n• Resources and tools needed\n• Timeline and milestones`,
        speakerNotes: `Provide a clear, actionable roadmap for implementing or applying the concepts discussed.`,
      },
      {
        title: `Key Takeaways`,
        content: `• Main points to remember\n• Critical insights and lessons\n• Action items and next steps\n• Resources for further learning`,
        speakerNotes: `Summarize the most important points. Provide clear action items for the audience to take away.`,
      },
      {
        title: `Conclusion and Next Steps`,
        content: `• Summary of key concepts\n• Review of main objectives\n• Recommended next actions\n• Questions and discussion`,
        speakerNotes: `Wrap up the presentation with a strong conclusion. Invite questions and discussion. Provide guidance on next steps.`,
      },
    ];

    // Use templates up to numSlides
    for (let i = 0; i < request.numSlides; i++) {
      const template = slideTemplates[i % slideTemplates.length];
      slides.push({
        id: uuidv4(),
        title: template.title,
        content: template.content,
        speakerNotes: template.speakerNotes,
        position: i + 1,
      });
    }

    return slides.slice(0, request.numSlides);
  }

  /**
   * Get a presentation by ID
   */
  async getPresentationById(id: string): Promise<PresentationResponse | null> {
    // TODO: Implement database storage and retrieval
    // For now, this is a stub that would connect to MongoDB
    console.log(`🔍 Fetching presentation: ${id}`);
    return null; // Placeholder - implement with database
  }

  /**
   * Save a presentation to database
   */
  async savePresentation(
    presentation: Presentation,
    userId: string
  ): Promise<Presentation> {
    // TODO: Implement database storage
    console.log(`💾 Saving presentation for user: ${userId}`);

    // Add user ID and timestamps
    return {
      ...presentation,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Export presentation in specified format
   */
  async exportPresentation(
    id: string,
    format: "pdf" | "pptx" | "json"
  ): Promise<any> {
    console.log(`📤 Exporting presentation ${id} as ${format}`);

    // For now return a placeholder - this would connect to actual export functionality
    const presentation = await this.getPresentationById(id);

    if (!presentation) {
      throw new Error("Presentation not found");
    }

    switch (format) {
      case "json":
        return JSON.stringify(presentation, null, 2);
      case "pdf":
        // TODO: Implement PDF generation
        return `PDF export for presentation ${id} would be generated here`;
      case "pptx":
        // TODO: Implement PPTX generation
        return `PPTX export for presentation ${id} would be generated here`;
      default:
        throw new Error("Unsupported export format");
    }
  }
}

export const weaveService = new WeaveService();

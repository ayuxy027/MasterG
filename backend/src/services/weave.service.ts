import { PresentationRequest, PresentationResponse, Slide, Presentation } from '../types';
import { groqService } from './groq.service';
import { vertexImageService } from './vertexImage.service';
import { v4 as uuidv4 } from 'uuid';
import { SUPPORTED_LANGUAGES, LanguageCode } from '../config/constants';

export class WeaveService {
  /**
   * Generate a presentation based on user request
   * Flow:
   * 1. Generate slide content using Groq (text, titles, speaker notes)
   * 2. Generate slide images using Vertex AI Gemini
   * 3. Combine into complete presentation
   */
  async generatePresentation(request: PresentationRequest): Promise<PresentationResponse> {
    console.log(`🌐 Generating presentation in ${SUPPORTED_LANGUAGES[request.language] || request.language}`);

    try {
      // Step 1: Generate slide content using AI (Groq)
      console.log('📝 Step 1: Generating slide content with Groq...');
      const slides = await this.generateSlidesWithAI(request);

      // Step 2: Generate slide images using Vertex AI
      console.log('🎨 Step 2: Generating slide images with Vertex AI...');
      const slidesWithImages = await this.generateSlideImages(slides, request);

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

      console.log(`✅ Generated ${slidesWithImages.length} slides with images for presentation`);
      return presentationResponse;
    } catch (error) {
      console.error('❌ Error generating presentation:', error);
      throw new Error(`Failed to generate presentation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate images for all slides using Vertex AI
   */
  private async generateSlideImages(
    slides: Slide[],
    request: PresentationRequest
  ): Promise<Slide[]> {
    try {
      // Generate images for all slides
      const imageMap = await vertexImageService.generateAllSlideImages(
        slides.map(s => ({
          id: s.id,
          title: s.title,
          content: s.content,
          imagePrompt: s.imagePrompt,
          position: s.position
        })),
        request.template,
        request.presentationStyle,
        request.targetAudience
      );

      // Add image URLs to slides
      return slides.map(slide => {
        const imageData = imageMap.get(slide.id);
        return {
          ...slide,
          imageUrl: imageData?.imageUrl || undefined,
          imageBase64: imageData?.imageBase64 || undefined
        };
      });
    } catch (error) {
      console.error('⚠️ Image generation failed, returning slides without images:', error);
      return slides;
    }
  }

  /**
   * Use AI to generate individual slides with titles, content, and speaker notes
   */
  private async generateSlidesWithAI(request: PresentationRequest): Promise<Slide[]> {
    const languageName = SUPPORTED_LANGUAGES[request.language] || request.language;

    // Build a detailed prompt for the AI to generate a complete presentation
    const prompt = this.buildPresentationPrompt(request, languageName);

    try {
      console.log(`🤖 Generating presentation with Groq API for topic: "${request.topic}"`);

      // Use the groq service to generate the presentation
      const response = await groqService.chatCompletion([
        {
          role: 'system',
          content: `You are an expert presentation creator. Generate comprehensive presentations with well-structured slides, appropriate for the specified audience and style. Create content in ${languageName}.`
        },
        {
          role: 'user',
          content: prompt
        }
      ], 'json_object'); // Request JSON format for structured output

      // Parse the AI response
      const aiResponse = this.parseAIResponse(response);

      // Convert to Slide objects
      const slides = this.convertToSlides(aiResponse.slides, request.language);

      return slides;
    } catch (error) {
      console.error('❌ Error generating slides with AI:', error);

      // Fallback: Generate basic slides if AI fails
      return this.generateFallbackSlides(request);
    }
  }

  /**
   * Build the prompt for the presentation generation
   */
  private buildPresentationPrompt(request: PresentationRequest, languageName: string): string {
    // Define audience-appropriate complexity
    const audienceComplexity = this.getAudienceComplexity(request.targetAudience);

    // Define style-specific tone
    const styleTone = this.getStyleTone(request.presentationStyle);

    // Build custom criteria string
    const customCriteriaStr = request.customCriteria && request.customCriteria.length > 0
      ? `\n\nCUSTOM CRITERIA:\n${request.customCriteria.map(c => `- ${c.label}: ${c.value}`).join('\n')}`
      : '';

    return `Generate a presentation with ${request.numSlides} slides on the topic: "${request.topic}"

AUDIENCE: ${request.targetAudience} (${audienceComplexity})
STYLE: ${request.presentationStyle} (${styleTone})
LANGUAGE: ${languageName}
TEMPLATE: ${request.template}
NUMBER OF SLIDES: ${request.numSlides}

${customCriteriaStr}

Generate a comprehensive JSON response with the following structure:
{
  "slides": [
    {
      "title": "Slide title",
      "content": "Detailed slide content with key points, explanations, and structured information",
      "speakerNotes": "Detailed notes for the presenter to explain the slide content, including talking points and additional context",
      "imagePrompt": "A detailed prompt for generating an appropriate educational image or diagram for this slide"
    }
  ]
}

Each slide should have:
- A clear, informative title
- Rich content with bullet points, explanations, and context appropriate for the audience
- Detailed speaker notes to help the presenter
- An image prompt for visual content

The content should be in ${languageName} and match the ${request.presentationStyle} style for ${request.targetAudience} audience.

Make sure the content is educational, well-structured, and informative.`;
  }

  /**
   * Define audience complexity levels
   */
  private getAudienceComplexity(audience: string): string {
    switch (audience) {
      case 'school':
        return 'Simple language, basic concepts, age-appropriate examples';
      case 'college':
        return 'Moderate complexity, detailed explanations, academic tone';
      case 'professional':
        return 'Advanced terminology, industry-specific examples, results-focused';
      case 'training':
        return 'Practical applications, step-by-step instructions, hands-on focus';
      default:
        return 'Moderate complexity, general audience';
    }
  }

  /**
   * Define style-specific tones
   */
  private getStyleTone(style: string): string {
    switch (style) {
      case 'academic':
        return 'Formal, research-based, evidence-focused';
      case 'business':
        return 'Professional, results-oriented, data-driven';
      case 'storytelling':
        return 'Narrative, engaging, example-rich';
      case 'technical':
        return 'Detailed, precise, process-focused';
      default:
        return 'Balanced, clear, informative';
    }
  }

  /**
   * Parse the AI response and validate structure
   */
  private parseAIResponse(response: string): { slides: Array<{ title: string; content: string; speakerNotes: string; imagePrompt?: string }> } {
    try {
      // Try to extract JSON from response if it's wrapped in text
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let parsed = JSON.parse(jsonMatch[0]);

        // Validate the structure
        if (!parsed.slides || !Array.isArray(parsed.slides)) {
          throw new Error('Invalid response format: missing slides array');
        }

        // Ensure all slides have required properties
        parsed.slides = parsed.slides.map((slide: any, index: number) => ({
          title: slide.title || `Slide ${index + 1}`,
          content: slide.content || 'Content to be added',
          speakerNotes: slide.speakerNotes || 'Speaker notes to be added',
          imagePrompt: slide.imagePrompt
        }));

        return parsed;
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
      throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Invalid format'}`);
    }
  }

  /**
   * Convert AI response to Slide objects
   */
  private convertToSlides(
    aiSlides: Array<{ title: string; content: string; speakerNotes: string; imagePrompt?: string }>,
    language: LanguageCode
  ): Slide[] {
    return aiSlides.map((slide, index) => ({
      id: uuidv4(),
      title: slide.title,
      content: slide.content,
      speakerNotes: slide.speakerNotes,
      imagePrompt: slide.imagePrompt,
      position: index + 1
    }));
  }

  /**
   * Generate fallback slides if AI generation fails
   */
  private generateFallbackSlides(request: PresentationRequest): Slide[] {
    console.log('🔄 Using fallback slide generation');

    const slides: Slide[] = [];
    const baseTitle = request.topic.substring(0, 30);

    for (let i = 0; i < request.numSlides; i++) {
      slides.push({
        id: uuidv4(),
        title: `${baseTitle} - Slide ${i + 1}`,
        content: `Content for slide ${i + 1} about ${request.topic}. This is placeholder content that would normally be generated by AI based on your presentation requirements.`,
        speakerNotes: `Speaker notes for slide ${i + 1}. Provide additional context and talking points related to the slide content.`,
        position: i + 1
      });
    }

    return slides;
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
  async savePresentation(presentation: Presentation, userId: string): Promise<Presentation> {
    // TODO: Implement database storage
    console.log(`💾 Saving presentation for user: ${userId}`);

    // Add user ID and timestamps
    return {
      ...presentation,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Export presentation in specified format
   */
  async exportPresentation(id: string, format: 'pdf' | 'pptx' | 'json'): Promise<any> {
    console.log(`📤 Exporting presentation ${id} as ${format}`);

    // For now return a placeholder - this would connect to actual export functionality
    const presentation = await this.getPresentationById(id);

    if (!presentation) {
      throw new Error('Presentation not found');
    }

    switch (format) {
      case 'json':
        return JSON.stringify(presentation, null, 2);
      case 'pdf':
        // TODO: Implement PDF generation
        return `PDF export for presentation ${id} would be generated here`;
      case 'pptx':
        // TODO: Implement PPTX generation
        return `PPTX export for presentation ${id} would be generated here`;
      default:
        throw new Error('Unsupported export format');
    }
  }
}

export const weaveService = new WeaveService();
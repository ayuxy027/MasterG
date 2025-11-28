import { Request, Response } from 'express';
import { posterService } from '../services/poster.service';

export class PosterController {
  /**
   * Generate educational poster(s)
   * POST /api/posters/generate
   */
  async generatePoster(req: Request, res: Response): Promise<void> {
    try {
      const {
        query,
        category = 'general-knowledge',
        language = 'English',
        count = 1,
        aspectRatio = '1:1'
      } = req.body;

      // Validation
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Query is required and must be a non-empty string'
        });
        return;
      }

      if (count < 1 || count > 4) {
        res.status(400).json({
          success: false,
          error: 'Count must be between 1 and 4'
        });
        return;
      }

      console.log(`🎨 Generating ${count} poster(s) for category: ${category}`);

      // Single image generation
      if (count === 1) {
        const enhancedPrompt = await posterService.enhanceQuery({
          query: query.trim(),
          category: category.trim(),
          language
        });

        const imageBase64 = await posterService.generateImage({
          prompt: enhancedPrompt,
          aspectRatio,
          sampleCount: 1
        });

        res.status(200).json({
          success: true,
          posters: [{
            imageBase64,
            enhancedPrompt,
            mimeType: 'image/png'
          }],
          metadata: {
            category,
            language,
            originalQuery: query.trim()
          }
        });
        return;
      }

      // Multiple images generation
      const posters = await posterService.generateMultiplePosters(
        query.trim(),
        category.trim(),
        count,
        language
      );

      res.status(200).json({
        success: true,
        posters: posters.map(poster => ({
          ...poster,
          mimeType: 'image/png'
        })),
        metadata: {
          category,
          language,
          originalQuery: query.trim(),
          count: posters.length
        }
      });
    } catch (error: any) {
      console.error('Poster generation error:', error);
      
      // Handle specific errors
      if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
        res.status(429).json({
          success: false,
          error: 'API rate limit exceeded. Please try again in a few minutes.'
        });
        return;
      }

      if (error.message?.includes('safety') || error.message?.includes('blocked')) {
        res.status(400).json({
          success: false,
          error: 'Content policy violation. Please modify your request to be more educational and appropriate.'
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate poster'
      });
    }
  }

  /**
   * Get available categories
   * GET /api/posters/categories
   */
  async getCategories(req: Request, res: Response): Promise<void> {
    const categories = [
      {
        id: 'science',
        name: 'Science',
        description: 'Scientific concepts, diagrams, experiments',
        icon: '🔬',
        examples: ['Photosynthesis diagram', 'Solar system', 'Water cycle']
      },
      {
        id: 'mathematics',
        name: 'Mathematics',
        description: 'Mathematical concepts, formulas, geometry',
        icon: '📐',
        examples: ['Pythagorean theorem', 'Number patterns', 'Geometric shapes']
      },
      {
        id: 'history',
        name: 'History',
        description: 'Historical events, monuments, freedom fighters',
        icon: '🏛️',
        examples: ['Indian freedom struggle', 'Mughal architecture', 'Ancient civilizations']
      },
      {
        id: 'geography',
        name: 'Geography',
        description: 'Maps, landforms, climate, cultures',
        icon: '🗺️',
        examples: ['India map with states', 'Rivers of India', 'Climate zones']
      },
      {
        id: 'social-studies',
        name: 'Social Studies',
        description: 'Civic education, society, culture',
        icon: '👥',
        examples: ['Indian festivals', 'Fundamental rights', 'Cultural diversity']
      },
      {
        id: 'languages',
        name: 'Languages',
        description: 'Grammar, vocabulary, literary concepts',
        icon: '📚',
        examples: ['Hindi varnamala', 'Parts of speech', 'Poetry themes']
      },
      {
        id: 'general-knowledge',
        name: 'General Knowledge',
        description: 'Facts, current affairs, awareness',
        icon: '🌟',
        examples: ['Famous personalities', 'Important dates', 'World capitals']
      },
      {
        id: 'motivational',
        name: 'Motivational',
        description: 'Inspiration, study tips, success stories',
        icon: '💪',
        examples: ['Study motivation', 'Time management', 'Goal setting']
      },
      {
        id: 'arts',
        name: 'Arts & Crafts',
        description: 'Art forms, techniques, creativity',
        icon: '🎨',
        examples: ['Madhubani art', 'Color wheel', 'Indian folk art']
      },
      {
        id: 'health-education',
        name: 'Health & Wellness',
        description: 'Health awareness, fitness, nutrition',
        icon: '❤️',
        examples: ['Balanced diet', 'Exercise benefits', 'Mental health']
      }
    ];

    res.status(200).json({
      success: true,
      categories
    });
  }

  /**
   * Get supported languages
   * GET /api/posters/languages
   */
  async getLanguages(req: Request, res: Response): Promise<void> {
    const languages = [
      { code: 'en', name: 'English', native: 'English' },
      { code: 'hi', name: 'Hindi', native: 'हिंदी' },
      { code: 'mr', name: 'Marathi', native: 'मराठी' },
      { code: 'bn', name: 'Bengali', native: 'বাংলা' },
      { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
      { code: 'te', name: 'Telugu', native: 'తెలుగు' },
      { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
      { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
      { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
      { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' }
    ];

    res.status(200).json({
      success: true,
      languages
    });
  }
}

export const posterController = new PosterController();

import Tesseract from 'tesseract.js';

export class OCRService {
  /**
   * Extract text from an image using OCR
   */
  async extractText(filePath: string, language: string = 'eng'): Promise<string> {
    try {
      console.log(`Starting OCR for ${filePath} with language: ${language}`);
      
      const { data: { text } } = await Tesseract.recognize(filePath, language, {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      if (!text || text.trim().length === 0) {
        throw new Error('No text content found in image');
      }

      return text.trim();
    } catch (error) {
      console.error('OCR extraction error:', error);
      throw new Error(`Failed to extract text from image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if file is an image
   */
  isImageFile(mimetype: string): boolean {
    return mimetype.startsWith('image/');
  }
}

export const ocrService = new OCRService();

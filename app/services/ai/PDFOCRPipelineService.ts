/**
 * PDF OCR Pipeline Service
 * 
 * Complete pipeline:
 * PDF File → Render Pages as Images → ML Kit OCR → Extracted Text → LLM Q&A
 * 
 * Dependencies:
 * - react-native-pdf (PDF rendering)
 * - react-native-view-shot (screenshot capture)
 * - @react-native-ml-kit/text-recognition (OCR)
 */

import TextRecognition from '@react-native-ml-kit/text-recognition';
import * as FileSystem from 'expo-file-system/legacy';

export interface PDFExtractionResult {
    text: string;
    pageCount: number;
    wordCount: number;
    pages: PageResult[];
    extractionTime: number;
}

export interface PageResult {
    pageNumber: number;
    text: string;
    wordCount: number;
}

export interface ExtractionProgress {
    currentPage: number;
    totalPages: number;
    status: string;
    percentage: number;
}

type ProgressCallback = (progress: ExtractionProgress) => void;

class PDFOCRPipelineService {
    private static instance: PDFOCRPipelineService;

    static getInstance(): PDFOCRPipelineService {
        if (!PDFOCRPipelineService.instance) {
            PDFOCRPipelineService.instance = new PDFOCRPipelineService();
        }
        return PDFOCRPipelineService.instance;
    }

    /**
     * Main method: Extract text from PDF using OCR
     * 
     * Since react-native-pdf doesn't directly export pages as images,
     * we'll use an alternative approach:
     * 1. For now, provide a fallback to camera OCR
     * 2. Future: Implement WebView + PDF.js rendering
     */
    async extractTextFromPDF(
        pdfPath: string,
        onProgress?: ProgressCallback
    ): Promise<PDFExtractionResult> {
        console.log('\n' + '='.repeat(60));
        console.log('📄 PDF OCR PIPELINE STARTING...');
        console.log('='.repeat(60));
        console.log('📁 PDF Path:', pdfPath);

        const startTime = Date.now();

        try {
            // Read PDF file
            const fileInfo = await FileSystem.getInfoAsync(pdfPath);
            if (!fileInfo.exists) {
                throw new Error('PDF file not found');
            }

            console.log('📊 File size:', Math.round((fileInfo.size || 0) / 1024), 'KB');

            // Report initial progress
            onProgress?.({
                currentPage: 0,
                totalPages: 1,
                status: 'Reading PDF...',
                percentage: 10
            });

            // Try basic text extraction first (from PDF structure)
            const basicText = await this.extractBasicText(pdfPath);

            if (basicText && basicText.length > 100) {
                console.log('✅ Basic text extraction succeeded!');
                console.log('📝 Extracted', basicText.length, 'characters');

                const extractionTime = Date.now() - startTime;
                const wordCount = basicText.split(/\s+/).filter(w => w.length > 0).length;

                return {
                    text: basicText,
                    pageCount: 1,
                    wordCount: wordCount,
                    pages: [{
                        pageNumber: 1,
                        text: basicText,
                        wordCount: wordCount
                    }],
                    extractionTime
                };
            }

            // If basic extraction fails, inform user about manual approach
            console.log('⚠️ Basic text extraction failed');
            console.log('ℹ️ PDF may be image-based or have complex encoding');

            onProgress?.({
                currentPage: 1,
                totalPages: 1,
                status: 'Text extraction limited - please use camera scan',
                percentage: 100
            });

            throw new Error('PDF text extraction limited. Please take photos of each page and scan them.');

        } catch (error) {
            console.error('❌ PDF OCR Pipeline failed:', error);
            throw error;
        }
    }

    /**
     * Basic text extraction using pako (for simple PDFs)
     */
    private async extractBasicText(pdfPath: string): Promise<string> {
        try {
            // Read PDF as base64
            const base64Content = await FileSystem.readAsStringAsync(pdfPath, {
                encoding: FileSystem.EncodingType.Base64,
            });

            // Convert base64 to binary string
            const binaryString = atob(base64Content);

            // Try to extract text using regex patterns
            const text = this.extractTextFromPDFContent(binaryString);

            return this.cleanExtractedText(text);

        } catch (error) {
            console.error('Basic extraction error:', error);
            return '';
        }
    }

    /**
     * Extract text content from PDF binary
     */
    private extractTextFromPDFContent(content: string): string {
        const textParts: string[] = [];

        // Pattern 1: Text in parentheses (most common)
        const parenMatches = content.match(/\(([^)]+)\)/g);
        if (parenMatches) {
            parenMatches.forEach(match => {
                const text = match.slice(1, -1);
                if (this.isReadableText(text)) {
                    textParts.push(text);
                }
            });
        }

        // Pattern 2: Text in BT...ET blocks
        const btEtRegex = /BT\s*([\s\S]*?)\s*ET/g;
        let match;
        while ((match = btEtRegex.exec(content)) !== null) {
            const block = match[1];
            const textInBlock = block.match(/\(([^)]+)\)/g);
            if (textInBlock) {
                textInBlock.forEach(t => {
                    const text = t.slice(1, -1);
                    if (this.isReadableText(text)) {
                        textParts.push(text);
                    }
                });
            }
        }

        return textParts.join(' ');
    }

    /**
     * Check if text is readable (not binary garbage)
     */
    private isReadableText(text: string): boolean {
        if (!text || text.length < 2) return false;

        // Count readable characters
        const readableCount = (text.match(/[a-zA-Z0-9\s.,!?;:'"()-]/g) || []).length;
        const ratio = readableCount / text.length;

        return ratio > 0.7 && text.length > 1;
    }

    /**
     * Extract text from multiple images using OCR
     * This can be used when user takes photos of PDF pages
     */
    async extractTextFromPageImages(
        imageUris: string[],
        onProgress?: ProgressCallback
    ): Promise<PDFExtractionResult> {
        console.log('\n' + '='.repeat(60));
        console.log('📷 PAGE IMAGE OCR STARTING...');
        console.log('='.repeat(60));
        console.log(`📚 Processing ${imageUris.length} pages`);

        const startTime = Date.now();
        const pages: PageResult[] = [];
        let totalText = '';

        for (let i = 0; i < imageUris.length; i++) {
            const pageNum = i + 1;
            console.log(`\n📄 Processing page ${pageNum}/${imageUris.length}...`);

            onProgress?.({
                currentPage: pageNum,
                totalPages: imageUris.length,
                status: `Processing page ${pageNum}...`,
                percentage: Math.round((pageNum / imageUris.length) * 100)
            });

            try {
                // Ensure proper URI format
                let imageUri = imageUris[i];
                if (!imageUri.startsWith('file://') && !imageUri.startsWith('content://')) {
                    imageUri = `file://${imageUri}`;
                }

                // OCR the image
                const result = await TextRecognition.recognize(imageUri);
                const pageText = (result.blocks || [])
                    .map(block => block.text)
                    .filter(text => text && text.length > 0)
                    .join('\n');

                const cleanedText = this.cleanExtractedText(pageText);
                const wordCount = cleanedText.split(/\s+/).filter(w => w.length > 0).length;

                console.log(`   ✅ Extracted ${wordCount} words from page ${pageNum}`);

                pages.push({
                    pageNumber: pageNum,
                    text: cleanedText,
                    wordCount: wordCount
                });

                totalText += `\n--- Page ${pageNum} ---\n${cleanedText}\n`;

            } catch (error) {
                console.error(`   ❌ Failed to process page ${pageNum}:`, error);
                pages.push({
                    pageNumber: pageNum,
                    text: `[OCR failed for page ${pageNum}]`,
                    wordCount: 0
                });
            }
        }

        const extractionTime = Date.now() - startTime;
        const totalWordCount = pages.reduce((sum, p) => sum + p.wordCount, 0);

        console.log('\n' + '-'.repeat(60));
        console.log('📊 EXTRACTION COMPLETE:');
        console.log(`   Pages: ${pages.length}`);
        console.log(`   Total Words: ${totalWordCount}`);
        console.log(`   Time: ${extractionTime}ms`);
        console.log('='.repeat(60) + '\n');

        return {
            text: this.cleanExtractedText(totalText),
            pageCount: pages.length,
            wordCount: totalWordCount,
            pages: pages,
            extractionTime: extractionTime
        };
    }

    /**
     * Clean extracted text
     */
    private cleanExtractedText(text: string): string {
        return text
            .replace(/  +/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n')
            .trim();
    }
}

export default PDFOCRPipelineService;

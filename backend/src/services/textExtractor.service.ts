import fs from 'fs/promises';
import path from 'path';
import { SUPPORTED_FILE_TYPES } from '../config/constants';
import { pdfService } from './pdf.service';
import { ocrService } from './ocr.service';

export interface ExtractionResult {
    text: string;
    pageCount?: number;
    pages?: Array<{ pageNumber: number; text: string }>;
    metadata?: Record<string, any>;
}

/**
 * Universal Text Extractor Service
 * Extracts text from various file formats for RAG indexing
 */
class TextExtractorService {
    /**
     * Extract text from any supported file type
     */
    async extract(filePath: string, mimeType: string): Promise<ExtractionResult> {
        console.log(`📝 Extracting text from: ${path.basename(filePath)} (${mimeType})`);

        switch (mimeType) {
            case SUPPORTED_FILE_TYPES.PDF:
                return this.extractPDF(filePath);

            case SUPPORTED_FILE_TYPES.TXT:
                return this.extractTXT(filePath);

            case SUPPORTED_FILE_TYPES.DOC:
            case SUPPORTED_FILE_TYPES.DOCX:
                return this.extractDOCX(filePath);

            case SUPPORTED_FILE_TYPES.PPT:
            case SUPPORTED_FILE_TYPES.PPTX:
                return this.extractPPT(filePath);

            case SUPPORTED_FILE_TYPES.JPEG:
            case SUPPORTED_FILE_TYPES.PNG:
            case SUPPORTED_FILE_TYPES.JPG:
            case SUPPORTED_FILE_TYPES.GIF:
            case SUPPORTED_FILE_TYPES.WEBP:
            case 'image/bmp':
            case 'image/svg+xml':
            case 'image/tiff':
            case 'image/x-icon':
            case 'image/avif':
            case 'image/heic':
            case 'image/heif':
                return this.extractImage(filePath);

            default:
                // Check if it's any image type we might have missed
                if (mimeType.startsWith('image/')) {
                    console.log(`📷 Treating ${mimeType} as image for OCR`);
                    return this.extractImage(filePath);
                }
                throw new Error(`Unsupported file type: ${mimeType}`);
        }
    }

    /**
     * Extract text from PDF
     */
    private async extractPDF(filePath: string): Promise<ExtractionResult> {
        const pages = await pdfService.extractTextByPages(filePath);

        return {
            text: pages.map(p => p.text).join('\n\n'),
            pageCount: pages.length,
            pages: pages.map(p => ({ pageNumber: p.pageNumber, text: p.text })),
        };
    }

    /**
     * Extract text from TXT file
     */
    private async extractTXT(filePath: string): Promise<ExtractionResult> {
        const text = await fs.readFile(filePath, 'utf-8');

        // Count "pages" by splitting on form feeds or every ~3000 chars
        const pageSize = 3000;
        const pages: Array<{ pageNumber: number; text: string }> = [];

        for (let i = 0; i < text.length; i += pageSize) {
            pages.push({
                pageNumber: pages.length + 1,
                text: text.slice(i, i + pageSize),
            });
        }

        return {
            text,
            pageCount: pages.length || 1,
            pages: pages.length > 0 ? pages : [{ pageNumber: 1, text }],
        };
    }

    /**
     * Extract text from DOC/DOCX using mammoth
     */
    private async extractDOCX(filePath: string): Promise<ExtractionResult> {
        try {
            // Dynamic import for mammoth (may not be installed)
            const mammoth = await import('mammoth');
            const buffer = await fs.readFile(filePath);

            const result = await mammoth.extractRawText({ buffer });
            const text = result.value;

            // Split into pages (approx 3000 chars each)
            const pageSize = 3000;
            const pages: Array<{ pageNumber: number; text: string }> = [];

            for (let i = 0; i < text.length; i += pageSize) {
                pages.push({
                    pageNumber: pages.length + 1,
                    text: text.slice(i, i + pageSize),
                });
            }

            return {
                text,
                pageCount: pages.length || 1,
                pages: pages.length > 0 ? pages : [{ pageNumber: 1, text }],
                metadata: { warnings: result.messages },
            };
        } catch (error: any) {
            if (error.code === 'MODULE_NOT_FOUND') {
                console.warn('⚠️ mammoth not installed. Install with: npm install mammoth');
                return { text: '[DOCX extraction requires mammoth package]', pageCount: 1 };
            }
            throw error;
        }
    }

    /**
     * Extract text from PPT/PPTX using officeparser
     */
    private async extractPPT(filePath: string): Promise<ExtractionResult> {
        try {
            // Dynamic import for officeparser
            const officeparser = await import('officeparser');

            // Use parseOfficeAsync (Promise-based API)
            let text: string;

            if (typeof officeparser.parseOfficeAsync === 'function') {
                // Modern API (v4+)
                text = await officeparser.parseOfficeAsync(filePath);
            } else if (typeof officeparser.default?.parseOfficeAsync === 'function') {
                // ESM default export
                text = await officeparser.default.parseOfficeAsync(filePath);
            } else if (typeof officeparser.parseOffice === 'function') {
                // Legacy callback API - wrap in Promise
                text = await new Promise<string>((resolve, reject) => {
                    officeparser.parseOffice(filePath, (err: Error | null, data: string) => {
                        if (err) reject(err);
                        else resolve(data || '');
                    });
                });
            } else {
                throw new Error('officeparser API not found. Try reinstalling: npm install officeparser');
            }

            if (!text || text.trim().length === 0) {
                console.warn(`⚠️ Empty text extracted from PPT: ${filePath}`);
                return { text: '', pageCount: 1, pages: [{ pageNumber: 1, text: '' }] };
            }

            // Split by slides if possible, otherwise by size
            const slidePattern = /(?:Slide \d+|^---$)/gm;
            let pages: Array<{ pageNumber: number; text: string }> = [];

            const parts = text.split(slidePattern).filter((p: string) => p.trim());

            if (parts.length > 1) {
                pages = parts.map((slideText: string, idx: number) => ({
                    pageNumber: idx + 1,
                    text: slideText.trim(),
                }));
            } else {
                // Fallback: split by size
                const pageSize = 2000;
                for (let i = 0; i < text.length; i += pageSize) {
                    pages.push({
                        pageNumber: pages.length + 1,
                        text: text.slice(i, i + pageSize),
                    });
                }
            }

            console.log(`✅ Extracted ${pages.length} slide(s) from PPT`);

            return {
                text,
                pageCount: pages.length || 1,
                pages: pages.length > 0 ? pages : [{ pageNumber: 1, text }],
            };
        } catch (error: any) {
            if (error.code === 'MODULE_NOT_FOUND' || error.code === 'ERR_MODULE_NOT_FOUND') {
                console.warn('⚠️ officeparser not installed. Install with: npm install officeparser');
                throw new Error('officeparser package not installed. Run: npm install officeparser');
            }
            console.error('PPT extraction error:', error);
            throw new Error(`PPT extraction failed: ${error.message}`);
        }
    }

    /**
     * Extract text from images using OCR
     */
    private async extractImage(filePath: string): Promise<ExtractionResult> {
        const text = await ocrService.extractText(filePath);

        return {
            text,
            pageCount: 1,
            pages: [{ pageNumber: 1, text }],
        };
    }

    /**
     * Check if file type is supported
     */
    isSupported(mimeType: string): boolean {
        // Check explicit types or any image type
        if (Object.values(SUPPORTED_FILE_TYPES).includes(mimeType as any)) {
            return true;
        }
        // Also support any image/* type
        return mimeType.startsWith('image/');
    }

    /**
     * Get file extension from MIME type
     */
    getExtension(mimeType: string): string {
        const mimeToExt: Record<string, string> = {
            'application/pdf': '.pdf',
            'text/plain': '.txt',
            'application/msword': '.doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
            'application/vnd.ms-powerpoint': '.ppt',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'image/bmp': '.bmp',
            'image/svg+xml': '.svg',
            'image/tiff': '.tiff',
        };
        return mimeToExt[mimeType] || '';
    }
}

export const textExtractorService = new TextExtractorService();

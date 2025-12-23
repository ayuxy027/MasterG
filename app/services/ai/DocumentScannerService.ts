/**
 * EduLite Mobile AI - Document Scanner Service
 * Handles document scanning, OCR, and analysis using SmolVLM2
 */

import {
    DocumentAnalysisParams,
    DocumentType,
    ScanResult,
    SupportedLanguage
} from '../../types/ai.types';
import { DOCUMENT_TYPE_KEYWORDS } from './constants';
import ModelManager from './ModelManager';

class DocumentScannerService {
    private static instance: DocumentScannerService;
    private modelManager: ModelManager;
    private scanHistory: ScanResult[] = [];

    private constructor() {
        this.modelManager = ModelManager.getInstance();
    }

    static getInstance(): DocumentScannerService {
        if (!DocumentScannerService.instance) {
            DocumentScannerService.instance = new DocumentScannerService();
        }
        return DocumentScannerService.instance;
    }

    /**
     * Scan and analyze a document image
     */
    async scanDocument(params: DocumentAnalysisParams): Promise<ScanResult> {
        const startTime = Date.now();
        console.log('📷 Scanning document:', params.imagePath);

        try {
            // Step 1: Perform OCR to extract text
            const ocrResult = await this.performOCR(params.imagePath, params.language);
            console.log('  ├── OCR completed, confidence:', ocrResult.confidence);

            // Step 2: Classify document type
            const classification = await this.classifyDocument(ocrResult.text);
            console.log('  ├── Document type:', classification.type);

            // Step 3: Extract key information
            let keyInfo: Record<string, unknown> = {};
            if (params.extractKeyInfo !== false) {
                keyInfo = await this.extractKeyInformation(ocrResult.text, classification.type);
                console.log('  ├── Key info extracted');
            }

            // Step 4: Generate summary
            let summary = '';
            if (params.generateSummary !== false) {
                summary = await this.generateSummary(ocrResult.text, classification.type);
                console.log('  ├── Summary generated');
            }

            // Step 5: Generate insights
            const insights = await this.generateInsights(ocrResult.text, classification.type);
            console.log('  └── Insights generated');

            const processingTime = Date.now() - startTime;

            const result: ScanResult = {
                id: this.generateScanId(),
                imagePath: params.imagePath,
                text: ocrResult.text,
                type: classification.type,
                confidence: classification.confidence,
                keyInfo: keyInfo,
                summary: summary,
                insights: insights,
                ocrConfidence: ocrResult.confidence,
                processedAt: new Date().toISOString(),
            };

            // Store in history
            this.scanHistory.push(result);

            console.log('✅ Document scanned in', processingTime, 'ms');

            return result;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Document scanning failed:', errorMessage);
            throw new Error('Document scanning failed: ' + errorMessage);
        }
    }

    /**
     * Perform OCR on document image using vision model
     * Note: Vision model is currently disabled - using fallback OCR
     */
    private async performOCR(
        imagePath: string,
        language?: SupportedLanguage
    ): Promise<{ text: string; confidence: number }> {

        // Vision model is disabled - always use fallback OCR
        // In the future, this can be re-enabled when vision model is available
        if (!this.modelManager.isVisionReady()) {
            console.warn('Vision model not available, using fallback OCR');
            return this.fallbackOCR(imagePath);
        }

        // Vision model is disabled, so this will always return undefined
        // Keeping the code structure for future re-enablement
        return this.fallbackOCR(imagePath);
    }

    /**
     * Fallback OCR when vision model is not available
     */
    private async fallbackOCR(imagePath: string): Promise<{ text: string; confidence: number }> {
        // This is a placeholder - in production, integrate with a local OCR library
        // like react-native-mlkit-ocr or tesseract
        console.log('Using fallback OCR (placeholder)');
        return {
            text: 'OCR text extraction requires vision model. Please load the SmolVLM2 model.',
            confidence: 0,
        };
    }

    /**
     * Classify document type based on extracted text
     */
    private async classifyDocument(text: string): Promise<{ type: DocumentType; confidence: number }> {
        // First try AI classification if model is ready
        if (this.modelManager.isReady()) {
            const aiClassification = await this.aiClassifyDocument(text);
            if (aiClassification) {
                return aiClassification;
            }
        }

        // Fallback to keyword-based classification
        return this.keywordClassifyDocument(text);
    }

    /**
     * AI-based document classification
     */
    private async aiClassifyDocument(text: string): Promise<{ type: DocumentType; confidence: number } | null> {
        const textModel = this.modelManager.getTextModel();
        if (!textModel) return null;

        try {
            const prompt = `Classify this document into exactly one category: receipt, form, notes, report, certificate, textbook, or other.

Document text (first 500 characters):
${text.substring(0, 500)}

Return only the category name:`;

            const result = await textModel.completion(
                {
                    prompt: prompt,
                    n_predict: 20,
                    temperature: 0.3,
                },
                () => { }
            );

            const category = result.text.trim().toLowerCase() as DocumentType;
            const validTypes: DocumentType[] = ['receipt', 'form', 'notes', 'report', 'certificate', 'textbook', 'other'];

            if (validTypes.includes(category)) {
                return { type: category, confidence: 0.85 };
            }

            return null;

        } catch (error) {
            console.warn('AI classification failed');
            return null;
        }
    }

    /**
     * Keyword-based document classification
     */
    private keywordClassifyDocument(text: string): { type: DocumentType; confidence: number } {
        const textLower = text.toLowerCase();
        const scores: Record<DocumentType, number> = {
            receipt: 0,
            form: 0,
            notes: 0,
            report: 0,
            certificate: 0,
            textbook: 0,
            other: 0,
        };

        // Score each document type
        Object.entries(DOCUMENT_TYPE_KEYWORDS).forEach(([type, keywords]) => {
            keywords.forEach(keyword => {
                if (textLower.includes(keyword)) {
                    scores[type as DocumentType] += 1;
                }
            });
        });

        // Find highest scoring type
        let maxType: DocumentType = 'other';
        let maxScore = 0;

        Object.entries(scores).forEach(([type, score]) => {
            if (score > maxScore) {
                maxScore = score;
                maxType = type as DocumentType;
            }
        });

        const confidence = maxScore > 0 ? Math.min(maxScore / 5, 0.95) : 0.3;

        return { type: maxType, confidence };
    }

    /**
     * Extract key information based on document type
     */
    private async extractKeyInformation(
        text: string,
        docType: DocumentType
    ): Promise<Record<string, unknown>> {
        if (!this.modelManager.isReady()) {
            return this.simpleKeyExtraction(text, docType);
        }

        const textModel = this.modelManager.getTextModel();
        if (!textModel) {
            return this.simpleKeyExtraction(text, docType);
        }

        try {
            const prompt = `Extract key information from this ${docType} document. Return as a simple list of key-value pairs:

Document text:
${text.substring(0, 800)}

Key information:`;

            const result = await textModel.completion(
                {
                    prompt: prompt,
                    n_predict: 200,
                    temperature: 0.4,
                },
                () => { }
            );

            // Parse the result into key-value pairs
            const keyInfo: Record<string, unknown> = {};
            const lines = result.text.split('\n').filter(line => line.includes(':'));

            lines.forEach(line => {
                const [key, ...valueParts] = line.split(':');
                if (key && valueParts.length > 0) {
                    keyInfo[key.trim().toLowerCase().replace(/\s+/g, '_')] = valueParts.join(':').trim();
                }
            });

            return keyInfo;

        } catch (error) {
            console.warn('AI key extraction failed');
            return this.simpleKeyExtraction(text, docType);
        }
    }

    /**
     * Simple key extraction without AI
     */
    private simpleKeyExtraction(text: string, docType: DocumentType): Record<string, unknown> {
        const keyInfo: Record<string, unknown> = {};

        // Extract dates
        const dateMatch = text.match(/\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/);
        if (dateMatch) {
            keyInfo.date = dateMatch[0];
        }

        // Extract amounts (for receipts)
        if (docType === 'receipt') {
            const amountMatch = text.match(/(?:Rs\.?|INR|₹)\s*[\d,]+(?:\.\d{2})?/i);
            if (amountMatch) {
                keyInfo.amount = amountMatch[0];
            }
        }

        // Extract names
        const nameMatch = text.match(/(?:Name|From|To|By)\s*:\s*([A-Za-z\s]+)/i);
        if (nameMatch) {
            keyInfo.name = nameMatch[1].trim();
        }

        return keyInfo;
    }

    /**
     * Generate summary of document content
     */
    private async generateSummary(text: string, docType: DocumentType): Promise<string> {
        if (!this.modelManager.isReady()) {
            return this.simpleSummary(text);
        }

        const textModel = this.modelManager.getTextModel();
        if (!textModel) {
            return this.simpleSummary(text);
        }

        try {
            const prompt = `Write a brief 2-3 sentence summary of this ${docType}:

${text.substring(0, 600)}

Summary:`;

            const result = await textModel.completion(
                {
                    prompt: prompt,
                    n_predict: 100,
                    temperature: 0.5,
                },
                () => { }
            );

            return result.text.trim();

        } catch (error) {
            console.warn('AI summary generation failed');
            return this.simpleSummary(text);
        }
    }

    /**
     * Simple summary without AI
     */
    private simpleSummary(text: string): string {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
        return sentences.slice(0, 2).join('. ').trim() + '.';
    }

    /**
     * Generate insights about the document
     */
    private async generateInsights(text: string, docType: DocumentType): Promise<string[]> {
        const insights: string[] = [];

        // Word count insight
        const wordCount = text.split(/\s+/).length;
        insights.push(`Document contains approximately ${wordCount} words`);

        // Document type insight
        insights.push(`Classified as ${docType} document`);

        // Language detection (simplified)
        const hasHindi = /[\u0900-\u097F]/.test(text);
        if (hasHindi) {
            insights.push('Contains Hindi text (Devanagari script)');
        }

        // AI-generated insights if available
        if (this.modelManager.isReady()) {
            const textModel = this.modelManager.getTextModel();
            if (textModel) {
                try {
                    const prompt = `List 2 key insights about this ${docType} in short bullet points:

${text.substring(0, 400)}

Insights:`;

                    const result = await textModel.completion(
                        {
                            prompt: prompt,
                            n_predict: 100,
                            temperature: 0.6,
                        },
                        () => { }
                    );

                    const aiInsights = result.text.split('\n')
                        .filter(line => line.trim().length > 10)
                        .slice(0, 2);

                    insights.push(...aiInsights);

                } catch (error) {
                    console.warn('AI insights generation failed');
                }
            }
        }

        return insights;
    }

    /**
     * Generate unique scan ID
     */
    private generateScanId(): string {
        return 'scan_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get scan history
     */
    getScanHistory(): ScanResult[] {
        return [...this.scanHistory];
    }

    /**
     * Get a specific scan result
     */
    getScanResult(scanId: string): ScanResult | undefined {
        return this.scanHistory.find(scan => scan.id === scanId);
    }

    /**
     * Clear scan history
     */
    clearHistory(): void {
        this.scanHistory = [];
    }
}

export default DocumentScannerService;

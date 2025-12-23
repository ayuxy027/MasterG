/**
 * EduLite Mobile AI - Main AI Service Export
 * Central export point for all AI services
 */

// Core Services
export { default as ContentGenerationService } from './ContentGenerationService';
export { default as DocumentScannerService } from './DocumentScannerService';
export { default as MemoryManager } from './MemoryManager';
export { default as ModelManager } from './ModelManager';
export { default as PDFQAService } from './PDFQAService';
export { default as TranslationService } from './TranslationService';

// Constants & Configuration
export * from './CBSECurriculumConfig';
export * from './constants';

// Import services for unified API
import ContentGenerationService from './ContentGenerationService';
import DocumentScannerService from './DocumentScannerService';
import MemoryManager from './MemoryManager';
import ModelManager from './ModelManager';
import PDFQAService from './PDFQAService';
import TranslationService from './TranslationService';

import {
    ContentGenerationParams,
    DocumentAnalysisParams,
    GeneratedContent,
    ModelType,
    PDFAnswer,
    PDFDocument,
    PDFQuestionParams,
    ScanResult,
    TranslationParams,
    TranslationResult
} from '../../types/ai.types';

/**
 * EduLite AI - Unified API
 * Main entry point for all AI operations
 */
class EduLiteAI {
    private static instance: EduLiteAI;

    private modelManager: ModelManager;
    private memoryManager: MemoryManager;
    private contentService: ContentGenerationService;
    private pdfService: PDFQAService;
    private scannerService: DocumentScannerService;
    private translationService: TranslationService;

    private constructor() {
        this.modelManager = ModelManager.getInstance();
        this.memoryManager = MemoryManager.getInstance();
        this.contentService = ContentGenerationService.getInstance();
        this.pdfService = PDFQAService.getInstance();
        this.scannerService = DocumentScannerService.getInstance();
        this.translationService = TranslationService.getInstance();
    }

    /**
     * Get singleton instance
     */
    static getInstance(): EduLiteAI {
        if (!EduLiteAI.instance) {
            EduLiteAI.instance = new EduLiteAI();
        }
        return EduLiteAI.instance;
    }

    // ============================================
    // Initialization
    // ============================================

    /**
     * Initialize all AI models
     */
    async initialize(
        onProgress?: (modelType: ModelType, progress: number) => void
    ): Promise<boolean> {
        console.log('🚀 Initializing EduLite AI...');

        // Start memory monitoring
        this.memoryManager.startMonitoring();

        // Verify models exist
        const modelStatus = await this.modelManager.verifyModels();

        if (!modelStatus.text) {
            console.warn('⚠️ Text model not found. Please download the model first.');
            return false;
        }

        // Initialize available models
        return await this.modelManager.initializeAllModels(onProgress);
    }

    /**
     * Initialize only the text model (for content generation and Q&A)
     */
    async initializeTextModel(
        onProgress?: (progress: number) => void
    ): Promise<boolean> {
        return await this.modelManager.initializeTextModel(onProgress);
    }

    /**
     * Initialize only the vision model (disabled - using ML Kit OCR)
     */
    async initializeVisionModel(
        onProgress?: (progress: number) => void
    ): Promise<boolean> {
        console.log('⚠️ Vision model disabled - using ML Kit OCR instead');
        return false;
    }

    /**
     * Initialize only the Translation model (Sarvam-1)
     * Note: This replaces the old Navarasa/Hindi model
     */
    async initializeTranslationModel(
        onProgress?: (progress: number) => void
    ): Promise<boolean> {
        return await this.modelManager.initializeTranslationModel(onProgress);
    }

    // ============================================
    // Content Generation
    // ============================================

    /**
     * Generate educational content
     */
    async generateContent(params: ContentGenerationParams): Promise<GeneratedContent> {
        return await this.contentService.generateContent(params);
    }

    /**
     * Generate content with streaming
     */
    async generateContentStreaming(
        params: ContentGenerationParams,
        onToken: (token: string) => void
    ): Promise<GeneratedContent> {
        return await this.contentService.generateContentStreaming(params, onToken);
    }

    // ============================================
    // Translation
    // ============================================

    /**
     * Translate text using Sarvam-1
     * Supports 22 Indian languages with state-of-the-art accuracy
     */
    async translate(params: TranslationParams): Promise<TranslationResult> {
        return await this.translationService.translate(params);
    }

    /**
     * Translate with quality verification
     */
    async translateWithVerification(params: TranslationParams): Promise<TranslationResult> {
        return await this.translationService.translateWithVerification(params);
    }

    /**
     * Batch translate multiple texts
     */
    async batchTranslate(
        texts: string[],
        sourceLanguage: string,
        targetLanguage: string,
        context?: string
    ): Promise<TranslationResult[]> {
        return await this.translationService.batchTranslate(
            texts,
            sourceLanguage,
            targetLanguage,
            context
        );
    }

    /**
     * Get list of supported translation languages
     */
    getSupportedLanguages() {
        return this.translationService.getSupportedLanguages();
    }

    // ============================================
    // PDF Q&A
    // ============================================

    /**
     * Process a PDF document
     */
    async processPDF(
        pdfPath: string,
        pdfName: string,
        onProgress?: (progress: number, message: string) => void
    ): Promise<PDFDocument> {
        return await this.pdfService.processPDF(pdfPath, pdfName, onProgress);
    }

    /**
     * Answer a question about a processed PDF
     */
    async askQuestion(params: PDFQuestionParams): Promise<PDFAnswer> {
        return await this.pdfService.answerQuestion(params);
    }

    /**
     * Get all processed PDF documents
     */
    getDocuments(): PDFDocument[] {
        return this.pdfService.getAllDocuments();
    }

    // ============================================
    // Translation Status
    // ============================================

    /**
     * Check if Translation model is ready
     */
    isTranslationReady(): boolean {
        return this.modelManager.isTranslationModelReady();
    }

    // ============================================
    // Document Scanning
    // ============================================

    /**
     * Scan and analyze a document
     */
    async scanDocument(params: DocumentAnalysisParams): Promise<ScanResult> {
        return await this.scannerService.scanDocument(params);
    }

    /**
     * Get scan history
     */
    getScanHistory(): ScanResult[] {
        return this.scannerService.getScanHistory();
    }

    // ============================================
    // Status & Utilities
    // ============================================

    /**
     * Check if AI is ready for text operations
     */
    isTextReady(): boolean {
        return this.modelManager.isReady();
    }

    /**
     * Check if AI is ready for vision operations
     * Note: Vision model removed - using ML Kit OCR instead
     */
    isVisionReady(): boolean {
        return false; // Vision model disabled
    }

    /**
     * Check if Hindi/Translation model is ready
     * @deprecated Use isTranslationReady() instead - Hindi model replaced by Sarvam-1
     */
    isHindiReady(): boolean {
        return this.isTranslationReady();
    }

    /**
     * Get full status summary
     */
    getStatusSummary(): string {
        return this.modelManager.getDebugInfo();
    }

    /**
     * Get memory status
     */
    async getMemoryStatus(): Promise<string> {
        return await this.memoryManager.getStatusReport();
    }

    /**
     * Release all resources
     */
    async shutdown(): Promise<void> {
        console.log('🛑 Shutting down EduLite AI...');
        this.memoryManager.stopMonitoring();
        await this.modelManager.releaseAllModels();
        this.pdfService.clearAllDocuments();
        this.scannerService.clearHistory();
        console.log('✅ EduLite AI shutdown complete');
    }
}

export default EduLiteAI;

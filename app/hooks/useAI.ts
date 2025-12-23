/**
 * useAI Hook - React hook for AI operations
 * Provides easy access to AI features in components
 * Now with Sarvam-1 translation support!
 */

import { useCallback, useMemo } from 'react';
import EduLiteAI from '../services/ai';
import {
    askPDFQuestion,
    clearError,
    generateContent,
    initializeAI,
    initializeTextModel,
    initializeTranslationModel,
    initializeVisionModel,
    processPDF,
    removeContent,
    removeDocument,
    removeScanResult,
    scanDocument,
    shutdownAI,
    translateText,
    updateSettings,
} from '../store/slices/aiSlice';
import {
    AISettings,
    ContentGenerationParams,
    DocumentAnalysisParams,
    PDFQuestionParams,
    TranslationParams,
} from '../types/ai.types';
import { useAppDispatch, useAppSelector } from './useRedux';

export function useAI() {
    const dispatch = useAppDispatch();
    const aiState = useAppSelector((state) => state.ai);

    // ============================================
    // Model Status
    // ============================================

    const isTextModelReady = useMemo(
        () => aiState.textModelStatus.isLoaded,
        [aiState.textModelStatus.isLoaded]
    );

    const isVisionModelReady = useMemo(
        () => aiState.visionModelStatus.isLoaded,
        [aiState.visionModelStatus.isLoaded]
    );



    const isTranslationModelReady = useMemo(
        () => aiState.translationModelStatus.isLoaded,
        [aiState.translationModelStatus.isLoaded]
    );

    const isLoading = useMemo(
        () =>
            aiState.textModelStatus.isLoading ||
            aiState.visionModelStatus.isLoading ||
            aiState.translationModelStatus.isLoading ||
            aiState.isProcessing,
        [
            aiState.textModelStatus.isLoading,
            aiState.visionModelStatus.isLoading,
            aiState.translationModelStatus.isLoading,
            aiState.isProcessing,
        ]
    );

    // ============================================
    // Initialization
    // ============================================

    const initialize = useCallback(async () => {
        return await dispatch(initializeAI()).unwrap();
    }, [dispatch]);

    const initializeText = useCallback(async () => {
        return await dispatch(initializeTextModel()).unwrap();
    }, [dispatch]);

    const initializeVision = useCallback(async () => {
        return await dispatch(initializeVisionModel()).unwrap();
    }, [dispatch]);

    const initializeTranslation = useCallback(async () => {
        return await dispatch(initializeTranslationModel()).unwrap();
    }, [dispatch]);

    const shutdown = useCallback(async () => {
        return await dispatch(shutdownAI()).unwrap();
    }, [dispatch]);

    // ============================================
    // Content Generation
    // ============================================

    const generate = useCallback(
        async (params: ContentGenerationParams) => {
            return await dispatch(generateContent(params)).unwrap();
        },
        [dispatch]
    );

    // ============================================
    // Translation (Sarvam-1)
    // ============================================

    const translate = useCallback(
        async (params: TranslationParams) => {
            return await dispatch(translateText(params)).unwrap();
        },
        [dispatch]
    );

    /**
     * Get supported translation languages (22 Indian languages)
     * Returns array of { code, name, script }
     */
    const getSupportedLanguages = useCallback(() => {
        const ai = EduLiteAI.getInstance();
        return ai.getSupportedLanguages();
    }, []);

    // ============================================
    // PDF Q&A
    // ============================================

    const processDocument = useCallback(
        async (pdfPath: string, pdfName: string) => {
            return await dispatch(processPDF({ pdfPath, pdfName })).unwrap();
        },
        [dispatch]
    );

    const askQuestion = useCallback(
        async (params: PDFQuestionParams) => {
            return await dispatch(askPDFQuestion(params)).unwrap();
        },
        [dispatch]
    );

    // ============================================
    // Document Scanning
    // ============================================

    const scan = useCallback(
        async (params: DocumentAnalysisParams) => {
            return await dispatch(scanDocument(params)).unwrap();
        },
        [dispatch]
    );

    // ============================================
    // Utilities
    // ============================================

    const clearAIError = useCallback(() => {
        dispatch(clearError());
    }, [dispatch]);

    const updateAISettings = useCallback(
        (settings: Partial<AISettings>) => {
            dispatch(updateSettings(settings));
        },
        [dispatch]
    );

    const deleteContent = useCallback(
        (contentId: string) => {
            dispatch(removeContent(contentId));
        },
        [dispatch]
    );

    const deleteDocument = useCallback(
        (documentId: string) => {
            dispatch(removeDocument(documentId));
        },
        [dispatch]
    );

    const deleteScan = useCallback(
        (scanId: string) => {
            dispatch(removeScanResult(scanId));
        },
        [dispatch]
    );

    // ============================================
    // Return Hook API
    // ============================================

    return {
        // State
        state: aiState,
        isTextModelReady,
        isVisionModelReady,
        isTranslationModelReady,
        isLoading,
        error: aiState.error,
        currentOperation: aiState.currentOperation,
        operationProgress: aiState.operationProgress,

        // Data
        generatedContents: aiState.generatedContents,
        loadedDocuments: aiState.loadedDocuments,
        scanResults: aiState.scanResults,
        settings: aiState.settings,

        // Model status
        textModelStatus: aiState.textModelStatus,
        visionModelStatus: aiState.visionModelStatus,
        translationModelStatus: aiState.translationModelStatus,

        // Actions
        initialize,
        initializeText,
        initializeVision,
        initializeTranslation,
        shutdown,
        generate,
        translate,
        getSupportedLanguages,
        processDocument,
        askQuestion,
        scan,
        clearAIError,
        updateAISettings,
        deleteContent,
        deleteDocument,
        deleteScan,
    };
}

export default useAI;

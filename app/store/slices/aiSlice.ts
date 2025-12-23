/**
 * EduLite Mobile AI - AI Redux Slice
 * Manages AI state including model status, generated content, and settings
 */

import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import EduLiteAI from '../../services/ai';
import {
    AISettings,
    AIState,
    ContentGenerationParams,
    DocumentAnalysisParams,
    ModelStatus,
    PDFQuestionParams,
    TranslationParams
} from '../../types/ai.types';

// ============================================
// Initial State
// ============================================

const initialModelStatus: ModelStatus = {
    isLoaded: false,
    isLoading: false,
    error: null,
    loadProgress: 0,
    memoryUsage: 0,
};

const initialSettings: AISettings = {
    preferredLanguage: 'english',
    autoSaveContent: true,
    enableGPU: true,
    memoryLimit: 1500, // 1.5GB
    cacheEnabled: true,
    offlineMode: true,
};

const initialState: AIState = {
    textModelStatus: { ...initialModelStatus },
    visionModelStatus: { ...initialModelStatus },
    translationModelStatus: { ...initialModelStatus },
    isProcessing: false,
    currentOperation: null,
    operationProgress: 0,
    generatedContents: [],
    loadedDocuments: [],
    scanResults: [],
    error: null,
    settings: initialSettings,
};

// ============================================
// Async Thunks
// ============================================

/**
 * Initialize all AI models
 */
export const initializeAI = createAsyncThunk(
    'ai/initialize',
    async (_, { dispatch, rejectWithValue }) => {
        try {
            const ai = EduLiteAI.getInstance();

            const success = await ai.initialize((modelType, progress) => {
                if (modelType === 'text') {
                    dispatch(updateTextModelProgress(progress));
                } else if (modelType === 'vision') {
                    dispatch(updateVisionModelProgress(progress));
                } else {
                    dispatch(updateTranslationModelProgress(progress));
                }
            });

            // Return separate status for each model
            return {
                textLoaded: ai.isTextReady(),
                visionLoaded: ai.isVisionReady(),
                translationLoaded: ai.isTranslationReady(),
                success
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Initialization failed';
            return rejectWithValue(message);
        }
    }
);

/**
 * Initialize text model only
 */
export const initializeTextModel = createAsyncThunk(
    'ai/initializeTextModel',
    async (_, { dispatch, rejectWithValue }) => {
        try {
            const ai = EduLiteAI.getInstance();

            const success = await ai.initializeTextModel((progress) => {
                dispatch(updateTextModelProgress(progress));
            });

            return success;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Text model initialization failed';
            return rejectWithValue(message);
        }
    }
);

/**
 * Initialize vision model only (for document scanning)
 */
export const initializeVisionModel = createAsyncThunk(
    'ai/initializeVisionModel',
    async (_, { dispatch, rejectWithValue }) => {
        try {
            const ai = EduLiteAI.getInstance();

            const success = await ai.initializeVisionModel((progress) => {
                dispatch(updateVisionModelProgress(progress));
            });

            return success;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Vision model initialization failed';
            return rejectWithValue(message);
        }
    }
);

/**
 * Generate educational content
 */
export const generateContent = createAsyncThunk(
    'ai/generateContent',
    async (params: ContentGenerationParams, { rejectWithValue }) => {
        try {
            const ai = EduLiteAI.getInstance();
            const content = await ai.generateContent(params);
            return content;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Content generation failed';
            return rejectWithValue(message);
        }
    }
);

/**
 * Process PDF document
 */
export const processPDF = createAsyncThunk(
    'ai/processPDF',
    async (
        { pdfPath, pdfName }: { pdfPath: string; pdfName: string },
        { dispatch, rejectWithValue }
    ) => {
        try {
            const ai = EduLiteAI.getInstance();

            const document = await ai.processPDF(pdfPath, pdfName, (progress, message) => {
                dispatch(setOperationProgress({ progress, message }));
            });

            return document;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'PDF processing failed';
            return rejectWithValue(message);
        }
    }
);

/**
 * Ask question about PDF
 */
export const askPDFQuestion = createAsyncThunk(
    'ai/askQuestion',
    async (params: PDFQuestionParams, { rejectWithValue }) => {
        try {
            const ai = EduLiteAI.getInstance();
            const answer = await ai.askQuestion(params);
            return answer;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Question answering failed';
            return rejectWithValue(message);
        }
    }
);

/**
 * Scan document
 */
export const scanDocument = createAsyncThunk(
    'ai/scanDocument',
    async (params: DocumentAnalysisParams, { rejectWithValue }) => {
        try {
            const ai = EduLiteAI.getInstance();
            const result = await ai.scanDocument(params);
            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Document scanning failed';
            return rejectWithValue(message);
        }
    }
);

/**
 * Initialize translation model (Sarvam-1)
 */
export const initializeTranslationModel = createAsyncThunk(
    'ai/initializeTranslationModel',
    async (_, { dispatch, rejectWithValue }) => {
        try {
            const ai = EduLiteAI.getInstance();

            const success = await ai.initializeTranslationModel((progress) => {
                dispatch(updateTranslationModelProgress(progress));
            });

            return success;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Translation model initialization failed';
            return rejectWithValue(message);
        }
    }
);

/**
 * Translate text using Sarvam-1
 */
export const translateText = createAsyncThunk(
    'ai/translateText',
    async (params: TranslationParams, { rejectWithValue }) => {
        try {
            const ai = EduLiteAI.getInstance();
            const result = await ai.translate(params);
            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Translation failed';
            return rejectWithValue(message);
        }
    }
);

/**
 * Shutdown AI
 */
export const shutdownAI = createAsyncThunk(
    'ai/shutdown',
    async () => {
        const ai = EduLiteAI.getInstance();
        await ai.shutdown();
        return true;
    }
);

// ============================================
// Slice
// ============================================

const aiSlice = createSlice({
    name: 'ai',
    initialState,
    reducers: {
        // Model status updates
        updateTextModelProgress: (state, action: PayloadAction<number>) => {
            state.textModelStatus.loadProgress = action.payload;
        },
        updateVisionModelProgress: (state, action: PayloadAction<number>) => {
            state.visionModelStatus.loadProgress = action.payload;
        },
        updateTranslationModelProgress: (state, action: PayloadAction<number>) => {
            state.translationModelStatus.loadProgress = action.payload;
        },

        // Operation progress
        setOperationProgress: (state, action: PayloadAction<{ progress: number; message: string }>) => {
            state.operationProgress = action.payload.progress;
            state.currentOperation = action.payload.message;
        },

        // Clear error
        clearError: (state) => {
            state.error = null;
        },

        // Update settings
        updateSettings: (state, action: PayloadAction<Partial<AISettings>>) => {
            state.settings = { ...state.settings, ...action.payload };
        },

        // Remove generated content
        removeContent: (state, action: PayloadAction<string>) => {
            state.generatedContents = state.generatedContents.filter(
                content => content.id !== action.payload
            );
        },

        // Remove PDF document
        removeDocument: (state, action: PayloadAction<string>) => {
            state.loadedDocuments = state.loadedDocuments.filter(
                doc => doc.id !== action.payload
            );
        },

        // Remove scan result
        removeScanResult: (state, action: PayloadAction<string>) => {
            state.scanResults = state.scanResults.filter(
                scan => scan.id !== action.payload
            );
        },

        // Clear all data
        clearAllData: (state) => {
            state.generatedContents = [];
            state.loadedDocuments = [];
            state.scanResults = [];
        },
    },
    extraReducers: (builder) => {
        // Initialize AI
        builder
            .addCase(initializeAI.pending, (state) => {
                state.textModelStatus.isLoading = true;
                state.visionModelStatus.isLoading = true;
                state.error = null;
            })
            .addCase(initializeAI.fulfilled, (state, action) => {
                // Now properly track each model's status separately
                state.textModelStatus.isLoading = false;
                state.textModelStatus.isLoaded = action.payload.textLoaded;
                state.textModelStatus.loadProgress = action.payload.textLoaded ? 100 : 0;
                state.visionModelStatus.isLoading = false;
                state.visionModelStatus.isLoaded = action.payload.visionLoaded;
                state.visionModelStatus.loadProgress = action.payload.visionLoaded ? 100 : 0;

                state.translationModelStatus.isLoading = false;
                state.translationModelStatus.isLoaded = action.payload.translationLoaded || false;
                state.translationModelStatus.loadProgress = action.payload.translationLoaded ? 100 : 0;
            })
            .addCase(initializeAI.rejected, (state, action) => {
                state.textModelStatus.isLoading = false;
                state.textModelStatus.error = action.payload as string;
                state.visionModelStatus.isLoading = false;
                state.visionModelStatus.error = action.payload as string;
                state.error = action.payload as string;
            });

        // Initialize text model
        builder
            .addCase(initializeTextModel.pending, (state) => {
                state.textModelStatus.isLoading = true;
                state.textModelStatus.error = null;
            })
            .addCase(initializeTextModel.fulfilled, (state, action) => {
                state.textModelStatus.isLoading = false;
                state.textModelStatus.isLoaded = action.payload;
                state.textModelStatus.loadProgress = 100;
            })
            .addCase(initializeTextModel.rejected, (state, action) => {
                state.textModelStatus.isLoading = false;
                state.textModelStatus.error = action.payload as string;
            });

        // Initialize vision model
        builder
            .addCase(initializeVisionModel.pending, (state) => {
                state.visionModelStatus.isLoading = true;
                state.visionModelStatus.error = null;
            })
            .addCase(initializeVisionModel.fulfilled, (state, action) => {
                state.visionModelStatus.isLoading = false;
                state.visionModelStatus.isLoaded = action.payload;
                state.visionModelStatus.loadProgress = 100;
            })
            .addCase(initializeVisionModel.rejected, (state, action) => {
                state.visionModelStatus.isLoading = false;
                state.visionModelStatus.error = action.payload as string;
            });

        // Generate content
        builder
            .addCase(generateContent.pending, (state) => {
                state.isProcessing = true;
                state.currentOperation = 'Generating content...';
                state.error = null;
            })
            .addCase(generateContent.fulfilled, (state, action) => {
                state.isProcessing = false;
                state.currentOperation = null;
                state.generatedContents.unshift(action.payload);
            })
            .addCase(generateContent.rejected, (state, action) => {
                state.isProcessing = false;
                state.currentOperation = null;
                state.error = action.payload as string;
            });

        // Process PDF
        builder
            .addCase(processPDF.pending, (state) => {
                state.isProcessing = true;
                state.currentOperation = 'Processing PDF...';
                state.operationProgress = 0;
                state.error = null;
            })
            .addCase(processPDF.fulfilled, (state, action) => {
                state.isProcessing = false;
                state.currentOperation = null;
                state.operationProgress = 100;
                state.loadedDocuments.unshift(action.payload);
            })
            .addCase(processPDF.rejected, (state, action) => {
                state.isProcessing = false;
                state.currentOperation = null;
                state.error = action.payload as string;
            });

        // Scan document
        builder
            .addCase(scanDocument.pending, (state) => {
                state.isProcessing = true;
                state.currentOperation = 'Scanning document...';
                state.error = null;
            })
            .addCase(scanDocument.fulfilled, (state, action) => {
                state.isProcessing = false;
                state.currentOperation = null;
                state.scanResults.unshift(action.payload);
            })
            .addCase(scanDocument.rejected, (state, action) => {
                state.isProcessing = false;
                state.currentOperation = null;
                state.error = action.payload as string;
            });

        // Initialize translation model
        builder
            .addCase(initializeTranslationModel.pending, (state) => {
                state.translationModelStatus.isLoading = true;
                state.translationModelStatus.error = null;
            })
            .addCase(initializeTranslationModel.fulfilled, (state, action) => {
                state.translationModelStatus.isLoading = false;
                state.translationModelStatus.isLoaded = action.payload;
                state.translationModelStatus.loadProgress = 100;
            })
            .addCase(initializeTranslationModel.rejected, (state, action) => {
                state.translationModelStatus.isLoading = false;
                state.translationModelStatus.error = action.payload as string;
            });

        // Translate text
        builder
            .addCase(translateText.pending, (state) => {
                state.isProcessing = true;
                state.currentOperation = 'Translating...';
                state.error = null;
            })
            .addCase(translateText.fulfilled, (state) => {
                state.isProcessing = false;
                state.currentOperation = null;
            })
            .addCase(translateText.rejected, (state, action) => {
                state.isProcessing = false;
                state.currentOperation = null;
                state.error = action.payload as string;
            });

        // Shutdown
        builder
            .addCase(shutdownAI.fulfilled, (state) => {
                state.textModelStatus = { ...initialModelStatus };
                state.visionModelStatus = { ...initialModelStatus };
                state.translationModelStatus = { ...initialModelStatus };
                state.isProcessing = false;
                state.currentOperation = null;
            });
    },
});

export const {
    updateTextModelProgress,
    updateVisionModelProgress,
    updateTranslationModelProgress,
    setOperationProgress,
    clearError,
    updateSettings,
    removeContent,
    removeDocument,
    removeScanResult,
    clearAllData,
} = aiSlice.actions;

export default aiSlice.reducer;

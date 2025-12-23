/**
 * EduLite Mobile AI - Model Manager
 * Handles AI model initialization, loading, and lifecycle management
 * 
 * Models: Text (Gemma 3 1B) + Translation (Sarvam-1 for 10 Indian Languages)
 */

import * as FileSystem from "expo-file-system/legacy"
import { initLlama } from "llama.rn"

import { ModelConfig, ModelStatus, ModelType } from "../../types/ai.types"
import {
  TEXT_MODEL_CONFIG,
  TRANSLATION_MODEL_CONFIG,
} from "./constants"
import MemoryManager from "./MemoryManager"

// Define the context type from llama.rn
type LlamaContextType = Awaited<ReturnType<typeof initLlama>>

// Extended model type to include translation
type ExtendedModelType = ModelType | "translation"

class ModelManager {
  private static instance: ModelManager
  private models: Map<ExtendedModelType, LlamaContextType> = new Map()
  private modelStatuses: Map<ExtendedModelType, ModelStatus> = new Map()
  private memoryManager: MemoryManager
  private isInitialized: boolean = false

  private constructor() {
    this.memoryManager = MemoryManager.getInstance()
    this.initializeStatuses()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager()
    }
    return ModelManager.instance
  }

  /**
   * Initialize default model statuses
   */
  private initializeStatuses(): void {
    const defaultStatus: ModelStatus = {
      isLoaded: false,
      isLoading: false,
      error: null,
      loadProgress: 0,
      memoryUsage: 0,
    }

    this.modelStatuses.set("text", { ...defaultStatus })
    this.modelStatuses.set("translation", { ...defaultStatus })
  }

  /**
   * Get potential model paths (tries multiple locations)
   */
  private async getModelPaths(config: ModelConfig): Promise<string[]> {
    const fileName = config.path.replace("models/", "")
    const paths = [
      // App's document directory (most reliable)
      `${FileSystem.documentDirectory}models/${fileName}`,
      // Common download locations
      `file:///storage/emulated/0/Download/models/${fileName}`,
      `file:///storage/emulated/0/Download/${fileName}`,
    ]
    return paths
  }

  /**
   * Check if model exists at given path
   */
  private async checkPath(
    path: string
  ): Promise<{ exists: boolean; size?: number }> {
    try {
      const info = await FileSystem.getInfoAsync(path)
      if (info.exists && "size" in info) {
        return { exists: true, size: info.size as number }
      }
      return { exists: info.exists }
    } catch {
      return { exists: false }
    }
  }

  /**
   * Find usable model path (copies from Download if needed)
   */
  private async getUsableModelPath(
    config: ModelConfig
  ): Promise<string | null> {
    const paths = await this.getModelPaths(config)
    const appPath = paths[0] // First path is app storage

    // Check if model exists in app storage first
    const appCheck = await this.checkPath(appPath)
    if (appCheck.exists && appCheck.size && appCheck.size > 100000000) {
      console.log(`✅ Model found in app storage: ${appPath}`)
      return appPath
    }

    // Check Download locations
    for (let i = 1; i < paths.length; i++) {
      const downloadPath = paths[i]
      const check = await this.checkPath(downloadPath)

      if (check.exists && check.size && check.size > 100000000) {
        console.log(`📁 Found model in Download: ${downloadPath}`)

        // Copy to app storage for reliability
        try {
          const modelsDir = `${FileSystem.documentDirectory}models/`
          const dirInfo = await FileSystem.getInfoAsync(modelsDir)
          if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(modelsDir, {
              intermediates: true,
            })
          }

          console.log(`📋 Copying to app storage...`)
          await FileSystem.copyAsync({ from: downloadPath, to: appPath })
          console.log(`✅ Model copied to app storage`)
          return appPath
        } catch (e) {
          console.log(`⚠️ Could not copy, using Download path directly`)
          return downloadPath
        }
      }
    }

    console.error(`❌ Model not found: ${config.name}`)
    return null
  }

  /**
   * Check if model file exists
   */
  private async checkModelExists(config: ModelConfig): Promise<boolean> {
    const paths = await this.getModelPaths(config)
    for (const path of paths) {
      const check = await this.checkPath(path)
      if (check.exists && check.size && check.size > 100000000) {
        return true
      }
    }
    return false
  }

  /**
   * Verify all required models exist
   */
  async verifyModels(): Promise<{
    text: boolean
    translation: boolean
  }> {
    const textExists = await this.checkModelExists(TEXT_MODEL_CONFIG)
    const translationExists = await this.checkModelExists(
      TRANSLATION_MODEL_CONFIG
    )
    console.log("📊 Model verification:")
    console.log(`  ├── Text Model (Gemma 3 1B): ${textExists ? "✅" : "❌"}`)
    console.log(
      `  └── Translation Model (Sarvam-1): ${translationExists ? "✅" : "❌"
      }`
    )
    return {
      text: textExists,
      translation: translationExists,
    }
  }

  /**
   * Initialize the text model (Gemma 3 1B)
   */
  async initializeTextModel(
    onProgress?: (progress: number) => void
  ): Promise<boolean> {
    const status = this.modelStatuses.get("text")!

    if (status.isLoaded) {
      console.log("ℹ️ Text model already loaded")
      return true
    }

    if (status.isLoading) {
      console.log("ℹ️ Text model is currently loading...")
      return false
    }

    try {
      // Check memory availability
      const memoryReady = await this.memoryManager.prepareForModelLoad("text")
      if (!memoryReady) {
        throw new Error("Insufficient memory to load text model")
      }

      // Update status
      this.modelStatuses.set("text", {
        ...status,
        isLoading: true,
        error: null,
      })

      // Find valid model path (copies from Download if needed)
      const modelPath = await this.getUsableModelPath(TEXT_MODEL_CONFIG)
      if (!modelPath) {
        throw new Error(
          `Text model not found. Please download gemma-3-1b-it-q4_0.gguf`
        )
      }

      console.log("🚀 Initializing text model (Gemma 3 1B)...")
      console.log(`📁 Loading from: ${modelPath}`)
      onProgress?.(10)

      // Initialize the model
      const context = await initLlama({
        model: modelPath,
        n_ctx: TEXT_MODEL_CONFIG.contextLength,
        n_gpu_layers: 0, // CPU-only for stability
        n_batch: 256,
        use_mlock: false,
        use_mmap: true,
      })

      onProgress?.(100)

      this.models.set("text", context)
      this.modelStatuses.set("text", {
        isLoaded: true,
        isLoading: false,
        error: null,
        loadProgress: 100,
        memoryUsage: TEXT_MODEL_CONFIG.size,
      })

      console.log("✅ Text model initialized successfully")
      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"
      console.error("❌ Failed to initialize text model:", errorMessage)

      this.modelStatuses.set("text", {
        ...status,
        isLoading: false,
        error: errorMessage,
      })

      return false
    }
  }


  /**
   * Initialize the Translation model (Sarvam-1)
   */
  async initializeTranslationModel(
    onProgress?: (progress: number) => void
  ): Promise<boolean> {
    const status = this.modelStatuses.get("translation")!

    if (status.isLoaded) {
      console.log("ℹ️ Translation model already loaded")
      return true
    }

    if (status.isLoading) {
      console.log("ℹ️ Translation model is currently loading...")
      return false
    }

    try {
      // Check memory availability
      const memoryReady = await this.memoryManager.prepareForModelLoad("text")
      if (!memoryReady) {
        throw new Error("Insufficient memory to load translation model")
      }

      // Update status
      this.modelStatuses.set("translation", {
        ...status,
        isLoading: true,
        error: null,
      })

      // Find valid model path
      const modelPath = await this.getUsableModelPath(TRANSLATION_MODEL_CONFIG)
      if (!modelPath) {
        throw new Error(
          `Translation model not found. Please download Sarvam-1`
        )
      }

      console.log("🚀 Initializing translation model (Sarvam-1)...")
      console.log(`📁 Loading from: ${modelPath}`)
      onProgress?.(10)

      // Initialize the model
      const context = await initLlama({
        model: modelPath,
        n_ctx: TRANSLATION_MODEL_CONFIG.contextLength,
        n_gpu_layers: 0, // CPU-only for stability
        n_batch: 256,
        use_mlock: false,
        use_mmap: true,
      })

      onProgress?.(100)

      this.models.set("translation", context)
      this.modelStatuses.set("translation", {
        isLoaded: true,
        isLoading: false,
        error: null,
        loadProgress: 100,
        memoryUsage: TRANSLATION_MODEL_CONFIG.size,
      })

      console.log("✅ Translation model initialized successfully")
      return true
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"
      console.error("❌ Failed to initialize translation model:", errorMessage)

      this.modelStatuses.set("translation", {
        ...status,
        isLoading: false,
        error: errorMessage,
      })

      return false
    }
  }

  /**
   * Initialize all models
   */
  async initializeAllModels(
    onProgress?: (modelType: ModelType, progress: number) => void
  ): Promise<boolean> {
    console.log("🚀 Initializing AI models...")

    // Initialize text model (required)
    const textResult = await this.initializeTextModel((progress) =>
      onProgress?.("text", progress)
    )

    // Try to initialize Translation model if available (recommended for multilingual support)
    const translationExists = await this.checkModelExists(
      TRANSLATION_MODEL_CONFIG
    )
    if (translationExists) {
      await this.initializeTranslationModel((progress) =>
        onProgress?.("text", progress)
      )
    }

    this.isInitialized = textResult

    if (textResult) {
      const translationStatus = this.modelStatuses.get("translation")!
      console.log(
        `✅ AI ready - Text: ✅ | Translation: ${translationStatus.isLoaded ? "✅" : "❌"}`
      )
    } else {
      console.error("❌ Failed to initialize AI models")
    }

    return this.isInitialized
  }

  /**
   * Get the text model context
   */
  getTextModel(): LlamaContextType | undefined {
    return this.models.get("text")
  }



  /**
   * Get the Translation model context (Sarvam-1)
   */
  getTranslationModel(): LlamaContextType | undefined {
    return this.models.get("translation")
  }

  /**
   * Get model status
   */
  getModelStatus(modelType: ExtendedModelType): ModelStatus | undefined {
    return this.modelStatuses.get(modelType)
  }

  /**
   * Check if text model is ready
   */
  isReady(): boolean {
    return this.isInitialized
  }

  /**
   * Check if text model is ready (alias)
   */
  isTextModelReady(): boolean {
    const textStatus = this.modelStatuses.get("text")
    return textStatus?.isLoaded || false
  }


  /**
   * Check if Translation model is ready
   */
  isTranslationModelReady(): boolean {
    const translationStatus = this.modelStatuses.get("translation")
    return translationStatus?.isLoaded || false
  }

  /**
   * Vision model disabled - using ML Kit OCR instead
   */
  isVisionReady(): boolean {
    return false
  }

  /**
   * Vision model disabled - returns undefined
   */
  getVisionModel(): undefined {
    return undefined
  }

  /**
   * Release a model from memory
   */
  async releaseModel(modelType: ExtendedModelType): Promise<void> {
    const context = this.models.get(modelType)
    if (context) {
      try {
        // Release the model context
        await context.release()
        this.models.delete(modelType)

        const status = this.modelStatuses.get(modelType)!
        this.modelStatuses.set(modelType, {
          ...status,
          isLoaded: false,
          loadProgress: 0,
          memoryUsage: 0,
        })

        console.log(`✅ Released ${modelType} model`)
      } catch (error) {
        console.error(`❌ Error releasing ${modelType} model:`, error)
      }
    }
  }

  /**
   * Release all models
   */
  async releaseAllModels(): Promise<void> {
    console.log("🧹 Releasing all models...")
    await this.releaseModel("text")
    await this.releaseModel("translation")
    this.isInitialized = false
    console.log("✅ All models released")
  }

  /**
   * Get debug info
   */
  getDebugInfo(): string {
    const textStatus = this.modelStatuses.get("text")!
    const translationStatus = this.modelStatuses.get("translation")!

    return `
╔══════════════════════════════════════╗
║       AI Model Manager Status        ║
╠══════════════════════════════════════╣
║ Text Model (Gemma 3 1B):            
│   ├── Loaded: ${textStatus.isLoaded ? "✅" : "❌"}
│   ├── Loading: ${textStatus.isLoading ? "⏳" : "—"}
│   └── Error: ${textStatus.error || "None"}
║ Translation Model (Sarvam-1):            
│   ├── Loaded: ${translationStatus.isLoaded ? "✅" : "❌"}
│   ├── Loading: ${translationStatus.isLoading ? "⏳" : "—"}
│   └── Error: ${translationStatus.error || "None"}
╚══════════════════════════════════════╝`
  }
}

export default ModelManager

/**
 * EduLite Mobile AI - Model Download Utility
 * Handles downloading and managing AI models
 * 
 * Models: Text (Gemma 3 1B) + Translation (Sarvam-1 for 10 Indian Languages)
 */

import * as FileSystem from "expo-file-system/legacy"
import {
  TEXT_MODEL_CONFIG,
  TRANSLATION_MODEL_CONFIG,
} from "./constants"

// Model download URLs from HuggingFace
const MODEL_URLS = {
  // Gemma 3 1B - Text Model (Official Google Q4 quantized)
  text: "https://huggingface.co/google/gemma-3-1b-it-qat-q4_0-gguf/resolve/main/gemma-3-1b-it-q4_0.gguf",
  // Sarvam-1 - Translation Model for 10 Indian Languages (verified working GGUF)
  // From bartowski's verified conversions
  translation:
    "https://huggingface.co/bartowski/sarvam-1-GGUF/resolve/main/sarvam-1-Q4_K_M.gguf",
}

interface DownloadProgress {
  totalBytesWritten: number
  totalBytesExpectedToWrite: number
  percentage: number
}

interface ModelDownloadResult {
  success: boolean
  path: string
  error?: string
}

class ModelDownloader {
  private static instance: ModelDownloader
  private modelsDir: string
  private downloadResumables: Map<string, FileSystem.DownloadResumable> =
    new Map()

  private constructor() {
    this.modelsDir = `${FileSystem.documentDirectory}models/`
  }

  static getInstance(): ModelDownloader {
    if (!ModelDownloader.instance) {
      ModelDownloader.instance = new ModelDownloader()
    }
    return ModelDownloader.instance
  }

  /**
   * Ensure models directory exists
   */
  private async ensureModelsDir(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(this.modelsDir)
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.modelsDir, {
        intermediates: true,
      })
      console.log("📁 Created models directory")
    }
  }

  /**
   * Check which models are already downloaded
   */
  async checkDownloadedModels(): Promise<{
    text: boolean
    translation: boolean
  }> {
    const textPath = `${this.modelsDir}${TEXT_MODEL_CONFIG.path
      .split("/")
      .pop()}`
    const translationPath = `${this.modelsDir}${TRANSLATION_MODEL_CONFIG.path
      .split("/")
      .pop()}`

    const textInfo = await FileSystem.getInfoAsync(textPath)
    const translationInfo = await FileSystem.getInfoAsync(translationPath)

    // Verify file integrity by checking size
    const verifyFile = async (
      info: FileSystem.FileInfo,
      expectedSize: number,
      path: string
    ): Promise<boolean> => {
      if (!info.exists) return false
      const actualSize = (info as any).size || 0
      // Allow 10% variance for size check
      const isValid = actualSize > expectedSize * 0.9

      if (info.exists && !isValid && actualSize > 0) {
        console.warn(`⚠️ Corrupted file detected: ${path}`)
        try {
          await FileSystem.deleteAsync(path)
          console.log(`🗑️ Deleted corrupted file`)
        } catch (e) {
          console.error("Failed to delete corrupted file:", e)
        }
        return false
      }
      return isValid
    }

    const textValid = await verifyFile(
      textInfo,
      TEXT_MODEL_CONFIG.size,
      textPath
    )
    const translationValid = await verifyFile(
      translationInfo,
      TRANSLATION_MODEL_CONFIG.size,
      translationPath
    )

    return { text: textValid, translation: translationValid }
  }

  /**
   * Download a model with progress tracking
   */
  private async downloadModel(
    modelName: string,
    url: string,
    targetPath: string,
    onProgress?: (progress: DownloadProgress) => void,
    expectedSize?: number
  ): Promise<ModelDownloadResult> {
    await this.ensureModelsDir()

    // Delete existing corrupted file if present
    const existingInfo = await FileSystem.getInfoAsync(targetPath)
    if (existingInfo.exists) {
      const existingSize = (existingInfo as any).size || 0
      if (expectedSize && existingSize < expectedSize * 0.9) {
        console.log(`🗑️ Removing incomplete ${modelName} file`)
        await FileSystem.deleteAsync(targetPath)
      } else if (existingSize > 0) {
        console.log(`✅ ${modelName} already downloaded`)
        return { success: true, path: targetPath }
      }
    }

    console.log(`📥 Starting download: ${modelName}`)
    console.log(`   URL: ${url}`)

    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        targetPath,
        {},
        (downloadProgress) => {
          const progress: DownloadProgress = {
            totalBytesWritten: downloadProgress.totalBytesWritten,
            totalBytesExpectedToWrite:
              downloadProgress.totalBytesExpectedToWrite,
            percentage:
              (downloadProgress.totalBytesWritten /
                downloadProgress.totalBytesExpectedToWrite) *
              100,
          }
          onProgress?.(progress)
        }
      )

      this.downloadResumables.set(modelName, downloadResumable)
      const result = await downloadResumable.downloadAsync()

      if (result?.uri) {
        console.log(`✅ Downloaded ${modelName}`)
        this.downloadResumables.delete(modelName)
        return { success: true, path: result.uri }
      } else {
        throw new Error("Download returned no URI")
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      console.error(`❌ Download failed: ${modelName}`, errorMsg)
      return { success: false, path: targetPath, error: errorMsg }
    }
  }

  /**
   * Download the text model (Gemma 3 1B)
   */
  async downloadTextModel(
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<ModelDownloadResult> {
    return this.downloadModel(
      "text",
      MODEL_URLS.text,
      `${this.modelsDir}${TEXT_MODEL_CONFIG.path.split("/").pop()}`,
      onProgress,
      TEXT_MODEL_CONFIG.size
    )
  }


  /**
   * Download the Translation model (Sarvam-1)
   */
  async downloadTranslationModel(
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<ModelDownloadResult> {
    return this.downloadModel(
      "translation",
      MODEL_URLS.translation,
      `${this.modelsDir}${TRANSLATION_MODEL_CONFIG.path.split("/").pop()}`,
      onProgress,
      TRANSLATION_MODEL_CONFIG.size
    )
  }

  /**
   * Get download URL for a model (for manual download)
   */
  getModelUrl(modelKey: "text" | "translation"): string {
    return MODEL_URLS[modelKey]
  }

  /**
   * Format bytes to human readable string
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  /**
   * Cancel an ongoing download
   */
  async cancelDownload(modelName: string): Promise<void> {
    const resumable = this.downloadResumables.get(modelName)
    if (resumable) {
      try {
        await resumable.pauseAsync()
        this.downloadResumables.delete(modelName)
        console.log(`⏹️ Cancelled download: ${modelName}`)
      } catch (error) {
        console.error(`Error cancelling download:`, error)
      }
    }
  }

  /**
   * Delete a downloaded model
   */
  async deleteModel(
    modelKey: "text" | "translation"
  ): Promise<boolean> {
    try {
      const config =
        modelKey === "text"
          ? TEXT_MODEL_CONFIG
          : TRANSLATION_MODEL_CONFIG
      const filename = config.path.split("/").pop() || ""
      const path = `${this.modelsDir}${filename}`

      const info = await FileSystem.getInfoAsync(path)
      if (info.exists) {
        await FileSystem.deleteAsync(path, { idempotent: true })
        console.log(`🗑️ Deleted model: ${modelKey}`)
        return true
      }
      return false
    } catch (error) {
      console.error("Error deleting model:", error)
      return false
    }
  }

  /**
   * Get total size of all models (for download planning)
   */
  getTotalModelsSize(): number {
    return (
      TEXT_MODEL_CONFIG.size +
      TRANSLATION_MODEL_CONFIG.size
    ) // ~3.7 GB total
  }
}

export default ModelDownloader

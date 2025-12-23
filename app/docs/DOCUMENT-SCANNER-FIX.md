# Document Scanner - Complete Fix Guide

**Created:** 2025-12-17  
**Status:** Critical Issues Identified  
**Priority:** HIGH

---

## Executive Summary

The Document Scanner feature is **NOT WORKING** because:
1. The Vision Model is not loading correctly
2. Multimodal (image processing) is not being enabled
3. The fallback OCR is just a placeholder with no actual functionality
4. Model files are in the wrong location

---

## Current Problems

### Problem 1: Model Files Location Mismatch

**Issue:** Model files exist in `assets/models/` but the code looks for them in:
- `${FileSystem.documentDirectory}/models/` (app storage)
- `/storage/emulated/0/Download/models/` (device Download folder)

**Files in `assets/models/`:**
| File | Size | Purpose |
|------|------|---------|
| `gemma-3-1b-it-q4_0.gguf` | 957 MB | Text model |
| `ggml-model-q4_k.gguf` | 755 MB | Vision model (MobileVLM v2) |
| `mmproj-model-f16.gguf` | 568 MB | Vision projector (REQUIRED for multimodal) |

**Impact:** Models are never found, so vision model never loads.

---

### Problem 2: Missing `ctx_shift: false` in Vision Model Init

**Location:** `services/ai/ModelManager.ts` line 348-356

**Current Code:**
```typescript
const context = await initLlama({
    model: modelPath,
    n_ctx: VISION_MODEL_CONFIG.contextLength,
    n_gpu_layers: VISION_MODEL_CONFIG.gpuLayers,
    n_batch: 128,
    use_mlock: false,
    use_mmap: true,
});
```

**Issue:** According to llama.rn documentation, multimodal models **REQUIRE** `ctx_shift: false` to maintain media token positioning.

**Fix:**
```typescript
const context = await initLlama({
    model: modelPath,
    n_ctx: VISION_MODEL_CONFIG.contextLength,
    n_gpu_layers: VISION_MODEL_CONFIG.gpuLayers,
    n_batch: 128,
    use_mlock: false,
    use_mmap: true,
    ctx_shift: false,  // REQUIRED for multimodal
});
```

---

### Problem 3: Projector File Not Found

**Location:** `services/ai/ModelManager.ts` lines 308-342

**Issue:** The projector file search only checks:
1. `${FileSystem.documentDirectory}models/mmproj-model-f16.gguf`
2. `file:///storage/emulated/0/Download/models/mmproj-model-f16.gguf`

But the file is in `assets/models/` which is NOT accessible at runtime in React Native without using Expo Asset.

**Impact:** `projectorPath` is always `null`, so `initMultimodal()` is never called, so multimodal is NEVER enabled.

---

### Problem 4: Fallback OCR is a Placeholder

**Location:** `services/ai/DocumentScannerService.ts` lines 160-168

**Current Code:**
```typescript
private async fallbackOCR(imagePath: string): Promise<{ text: string; confidence: number }> {
    // This is a placeholder - in production, integrate with a local OCR library
    console.log('Using fallback OCR (placeholder)');
    return {
        text: 'OCR text extraction requires vision model. Please load the SmolVLM2 model.',
        confidence: 0,
    };
}
```

**Impact:** When vision model fails (which it always does due to above issues), users get no OCR at all.

---

### Problem 5: isMultimodalEnabled Check

**Location:** `services/ai/DocumentScannerService.ts` lines 113-120

**Code:**
```typescript
// Check if multimodal is enabled
const isMultimodal = await visionModel.isMultimodalEnabled?.() || false;

if (!isMultimodal) {
    console.warn('Multimodal not enabled, using fallback');
    return this.fallbackOCR(imagePath);
}
```

**Issue:** Since `initMultimodal()` was never called (projector not found), `isMultimodalEnabled()` returns `false`, and it falls back to placeholder OCR.

---

### Problem 6: Context Length Too Low

**Location:** `services/ai/constants.ts` lines 23-31

**Current Config:**
```typescript
export const VISION_MODEL_CONFIG: ModelConfig = {
    name: 'MobileVLM-v2-1.7B',
    path: 'models/ggml-model-q4_k.gguf',
    size: 1050000000,
    type: 'vision',
    quantization: 'q4_k',
    contextLength: 2048,  // May be too low for image processing
    gpuLayers: 0,
};
```

**Issue:** According to llama.rn docs, multimodal models need adequate `n_ctx`. 2048 may be too low for image+text processing.

**Recommendation:** Increase to 4096 for multimodal.

---

## Complete Fix Plan

### Fix 1: Copy Models from Assets to Document Directory

Create a utility to copy bundled assets to app storage on first launch.

**File:** `services/ai/AssetModelLoader.ts`

```typescript
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';

class AssetModelLoader {
    private static instance: AssetModelLoader;
    private modelsDir: string;

    private constructor() {
        this.modelsDir = `${FileSystem.documentDirectory}models/`;
    }

    static getInstance(): AssetModelLoader {
        if (!AssetModelLoader.instance) {
            AssetModelLoader.instance = new AssetModelLoader();
        }
        return AssetModelLoader.instance;
    }

    async ensureModelsDirectory(): Promise<void> {
        const dirInfo = await FileSystem.getInfoAsync(this.modelsDir);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(this.modelsDir, { intermediates: true });
        }
    }

    async copyBundledModel(assetModule: number, filename: string): Promise<string> {
        await this.ensureModelsDirectory();
        
        const targetPath = `${this.modelsDir}${filename}`;
        
        // Check if already copied
        const existingFile = await FileSystem.getInfoAsync(targetPath);
        if (existingFile.exists) {
            console.log(`✅ Model already exists: ${filename}`);
            return targetPath;
        }

        // Load asset and copy
        const asset = await Asset.fromModule(assetModule).downloadAsync();
        if (asset.localUri) {
            await FileSystem.copyAsync({
                from: asset.localUri,
                to: targetPath,
            });
            console.log(`📋 Copied bundled model: ${filename}`);
            return targetPath;
        }

        throw new Error(`Failed to copy bundled model: ${filename}`);
    }

    async loadAllBundledModels(): Promise<{text: boolean; vision: boolean; projector: boolean}> {
        const results = { text: false, vision: false, projector: false };
        
        try {
            // Note: You need to import the assets with require()
            // await this.copyBundledModel(require('../../assets/models/gemma-3-1b-it-q4_0.gguf'), 'gemma-3-1b-it-q4_0.gguf');
            // await this.copyBundledModel(require('../../assets/models/ggml-model-q4_k.gguf'), 'ggml-model-q4_k.gguf');
            // await this.copyBundledModel(require('../../assets/models/mmproj-model-f16.gguf'), 'mmproj-model-f16.gguf');
            
            // For large files, require() won't work. Use metro.config.js to bundle.
            // OR copy files manually to device storage.
            
        } catch (error) {
            console.error('Failed to load bundled models:', error);
        }
        
        return results;
    }
}

export default AssetModelLoader;
```

**IMPORTANT:** Expo/Metro cannot bundle large binary files (>50MB) with `require()`. For 500MB+ model files, you MUST:
1. Download at runtime via ModelDownloader
2. OR have user copy to device storage manually
3. OR use expo-updates to deliver as OTA assets

---

### Fix 2: Update ModelManager for ctx_shift

**File:** `services/ai/ModelManager.ts`

**Change lines 348-356 to:**

```typescript
// Initialize the model with memory-optimized settings
const context = await initLlama({
    model: modelPath,
    n_ctx: VISION_MODEL_CONFIG.contextLength,
    n_gpu_layers: VISION_MODEL_CONFIG.gpuLayers,
    n_batch: 128,
    use_mlock: false,
    use_mmap: true,
    ctx_shift: false,  // REQUIRED: Multimodal models need this disabled
});
```

---

### Fix 3: Increase Vision Model Context Length

**File:** `services/ai/constants.ts`

**Change:**
```typescript
export const VISION_MODEL_CONFIG: ModelConfig = {
    name: 'MobileVLM-v2-1.7B',
    path: 'models/ggml-model-q4_k.gguf',
    size: 1050000000,
    type: 'vision',
    quantization: 'q4_k',
    contextLength: 4096,  // Increased from 2048 for multimodal
    gpuLayers: 0,
};
```

---

### Fix 4: Implement Real Fallback OCR with ML Kit

Install the package:
```bash
npm install @react-native-ml-kit/text-recognition
npx expo prebuild
```

**Update `services/ai/DocumentScannerService.ts`:**

```typescript
import TextRecognition from '@react-native-ml-kit/text-recognition';

private async fallbackOCR(imagePath: string): Promise<{ text: string; confidence: number }> {
    console.log('🔍 Using ML Kit OCR fallback');
    
    try {
        // Use Google ML Kit for OCR
        const result = await TextRecognition.recognize(imagePath);
        
        if (result && result.text) {
            console.log('✅ ML Kit OCR successful');
            return {
                text: result.text,
                confidence: 0.85,
            };
        }
        
        return {
            text: 'No text detected in image',
            confidence: 0,
        };
    } catch (error) {
        console.error('❌ ML Kit OCR failed:', error);
        return {
            text: 'OCR failed. Please ensure the image is clear and try again.',
            confidence: 0,
        };
    }
}
```

---

### Fix 5: Add Better Error Logging

**File:** `services/ai/ModelManager.ts`

Add detailed logging in `initializeVisionModel()`:

```typescript
async initializeVisionModel(
    onProgress?: (progress: number) => void
): Promise<boolean> {
    const status = this.modelStatuses.get('vision')!;
    
    console.log('═══════════════════════════════════════');
    console.log('🔧 VISION MODEL INITIALIZATION DEBUG');
    console.log('═══════════════════════════════════════');

    // ... existing code ...
    
    // When checking model path
    console.log(`📁 Model path found: ${modelPath || 'NOT FOUND'}`);
    
    // When checking projector
    console.log(`📁 Projector path found: ${projectorPath || 'NOT FOUND'}`);
    
    // After initMultimodal
    if (projectorPath) {
        try {
            await context.initMultimodal({
                path: projectorPath,
                use_gpu: false,
            });
            const isEnabled = await context.isMultimodalEnabled?.() || false;
            console.log(`✅ Multimodal initialized: ${isEnabled}`);
        } catch (mmError) {
            console.error('❌ initMultimodal FAILED:', mmError);
        }
    }
    
    console.log('═══════════════════════════════════════');
}
```

---

## Quick Fix Options (Choose One)

### Option A: Use ML Kit OCR (Recommended - Fastest)

This bypasses the broken Vision model entirely.

1. Install ML Kit:
```bash
npm install @react-native-ml-kit/text-recognition
npx expo prebuild
cd android && ./gradlew clean
cd ..
npx expo run:android
```

2. Update `fallbackOCR()` to use ML Kit (see Fix 4 above)

3. Remove the `isVisionModelReady` check in scanner.tsx since ML Kit will handle OCR

**Pros:** Works immediately, no model loading required  
**Cons:** Not AI-powered analysis (just OCR)

---

### Option B: Fix Vision Model Loading

1. Copy model files to device's `Download/models/` folder manually:
   - `ggml-model-q4_k.gguf`
   - `mmproj-model-f16.gguf`

2. Apply Fix 2 (ctx_shift)

3. Apply Fix 3 (context length)

4. Rebuild app: `npx expo run:android`

**Pros:** Full AI-powered vision  
**Cons:** Requires manual file copy, uses ~1.3GB RAM

---

### Option C: Use Vision Model Download

1. Go to AI Test Dashboard → Model Manager
2. Download Vision Model and Projector
3. Return to Dashboard, wait for auto-init
4. Apply Fix 2 and Fix 3 first

**Pros:** No manual file copy  
**Cons:** Requires internet, large download (1.3GB)

---

## Testing Checklist

After applying fixes, verify:

- [ ] Model files exist in `documentDirectory/models/`
- [ ] `initializeVisionModel()` returns `true`
- [ ] `isMultimodalEnabled()` returns `true`
- [ ] Console shows "✅ Vision model initialized successfully"
- [ ] Console shows "✅ Multimodal initialized: true"
- [ ] Document Scanner can extract text from images

---

## Files to Modify

| File | Changes |
|------|---------|
| `services/ai/ModelManager.ts` | Add `ctx_shift: false`, add logging |
| `services/ai/constants.ts` | Increase contextLength to 4096 |
| `services/ai/DocumentScannerService.ts` | Implement real fallback OCR |
| `package.json` | Add `@react-native-ml-kit/text-recognition` |

---

## Root Cause Summary

```
┌─────────────────────────────────────────────────────────────────┐
│ User takes photo → Scanner tries to OCR                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Check: isVisionModelReady?                                       │
│ Result: FALSE (model files not in expected location)            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Falls back to fallbackOCR()                                      │
│ Result: Returns placeholder text, not real OCR                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ classifyDocument() receives placeholder text                    │
│ extractKeyInfo() generates template output                      │
│ User sees: "Title: Document Title" garbage                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Recommended Action

**Implement Option A (ML Kit OCR)** for immediate fix, then work on Option B/C for full AI vision support later.

ML Kit provides:
- On-device OCR (no internet needed)
- Works immediately (no model loading)
- Supports multiple languages
- ~95% accuracy for printed text

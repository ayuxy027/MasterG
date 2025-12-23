# 📱 How Offline AI Works in EduLite - Complete Guide

## 🎯 Quick Answer to Your Questions

| Question | Answer |
|----------|--------|
| **Do I need to download the model?** | Yes, users download models on first launch (~700 MB - 2 GB) |
| **Do I need Ollama?** | ❌ No! llama.rn runs directly on the phone's CPU/GPU |
| **Does the app include the model?** | ❌ No, models are too large. Users download separately |
| **How does it work offline?** | Models are stored on device, run 100% locally |
| **What about when I share the APK?** | User downloads models on first launch over WiFi |

---

## 🏗️ Architecture: How It Actually Works

```
┌─────────────────────────────────────────────────────────────────┐
│                     YOUR MOBILE DEVICE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    MasterJi App                             │ │
│  │                    (~50 MB installed)                       │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │              llama.rn Library                        │  │ │
│  │  │  (React Native binding for llama.cpp)                │  │ │
│  │  │                                                      │  │ │
│  │  │  • Loads GGUF model files from storage               │  │ │
│  │  │  • Uses phone's CPU for inference                    │  │ │
│  │  │  • Uses Metal (iOS) or OpenCL (Android) for GPU      │  │ │
│  │  │  • 100% on-device, no internet needed                │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                          │                                  │ │
│  │                          ▼                                  │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │          Local Storage (Phone's Storage)             │  │ │
│  │  │                                                      │  │ │
│  │  │  📁 /data/data/com.edulite.masterji/files/models/   │  │ │
│  │  │  ├── gemma-3-1b-it-q4_0.gguf      (~700 MB)         │  │ │
│  │  │  ├── smolvlm2-2.2b-q4_k_s.gguf    (~800 MB)         │  │ │
│  │  │  └── smolvlm2-mmproj-f16.gguf     (~200 MB)         │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│                    ⚡ Phone's CPU/GPU                            │
│                    Runs AI inference locally                     │
└─────────────────────────────────────────────────────────────────┘

            ❌ NO INTERNET NEEDED AFTER MODEL DOWNLOAD
            ❌ NO SERVER REQUIRED  
            ❌ NO API CALLS
            ❌ NO OLLAMA
```

---

## 📥 Model Download Options

### Option A: In-App Download (Recommended for Production)

**User Experience:**
1. User installs app from Play Store (~50 MB)
2. Opens app for the first time
3. Sees "Download AI Models" screen
4. Downloads models over WiFi (~700 MB - 2 GB)
5. From now on, 100% offline!

```tsx
// Example download screen UI
<View>
  <Text>Download AI Models</Text>
  <Text>Required for offline learning</Text>
  
  <ModelDownloadCard 
    name="Gemma 3 (Text AI)" 
    size="700 MB" 
    onDownload={downloadTextModel}
  />
  
  <Text>⚠️ Connect to WiFi for best experience</Text>
</View>
```

### Option B: Manual Download (For Development/Testing)

Download files directly to your computer, then copy to device:

---

## 🎯 Step-by-Step: Download Gemma 3 Model

### Method 1: PowerShell (Windows)

```powershell
# Navigate to models folder
cd d:\Hackathon\Eduthon\masterji\assets\models

# Download Gemma 3 1B (Q4 quantized) - ~700 MB
# This is the correct direct download URL:
Invoke-WebRequest `
  -Uri "https://huggingface.co/google/gemma-3-1b-it-qat-q4_0-gguf/resolve/main/gemma-3-1b-it-q4_0.gguf" `
  -OutFile "gemma-3-1b-it-q4_0.gguf"
```

### Method 2: Browser Download

1. Go to: https://huggingface.co/google/gemma-3-1b-it-qat-q4_0-gguf/tree/main
2. Click on the file `gemma-3-1b-it-q4_0.gguf`
3. Click the "Download" button
4. Move the file to `assets/models/` folder

### Method 3: Curl (macOS/Linux)

```bash
cd assets/models
curl -L -o gemma-3-1b-it-q4_0.gguf \
  "https://huggingface.co/google/gemma-3-1b-it-qat-q4_0-gguf/resolve/main/gemma-3-1b-it-q4_0.gguf"
```

---

## 📦 Model Files We Need

| Model | Purpose | Size | Required |
|-------|---------|------|----------|
| `gemma-3-1b-it-q4_0.gguf` | Text generation, Q&A | ~700 MB | ✅ Yes |
| `smolvlm2-2.2b-instruct-q4_k_s.gguf` | Vision, OCR | ~800 MB | For scanning |
| `smolvlm2-2.2b-instruct-mmproj-f16.gguf` | Vision projector | ~200 MB | For scanning |

**For Hackathon MVP:** Just download Gemma 3 (~700 MB) - you can do text AI without vision.

---

## 🔧 How to Build & Run

### For Development/Testing:

Since llama.rn requires native code, you CANNOT use Expo Go. You need a development build:

```bash
# 1. Install expo-dev-client
npx expo install expo-dev-client

# 2. Create a development build using EAS
eas build --profile development --platform android

# 3. OR build locally (requires Android Studio)
npx expo prebuild
npx expo run:android
```

### What the Build Does:

```
expo prebuild
      │
      ▼
┌─────────────────────────────────────────┐
│ Generates native Android/iOS projects   │
│ with llama.rn native code included      │
└─────────────────────────────────────────┘
      │
      ▼
npx expo run:android
      │
      ▼
┌─────────────────────────────────────────┐
│ Builds APK with:                        │
│ • React Native code                     │
│ • llama.cpp native library              │
│ • All your TypeScript code              │
│                                         │
│ APK size: ~50-80 MB                     │
│ (Models NOT included)                   │
└─────────────────────────────────────────┘
```

---

## 📱 User Flow When Using Your App

```
┌─────────────────────────────────────────┐
│ 1️⃣ USER INSTALLS APP                    │
│    From Play Store or APK file          │
│    Size: ~50-80 MB                      │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│ 2️⃣ FIRST LAUNCH                         │
│    App checks if models exist           │
│    Models NOT found → Show download UI  │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│ 3️⃣ MODEL DOWNLOAD SCREEN               │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 📦 Download AI Models           │   │
│  │                                  │   │
│  │ To enable offline learning,     │   │
│  │ download the AI models (700 MB) │   │
│  │                                  │   │
│  │ ⚠️ Connect to WiFi              │   │
│  │                                  │   │
│  │ [████████░░░░░░░░] 45%          │   │
│  │                                  │   │
│  └─────────────────────────────────┘   │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│ 4️⃣ MODELS STORED LOCALLY               │
│                                         │
│    /storage/emulated/0/Android/data/   │
│    com.edulite.masterji/files/models/  │
│    └── gemma-3-1b-it-q4_0.gguf (700MB) │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│ 5️⃣ 100% OFFLINE FOREVER!               │
│                                         │
│    • No internet needed                 │
│    • AI runs on phone's CPU/GPU         │
│    • Fast responses (3-15 seconds)      │
│    • Complete privacy                   │
└─────────────────────────────────────────┘
```

---

## ⚡ Why This Approach?

### Pros:
✅ **Small app size** - Only 50-80 MB to download from app store  
✅ **User choice** - Users can choose which models to download  
✅ **Updatable models** - Can push new models without app update  
✅ **Storage efficient** - Users can delete models to free space  
✅ **Works on older devices** - Smaller model options available

### Cons:
❌ Requires WiFi for initial model download  
❌ Large download after install (700 MB - 2 GB)  
❌ Some users may not complete download

### Alternative (Bundle Models):
❌ App would be 2+ GB - too large for app stores  
❌ Users forced to download entire model even if they don't need it  
❌ Updates would require re-downloading everything

---

## 🎮 Comparison with Other Approaches

| Approach | App Size | Offline? | Speed | Privacy |
|----------|----------|----------|-------|---------|
| **llama.rn (Ours)** | 50 MB + 700 MB download | ✅ 100% | Fast | ✅ Full |
| Ollama (Server) | Small | ❌ Needs server | Very Fast | ❌ Data leaves device |
| Cloud API (OpenAI) | Tiny | ❌ Internet required | Varies | ❌ Data sent to cloud |
| Bundled Model | 2+ GB | ✅ 100% | Fast | ✅ Full |

---

## 🚀 Quick Start for Hackathon

### Step 1: Download Model (One-Time)
```powershell
cd d:\Hackathon\Eduthon\masterji\assets\models

Invoke-WebRequest `
  -Uri "https://huggingface.co/google/gemma-3-1b-it-qat-q4_0-gguf/resolve/main/gemma-3-1b-it-q4_0.gguf" `
  -OutFile "gemma-3-1b-it-q4_0.gguf"
```

### Step 2: Create Development Build
```bash
npx expo install expo-dev-client
npx expo prebuild
npx expo run:android
```

### Step 3: Test AI Features
The app will load the model from `assets/models/` and run AI inference locally!

---

## 📋 Summary

**Key Points:**
1. **No Ollama needed** - llama.rn runs directly on device
2. **Models downloaded separately** - Not bundled in app
3. **100% offline after download** - No internet required
4. **Privacy-first** - All data stays on device
5. **Development build required** - Can't use Expo Go

**File Locations:**
- Models stored at: `DocumentDirectoryPath/models/`
- Typical path: `/data/data/com.edulite.masterji/files/models/`
- Size: 700 MB - 2 GB total

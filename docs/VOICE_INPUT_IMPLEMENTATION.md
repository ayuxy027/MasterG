# Voice Input Implementation - Offline Setup

## Overview
Speech-to-text using **whisper.cpp** for completely offline transcription.

---

## 📦 Required Downloads

### 1. Download whisper.cpp Executable

**Windows:**
1. Go to: https://github.com/ggerganov/whisper.cpp/releases
2. Download the latest `whisper-xxxxx-bin-x64.zip`
3. Extract and copy `main.exe` to: `backend/bin/whisper/main.exe`

**Or build from source:**
```bash
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp
cmake -B build
cmake --build build --config Release
# Copy build/bin/Release/main.exe to backend/bin/whisper/
```

### 2. Download Whisper Model

Download one of these GGML models from:
https://huggingface.co/ggerganov/whisper.cpp/tree/main

| Model | Size | Speed | Accuracy | Recommended For |
|-------|------|-------|----------|-----------------|
| `ggml-tiny.en.bin` | 75MB | Fastest | Lower | Quick testing |
| `ggml-base.en.bin` | 148MB | Fast | Good | **Recommended** |
| `ggml-small.en.bin` | 488MB | Medium | Better | Better accuracy |
| `ggml-medium.en.bin` | 1.5GB | Slower | High | Best accuracy |

Place the model in: `backend/models/whisper/ggml-base.en.bin`

### 3. Install FFmpeg (Required for audio conversion)

**Windows (via winget):**
```bash
winget install FFmpeg
```

**Or via Chocolatey:**
```bash
choco install ffmpeg
```

**Verify installation:**
```bash
ffmpeg -version
```

---

## 📁 Directory Structure

```
backend/
├── bin/
│   └── whisper/
│       └── main.exe          # whisper.cpp executable
├── models/
│   └── whisper/
│       └── ggml-base.en.bin  # Whisper model
└── uploads/
    └── temp/                  # Temporary audio files (auto-created)
```

---

## ⚙️ Environment Variables (Optional)

Add to `backend/.env` if you want custom paths:

```env
# Custom whisper executable path
WHISPER_EXE_PATH=C:/path/to/main.exe

# Custom model path
WHISPER_MODEL_PATH=C:/path/to/ggml-base.en.bin
```

---

## 🧪 Testing the Setup

1. Start your backend server:
```bash
cd backend
npm run dev
```

2. Check the console for:
```
[Speech] Whisper initialized with model: ggml-base.en.bin
```

If you see warnings about missing files, double-check the paths.

3. Test the API:
```bash
# Record a test audio file and send it
curl -X POST http://localhost:5000/api/speech/transcribe \
  -F "audio=@test.wav"
```

---

## 🎤 How It Works

1. **User clicks mic button** → Browser records audio via MediaRecorder API
2. **Audio sent to backend** → WebM/WAV format via multipart upload
3. **FFmpeg converts** → Audio converted to 16kHz mono WAV
4. **Whisper processes** → whisper.cpp runs transcription on CPU
5. **Text returned** → Transcription sent back to frontend
6. **Auto-fills input** → Text appears in the chat input box

---

## ⏱️ Performance (CPU)

| Model | ~5 sec audio | ~30 sec audio |
|-------|--------------|---------------|
| tiny.en | ~1-2 sec | ~5-8 sec |
| base.en | ~2-4 sec | ~10-15 sec |
| small.en | ~5-10 sec | ~30-45 sec |

*Performance varies based on CPU speed*

---

## 🔧 Troubleshooting

### "Whisper model not found"
- Check that model file exists at `backend/models/whisper/ggml-base.en.bin`
- Ensure filename matches exactly (case-sensitive)

### "Whisper executable not found"
- Check that `main.exe` exists at `backend/bin/whisper/main.exe`
- On non-Windows systems, use `main` without .exe extension

### "FFmpeg conversion failed"
- Install FFmpeg and ensure it's in your PATH
- Run `ffmpeg -version` to verify installation

### "Transcription timed out"
- Audio may be too long (try shorter recordings)
- CPU may be under heavy load
- Try a smaller model (tiny.en)

---

## 📋 Quick Setup Checklist

- [ ] Downloaded whisper.cpp `main.exe` → `backend/bin/whisper/`
- [ ] Downloaded GGML model → `backend/models/whisper/`
- [ ] Installed FFmpeg and verified with `ffmpeg -version`
- [ ] Started backend and saw "Whisper initialized" message
- [ ] Tested voice input in the app

---

## Files Created

| File | Description |
|------|-------------|
| `backend/src/services/speech.service.ts` | Local whisper.cpp integration |
| `backend/src/controllers/speech.controller.ts` | Audio upload handler |
| `backend/src/routes/speech.routes.ts` | API route `/api/speech/transcribe` |
| `frontend/src/services/speechApi.ts` | Frontend API client |
| `frontend/src/hooks/useVoiceInput.ts` | Recording hook |
| `frontend/src/components/ui/MicButton.tsx` | Mic button component |

---

Created: December 15, 2025

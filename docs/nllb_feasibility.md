# NLLB-200-Distilled-600M Feasibility Audit

## Model Overview
- **Model**: `facebook/nllb-200-distilled-600M`
- **Parameters**: 600M (vs IndicTrans2 200M)
- **Languages**: 200 languages (vs IndicTrans2 22 Indian languages)
- **Size**: ~2.4GB (estimated, vs IndicTrans2 ~2GB)

## Feasibility Assessment

### ✅ Pros
1. **Broader Language Support**: 200 languages vs 22 (useful for international content)
2. **Facebook/Meta Backing**: Well-maintained, active development
3. **Similar Architecture**: Uses transformers library (same as IndicTrans2)
4. **Better for Non-Indian Languages**: If we need Spanish, French, etc. later
5. **Quality**: Generally better quality for many language pairs

### ⚠️ Cons
1. **Larger Model**: 600M params vs 200M (slightly slower, more memory)
2. **Not India-Specific**: IndicTrans2 is optimized for Indian languages
3. **Memory Usage**: ~3-4GB RAM during inference (vs ~2-3GB for IndicTrans2)
4. **Inference Speed**: Slightly slower due to larger model size
5. **Language Codes**: Uses different format (`eng_Latn`, `hin_Deva`, `mar_Deva`) - compatible with IndicTrans2 format

### 🔍 Technical Considerations

#### Memory Requirements
- **Model Loading**: ~2.4GB disk space
- **Runtime Memory**: ~3-4GB RAM (with torch)
- **CPU Inference**: Acceptable for development, GPU recommended for production
- **Concurrent Requests**: Can handle multiple requests with cached model

#### Performance
- **First Request**: ~15-30 seconds (model loading)
- **Subsequent Requests**: ~2-5 seconds per sentence (similar to IndicTrans2)
- **Streaming**: Can be implemented same as IndicTrans2

#### Integration Complexity
- **Low**: Very similar to IndicTrans2 implementation
- **Same Protocol**: Can use stdin/stdout JSON like IndicTrans2
- **Same Service Pattern**: Persistent Python server with Node.js wrapper

### 📊 Comparison with IndicTrans2

| Feature | IndicTrans2 | NLLB-200-600M |
|---------|-------------|---------------|
| Parameters | 200M | 600M |
| Disk Size | ~2GB | ~2.4GB |
| RAM Usage | ~2-3GB | ~3-4GB |
| Languages | 22 (Indian) | 200 (global) |
| Speed | Fast | Slightly slower |
| India Focus | ✅ Optimized | ⚠️ General purpose |
| Quality (Indian langs) | ✅ Good | ✅ Good |

### ✅ Recommendation: **FEASIBLE**

**Decision**: Implement NLLB-200 as an **alternative translation service** alongside IndicTrans2.

**Rationale**:
1. Both models can coexist (different Python servers)
2. Users can choose based on use case:
   - IndicTrans2: For Indian languages (faster, optimized)
   - NLLB-200: For broader language support or comparison
3. Low implementation cost (reuse IndicTrans2 pattern)
4. Good fallback option if IndicTrans2 fails

### 🚀 Implementation Plan

1. Create `nllb_server.py` (similar to `indictrans2_server.py`)
2. Create `nllb.service.ts` (similar to `indictrans2.service.ts`)
3. Add NLLB status to playground
4. Add NLLB translation option to playground
5. Add environment variable to enable/disable NLLB

### ⚠️ Potential Issues

1. **Model Download**: First-time download requires internet (can be cached locally)
2. **Memory Pressure**: Running both models simultaneously = ~5-6GB RAM
3. **Language Code Mapping**: Need to map UI language codes to NLLB codes

### 🔧 Solutions

1. **Model Caching**: Download once, use `local_files_only=True`
2. **Optional Service**: Only start if enabled in env (default: disabled)
3. **Language Mapping**: Create mapping table for common languages


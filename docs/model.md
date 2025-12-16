# Translation Model Analysis – NLLB-200 (600M)

## Model in Use

* **Model Name:** facebook/nllb-200-distilled-600M
* **Type:** Multilingual Machine Translation model (200 languages)
* **Size:** ~600M parameters (distilled)
* **Deployment:** CPU/GPU-friendly, offline-capable
* **Memory Footprint:** ~3-4 GB RAM during inference
* **Storage:** ~2.4GB (cached by HuggingFace transformers library)

This model was selected for its excellent multilingual coverage, strong translation quality, and reasonable resource requirements for offline operation.

---

## Core Strengths

### 1. Multilingual & Offline-Capable

* Supports 200 languages including all major Indian languages
* Runs on CPU, GPU (CUDA), or Apple Silicon (MPS)
* Fully offline operation after initial model download
* Fast inference for short to medium inputs

### 2. Strong Translation Quality

* Performs reliably on:
  * Educational content
  * Scientific terminology
  * Simple factual statements
  * Multi-clause sentences
* Demonstrated correct handling of:
  * Science definitions
  * Educational explanations
  * Formal language

### 3. Good Terminology Retention

* Preserves scientific terms better than smaller models
* Handles proper nouns correctly
* Maintains grammatical structure

---

## Technical Details

### Language Code Format

NLLB-200 uses FLORES-200 language codes:
* English: `eng_Latn`
* Hindi: `hin_Deva`
* Marathi: `mar_Deva`
* Bengali: `ben_Beng`
* Tamil: `tam_Taml`
* And 195+ other languages

### Device Support

* **CUDA**: GPU acceleration with torch.compile optimization
* **MPS**: Apple Silicon GPU acceleration (M1/M2/M3)
* **CPU**: Fallback for systems without GPU

### Performance

* First request: Model loading (~5-10 seconds)
* Subsequent requests: ~2-5 seconds per sentence
* Streaming: Sentence-by-sentence translation support

---

## Integration Notes

* Model is cached by HuggingFace transformers library
* Persistent Python server keeps model in memory
* Supports both single-shot and streaming translation
* Line-by-line processing for best quality

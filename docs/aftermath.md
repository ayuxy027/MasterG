# Translation Feature – Aftermath & Learnings

## Context

We explored the feasibility of multilingual educational content generation under **extreme resource constraints** (CPU-only, 4–8 GB RAM, offline-first) for a hackathon submission. The system generates English educational content using a capable LLM (e.g., DeepSeek via Ollama) and then translates it into **Indian languages** using a lightweight MT model.

---

## Final Architecture Decision

### Current Approach

* English educational content generated via DeepSeek R1 (via Ollama)
* Translation performed using **NLLB-200 (facebook/nllb-200-distilled-600M)**
* Goal: NCERT-aligned, age-appropriate, culturally relevant educational content

---

## Translation Pipeline

### Revised Pipeline

1. **English Content Generation** (Ollama/DeepSeek R1)
   - Generate content using strict MT-safe prompt
   - One sentence per line format
   - No markdown, minimal pronouns

2. **NLLB-200 Translation**
   - Line-by-line processing (one sentence per inference)
   - Stream sentence-by-sentence results
   - FLORES-200 language code format

3. **Output**
   - Clean translated text in target language
   - Preserved scientific terminology
   - Maintained sentence boundaries

---

## Model Selection Rationale

### NLLB-200 (Current Model)

* **facebook/nllb-200-distilled-600M**
* Pros: 
  - Excellent multilingual coverage (200 languages)
  - Strong translation quality
  - Better terminology retention than smaller models
  - GPU acceleration support (CUDA/MPS)
* Cons:
  - Larger memory footprint (~3-4GB RAM)
  - Slightly slower than smaller models

**Decision:** NLLB-200 provides the best balance of quality and performance for educational content translation.

---

## Key Learnings

1. **Sentence-level processing** is critical for quality
2. **Strict prompt engineering** for source content improves translation
3. **GPU acceleration** significantly improves performance (when available)
4. **Streaming responses** improve user experience
5. **Persistent model caching** reduces latency after first request

---

## Implementation Notes

* Model cached in memory via persistent Python server
* Supports both single-shot and streaming translation
* Auto-detects best available device (CUDA > MPS > CPU)
* Line-by-line processing enforced for consistency

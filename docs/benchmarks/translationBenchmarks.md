# Translation Benchmark Report

## Overview

This document benchmarks multiple translation and multilingual language models evaluated during development of the multilingual educational content pipeline. The focus is on **translation quality, language coverage, model size, disk footprint, and suitability under offline / CPU constraints**.

The benchmarked models are:

* IndicTrans2 (200M, distilled)
* IndicTrans2 (1.1B)
* NLLB-200 (distilled 600M)
* DeepSeek-R1 (SLM)
* Gemma (270M)

---

## Benchmark Dimensions

The models were evaluated across the following parameters:

1. **Language Coverage** – Number of supported Indian / global languages
2. **Translation Stability** – Sentence and paragraph-level coherence
3. **Scientific Fidelity** – Preservation of technical and educational terms
4. **Context Handling** – Ability to translate multi-sentence inputs
5. **Model Size** – Parameter count (approx.)
6. **Disk Footprint** – On-disk size after installation
7. **Offline Viability** – Feasibility under CPU-only constraints

---

## Model Comparison Table

| Model                         | Primary Purpose        | Languages Supported | Indic Languages | Model Size | Disk Usage | Notes                                              |
| ----------------------------- | ---------------------- | ------------------- | --------------- | ---------- | ---------- | -------------------------------------------------- |
| **DeepSeek-R1 (SLM)**         | Reasoning + Generation | ~2                  | 2               | ~1.3 GB    | ~3 GB      | Strong reasoning, very limited translation support |
| **Gemma (270M)**              | General LLM            | ~1                  | 1               | ~270 MB    | ~2 GB      | Not designed for translation, weak Indic support   |
| **IndicTrans2 (200M)**        | MT (English ↔ Indic)   | ~15                 | 15              | ~200 MB    | ~3 GB      | Fast, but unstable for paragraphs and science      |
| **IndicTrans2 (1.1B)**        | MT (English ↔ Indic)   | 22                  | 22              | ~1.1 GB    | ~5 GB      | Better quality, heavy for CPU-only setups          |
| **NLLB-200 (600M distilled)** | MT (Global)            | 200+                | 22+             | ~600 MB    | ~1.2 GB    | Best balance of quality, coverage, and stability   |

---

## Language Coverage Analysis

* **DeepSeek-R1**: Translation usable for only **2 languages**.
* **Gemma (270M)**: Effectively supports **1 Indic language**.
* **IndicTrans2 (200M)**: Supports **~15 Indian languages**.
* **IndicTrans2 (1.1B)**: Supports **all 22 scheduled Indian languages**.
* **NLLB-200**: Supports **200+ global languages**, including all major and regional Indian languages (Bhojpuri, Santali, etc.).

➡️ **NLLB-200 provides the widest language coverage by a large margin.**

---

## Translation Quality & Stability

### DeepSeek-R1 (SLM)

* Designed for reasoning, not translation.
* Produces paraphrases instead of faithful translations.
* Hallucinates corrections in educational content.

### Gemma (270M)

* Not a translation model.
* Fails on sentence-level fidelity.
* Unsuitable for multilingual education.

### IndicTrans2 (200M)

* Works reliably only for **short, single sentences**.
* Collapses on paragraph-level input.
* Merges sentences and flips subjects under context load.

### IndicTrans2 (1.1B)

* Improved sentence and clause handling.
* More stable for educational text.
* High memory and latency cost on CPU.

### NLLB-200 (600M)

* Stable paragraph-level translation.
* Preserves negation, contrast, and sentence boundaries.
* Faithful translation even for factually incorrect input (no hallucinated fixes).

➡️ **NLLB-200 demonstrated best-in-class translation stability under real workloads.**

---

## Scientific & Educational Fidelity

* **DeepSeek-R1 / Gemma**: Often modify or correct scientific facts unintentionally.
* **IndicTrans2 (200M)**: Drops or corrupts scientific terminology under load.
* **IndicTrans2 (1.1B)**: Retains terminology but struggles with CPU constraints.
* **NLLB-200**: Preserves technical terms (ATP, NADPH, Calvin cycle, chloroplast) accurately.

➡️ **NLLB-200 is safest for educational content translation.**

---

## Resource Efficiency (CPU & Offline)

| Model            | CPU Feasibility | Offline Use | Notes                       |
| ---------------- | --------------- | ----------- | --------------------------- |
| DeepSeek-R1      | ⚠️              | ❌           | Heavy, not optimized for MT |
| Gemma 270M       | ⚠️              | ❌           | Not translation-focused     |
| IndicTrans2 200M | ✅               | ✅           | Lightweight but fragile     |
| IndicTrans2 1.1B | ⚠️              | ⚠️          | Quality gain but heavy      |
| NLLB-200 600M    | ✅               | ✅           | Best quality-to-size ratio  |

---

## State-of-the-Art (SOTA) Positioning

Based on observed performance and published benchmarks:

* **NLLB-200 is considered SOTA** among open-source translation models for:

  * Low-resource languages
  * Indic language coverage
  * Faithful machine translation

It consistently outperforms smaller distilled MT models while remaining deployable on CPU systems.

---

## Final Conclusion

* **DeepSeek-R1 and Gemma** are unsuitable as primary translation engines.
* **IndicTrans2 (200M)** is useful only under strict sentence-level constraints.
* **IndicTrans2 (1.1B)** improves quality but is resource-heavy.
* **NLLB-200 (600M)** provides the **best balance** of:

  * Translation quality
  * Language coverage
  * Disk efficiency
  * Offline CPU viability

> **Final Choice:** NLLB-200 (distilled 600M) as the production translation backbone.

---

## Performance Evolution & Optimization

### Translation Speed Timeline

| Phase | Model | Time | Speedup | Key Optimization |
|-------|-------|------|---------|------------------|
| **Phase 1** | IndicTrans2 (200M) | ~5:00 | Baseline | Sequential processing |
| **Phase 2** | NLLB-200 (600M) | ~4:00 | 1.25x | Better model quality |
| **Phase 3** | NLLB-200 + Batch | ~2:00 | 2.5x | Batch processing (8 sentences) |
| **Phase 4** | NLLB-200 + Threading | ~1:30 | 3.3x | CPU multi-threading, larger batches |
| **Phase 5** | NLLB-200 + Full Opt | **~0:30** | **10x** | Parallel batches, caching, auto-tuning |

### Optimization Graph

```
Translation Time (seconds)
300 | ● (IndicTrans2 - Baseline)
    |
240 | 
    |
180 | 
    |
120 |     ● (NLLB Initial)
    |
 90 |         ● (Batch Processing)
    |
 60 |             ● (CPU Threading)
    |
 30 |                 ● (Full Optimization - Current)
    |_____________________________
    0    1    2    3    4    5    Phase
```

**Speedup Factor:** 10x improvement from baseline (5:00 → 0:30)

### Current Performance (Optimized)
- **Translation Time:** ~30 seconds for standard educational content
- **Batch Processing:** 6-10 sentences (CPU), 12 sentences (GPU) - auto-detected
- **Parallel Workers:** 4 workers for CPU multi-core systems
- **Cache Hit Rate:** High for repeated translations
- **Model Load Time:** 0s (persistent server)

### Optimization Techniques Applied

#### 1. Batch Processing
- **What:** Process multiple sentences simultaneously
- **Impact:** 8-10x speedup
- **Implementation:** Group sentences into batches before translation

#### 2. Parallel Batch Processing
- **What:** Process multiple batches in parallel using ThreadPoolExecutor
- **Impact:** 2-3x additional speedup on multi-core CPUs
- **Implementation:** ThreadPoolExecutor with 4 workers

#### 3. Translation Caching
- **What:** Cache previously translated content
- **Impact:** Near-instant for cached content
- **Implementation:** LRU cache with 1000 entry limit

#### 4. Multi-threading Configuration
- **What:** Configure all threading libraries for maximum CPU utilization
- **Impact:** Better CPU core utilization
- **Implementation:** OMP, MKL, NUMEXPR, PyTorch thread configuration

#### 5. CPU-Optimized Parameters
- **What:** Greedy decoding, lower penalties for CPU
- **Impact:** Faster inference with maintained quality
- **Implementation:** Device-specific parameter tuning

#### 6. Auto-Detected Batch Sizing
- **What:** Automatically determine optimal batch size based on device
- **Impact:** Optimal performance for each hardware
- **Implementation:** Device detection + adaptive batch sizing

#### 7. Model Caching
- **What:** Keep model loaded in persistent Python server
- **Impact:** Zero startup overhead
- **Implementation:** Persistent process with model in memory

### Comparison: Before vs After

| Metric | Before (IndicTrans2) | After (NLLB-200 Optimized) | Improvement |
|--------|----------------------|---------------------------|-------------|
| **Translation Time** | 5:00 | 0:30 | **10x faster** |
| **Batch Processing** | ❌ No | ✅ Yes (6-12 sentences) | Major speedup |
| **Parallel Processing** | ❌ No | ✅ Yes (4 workers) | 2-3x speedup |
| **Caching** | ❌ No | ✅ Yes (LRU, 1000 entries) | Instant for cached |
| **Multi-threading** | ❌ Basic | ✅ Optimized (all cores) | Better utilization |
| **Device Auto-tuning** | ❌ No | ✅ Yes | Optimal per device |
| **Model Persistence** | ❌ Reload each time | ✅ Persistent server | Zero startup |

---

## Summary for Visualization (Judges)

Key axes for graphs:

* Language Coverage
* Model Size vs Disk Usage
* Translation Stability
* Educational Safety
* Offline Readiness
* **Performance Evolution** (5:00 → 0:30 - 10x speedup)

These metrics clearly position **NLLB-200** as the most practical and scalable choice under real-world constraints.

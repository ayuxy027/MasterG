# Translation Model Analysis – IndicTrans2 (200M)

## Model in Use

* **Model Name:** ai4bharat/indictrans2-en-indic-dist-200M
* **Type:** English → Indic Machine Translation model
* **Size:** ~200M parameters (distilled)
* **Deployment:** CPU-only, offline-friendly
* **Memory Footprint:** ~400–450 MB on disk

This model was selected due to strict hackathon constraints: low memory (4–8 GB RAM), offline operation, and multilingual coverage.

---

## Core Strengths

### 1. Lightweight & Offline-Capable

* Runs fully on CPU without GPU dependency.
* Suitable for low-resource and rural deployments.
* Fast inference for short inputs.

### 2. Strong at Short, Literal Sentences

* Performs reliably on:

  * Simple factual statements
  * Single-clause sentences
  * Declarative educational facts
* Demonstrated correct handling of:

  * Basic science definitions
  * Cause–effect statements (when short)

### 3. Good Terminology Retention with Guardrails

* When combined with glossary locking:

  * Preserves scientific terms (e.g., photosynthesis, chlorophyll).
  * Avoids catastrophic hallucinations.
* Errors become predictable and rule-fixable.

---

## Observed Failure Modes (Critical)

### 1. Context Overload on Large Inputs

When given large or multi-sentence inputs, the model:

* Merges multiple sentences into one.
* Loses sentence boundaries.
* Blends subjects and objects across sentences.
* Produces semantically incorrect outputs.

**Root cause:** limited context handling capacity in a small, distilled model.

---

### 2. Clause & Conjunction Breakdown

The model struggles with:

* Contrast clauses ("although", "however")
* Long compound sentences
* Nested or dependent clauses

This often leads to:

* Subject flipping
* Loss of negation ("does not")
* Partial sentence outputs

---

### 3. Coordination Errors ("and" problem)

Sentences of the form:

> A uses B and C.

May be mistranslated as:

> A and B use C.

This is a known limitation of low-capacity MT models and appears consistently.

---

## Why These Failures Occur

* The model is **distilled**, prioritizing speed over alignment fidelity.
* Limited attention span and embedding capacity.
* Machine translation models do not reason; they map patterns.
* Large inputs cause internal compression, leading to sentence fusion.

These behaviors are expected and documented limitations, not implementation bugs.

---

## Proven Mitigation Strategies (Current System)

### 1. Sentence-Level Processing (Mandatory)

* Input must be split into single sentences.
* One sentence per inference call.
* Avoid batching raw paragraphs directly.

### 2. Input Simplification

* Prefer short, literal English sentences.
* Avoid conjunction-heavy constructions.
* Replace complex clauses with multiple simple sentences.

### 3. Glossary Locking (Critical)

* Replace key domain terms with placeholders before translation.
* Restore correct target-language terms post-translation.

### 4. Lightweight Post-Processing

* Rule-based fixes for known patterns.
* Regex-based correction for common scientific errors.

---

## Recommendations for Cursor / Further Improvement

### A. Batch Processing with Safeguards

* Batch sentences only after explicit sentence splitting.
* Maintain sentence index mapping to prevent merge errors.

### B. Adaptive Chunking

* Enforce maximum token length per input.
* Reject or re-split inputs exceeding safe thresholds.

### C. Fallback Logic

* If translation confidence drops:

  * Re-run sentence with simplified structure.
  * Or switch to glossary-only literal translation.

### D. Do NOT Rely on Paragraph-Level Translation

* Paragraph-level translation is unsafe for this model.
* Sentence-level control is essential for correctness.

---

## Final Assessment

IndicTrans2-200M is **not a general-purpose translator**.
It is a **constrained, lightweight MT engine** that performs well when:

* Input is structured.
* Context size is controlled.
* Domain terminology is locked.

When used correctly, it can reliably support multilingual educational content under extreme resource constraints.

---

## One-Line Summary

> The model fails on large contexts due to sentence-boundary collapse, but performs reliably under sentence-level, glossary-controlled translation pipelines.

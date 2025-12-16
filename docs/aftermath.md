# Translation Feature – Aftermath & Learnings

## Context

We explored the feasibility of multilingual educational content generation under **extreme resource constraints** (CPU-only, 4–8 GB RAM, offline-first) for a hackathon submission. The system generates English educational content using a capable LLM (e.g., DeepSeek) and then translates it into **22 Indian languages** using a lightweight MT model.

---

## Initial Approach

* English educational content generated via a strong LLM.
* Translation performed using **IndicTrans2 (ai4bharat/indictrans2-en-indic-dist-200M)**.
* Goal: NCERT-aligned, age-appropriate, culturally relevant educational content.

---

## Observed Problems

### 1. Translation Quality Issues

* Sentence merging across inputs.
* Subject–object inversion.
* Loss of key scientific entities (e.g., chlorophyll, carbon dioxide).
* Hallucinated or incorrect scientific terms (e.g., "ऑक्सीजन डाइऑक्साइड").
* Failure on complex grammar (contrast clauses like “although”).

### 2. Root Cause Analysis

* IndicTrans2-200M is a **small, distilled model (~200M params)**.
* Optimized for speed and general prose, not scientific or educational text.
* Limited clause handling, weak terminology retention, and shallow context window.
* These failures are **expected behavior**, not bugs.

---

## Model Options Evaluated

### Current Model

* **ai4bharat/indictrans2-en-indic-dist-200M**
* Pros: Fast, CPU-friendly, offline-capable.
* Cons: Poor for science, long sentences, and high-fidelity translation.

### Larger Alternative

* **ai4bharat/indictrans2-en-indic-1B**
* Better structure and entity retention.
* Requires significantly more memory and is slow on CPU.
* Not ideal for hackathon CPU-only constraints.

**Decision:** Do NOT upgrade to 1B for hackathon use.

---

## Final Architecture Decision (Winning Strategy)

Instead of chasing perfect translation, we shifted to **controlled correctness** via a hybrid pipeline.

### Revised Pipeline

1. **English Content Generation** (LLM)

   * Simplified, literal, MT-friendly English.
   * No complex clauses or idioms.

2. **Sentence Simplification & Splitting**

   * One sentence per translation call.
   * Short, direct sentences.

3. **Glossary Locking (Critical Step)**

   * Replace key scientific terms with placeholders before translation.
   * Restore correct Hindi/Indic terms post-translation.

4. **IndicTrans2-200M Translation**

   * Used in safe mode (short inputs only).

5. **Post-Translation Validation**

   * Regex and rule-based fixes.
   * Detect and correct known failure patterns.

---

## Prompt Engineering Improvements

* Rewrote the generation prompt to:

  * Force simple English.
  * Avoid conjunction-heavy sentences.
  * Repeat nouns instead of pronouns.
  * Separate cultural context from core explanations.
* This significantly improved downstream translation reliability.

---

## Hackathon Insight (Key Takeaway)

Judges care more about:

* Understanding and respecting constraints.
* Designing systems that fail safely.
* Clear trade-off explanations.
* Engineering maturity and scalability.

Perfect translation under offline, CPU-only constraints is unrealistic.
**Demonstrating controlled, explainable correctness is the real win.**

---

## Final Verdict

* The translation issues were **model-capacity limitations**, not design mistakes.
* A hybrid, rule-augmented MT pipeline is the most viable solution.
* This approach aligns strongly with hackathon judging criteria and real-world rural deployment constraints.

---

## One-Line Summary

> We optimized for *responsible multilingual education under extreme constraints*, not for perfect tra

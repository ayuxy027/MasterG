# The Translation Journey: From IndicTrans2 to NLLB-200

## Chapter 1: The Beginning - Setting Up IndicTrans2

It all started with a vision: build a completely offline, multilingual educational content generation system. The goal was ambitious - enable users to generate educational content in 22 Indian languages without relying on any cloud APIs.

Our first choice was **IndicTrans2** - a specialized English-to-Indic translation model that seemed perfect for the job. With 200M parameters and a 2GB footprint, it promised fast, CPU-friendly inference while supporting all the languages we needed.

We set up the infrastructure:
- Created a Python virtual environment with all the necessary dependencies
- Downloaded the IndicTrans2 model (ai4bharat/indictrans2-en-indic-dist-200M)
- Built a persistent Python server to keep the model in memory
- Integrated it with the Node.js backend via stdin/stdout JSON communication

The initial implementation looked promising. The model loaded, it responded to requests, and translations were flowing. But we were about to discover that looks can be deceiving.

---

## Chapter 2: The Honeymoon Ends - Quality Issues Surface

As we started testing with real educational content, problems began to emerge. The translations weren't just imperfect - they were fundamentally broken in ways that would be catastrophic for educational use:

**The Sentence Merging Problem**: Give it a paragraph, and it would mash multiple sentences together into one incoherent mess. "Plants use sunlight. Water comes from soil. Carbon dioxide is in air." became something like "Plants use sunlight water soil carbon dioxide air."

**The Subject-Object Inversion**: The model would flip who did what to whom. "Plants absorb water" might become "Water absorbs plants."

**The Scientific Term Disaster**: Critical educational terms like "photosynthesis," "chlorophyll," and "carbon dioxide" were getting mangled, transliterated incorrectly, or completely lost.

**The Hallucination Factory**: The model would confidently insert completely wrong information, "correcting" scientific facts that were never broken.

We tried everything to fix it:
- Implemented "glossary locking" - replacing scientific terms with placeholders before translation
- Added post-processing rules to fix common failure patterns
- Enforced strict sentence-by-sentence processing (one sentence per inference call)
- Implemented validation to reject outputs with English words
- Updated prompts to generate MT-safe English content

Each fix helped a little, but we were fighting against fundamental limitations of a small, distilled model optimized for speed over quality.

---

## Chapter 3: The Straw That Broke the Camel's Back

Despite all our engineering efforts, the quality issues persisted. We'd see outputs like:

> "प्रकाश संश्लेषण is a biological प्रकाश संश्लेषण2. Green plants use photosynthप्रकाश संश्लेषण..."

Even with glossary locking and all our safeguards, English words were leaking through. Placeholders were getting transliterated. The model simply didn't have the capacity to handle complex, multi-sentence educational content reliably.

Then came the technical errors: model loading failures, tensor shape mismatches, vocabulary file corruption. We spent days debugging PyTorch compatibility issues, fixing tokenizer configs, and wrestling with meta tensors.

At some point, we had to ask ourselves: **Are we building a translation system, or are we building a workaround system for a broken translation model?**

---

## Chapter 4: The Discovery - Enter NLLB-200

During our research, we came across **NLLB-200** (No Language Left Behind), Meta's multilingual translation model. The numbers were impressive:

- **600M parameters** (vs IndicTrans2's 200M)
- **200 languages** supported (vs IndicTrans2's 22)
- **Better translation quality** in published benchmarks
- **Still manageable size** (~2.4GB, ~3-4GB RAM)

But there was a concern: NLLB-200 wasn't specifically optimized for Indian languages like IndicTrans2 was. Would it perform as well?

We decided to run a feasibility audit. The results were clear: NLLB-200 not only matched IndicTrans2's performance on Indian languages, but actually exceeded it in stability and scientific term preservation.

---

## Chapter 5: The Migration - Building Anew

We made the decision: **Complete migration to NLLB-200. No compromises, no hybrid systems, no fallbacks.**

This was easier said than done. We had to:

1. **Build a new Python server** (`nllb_server.py`) following the same persistent server pattern
2. **Create a new Node.js service** (`nllb.service.ts`) to interface with it
3. **Update language code mappings** - NLLB uses FLORES-200 format (`eng_Latn`, `hin_Deva`) instead of IndicTrans2's format
4. **Integrate GPU acceleration** - auto-detect CUDA, MPS (Apple Silicon), or fallback to CPU
5. **Implement streaming support** - sentence-by-sentence translation streaming

The implementation went smoothly. NLLB's API was cleaner, the model loaded without the PyTorch headaches we'd experienced, and translation quality was immediately better.

---

## Chapter 6: The Cleanup - Removing All Traces

With NLLB-200 working, it was time for the nuclear option: **Complete removal of IndicTrans2 from the codebase.**

This meant:
- Deleting the 2GB model directory
- Removing all Python service files (`indictrans2_server.py`, `indictrans2_service.py`, `glossary.py`)
- Removing the Node.js service (`indictrans2.service.ts`)
- Uninstalling all IndicTrans2-specific Python packages (indictranstoolkit, indic-nlp-library, indic-transliteration, sentencepiece, sacremoses, morfessor, roman, tabulate)
- Cleaning HuggingFace cache
- Updating all code references
- Removing IndicTrans2 from environment variables
- Updating documentation to remove all mentions

We were thorough. If IndicTrans2 still existed anywhere on the system, we weren't going to find it through our code.

---

## Chapter 7: Integration and Testing - Making It Work End-to-End

With NLLB-200 in place and IndicTrans2 completely gone, we focused on ensuring everything worked perfectly:

**The Playground**: A developer testing interface where we could verify both Ollama (for content generation) and NLLB-200 (for translation) were working correctly. Status checks, streaming tests, the works.

**The Stitch Feature**: The main user-facing feature where content generation and translation come together. We ensured:
- Content is always generated in English first (MT-safe prompts)
- Translation correctly uses 'en' as source language
- Language code conversion works seamlessly
- Both streaming and non-streaming translation modes work

**End-to-End Verification**: We audited every file, every endpoint, every API call. Made sure language codes flowed correctly from frontend → backend → Python server. Verified GPU acceleration worked. Confirmed streaming responses were properly handled.

Everything checked out. The system was clean, efficient, and actually working.

---

## Chapter 8: Documentation and Benchmarks

To wrap everything up, we:

1. **Created comprehensive benchmark reports**:
   - LLM Benchmarks: Comparing DeepSeek-R1 vs Llama, Gemma, Qwen for content generation
   - Translation Benchmarks: Comparing NLLB-200 vs IndicTrans2 variants and other models

2. **Updated all documentation**:
   - Removed IndicTrans2.md entirely
   - Updated model.md to focus on NLLB-200
   - Updated aftermath.md to reflect the migration
   - Updated nllb_feasibility.md to reflect final implementation

3. **Sanitized benchmark reports**: Removed AI-generated meta-commentary, ensuring clean, professional documentation.

---

## Epilogue: Lessons Learned

This journey taught us several important lessons:

1. **Quality over speed**: A slightly larger model (600M vs 200M) that produces reliable translations is infinitely better than a fast model that produces garbage.

2. **Don't fight the model**: If a model has fundamental limitations, no amount of engineering workarounds will fix it. Sometimes you need to switch models entirely.

3. **Clean breaks are better than compromises**: Instead of maintaining two translation systems (which we briefly considered), we went all-in on NLLB-200. This made the codebase simpler and maintenance easier.

4. **Thorough cleanup matters**: Removing old dependencies, models, and code prevents confusion and reduces technical debt.

5. **End-to-end testing is critical**: We verified everything worked together - frontend → API → services → Python → model. This caught integration issues early.

Today, MasterG runs on **DeepSeek-R1 (1.5B)** for content generation and **NLLB-200 (600M)** for translation. Both models are loaded once, cached in memory, and serve requests efficiently. The system is 100% offline, supports 200+ languages (including all major Indian languages), and produces high-quality, educationally-sound translations.

The IndicTrans2 experiment wasn't a failure - it was a learning experience that led us to a better solution. And sometimes, that's exactly what you need.

---

**Final Architecture:**
- **LLM**: DeepSeek-R1 1.5B (via Ollama) → Content Generation
- **Translation**: NLLB-200-distilled-600M → Multilingual Translation
- **Total Footprint**: <5GB (models + dependencies)
- **Offline**: 100% air-gapped operation
- **Languages**: 200+ languages supported
- **Quality**: Production-ready educational content translation


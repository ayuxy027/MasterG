# 🌐 Quick Start: IndicTrans2 Translation

## Setup (One-time)

### 1. Download Translation Model

```bash
# Model will be downloaded to: {DocumentDirectory}/models/
# Size: ~1.1 GB
# URL: https://huggingface.co/AI4Bharat/indictrans2-en-indic-1B-gguf
```

### 2. Initialize in App

```typescript
import EduLiteAI from "./services/ai"

const ai = EduLiteAI.getInstance()

// Initialize translation model
await ai.initializeTranslationModel((progress) => {
  console.log(`Loading: ${progress}%`)
})
```

---

## Usage Examples

### Translate Text

```typescript
const result = await ai.translate({
  text: "Photosynthesis is how plants make food",
  sourceLanguage: "english",
  targetLanguage: "hindi",
})

console.log(result.translatedText)
// प्रकाश संश्लेषण वह है जिससे पौधे भोजन बनाते हैं
```

### Generate & Translate Content

```typescript
// Automatically generates in English then translates
const content = await ai.generateContent({
  topic: "Solar System",
  subject: "science",
  grade: "6",
  language: "tamil", // Will auto-translate to Tamil
  curriculum: "cbse",
})
```

### Batch Translation

```typescript
const results = await ai.batchTranslate(
  ["Hello", "Welcome", "Goodbye"],
  "english",
  "bengali"
)
```

---

## Supported Languages (22)

**Devanagari:** Hindi, Marathi, Nepali, Sanskrit, Dogri, Bodo, Kashmiri, Konkani, Maithili  
**Dravidian:** Tamil, Telugu, Kannada, Malayalam  
**Eastern:** Bengali, Assamese, Odia, Manipuri  
**Others:** Punjabi, Gujarati, Urdu, Sindhi, Santali, English

---

## Check Status

```typescript
// Check if ready
if (ai.isTranslationReady()) {
  console.log("Translation available!")
}

// Get supported languages
const languages = ai.getSupportedLanguages()
```

---

## Model Specs

- **Size:** 1.1 GB
- **Accuracy:** 92%+ (outperforms Google Translate)
- **Speed:** Optimized for mobile
- **Offline:** Yes
- **Training:** BPCC (educational focus)

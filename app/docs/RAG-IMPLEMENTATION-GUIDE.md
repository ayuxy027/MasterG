# RAG Implementation Guide for Masterji

## Overview

This document describes the complete RAG (Retrieval-Augmented Generation) system implemented for the Masterji app to handle large PDF documents (16+ pages) on mobile devices with offline capability.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Ask Screen (UI)                         │
│  - Document upload                                           │
│  - RAG progress display                                      │
│  - Chat interface                                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    PDFQAService                              │
│  - createFromText() with RAG indexing                        │
│  - answerWithRAG() for retrieval-enhanced QA                 │
│  - buildRAGPrompt() for dynamic context                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      RAGService                              │
│  - Orchestrates indexing pipeline                            │
│  - Manages document lifecycle                                │
│  - Coordinates search and retrieval                          │
└────────────┬─────────────┬─────────────┬────────────────────┘
             │             │             │
             ▼             ▼             ▼
┌────────────────┐ ┌──────────────┐ ┌──────────────┐
│ ChunkingService│ │DocumentStore │ │ SearchEngine │
│ - Split text   │ │ - SQLite DB  │ │ - BM25 algo  │
│ - Overlap      │ │ - Persistence│ │ - TF-IDF     │
│ - Metadata     │ │ - Indexing   │ │ - Ranking    │
└────────────────┘ └──────────────┘ └──────────────┘
```

## Files Created

### 1. `services/ai/rag/types.ts`
Core TypeScript interfaces and configuration types:
- `DocumentChunk` - Chunk with content, metadata, page info
- `SearchResult` - Search result with score and relevance
- `DocumentIndex` - Full document index structure
- `RAGConfig` - Configuration for chunking and retrieval
- `RAGProgress` - Progress callback interface

### 2. `services/ai/rag/ChunkingService.ts`
Document chunking with semantic boundary detection:
- **Token-based chunking** (default: 500 tokens per chunk)
- **Overlap support** (default: 50 tokens)
- **Semantic boundaries** - Respects paragraph/sentence breaks
- **Metadata extraction** - Detects headings, lists, formulas
- **Page number tracking** - Maintains page references

### 3. `services/ai/rag/DocumentStore.ts`
SQLite-based persistent storage:
- **Tables**: `documents`, `chunks`, `vocabulary`
- **Auto-cleanup**: MAX_DOCUMENTS = 10 (removes oldest)
- **Query support**: Get chunks by document ID
- **Vocabulary storage**: For BM25 IDF calculations

### 4. `services/ai/rag/SearchEngine.ts`
BM25 + TF-IDF hybrid search:
- **BM25 scoring** with k1=1.5, b=0.75
- **TF-IDF fallback** for edge cases
- **Query expansion** with educational synonyms
- **Result reranking** based on term density
- **Context building** with page grouping

### 5. `services/ai/rag/RAGService.ts`
Main orchestrator:
- `indexDocument()` - Full indexing pipeline
- `loadDocument()` - Load from SQLite
- `search()` - Search with query
- `getRetrievalContext()` - Build context for LLM

### 6. `services/ai/rag/index.ts`
Module exports for clean imports.

## Modified Files

### `services/ai/PDFQAService.ts`
Added RAG integration:
- `useRAG: boolean = true` - Enable/disable RAG
- `createFromText()` - Now indexes with RAG
- `answerWithRAG()` - Uses retrieval context
- `buildRAGPrompt()` - Dynamic prompt generation
- `setRAGMode()` - Toggle RAG mode
- `getRAGStats()` - Get RAG statistics

### `app/(tabs)/ask.tsx`
Updated UI:
- Added `ragProgress` state
- Progress bar during indexing
- RAG-enhanced message display
- Updated extraction handlers

## Configuration

### Default RAG Config
```typescript
const DEFAULT_RAG_CONFIG: RAGConfig = {
  chunkSize: 500,           // Tokens per chunk
  chunkOverlap: 50,         // Overlap between chunks
  maxRetrievedChunks: 10,   // Max chunks to retrieve
  minRelevanceScore: 0.1,   // Minimum BM25 score
  contextWindowSize: 1500,  // Max context tokens
}
```

### Document Limits
- `MAX_DOCUMENTS = 10` in DocumentStore
- `MAX_CONTEXT_LENGTH = 1500` tokens for LLM
- Auto-cleanup removes oldest documents

## How It Works

### 1. Document Indexing
```
PDF Upload → PDF.js Extraction → ChunkingService
     ↓
Split into 500-token chunks with 50-token overlap
     ↓
Extract metadata (headings, page numbers)
     ↓
Store chunks in SQLite (DocumentStore)
     ↓
Build BM25 index (SearchEngine)
     ↓
Ready for queries!
```

### 2. Question Answering
```
User Question → SearchEngine.search()
     ↓
BM25 ranking of all chunks
     ↓
Top 10 chunks retrieved
     ↓
Chunks grouped by page
     ↓
Context assembled (max 1500 tokens)
     ↓
LLM generates answer with context
```

## Usage Example

```typescript
// In ask.tsx handlePDFJSExtraction
const pdfService = PDFQAService.getInstance();

// Index document with progress callback
const doc = await pdfService.createFromText(
  extractedText,
  fileName,
  (progress) => {
    setRagProgress(progress);
    console.log(`${progress.stage}: ${progress.progress}%`);
  }
);

// Answer questions with RAG
const response = await pdfService.answerWithRAG(
  doc.id,
  "What are the main topics covered?",
  askQuestion // From useAI hook
);
```

## Testing

### Test Large PDF (16+ pages)
1. Upload a 16+ page PDF
2. Watch RAG progress bar
3. Ask questions about content from different pages
4. Verify answers cite correct page numbers

### Test Chunking
```typescript
import { ChunkingService } from '@/services/ai/rag';

const chunker = new ChunkingService();
const chunks = chunker.chunkDocument(
  "Long document text...",
  { chunkSize: 500, chunkOverlap: 50 }
);
console.log(`Created ${chunks.length} chunks`);
```

### Test Search
```typescript
import { SearchEngine } from '@/services/ai/rag';

const engine = new SearchEngine();
await engine.buildIndex(chunks);
const results = await engine.search("photosynthesis", 5);
console.log(results);
```

## Why BM25 Over Embeddings?

| Approach | Pros | Cons |
|----------|------|------|
| **BM25 (chosen)** | No model needed, pure algorithm, works offline, fast | Less semantic understanding |
| Embeddings | Better semantic matching | 17MB model, ONNX runtime issues on RN |

For educational Q&A with keyword-heavy content, BM25 performs excellently.

## Dependencies

Required packages (already in package.json):
```json
{
  "expo-crypto": "~15.0.2",  // UUID generation
  "expo-sqlite": "^16.0.10", // Document storage
  "natural": "^8.0.1",       // Text processing (optional)
  "stopword": "^3.1.1"       // Stopword removal
}
```

## Troubleshooting

### "Cannot find module 'expo-crypto'"
Run `npm install` and restart TypeScript server.

### RAG not working
Check if `useRAG` is enabled:
```typescript
PDFQAService.getInstance().setRAGMode(true);
```

### Slow indexing
Reduce chunk size or increase batch processing:
```typescript
const config = { chunkSize: 300, chunkOverlap: 30 };
```

### Memory issues
Reduce MAX_DOCUMENTS or clear old documents:
```typescript
await DocumentStore.getInstance().clearAll();
```

## Future Improvements

1. **Hybrid search** - Combine BM25 with lightweight embeddings
2. **Caching** - Cache frequently accessed chunks in memory
3. **Incremental indexing** - Add pages without re-indexing
4. **Multi-document search** - Search across all uploaded PDFs
5. **Query understanding** - Better question parsing

## Summary

The RAG system enables Masterji to:
- ✅ Handle PDFs of any size (16+ pages)
- ✅ Work completely offline
- ✅ Provide accurate, sourced answers
- ✅ Show progress during indexing
- ✅ Persist documents across sessions
- ✅ Auto-manage storage limits

The BM25-based approach is perfect for educational Q&A where users ask specific questions about textbook content.

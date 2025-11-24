# EduRAG Backend - Multilingual Educational AI Assistant

A production-ready RAG (Retrieval-Augmented Generation) backend API for educational document question-answering with support for 22 Indian languages + English.

## Features

🚀 **Core Capabilities**
- PDF page-wise processing with automatic OCR fallback
- Multilingual support (23 languages total)
- Intelligent 3-layer query routing (Groq → ChromaDB → Gemini)
- Cross-language query support (ask in Hindi, get English PDF content)
- Agentic query decomposition for complex questions
- Stateful chat history with MongoDB
- Source citations with page numbers

📚 **Document Processing**
- Page-by-page PDF text extraction
- Automatic language detection
- Smart chunking with overlap
- Vector embeddings for semantic search
- Chat-isolated document storage

🧠 **AI Intelligence**
- Fast responses for simple queries (Layer 1: Groq)
- Document-aware semantic search (Layer 2: ChromaDB)
- Deep contextual understanding (Layer 3: Gemini Flash)
- Automatic query translation for cross-language scenarios

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- MongoDB (local or cloud)
- ChromaDB server running on port 8000
- API keys: Groq, Gemini, HuggingFace

### Installation

```bash
# 1. Clone and navigate to backend
cd backend

# 2. Install dependencies
npm install

# 3. Create .env file (see .env.example)
cp .env.example .env

# 4. Edit .env with your credentials
# Add your API keys and database URLs

# 5. Start development server
npm run dev
```

Server will start on `http://localhost:5000`

---

## Environment Setup

Create `.env` file with:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/edurag

# ChromaDB Server
CHROMA_URL=http://localhost:8000

# AI API Keys
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GEMMA_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Getting API Keys

1. **Groq** - https://console.groq.com/keys
2. **Gemini (GEMMA_API_KEY)** - https://aistudio.google.com/app/apikey
3. **HuggingFace** - https://huggingface.co/settings/tokens

---

## Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── constants.ts  # Language codes, file types
│   │   ├── database.ts   # MongoDB connection
│   │   └── env.ts        # Environment variables
│   │
│   ├── controllers/      # Request handlers
│   │   ├── upload.controller.ts  # File upload logic
│   │   ├── query.controller.ts   # Query processing
│   │   └── chat.controller.ts    # Chat history
│   │
│   ├── services/         # Business logic
│   │   ├── pdf.service.ts           # PDF text extraction
│   │   ├── ocr.service.ts           # Image OCR (Tesseract)
│   │   ├── language.service.ts      # Language detection
│   │   ├── chunking.service.ts      # Text chunking
│   │   ├── embedding.service.ts     # Vector embeddings
│   │   ├── vectordb.service.ts      # ChromaDB operations
│   │   ├── document.service.ts      # MongoDB document storage
│   │   ├── groq.service.ts          # Groq AI API
│   │   ├── queryRouter.service.ts   # 3-layer routing
│   │   └── chat.service.ts          # Chat session management
│   │
│   ├── routes/           # API routes
│   │   ├── upload.routes.ts
│   │   ├── query.routes.ts
│   │   └── chat.routes.ts
│   │
│   ├── middleware/       # Express middleware
│   │   ├── multer.middleware.ts   # File upload
│   │   └── error.middleware.ts    # Error handling
│   │
│   ├── types/            # TypeScript types
│   │   └── index.ts
│   │
│   └── index.ts          # App entry point
│
├── uploads/              # Temporary file storage
├── .env                  # Environment variables (create this)
├── .env.example          # Environment template
├── package.json
├── tsconfig.json
├── nodemon.json
└── API_DOCUMENTATION.md  # Complete API reference
```

---

## API Endpoints

### 1. Upload Document
```
POST /api/upload
Content-Type: multipart/form-data

FormData:
- file: PDF/Image file
- userId: string
- sessionId: string
```

### 2. Query Documents
```
POST /api/query
Content-Type: application/json

Body:
{
  "query": "What is photosynthesis?",
  "userId": "user_123",
  "sessionId": "session_456"
}
```

### 3. Get Chat History
```
POST /api/chats/history

Body:
{
  "userId": "user_123",
  "sessionId": "session_456"
}
```

### 4. Create New Session
```
POST /api/chats/new

Body:
{
  "userId": "user_123"
}
```

**📖 Full API Documentation:** See `API_DOCUMENTATION.md`

---

## Technology Stack

**Runtime & Framework**
- Node.js 18+
- Express.js
- TypeScript

**Databases**
- MongoDB (document & chat storage)
- ChromaDB (vector database)

**AI Services**
- Groq (fast LLM - Layer 1)
- Gemini Flash 2.0 (deep understanding - Layer 3)
- HuggingFace Embeddings (text-to-vector)

**Document Processing**
- pdf-parse (PDF text extraction)
- Tesseract.js (OCR for images)

**Language Detection**
- Custom Unicode-based detection for 23 languages

---

## Development

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm start
```

### Test API
```bash
# Health check
curl http://localhost:5000/

# Upload file
curl -X POST http://localhost:5000/api/upload \
  -F "file=@document.pdf" \
  -F "userId=test_user" \
  -F "sessionId=test_session"

# Query
curl -X POST http://localhost:5000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Summarize the document",
    "userId": "test_user",
    "sessionId": "test_session"
  }'
```

---

## How It Works

### Upload Flow
1. **File Validation** - Check PDF/Image format
2. **Text Extraction** - Page-by-page for PDFs, OCR for images
3. **Language Detection** - Auto-detect from content (23 languages)
4. **MongoDB Storage** - One document with pages array
5. **Chunking** - Smart text splitting with page metadata
6. **Embedding** - Convert chunks to vectors
7. **ChromaDB Storage** - Store in chat-specific collection

### Query Flow
1. **Language Detection** - Detect query language
2. **Layer 1 Analysis** - Check if simple query (greeting, abuse, etc.)
3. **Layer 2 Retrieval** - Agentic document-aware search
   - Understands document structure
   - Generates intelligent sub-queries
   - Handles page-specific, chapter-specific queries
4. **Layer 3 Generation** - Gemini deep understanding
   - Cross-language translation if needed
   - Full context analysis
   - Source citations

### 3-Layer Intelligence

**Layer 1: Groq (Fast Gate Keeper)**
- Handles: Greetings, abuse, chat history references
- Speed: ~500ms
- No document access needed

**Layer 2: ChromaDB (Retrieval)**
- Agentic mode: Analyzes document structure first
- Generates multiple smart sub-queries
- Deduplicates and merges results
- Page/chapter filtering

**Layer 3: Gemini Flash (Deep Understanding)**
- Full document context
- Cross-language query translation
- Comprehensive response generation
- Source citations with page numbers

---

## Language Support

### Supported Languages (23 Total)

English, Hindi, Marathi, Bengali, Tamil, Telugu, Gujarati, Kannada, Malayalam, Punjabi, Odia, Assamese, Urdu, Sanskrit, Konkani, Manipuri, Bodo, Dogri, Kashmiri, Maithili, Santali, Sindhi, Nepali

### Cross-Language Features
- Ask in Hindi → Get English PDF content ✅
- Ask in English → Get Marathi PDF content ✅
- Automatic query translation when needed
- Response always in query language

---

## Database Schema

### MongoDB - PageDocument
```javascript
{
  fileId: "uuid",
  fileName: "document.pdf",
  userId: "user_123",
  sessionId: "session_456",
  language: "en",
  pages: [
    { pageNumber: 1, pageContent: "..." },
    { pageNumber: 2, pageContent: "..." }
  ],
  createdAt: Date
}
```

### MongoDB - ChatSession
```javascript
{
  userId: "user_123",
  sessionId: "session_456",
  chromaCollectionName: "chat_user_123_session_456",
  messages: [
    { role: "user", content: "...", timestamp: Date },
    { role: "assistant", content: "...", timestamp: Date }
  ]
}
```

### ChromaDB - Chunks
```javascript
{
  id: "chunk_uuid",
  document: "chunk text content",
  metadata: {
    fileId: "uuid",
    fileName: "document.pdf",
    page: 5,
    userId: "user_123"
  },
  embedding: [0.123, 0.456, ...]  // 384-dim vector
}
```

---

## Performance

- Simple queries (Layer 1): ~500ms
- Document queries (Layer 3): ~3-5s
- File upload (10-page PDF): ~5-8s
- Cross-language query: +1-2s (translation overhead)

---

## Production Deployment

### Recommended Setup
```bash
# 1. Set NODE_ENV
NODE_ENV=production

# 2. Use PM2 for process management
npm install -g pm2
pm2 start dist/index.js --name edurag-api

# 3. Setup reverse proxy (nginx)
# 4. Enable CORS for your frontend domain
# 5. Add rate limiting
# 6. Setup monitoring
```

### Security Checklist
- [ ] Environment variables in `.env` (not committed)
- [ ] CORS configured for specific origins
- [ ] File upload size limits (10MB recommended)
- [ ] Rate limiting per user
- [ ] Input validation
- [ ] Error messages don't leak sensitive info

---

## Troubleshooting

**MongoDB Connection Failed**
```bash
# Check MongoDB is running
mongod --version
# Check connection string in .env
```

**ChromaDB Connection Failed**
```bash
# Start ChromaDB server
docker run -p 8000:8000 chromadb/chroma
# Or use local installation
```

**API Keys Not Working**
- Verify keys are active in respective consoles
- Check for extra spaces in `.env`
- Ensure `.env` is in backend root directory

**File Upload Fails**
- Check `uploads/` folder exists and is writable
- Verify file size < 10MB
- Ensure supported format (PDF, PNG, JPG)

---

## License

MIT License - See LICENSE file

---

## Support

For API documentation: See `API_DOCUMENTATION.md`
For issues: Contact development team

**Version:** 3.0.0  
**Last Updated:** November 24, 2025

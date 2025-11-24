# EduRAG Assistant API Documentation

**Version:** 3.0.0  
**Base URL:** `http://localhost:5000`  
**Content-Type:** `application/json` (except file upload)

---

## Overview

EduRAG is a multilingual educational AI assistant API that processes PDF documents and answers questions using RAG (Retrieval-Augmented Generation). It supports 22 Indian languages + English with intelligent 3-layer routing.

### Key Features
- ✅ PDF page-wise processing with OCR fallback
- ✅ Stateful chat history (MongoDB)
- ✅ Multi-document support per session
- ✅ Multilingual support (22 Indian languages + English)
- ✅ Autonomous language detection
- ✅ Chat-based isolation
- ✅ Source citations (PDF name + page number)
- ✅ Cross-language query support
- ✅ Agentic query decomposition

---

## Authentication

Currently, no authentication is required. User identification is done via `userId` and `sessionId` parameters.

---

## API Endpoints

### 1. Health Check

**GET** `/`

Check if the API is running.

**Response:**
```json
{
  "success": true,
  "message": "EduRAG Assistant API with Multilingual Support",
  "version": "3.0.0",
  "features": [
    "PDF page-wise processing",
    "Stateful chat history (MongoDB)",
    "Multi-document support",
    "Multilingual support (22 Indian languages)",
    "Autonomous language detection",
    "Chat-based isolation",
    "Source citations (PDF name, page number)"
  ],
  "endpoints": {
    "upload": "/api/upload",
    "query": "/api/query",
    "chats": "/api/chats",
    "health": "/api/query/health",
    "stats": "/api/upload/stats"
  }
}
```

---

### 2. Upload Document

**POST** `/api/upload`

Upload a PDF or image file for processing.

**Headers:**
```
Content-Type: multipart/form-data
```

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | PDF or image file (png, jpg, jpeg) |
| `userId` | String | Yes | Unique user identifier |
| `sessionId` | String | Yes | Unique session identifier |

**Example Request (JavaScript):**
```javascript
const formData = new FormData();
formData.append('file', pdfFile);
formData.append('userId', 'user_1234567890');
formData.append('sessionId', 'session_9876543210');

const response = await fetch('http://localhost:5000/api/upload', {
  method: 'POST',
  body: formData,
});

const data = await response.json();
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "File uploaded and processed successfully",
  "data": {
    "fileId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "fileName": "physics-chapter1.pdf",
    "chunks": 45,
    "chromaCollectionName": "chat_user_1234567890_session_9876543210",
    "language": "en"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "No file uploaded"
}
```

**Error Response (500):**
```json
{
  "success": false,
  "error": "File processing failed: [error details]"
}
```

**Process Flow:**
1. File validation (PDF/Image only)
2. Text extraction (page-wise for PDFs)
3. Language detection
4. MongoDB storage (one document with pages array)
5. Chunking with page numbers
6. Embedding generation
7. ChromaDB storage (chat-specific collection)

---

### 3. Query Documents

**POST** `/api/query`

Ask questions about uploaded documents.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "query": "Explain photosynthesis in detail",
  "userId": "user_1234567890",
  "sessionId": "session_9876543210"
}
```

**Request Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | String | Yes | User's question (any language) |
| `userId` | String | Yes | Same userId used in upload |
| `sessionId` | String | Yes | Same sessionId used in upload |

**Example Request (JavaScript):**
```javascript
const response = await fetch('http://localhost:5000/api/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "What are the main concepts in chapter 1?",
    userId: "user_1234567890",
    sessionId: "session_9876543210"
  }),
});

const data = await response.json();
```

**Success Response (200):**
```json
{
  "success": true,
  "answer": "Chapter 1 discusses the fundamental concepts of photosynthesis...",
  "sources": [
    {
      "pdfName": "biology-textbook.pdf",
      "pageNo": 15,
      "snippet": "Photosynthesis is the process by which green plants..."
    },
    {
      "pdfName": "biology-textbook.pdf",
      "pageNo": 16,
      "snippet": "The light-dependent reactions occur in the thylakoid..."
    }
  ],
  "metadata": {
    "layer": "LAYER3-GEMINI",
    "reasoning": "Full context analysis with Gemini",
    "responseTime": "3245ms"
  }
}
```

**Query Types Supported:**
- General questions: `"What is photosynthesis?"`
- Chapter-specific: `"Summarize chapter 2"`
- Page-specific: `"What is on page 15?"`
- Comparisons: `"Difference between chapter 1 and 3"`
- Multi-part: `"Explain topics A, B, and C"`
- Cross-language: `"प्रकाश संश्लेषण क्या है?"` (Hindi query on English PDF)

**Routing Layers:**
- **LAYER1-GROQ-FAST**: Greetings, simple queries, chat history
- **LAYER3-GEMINI**: Document-based queries with full context

---

### 4. Get Chat History

**POST** `/api/chats/history`

Retrieve chat history for a session.

**Request Body:**
```json
{
  "userId": "user_1234567890",
  "sessionId": "session_9876543210"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "chatHistory": [
    {
      "role": "user",
      "content": "What is photosynthesis?",
      "timestamp": "2025-11-24T10:30:00.000Z"
    },
    {
      "role": "assistant",
      "content": "Photosynthesis is the process...",
      "timestamp": "2025-11-24T10:30:03.000Z"
    }
  ],
  "messageCount": 12
}
```

---

### 5. Create New Chat Session

**POST** `/api/chats/new`

Create a new chat session for a user.

**Request Body:**
```json
{
  "userId": "user_1234567890"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "sessionId": "session_1732450123456_abc123xyz",
  "chromaCollectionName": "chat_user_1234567890_session_1732450123456_abc123xyz"
}
```

---

### 6. Upload Statistics

**GET** `/api/upload/stats`

Get upload statistics (for monitoring).

**Success Response (200):**
```json
{
  "success": true,
  "stats": {
    "totalUploads": 157,
    "supportedFormats": ["PDF", "PNG", "JPG", "JPEG"]
  }
}
```

---

### 7. Query Health Check

**GET** `/api/query/health`

Check query service health.

**Success Response (200):**
```json
{
  "success": true,
  "status": "healthy",
  "services": {
    "groq": "operational",
    "chromadb": "operational",
    "gemini": "operational"
  }
}
```

---

## Error Handling

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (missing parameters, invalid file)
- `404` - Not Found (no documents found)
- `500` - Internal Server Error

---

## Language Support

### Supported Languages

| Language | Code | Example Query |
|----------|------|---------------|
| English | `en` | "What is photosynthesis?" |
| Hindi | `hi` | "प्रकाश संश्लेषण क्या है?" |
| Marathi | `mr` | "प्रकाशसंश्लेषण म्हणजे काय?" |
| Bengali | `bn` | "সালোকসংশ্লেষণ কী?" |
| Tamil | `ta` | "ஒளிச்சேர்க்கை என்றால் என்ன?" |
| Telugu | `te` | "కిరణజన్య సంయోగక్రియ అంటే ఏమిటి?" |
| Gujarati | `gu` | "પ્રકાશસંશ્લેષણ શું છે?" |
| Kannada | `kn` | "ದ್ಯುತಿಸಂಶ್ಲೇಷಣೆ ಎಂದರೇನು?" |
| Malayalam | `ml` | "പ്രകാശസംശ്ലേഷണം എന്താണ്?" |
| Punjabi | `pa` | "ਪ੍ਰਕਾਸ਼ ਸੰਸਲੇਸ਼ਣ ਕੀ ਹੈ?" |
| Odia | `or` | "ଆଲୋକ ସଂଶ୍ଲେଷଣ କ'ଣ?" |
| Assamese | `as` | "সালোকসংশ্লেষণ কি?" |
| Urdu | `ur` | "نوری ترکیب کیا ہے؟" |
| Sanskrit | `sa` | "प्रकाश-संश्लेषणं किम्?" |
| Konkani | `kok` | "प्रकाश संश्लेषण म्हळ्यार काय?" |
| Manipuri | `mni` | "ফটোসিন্থেসিস করি?" |
| Bodo | `brx` | "फोटोसिन्थेसिस खाबनो?" |
| Dogri | `doi` | "प्रकाश संश्लेषण क्या है?" |
| Kashmiri | `ks` | "روشنی تشکیل کیا چھ؟" |
| Maithili | `mai` | "प्रकाश संश्लेषण की छै?" |
| Santali | `sat` | "ᱯᱷᱳᱴᱳᱥᱤᱱᱛᱷᱮᱥᱤᱥ ᱫᱚ ᱪᱮᱫ ᱠᱟᱱᱟ?" |
| Sindhi | `sd` | "روشني سازي ڇا آهي؟" |
| Nepali | `ne` | "प्रकाश संश्लेषण के हो?" |

**Cross-Language Support:**
- Query in English → Find Hindi PDF content ✅
- Query in Marathi → Find English PDF content ✅
- Auto-detects and translates when needed

---

## Examples

### Example 1: Complete Workflow

```javascript
// 1. Create new session
const sessionResponse = await fetch('http://localhost:5000/api/chats/new', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'user_123' })
});
const { sessionId } = await sessionResponse.json();

// 2. Upload PDF
const formData = new FormData();
formData.append('file', pdfFile);
formData.append('userId', 'user_123');
formData.append('sessionId', sessionId);

await fetch('http://localhost:5000/api/upload', {
  method: 'POST',
  body: formData
});

// 3. Ask questions
const queryResponse = await fetch('http://localhost:5000/api/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "What are the main topics?",
    userId: 'user_123',
    sessionId: sessionId
  })
});

const answer = await queryResponse.json();
console.log(answer.answer);
```

### Example 2: Multilingual Query

```javascript
// Upload English PDF, then query in Hindi
const response = await fetch('http://localhost:5000/api/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "अध्याय 1 का सारांश बताओ", // "Summarize chapter 1" in Hindi
    userId: 'user_123',
    sessionId: sessionId
  })
});

// Response will be in Hindi
```

### Example 3: Page-Specific Query

```javascript
const response = await fetch('http://localhost:5000/api/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "What is on page 15?",
    userId: 'user_123',
    sessionId: sessionId
  })
});
```

---

## Technical Architecture

### 3-Layer Intelligent Routing

**LAYER 1: Gate Keeper (Groq)**
- Handles: Greetings, abuse detection, chat history references
- Speed: ~500ms
- Use case: Simple queries not needing documents

**LAYER 2: Retrieval (ChromaDB)**
- Agentic document-aware search
- Understands document structure
- Generates intelligent sub-queries
- Deduplicates results

**LAYER 3: Deep Understanding (Gemini Flash)**
- Full context analysis
- Cross-language translation
- Comprehensive responses
- Source citations

### Data Storage

**MongoDB Collections:**
1. `pagedocuments` - One document per PDF with pages array
2. `documents` - Legacy full-text storage
3. `chatsessions` - Chat history per session

**ChromaDB:**
- Chat-specific collections
- Page-level chunks with metadata
- Vector embeddings for semantic search

---

## Environment Variables

Create `.env` file:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/edurag

# ChromaDB
CHROMA_URL=http://localhost:8000

# AI APIs
GROQ_API_KEY=your_groq_api_key_here
GEMMA_API_KEY=your_gemini_api_key_here
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
```

---

## Rate Limits

No rate limits currently implemented. Recommended for production:
- 100 requests/minute per user
- 10 MB max file size
- 50 pages max per PDF

---

## Support

For issues or questions, contact the development team.

**Version:** 3.0.0  
**Last Updated:** November 24, 2025

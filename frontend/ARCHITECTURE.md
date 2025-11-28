# 🏗️ Chat Feature Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  AIChatPage.tsx (Main Container)                           │ │
│  │  • Session state management                                │ │
│  │  • Tab switching (Chat ↔ Resources)                        │ │
│  │  • User ID from localStorage                               │ │
│  └────────────────────────────────────────────────────────────┘ │
│            │                      │                              │
│            ▼                      ▼                              │
│  ┌─────────────────┐   ┌──────────────────────────┐            │
│  │ SessionSidebar  │   │   Active Tab Content     │            │
│  │ • Session list  │   │                          │            │
│  │ • Create/Delete │   │  ┌────────────────────┐  │            │
│  │ • Selection     │   │  │  ChatInterface     │  │            │
│  └─────────────────┘   │  │  • Message display │  │            │
│                         │  │  • File upload     │  │            │
│                         │  │  • Query input     │  │            │
│                         │  └────────────────────┘  │            │
│                         │          OR               │            │
│                         │  ┌────────────────────┐  │            │
│                         │  │  ResourcesPanel    │  │            │
│                         │  │  • Document list   │  │            │
│                         │  │  • File metadata   │  │            │
│                         │  └────────────────────┘  │            │
│                         └──────────────────────────┘            │
│                                     │                            │
│                                     ▼                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  chatApi.ts (API Client Service)                           │ │
│  │  • sendQuery(userId, sessionId, query)                     │ │
│  │  • uploadFile(userId, sessionId, file, onProgress)         │ │
│  │  • getAllSessions(userId)                                  │ │
│  │  • getSessionDetails(userId, sessionId)                    │ │
│  │  • deleteSession(userId, sessionId)                        │ │
│  │  • getSessionDocuments(userId, sessionId)                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                     │                            │
└─────────────────────────────────────┼────────────────────────────┘
                                      │ HTTP/HTTPS
                                      │ VITE_API_URL
                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js + Express)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  API Routes                                                 │ │
│  │  • POST   /api/query                                        │ │
│  │  • POST   /api/upload                                       │ │
│  │  • GET    /api/chat/sessions/:userId                        │ │
│  │  • GET    /api/chat/sessions/:userId/:sessionId             │ │
│  │  • DELETE /api/chat/sessions/:userId/:sessionId             │ │
│  │  • GET    /api/browse/session/:sessionId                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                        │                │                        │
│                        ▼                ▼                        │
│  ┌───────────────────────┐   ┌──────────────────────┐          │
│  │  chat.controller.ts   │   │  upload.controller.ts│          │
│  │  • Handle queries     │   │  • Handle file upload│          │
│  │  • Session mgmt       │   │  • Process PDF/image │          │
│  └───────────────────────┘   └──────────────────────┘          │
│                        │                │                        │
│                        ▼                ▼                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Services Layer                                             │ │
│  │                                                              │ │
│  │  ┌──────────────────┐  ┌──────────────────┐               │ │
│  │  │ queryRouter      │  │ document.service │               │ │
│  │  │ • 3-Layer routing│  │ • Page-wise store│               │ │
│  │  │ • Layer selection│  │ • MongoDB ops    │               │ │
│  │  └──────────────────┘  └──────────────────┘               │ │
│  │           │                       │                         │ │
│  │           ▼                       ▼                         │ │
│  │  ┌──────────────────┐  ┌──────────────────┐               │ │
│  │  │ groq.service     │  │ pdf.service      │               │ │
│  │  │ • Llama Scout    │  │ • Extract text   │               │ │
│  │  │ • Fast responses │  │ • Page-wise      │               │ │
│  │  └──────────────────┘  └──────────────────┘               │ │
│  │           │                       │                         │ │
│  │           ▼                       ▼                         │ │
│  │  ┌──────────────────┐  ┌──────────────────┐               │ │
│  │  │ gemini.service   │  │ ocr.service      │               │ │
│  │  │ • Flash 2.0      │  │ • Tesseract.js   │               │ │
│  │  │ • Deep analysis  │  │ • Image extract  │               │ │
│  │  └──────────────────┘  └──────────────────┘               │ │
│  │                                 │                           │ │
│  │                                 ▼                           │ │
│  │  ┌──────────────────┐  ┌──────────────────┐               │ │
│  │  │ embedding.service│  │ chunking.service │               │ │
│  │  │ • Google Embed   │  │ • Page-wise chunk│               │ │
│  │  │ • 384-dim vectors│  │ • Metadata attach│               │ │
│  │  └──────────────────┘  └──────────────────┘               │ │
│  │           │                                                 │ │
│  │           ▼                                                 │ │
│  │  ┌──────────────────┐                                      │ │
│  │  │ vectordb.service │                                      │ │
│  │  │ • ChromaDB ops   │                                      │ │
│  │  │ • Collection mgmt│                                      │ │
│  │  └──────────────────┘                                      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                     │                            │
│                                     ▼                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Data Storage                                               │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │   MongoDB    │  │  ChromaDB    │  │  Gemini API  │    │ │
│  │  │  • Sessions  │  │  • Embeddings│  │  • AI Models │    │ │
│  │  │  • Messages  │  │  • Vectors   │  │  • Groq API  │    │ │
│  │  │  • Documents │  │  • Metadata  │  │              │    │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 📤 File Upload Flow
```
1. User selects file(s)
   ↓
2. ChatInterface → chatApi.uploadFile()
   ↓
3. POST /api/upload with FormData + progress tracking
   ↓
4. upload.controller → pdf.service.extractText()
   ↓
5. Page-wise extraction (OCR fallback if needed)
   ↓
6. chunking.service → One chunk per page
   ↓
7. embedding.service → Generate 384-dim vectors (batch 30)
   ↓
8. vectordb.service → Store in ChromaDB collection
   ↓
9. document.service → Save to MongoDB
   ↓
10. Response: { success, fileId, pagesProcessed, language }
    ↓
11. ChatInterface updates UI with success message
```

### 💬 Query Flow
```
1. User types message
   ↓
2. ChatInterface → chatApi.sendQuery()
   ↓
3. POST /api/query with { userId, sessionId, query }
   ↓
4. chat.controller → queryRouter.service
   ↓
5. 3-Layer Routing Decision:
   ├─ Layer 1 (Groq Fast): Greetings, simple chat
   │  └─ groq.service → Llama Scout → Quick response
   │
   ├─ Layer 2 (RAG): Document-specific queries
   │  ├─ embedding.service → Query embedding
   │  ├─ vectordb.service → Semantic search
   │  └─ If no relevant chunks → Fall to Layer 3
   │
   └─ Layer 3 (Gemini Deep): Complex analysis
      ├─ document.service → Get full document(s)
      ├─ gemini.service → Full context analysis
      └─ Return with page citations
   ↓
6. Save to chat history (MongoDB)
   ↓
7. Response: { answer, sources, metadata }
   ↓
8. ChatInterface displays:
   - Markdown-rendered answer
   - Source citations (PDF + page numbers)
   - AI metadata (layer, time, reasoning)
```

### 📚 Session Management Flow
```
1. Page load → getUserId() from localStorage
   ↓
2. AIChatPage → chatApi.getAllSessions()
   ↓
3. GET /api/chat/sessions/:userId
   ↓
4. MongoDB query → Return session list
   ↓
5. Display in SessionSidebar
   ↓
6. User selects session → chatApi.getSessionDetails()
   ↓
7. GET /api/chat/sessions/:userId/:sessionId
   ↓
8. Load messages into ChatInterface
   ↓
9. User can delete → chatApi.deleteSession()
   ↓
10. DELETE /api/chat/sessions/:userId/:sessionId
    ↓
11. Update session list
```

## Component Communication

```
AIChatPage (Parent)
│
├─ State Management
│  ├─ userId (from localStorage)
│  ├─ currentSessionId
│  ├─ sessions (array)
│  ├─ messages (array)
│  └─ activeTab ('chat' | 'resources')
│
├─ Child: SessionSidebar
│  ├─ Props: sessions, currentSessionId
│  ├─ Callbacks: onSessionSelect, onNewSession, onDeleteSession
│  └─ Renders: Session list UI
│
├─ Child: ChatInterface (if activeTab === 'chat')
│  ├─ Props: userId, sessionId, messages, currentMode
│  ├─ Callbacks: setMessages, onSessionUpdate
│  ├─ Features:
│  │  ├─ Message display
│  │  ├─ File upload
│  │  ├─ Query input
│  │  └─ Source citations
│  └─ Calls: chatApi.sendQuery(), chatApi.uploadFile()
│
└─ Child: ResourcesPanel (if activeTab === 'resources')
   ├─ Props: userId, sessionId
   ├─ Features:
   │  ├─ Document grid
   │  ├─ File metadata
   │  └─ Actions (View/Delete)
   └─ Calls: chatApi.getSessionDocuments()
```

## TypeScript Type Flow

```typescript
// Frontend Types (chat.ts)
MessageUI {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: SourceCitation[]
  metadata?: QueryMetadata
}

// API Response Types
QueryResponse {
  success: boolean
  answer: string
  sources: SourceCitation[]
  metadata: QueryMetadata
}

UploadResponse {
  success: boolean
  fileId: string
  fileName: string
  pagesProcessed: number
  language: string
}

SessionListItem {
  sessionId: string
  messageCount: number
  lastMessage: string
  updatedAt: Date
}
```

## Key Design Decisions

### 1. **Session Isolation**
- Each session has unique ChromaDB collection
- Prevents cross-contamination
- Clean context per conversation

### 2. **Progressive Enhancement**
- Works without MongoDB (graceful degradation)
- Empty states guide users
- Error messages actionable

### 3. **Real-time Feedback**
- Upload progress bars
- Loading animations
- Optimistic UI updates

### 4. **Type Safety**
- Full TypeScript coverage
- Interfaces match backend
- Compile-time error catching

### 5. **Separation of Concerns**
- API layer (chatApi.ts) isolated
- Components focus on UI
- Services handle business logic

---

This architecture enables:
✅ Scalability (add more features easily)
✅ Maintainability (clear separation)
✅ Testability (isolated units)
✅ Performance (optimized flows)

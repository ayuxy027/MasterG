import express, { Request, Response } from "express";
import cors from "cors";
import env from "./config/env";
import { connectDatabase } from "./config/database";
import { errorHandler } from "./middleware/error.middleware";
import uploadRoutes from "./routes/upload.routes";
import queryRoutes from "./routes/query.routes";
import chatRoutes from "./routes/chat.routes";
import browseRoutes from "./routes/browse.routes";
import posterRoutes from "./routes/poster.routes";
import lmrRoutes from "./routes/lmr.routes";
import stitchRoutes from "./routes/stitch.routes";
import filesRoutes from "./routes/files.routes";
import speechRoutes from "./routes/speech.routes";
import analyzeRoutes from "./routes/analyze.routes";

const app = express();

// Middleware
// CORS - Allow all origins
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  exposedHeaders: ["Content-Type"],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "EduRAG Assistant API with Multilingual Support",
    version: "3.1.0",
    features: [
      "PDF page-wise processing",
      "Multi-file type support (PDF, TXT, DOCX, PPT, Images)",
      "Document preview with file streaming",
      "Stateful chat history (MongoDB)",
      "Multi-document support",
      "Multilingual support (22 Indian languages)",
      "Autonomous language detection",
      "Chat-based isolation",
      "Source citations (PDF name, page number)",
    ],
    endpoints: {
      upload: "/api/upload",
      query: "/api/query",
      files: "/api/files/:fileId",
      chats: "/api/chats",
      browse: "/api/browse",
      posters: "/api/posters",
      lmr: "/api/lmr",
      stitch: "/api/stitch",
      speech: "/api/speech/transcribe",
      health: "/api/query/health",
      stats: "/api/upload/stats",
    },
  });
});

app.use("/api/upload", uploadRoutes);
app.use("/api/query", queryRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/browse", browseRoutes);
app.use("/api/posters", posterRoutes);
app.use("/api/lmr", lmrRoutes);
app.use("/api/stitch", stitchRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/speech", speechRoutes);
app.use("/api/analyze", analyzeRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize and start server
async function startServer() {
  // Connect to MongoDB (optional - app works without it)
  await connectDatabase();

  // Start server
  app.listen(env.PORT, () => {
    console.log("=================================");
    console.log(`🚀 Server running on port ${env.PORT}`);
    console.log(`📚 Environment: ${env.NODE_ENV}`);
    console.log(`🔗 ChromaDB: ${env.CHROMA_URL}`);
    console.log(
      `💾 MongoDB: ${env.MONGODB_URI
        ? "✅ Connected"
        : "⚠️  Not configured (chat history disabled)"
      }`
    );
    console.log("=================================");
    console.log("✨ Features:");
    console.log("  - PDF page-wise chunking with page numbers");
    console.log("  - Stateful chat history (last 10 messages)");
    console.log("  - Multiple PDFs per session");
    console.log("  - Source citations (PDF name + page number)");
    console.log("=================================");
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { pdfService } from "../services/pdf.service";
import { ocrService } from "../services/ocr.service";
import { chunkingService } from "../services/chunking.service";
import { embeddingService } from "../services/embedding.service";
import { vectorDBService } from "../services/vectordb.service";
import { chatService } from "../services/chat.service";
import { documentService } from "../services/document.service";
import { languageService } from "../services/language.service";
import { UploadResponse } from "../types";
import { SUPPORTED_FILE_TYPES } from "../config/constants";
import fs from "fs/promises";

export class UploadController {
  /**
   * Handle file upload and processing
   * Stores PDFs in chat-specific ChromaDB collection
   */
  async uploadFile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: "No file uploaded",
        });
        return;
      }

      const file = req.file;
      const fileId = uuidv4();
      const userId = req.body.userId || "default-user";
      const sessionId = req.body.sessionId || "default-session";

      console.log(
        `Processing file: ${file.originalname} (${file.mimetype}) for user: ${userId}, session: ${sessionId}`
      );

      // Get chat-specific ChromaDB collection name
      const chromaCollectionName = await chatService.getChromaCollectionName(
        userId,
        sessionId
      );
      console.log(`📚 Storing in ChromaDB collection: ${chromaCollectionName}`);

      let allChunks: any[] = [];

      // Step 1: Extract text (page by page for PDFs)
      if (file.mimetype === SUPPORTED_FILE_TYPES.PDF) {
        // NEW: Extract text page by page
        const pages = await pdfService.extractTextByPages(file.path);
        console.log(
          `📄 Extracted ${pages.length} pages from ${file.originalname}`
        );

        // Get full document content for language detection
        const fullDocumentContent = pages.map((p) => p.text).join("\n\n");

        // Detect document language from full content
        const documentLanguageDetection =
          languageService.detectLanguage(fullDocumentContent);
        console.log(
          `🌐 Detected document language: ${documentLanguageDetection.language} (${documentLanguageDetection.languageCode})`
        );

        // Store pages individually in MongoDB (NEW: page-wise storage)
        const pageData = pages.map((page) => ({
          pageNumber: page.pageNumber,
          content: page.text,
        }));

        console.log(`💾 Storing ${pageData.length} pages in MongoDB...`);
        await documentService.storePages(
          fileId,
          file.originalname,
          pageData,
          userId,
          sessionId,
          documentLanguageDetection.languageCode
        );
        console.log(`✅ Page-wise storage complete for ${file.originalname}`);

        // Step 2: Create chunks for each page (maintaining page numbers)
        for (const page of pages) {
          if (page.text.trim().length === 0) continue;

          const pageChunks = await chunkingService.createChunks(
            page.text,
            file.originalname,
            fileId,
            page.pageNumber, // KEY: Pass page number for citations
            userId
            // fullDocumentContent removed - now stored separately in MongoDB
          );
          allChunks.push(...pageChunks);
        }
      } else if (ocrService.isImageFile(file.mimetype)) {
        // For images, treat as single page
        const extractedText = await ocrService.extractText(file.path);
        console.log(
          `Extracted ${extractedText.length} characters from ${file.originalname}`
        );

        // Detect language from image text
        const imageLanguageDetection =
          languageService.detectLanguage(extractedText);
        console.log(
          `🌐 Detected image language: ${imageLanguageDetection.language} (${imageLanguageDetection.languageCode})`
        );

        // Store full content in MongoDB
        await documentService.storeDocument(
          fileId,
          file.originalname,
          extractedText,
          userId,
          sessionId,
          imageLanguageDetection.languageCode
        );

        const chunks = await chunkingService.createChunks(
          extractedText,
          file.originalname,
          fileId,
          1, // Single page for images
          userId
          // fullDocumentContent removed - now stored separately in MongoDB
        );
        allChunks.push(...chunks);
      } else {
        res.status(400).json({
          success: false,
          error: "Unsupported file type",
        });
        return;
      }

      console.log(`✅ Created ${allChunks.length} chunks total`);

      // Step 3: Generate embeddings
      console.log("🔄 Generating embeddings...");
      const embeddingResults = await embeddingService.generateEmbeddings(
        allChunks.map((chunk) => chunk.content)
      );

      // Step 4: Store in chat-specific ChromaDB collection
      console.log("💾 Storing in vector database...");
      await vectorDBService.storeChunks(
        allChunks,
        embeddingResults.map((result) => result.embedding),
        chromaCollectionName // Store in chat-specific collection
      );

      // Step 5: Clean up uploaded file
      await fs.unlink(file.path);

      const response: UploadResponse = {
        success: true,
        fileId,
        fileName: file.originalname,
        chunksCreated: allChunks.length,
        message: "File processed successfully",
      };

      console.log(
        `\n✅ Upload complete: ${file.originalname} - ${allChunks.length} chunks created\n`
      );

      res.status(200).json(response);
    } catch (error) {
      console.error("❌ Upload controller error:", error);

      // Clean up uploaded file on error
      if (req.file && req.file.path) {
        try {
          await fs.unlink(req.file.path);
          console.log("🗑️  Cleaned up uploaded file after error");
        } catch (cleanupError) {
          console.error("Failed to clean up file:", cleanupError);
        }
      }

      // Determine appropriate status code and error message
      let statusCode = 500;
      let errorMessage = "Failed to process file";

      if (error instanceof Error) {
        errorMessage = error.message;

        // Check for specific error types
        if (
          error.message.includes("authentication") ||
          error.message.includes("API key")
        ) {
          statusCode = 401;
          errorMessage =
            "Invalid API key. Please check your GEMMA_API_KEY in .env file";
        } else if (
          error.message.includes("quota") ||
          error.message.includes("rate limit")
        ) {
          statusCode = 429;
          errorMessage =
            "API quota exceeded. Please check your Google AI API usage limits";
        }
      }

      res.status(statusCode).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  /**
   * Get upload stats
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await vectorDBService.getStats();
      res.status(200).json({
        success: true,
        ...stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to get stats",
      });
    }
  }
}

export const uploadController = new UploadController();

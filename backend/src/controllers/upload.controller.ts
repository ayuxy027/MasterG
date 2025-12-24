import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { chunkingService } from "../services/chunking.service";
import { ollamaEmbeddingService } from "../services/ollamaEmbedding.service";
import { vectorDBService } from "../services/vectordb.service";
import { chatService } from "../services/chat.service";
import { documentService } from "../services/document.service";
import { languageService } from "../services/language.service";
import { fileStorageService } from "../services/fileStorage.service";
import { textExtractorService } from "../services/textExtractor.service";
import { UploadResponse } from "../types";
import env from "../config/env";

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

      // console.log(
      //   `Processing file: ${file.originalname} (${file.mimetype}) for user: ${userId}, session: ${sessionId}`
      // );

      // Get chat-specific ChromaDB collection name
      const chromaCollectionName = await chatService.getChromaCollectionName(
        userId,
        sessionId
      );
      // console.log(`📚 Storing in ChromaDB collection: ${chromaCollectionName}`);

      let allChunks: any[] = [];

      // Step 1: Extract text using universal text extractor (handles ALL file types)
      try {
        const extractionResult = await textExtractorService.extract(
          file.path,
          file.mimetype
        );
        // console.log(
        //   `📄 Extracted ${extractionResult.pageCount || 1} page(s) from ${file.originalname}`
        // );

        // Get full document content for language detection
        const fullDocumentContent = extractionResult.text;

        // Detect document language from full content
        const documentLanguageDetection =
          languageService.detectLanguage(fullDocumentContent);
        // console.log(
        //   `🌐 Detected document language: ${documentLanguageDetection.language} (${documentLanguageDetection.languageCode})`
        // );

        // Store in MongoDB based on whether we have page-wise data
        if (extractionResult.pages && extractionResult.pages.length > 0) {
          // Page-wise storage for documents with multiple pages (PDF, PPT, etc.)
          const pageData = extractionResult.pages.map((page) => ({
            pageNumber: page.pageNumber,
            content: page.text,
          }));

          // console.log(`💾 Storing ${pageData.length} pages in MongoDB...`);
          await documentService.storePages(
            fileId,
            file.originalname,
            pageData,
            userId,
            sessionId,
            documentLanguageDetection.languageCode,
            file.mimetype // Pass mimeType
          );
          // console.log(`✅ Page-wise storage complete for ${file.originalname}`);

          // Create chunks for each page
          for (const page of extractionResult.pages) {
            if (page.text.trim().length === 0) continue;

            const pageChunks = await chunkingService.createChunks(
              page.text,
              file.originalname,
              fileId,
              page.pageNumber,
              userId
            );
            allChunks.push(...pageChunks);
          }
        } else {
          // Single document storage (TXT, DOC, single-page images, etc.)
          // console.log(`💾 Storing document content in MongoDB...`);
          await documentService.storeDocument(
            fileId,
            file.originalname,
            fullDocumentContent,
            userId,
            sessionId,
            documentLanguageDetection.languageCode,
            file.mimetype // Pass mimeType
          );

          const chunks = await chunkingService.createChunks(
            fullDocumentContent,
            file.originalname,
            fileId,
            1, // Single page
            userId
          );
          allChunks.push(...chunks);
        }
      } catch (extractError: any) {
        console.error(
          `❌ Text extraction failed for ${file.originalname}:`,
          extractError.message
        );

        // Clean up temp file
        try {
          const fs = await import("fs/promises");
          await fs.unlink(file.path);
        } catch {}

        res.status(400).json({
          success: false,
          error: `Failed to extract text: ${extractError.message}`,
        });
        return;
      }

      // console.log(
      //   `✅ Created ${allChunks.length} chunks total`
      // );

      // Step 3: Generate embeddings using Ollama (completely local)
      // console.log(
      //   `🔄 Generating embeddings for ${allChunks.length} chunks using Ollama embeddinggemma...`
      // );

      const embeddingResults = await ollamaEmbeddingService.generateEmbeddings(
        allChunks.map((chunk) => chunk.content)
      );

      // console.log(
      //   `✅ Generated ${embeddingResults.length} embeddings`
      // );

      // Step 4: Store in chat-specific ChromaDB collection
      // console.log("💾 Storing in vector database...");
      await vectorDBService.storeChunks(
        allChunks,
        embeddingResults.map((result) => result.embedding),
        chromaCollectionName // Store in chat-specific collection
      );

      // Step 5: Store file permanently for preview (instead of deleting)
      // console.log("📁 Storing file for preview...");
      const storedFile = await fileStorageService.storeFile(
        fileId, // Pass the same fileId used for MongoDB
        file.path,
        userId,
        sessionId,
        file.originalname,
        file.mimetype
      );
      // console.log(`✅ File stored: ${storedFile.filePath}`);

      // Step 6: Convert PPT/PPTX to PDF for preview (if LibreOffice available)
      let previewPdfPath: string | null = null;
      const isPPT =
        file.mimetype.includes("powerpoint") ||
        file.mimetype.includes("presentation") ||
        file.originalname.toLowerCase().endsWith(".pptx") ||
        file.originalname.toLowerCase().endsWith(".ppt");

      if (isPPT) {
        console.log("📊 Converting PPT to PDF for preview...");
        try {
          const { pptConversionService } = await import(
            "../services/pptConversion.service"
          );
          const sessionPath =
            storedFile.filePath.substring(
              0,
              storedFile.filePath.lastIndexOf("/")
            ) ||
            storedFile.filePath.substring(
              0,
              storedFile.filePath.lastIndexOf("\\")
            );

          const result = await pptConversionService.convertAndStore(
            storedFile.filePath,
            fileId,
            sessionPath
          );

          if (result.pdfPath) {
            previewPdfPath = result.pdfPath;
            console.log(`✅ PPT preview PDF ready: ${previewPdfPath}`);
          } else {
            console.log(
              "⚠️ PPT conversion skipped (LibreOffice not available), using text preview"
            );
          }
        } catch (convError: any) {
          console.error("PPT conversion error:", convError.message);
          // Continue without PDF preview
        }
      }

      // Clean up temp file (the original is now copied to storage)
      try {
        const fs = await import("fs/promises");
        await fs.unlink(file.path);
      } catch {
        // Temp file already cleaned or doesn't exist
      }

      const response: UploadResponse = {
        success: true,
        fileId,
        fileName: file.originalname,
        chunksCreated: allChunks.length,
        message: "File processed successfully",
        // @ts-ignore - Adding fileUrl for preview
        fileUrl: `/api/files/${fileId}?userId=${encodeURIComponent(
          userId
        )}&sessionId=${encodeURIComponent(sessionId)}`,
        mimeType: file.mimetype,
        // @ts-ignore - Adding preview info
        hasPreviewPdf: !!previewPdfPath,
        previewUrl: previewPdfPath
          ? `/api/files/${fileId}/preview?userId=${encodeURIComponent(
              userId
            )}&sessionId=${encodeURIComponent(sessionId)}`
          : null,
      };

      console.log(
        `✅ Upload complete: ${file.originalname} - ${allChunks.length} chunks created`
      );

      res.status(200).json(response);
    } catch (error) {
      console.error("❌ Upload controller error:", error);

      // Clean up uploaded file on error
      if (req.file && req.file.path) {
        try {
          const fs = await import("fs/promises");
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

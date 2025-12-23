import mongoose from "mongoose";

// File info interface for preview
export interface FileInfo {
  fileId: string;
  fileName: string;
  mimeType: string;
  userId: string;
  sessionId: string;
  pageCount: number;
  language?: string;
  createdAt: Date;
}

// Page-wise Document Schema - ONE document per PDF with pages array
const pageDocumentSchema = new mongoose.Schema({
  fileId: { type: String, required: true, unique: true, index: true },
  fileName: { type: String, required: true },
  mimeType: { type: String, default: 'application/pdf' },
  userId: { type: String, required: true },
  sessionId: { type: String, required: true },
  language: { type: String },
  pages: [
    {
      pageNumber: { type: Number, required: true },
      pageContent: { type: String, required: true },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

const PageDocument = mongoose.model("PageDocument", pageDocumentSchema);

// Legacy full document schema (kept for backward compatibility)
const documentSchema = new mongoose.Schema({
  fileId: { type: String, required: true, unique: true },
  fileName: { type: String, required: true },
  mimeType: { type: String, default: 'application/pdf' },
  fullContent: { type: String, required: true },
  userId: { type: String, required: true },
  sessionId: { type: String, required: true },
  language: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const Document = mongoose.model("Document", documentSchema);

export class DocumentService {
  /**
   * Store document pages as ONE document with pages array
   */
  async storePages(
    fileId: string,
    fileName: string,
    pages: Array<{ pageNumber: number; content: string }>,
    userId: string,
    sessionId: string,
    language?: string,
    mimeType?: string
  ): Promise<void> {
    try {
      // Validate: Don't store if no pages or all pages are empty
      if (!pages || pages.length === 0) {
        console.log(`⚠️  Skipping storage: No pages provided for ${fileName}`);
        return;
      }

      const validPages = pages.filter(
        (p) => p.content && p.content.trim().length > 0
      );

      if (validPages.length === 0) {
        console.log(
          `⚠️  Skipping storage: All pages are empty for ${fileName}`
        );
        return;
      }

      // Delete existing document for this fileId (in case of re-upload)
      await PageDocument.deleteOne({ fileId });
      // console.log(`🗑️  Cleared existing document for fileId: ${fileId}`);

      // Create ONE document with pages array
      const pageDocument = {
        fileId,
        fileName,
        mimeType: mimeType || 'application/pdf',
        userId,
        sessionId,
        language,
        pages: validPages.map((page) => ({
          pageNumber: page.pageNumber,
          pageContent: page.content.trim(),
        })),
      };

      const result = await PageDocument.create(pageDocument);
      // console.log(
      //   `✅ Successfully stored 1 document with ${result.pages.length} pages for ${fileName}`
      // );
      // console.log(
      //   `📊 Pages: ${result.pages.map((p) => p.pageNumber).join(", ")}`
      // );
    } catch (error: any) {
      console.error("❌ Page storage error:", error);
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        code: error.code,
      });
      throw new Error(`Failed to store pages: ${error.message}`);
    }
  }

  /**
   * Get specific page content
   */
  async getPage(fileId: string, pageNumber: number): Promise<string | null> {
    try {
      const doc = await PageDocument.findOne({ fileId });
      if (!doc) return null;

      const page = doc.pages.find((p) => p.pageNumber === pageNumber);
      return page?.pageContent || null;
    } catch (error) {
      console.error("Page retrieval error:", error);
      return null;
    }
  }

  /**
   * Get all pages for a file
   */
  async getAllPages(
    fileId: string
  ): Promise<Array<{ pageNumber: number; content: string }>> {
    try {
      const doc = await PageDocument.findOne({ fileId });
      if (!doc) return [];

      return doc.pages
        .sort((a, b) => a.pageNumber - b.pageNumber)
        .map((p) => ({
          pageNumber: p.pageNumber,
          content: p.pageContent,
        }));
    } catch (error) {
      console.error("All pages retrieval error:", error);
      return [];
    }
  }

  /**
   * Get pages by fileIds (for multiple documents)
   */
  async getPagesByFileIds(
    fileIds: string[]
  ): Promise<Map<string, Array<{ pageNumber: number; content: string }>>> {
    try {
      const docs = await PageDocument.find({ fileId: { $in: fileIds } });

      const pagesMap = new Map<
        string,
        Array<{ pageNumber: number; content: string }>
      >();

      docs.forEach((doc) => {
        const pages = doc.pages
          .sort((a, b) => a.pageNumber - b.pageNumber)
          .map((p) => ({
            pageNumber: p.pageNumber,
            content: p.pageContent,
          }));
        pagesMap.set(doc.fileId, pages);
      });

      return pagesMap;
    } catch (error) {
      console.error("Pages by fileIds retrieval error:", error);
      return new Map();
    }
  }

  /**
   * Legacy: Store full document content (backward compatibility)
   */
  async storeDocument(
    fileId: string,
    fileName: string,
    fullContent: string,
    userId: string,
    sessionId: string,
    language?: string,
    mimeType?: string
  ): Promise<void> {
    try {
      // Validate: Don't store if content is empty
      if (!fullContent || fullContent.trim().length === 0) {
        console.log(`⚠️  Skipping storage: Empty content for ${fileName}`);
        return;
      }

      await Document.create({
        fileId,
        fileName,
        mimeType: mimeType || 'application/octet-stream',
        fullContent: fullContent.trim(),
        userId,
        sessionId,
        language,
      });
      console.log(
        `📄 Stored full document: ${fileName} (${fullContent.length} chars)`
      );
    } catch (error) {
      console.error("Document storage error:", error);
      throw new Error("Failed to store document");
    }
  }



  /**
   * Legacy: Get full document content by fileId
   */
  async getDocument(fileId: string): Promise<string | null> {
    try {
      const doc = await Document.findOne({ fileId });
      return doc?.fullContent || null;
    } catch (error) {
      console.error("Document retrieval error:", error);
      return null;
    }
  }

  /**
   * Get full content as text for a document (for preview)
   * Checks both PageDocument and Document collections
   */
  async getFullContent(fileId: string): Promise<string | null> {
    try {
      // First try PageDocument (page-wise storage)
      const pageDoc = await PageDocument.findOne({ fileId });
      if (pageDoc && pageDoc.pages && pageDoc.pages.length > 0) {
        // Combine all pages into one text
        const fullText = pageDoc.pages
          .sort((a, b) => a.pageNumber - b.pageNumber)
          .map((p) => p.pageContent)
          .join('\n\n--- Page Break ---\n\n');
        return fullText;
      }

      // Fall back to Document (legacy storage)
      const doc = await Document.findOne({ fileId });
      if (doc?.fullContent) {
        return doc.fullContent;
      }

      return null;
    } catch (error) {
      console.error("Get full content error:", error);
      return null;
    }
  }

  /**
   * Delete document by fileId (from both PageDocument and Document collections)
   */
  async deleteDocument(fileId: string): Promise<void> {
    try {
      // Delete from PageDocument collection (page-wise storage)
      const pageResult = await PageDocument.deleteOne({ fileId });
      if (pageResult.deletedCount > 0) {
        console.log(`🗑️ Deleted PageDocument for fileId: ${fileId}`);
      }

      // Delete from Document collection (legacy storage)
      const docResult = await Document.deleteOne({ fileId });
      if (docResult.deletedCount > 0) {
        console.log(`🗑️ Deleted Document for fileId: ${fileId}`);
      }

      if (pageResult.deletedCount === 0 && docResult.deletedCount === 0) {
        console.log(`ℹ️ No documents found for fileId: ${fileId}`);
      }
    } catch (error) {
      console.error("Document deletion error:", error);
      throw new Error("Failed to delete document");
    }
  }

  /**
   * Get all documents for a session
   */
  async getSessionDocuments(userId: string, sessionId: string): Promise<any[]> {
    try {
      const docs = await Document.find({ userId, sessionId });
      return docs;
    } catch (error) {
      console.error("Session documents retrieval error:", error);
      return [];
    }
  }

  /**
   * Get full content from multiple fileIds (combines all pages)
   */
  async getDocumentsByFileIds(fileIds: string[]): Promise<Map<string, string>> {
    try {
      // Try page-wise first
      const pagesMap = await this.getPagesByFileIds(fileIds);
      const contentMap = new Map<string, string>();

      for (const [fileId, pages] of pagesMap.entries()) {
        const fullContent = pages
          .sort((a, b) => a.pageNumber - b.pageNumber)
          .map((p) => p.content)
          .join("\n\n");
        contentMap.set(fileId, fullContent);
      }

      // Fallback to legacy full documents if no pages found
      if (contentMap.size === 0) {
        const docs = await Document.find({ fileId: { $in: fileIds } });
        docs.forEach((doc) => {
          contentMap.set(doc.fileId, doc.fullContent);
        });
      }

      return contentMap;
    } catch (error) {
      console.error("Documents retrieval error:", error);
      return new Map();
    }
  }

  /**
   * Get file info by fileId (for preview)
   */
  async getFileInfo(fileId: string): Promise<FileInfo | null> {
    try {
      // Try page-wise document first
      const pageDoc = await PageDocument.findOne({ fileId });
      if (pageDoc) {
        return {
          fileId: pageDoc.fileId,
          fileName: pageDoc.fileName,
          mimeType: (pageDoc as any).mimeType || 'application/pdf',
          userId: pageDoc.userId,
          sessionId: pageDoc.sessionId,
          pageCount: pageDoc.pages?.length || 1,
          language: pageDoc.language,
          createdAt: pageDoc.createdAt,
        };
      }

      // Fallback to legacy document
      const doc = await Document.findOne({ fileId });
      if (doc) {
        return {
          fileId: doc.fileId,
          fileName: doc.fileName,
          mimeType: (doc as any).mimeType || 'application/pdf',
          userId: doc.userId,
          sessionId: doc.sessionId,
          pageCount: 1,
          language: doc.language,
          createdAt: doc.createdAt,
        };
      }

      return null;
    } catch (error) {
      console.error("Get file info error:", error);
      return null;
    }
  }
}

export const documentService = new DocumentService();

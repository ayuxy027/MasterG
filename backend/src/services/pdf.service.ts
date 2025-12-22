import pdfParse from 'pdf-parse';
import fs from 'fs/promises';
import path from 'path';

// Import pdfjs-dist for page-by-page extraction
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';

// Set up pdfjs worker for Node.js environment
GlobalWorkerOptions.workerSrc = `pdfjs-dist/legacy/build/pdf.worker.mjs`;

export interface PDFPage {
  pageNumber: number;
  text: string;
  extractionMethod: 'text';
}

export class PDFService {
  /**
   * Extract text from a PDF file (entire document)
   */
  async extractText(filePath: string): Promise<string> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);

      if (!data.text || data.text.trim().length === 0) {
        throw new Error('No text content found in PDF');
      }

      return data.text;
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text page by page using pdfjs-dist
   * Note: Only handles text-based PDFs. Scanned/image PDFs will return empty text.
   */
  async extractTextByPages(filePath: string): Promise<PDFPage[]> {
    // console.log(`\n${'='.repeat(60)}`);
    // console.log(`🔍 PDF TEXT EXTRACTION`);
    // console.log(`${'='.repeat(60)}`);
    // console.log(`📄 File: ${path.basename(filePath)}`);

    try {
      const dataBuffer = await fs.readFile(filePath);
      const uint8Array = new Uint8Array(dataBuffer);

      // Load PDF document
      const loadingTask = getDocument({
        data: uint8Array,
        useSystemFonts: true,
        isEvalSupported: false,
        useWorkerFetch: false,
      });
      const pdfDoc = await loadingTask.promise;
      const totalPages = pdfDoc.numPages;

      // console.log(`📑 Total pages: ${totalPages}`);
      // console.log(`${'='.repeat(60)}\n`);

      const pageContents: PDFPage[] = [];

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        // console.log(`📖 Processing page ${pageNum}/${totalPages}...`);

        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const textItems = textContent.items as any[];
        const pageText = textItems.map((item: any) => item.str).join(' ');

        if (pageText.trim().length > 0) {
          pageContents.push({
            pageNumber: pageNum,
            text: pageText.trim(),
            extractionMethod: 'text',
          });
          // console.log(`   ✅ Extracted ${pageText.length} characters`);
        } else {
          // console.log(`   ⚠️  No text found on page ${pageNum}`);
        }
      }

      // Clean up
      await pdfDoc.destroy();

      // Summary
      // console.log(`\n${'='.repeat(60)}`);
      // console.log(`📊 EXTRACTION SUMMARY`);
      // console.log(`${'='.repeat(60)}`);
      // console.log(`📑 Total pages: ${totalPages}`);
      // console.log(`✅ Pages with content: ${pageContents.length}`);
      // console.log(`❌ Pages without content: ${totalPages - pageContents.length}`);
      // console.log(`${'='.repeat(60)}\n`);

      if (pageContents.length === 0) {
        throw new Error('No text content found in PDF. The PDF may be image-based (scanned) or corrupted. Please try a text-based PDF.');
      }

      return pageContents;

    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error(`Failed to extract pages from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get metadata from PDF
   */
  async getMetadata(filePath: string): Promise<{ pages: number; info: any }> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);

      return {
        pages: data.numpages,
        info: data.info,
      };
    } catch (error) {
      console.error('PDF metadata error:', error);
      throw new Error('Failed to get PDF metadata');
    }
  }
}

export const pdfService = new PDFService();

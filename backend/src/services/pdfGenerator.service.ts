import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { LMRSummary, LMRQuestion, LMRQuiz, LMRRecallNote } from "./lmr.service";

export class PDFGeneratorService {
  /**
   * Remove emojis and non-WinAnsi characters from text
   */
  private sanitizeText(text: string): string {
    if (!text) return "";

    // Replace common Unicode characters with ASCII equivalents
    const replacements: Record<string, string> = {
      "→": "->",
      "←": "<-",
      "↑": "^",
      "↓": "v",
      "•": "*",
      "·": "*",
      "…": "...",
      "\u201C": '"', // left double quote
      "\u201D": '"', // right double quote
      "\u2018": "'", // left single quote
      "\u2019": "'", // right single quote
      "–": "-",
      "—": "-",
      "×": "x",
      "÷": "/",
      "≤": "<=",
      "≥": ">=",
      "≠": "!=",
      "∞": "infinity",
      "√": "sqrt",
      "∑": "sum",
      "∏": "product",
      "∫": "integral",
      "∂": "d",
      "∆": "delta",
      α: "alpha",
      β: "beta",
      γ: "gamma",
      δ: "delta",
      ε: "epsilon",
      θ: "theta",
      λ: "lambda",
      μ: "mu",
      π: "pi",
      σ: "sigma",
      φ: "phi",
      ω: "omega",
    };

    let sanitized = text;

    // Apply replacements
    for (const [unicode, ascii] of Object.entries(replacements)) {
      sanitized = sanitized.split(unicode).join(ascii);
    }

    // Remove any remaining characters outside WinAnsi range
    // Keep only: 0x20-0x7E (basic ASCII) and 0xA0-0xFF (extended Latin-1)
    sanitized = sanitized.replace(/[^\x20-\x7E\xA0-\xFF]/g, "");

    return sanitized.trim();
  }

  /**
   * Generate a formatted PDF with all LMR content
   */
  async generateLMRPDF(
    fileName: string,
    summary: LMRSummary,
    questions: LMRQuestion[],
    quiz: LMRQuiz[],
    recallNotes: LMRRecallNote[]
  ): Promise<Buffer> {
    try {
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const pageWidth = 595.28; // A4 width in points
      const pageHeight = 841.89; // A4 height in points
      const margin = 50;
      const contentWidth = pageWidth - 2 * margin;

      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      let yPosition = pageHeight - margin;

      // Helper function to add text with wrapping
      const addText = (
        text: string,
        size: number,
        useFont: any,
        color: { r: number; g: number; b: number } = { r: 0, g: 0, b: 0 }
      ) => {
        const sanitizedText = this.sanitizeText(text);
        const lines = this.wrapText(sanitizedText, contentWidth, size, useFont);

        for (const line of lines) {
          // Check if we need a new page
          if (yPosition < margin + 20) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            yPosition = pageHeight - margin;
          }

          page.drawText(line, {
            x: margin,
            y: yPosition,
            size,
            font: useFont,
            color: rgb(color.r, color.g, color.b),
          });

          yPosition -= size + 5;
        }
      };

      const addSpace = (space: number = 15) => {
        yPosition -= space;
      };

      // Title Page
      page.drawText("Last Minute Recall (LMR)", {
        x: margin,
        y: yPosition,
        size: 24,
        font: boldFont,
        color: rgb(1, 0.5, 0),
      });
      yPosition -= 40;

      page.drawText(`Document: ${this.sanitizeText(fileName)}`, {
        x: margin,
        y: yPosition,
        size: 14,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
      });
      yPosition -= 30;

      page.drawText(`Generated: ${new Date().toLocaleDateString()}`, {
        x: margin,
        y: yPosition,
        size: 12,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      });
      yPosition -= 50;

      // Summary Section
      page.drawText("SUMMARY", {
        x: margin,
        y: yPosition,
        size: 18,
        font: boldFont,
        color: rgb(1, 0.5, 0),
      });
      yPosition -= 25;

      addText(summary.summary, 11, font);
      addSpace(20);

      // Key Topics
      page.drawText("Key Topics:", {
        x: margin,
        y: yPosition,
        size: 14,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;

      summary.keyTopics.forEach((topic, index) => {
        addText(`${index + 1}. ${topic}`, 11, font);
      });
      addSpace(20);

      // Important Concepts
      page.drawText("Important Concepts:", {
        x: margin,
        y: yPosition,
        size: 14,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;

      summary.importantConcepts.forEach((concept, index) => {
        addText(`• ${concept}`, 11, font);
      });
      addSpace(30);

      // Questions Section
      if (yPosition < margin + 100) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        yPosition = pageHeight - margin;
      }

      page.drawText("QUESTIONS & ANSWERS", {
        x: margin,
        y: yPosition,
        size: 18,
        font: boldFont,
        color: rgb(1, 0.5, 0),
      });
      yPosition -= 25;

      questions.forEach((q, index) => {
        if (yPosition < margin + 100) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          yPosition = pageHeight - margin;
        }

        page.drawText(`Q${index + 1}. ${this.sanitizeText(q.question)}`, {
          x: margin,
          y: yPosition,
          size: 12,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= 20;

        addText(`Answer: ${q.answer}`, 10, font);

        page.drawText(
          `[${this.sanitizeText(q.difficulty)} | ${this.sanitizeText(
            q.subject
          )}]`,
          {
            x: margin,
            y: yPosition,
            size: 9,
            font: font,
            color: rgb(0.5, 0.5, 0.5),
          }
        );
        yPosition -= 25;
      });

      // Quiz Section
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - margin;

      page.drawText("QUIZ", {
        x: margin,
        y: yPosition,
        size: 18,
        font: boldFont,
        color: rgb(1, 0.5, 0),
      });
      yPosition -= 25;

      quiz.forEach((q, index) => {
        if (yPosition < margin + 120) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          yPosition = pageHeight - margin;
        }

        page.drawText(`${index + 1}. ${this.sanitizeText(q.question)}`, {
          x: margin,
          y: yPosition,
          size: 12,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= 20;

        q.options.forEach((option, optIndex) => {
          const prefix = String.fromCharCode(65 + optIndex); // A, B, C, D
          const isCorrect = optIndex === q.correctAnswer;

          page.drawText(
            `${prefix}. ${this.sanitizeText(option)}${
              isCorrect ? " (Correct)" : ""
            }`,
            {
              x: margin + 20,
              y: yPosition,
              size: 10,
              font: isCorrect ? boldFont : font,
              color: isCorrect ? rgb(0, 0.6, 0) : rgb(0, 0, 0),
            }
          );
          yPosition -= 18;
        });

        addText(`Explanation: ${q.explanation}`, 9, font, {
          r: 0.3,
          g: 0.3,
          b: 0.3,
        });
        yPosition -= 25;
      });

      // Recall Notes Section
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - margin;

      page.drawText("RECALL NOTES", {
        x: margin,
        y: yPosition,
        size: 18,
        font: boldFont,
        color: rgb(1, 0.5, 0),
      });
      yPosition -= 25;

      recallNotes.forEach((note) => {
        if (yPosition < margin + 100) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          yPosition = pageHeight - margin;
        }

        page.drawText(this.sanitizeText(note.topic), {
          x: margin,
          y: yPosition,
          size: 14,
          font: boldFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= 20;

        note.keyPoints.forEach((point) => {
          addText(`• ${point}`, 10, font);
        });

        if (note.quickFacts && note.quickFacts.length > 0) {
          addSpace(10);
          page.drawText("Quick Facts:", {
            x: margin,
            y: yPosition,
            size: 11,
            font: boldFont,
            color: rgb(0, 0, 0),
          });
          yPosition -= 15;

          note.quickFacts.forEach((fact) => {
            addText(`  - ${fact}`, 9, font);
          });
        }

        if (note.mnemonics && note.mnemonics.length > 0) {
          addSpace(10);
          page.drawText("Mnemonics:", {
            x: margin,
            y: yPosition,
            size: 11,
            font: boldFont,
            color: rgb(0, 0, 0),
          });
          yPosition -= 15;

          note.mnemonics.forEach((mnemonic) => {
            addText(`  [TIP] ${mnemonic}`, 9, font);
          });
        }

        addSpace(25);
      });

      // Footer on last page
      const pages = pdfDoc.getPages();
      pages.forEach((p, index) => {
        p.drawText(`Page ${index + 1} of ${pages.length}`, {
          x: pageWidth / 2 - 40,
          y: 30,
          size: 9,
          font: font,
          color: rgb(0.5, 0.5, 0.5),
        });

        p.drawText("Generated by MasterJi LMR", {
          x: pageWidth / 2 - 60,
          y: 15,
          size: 8,
          font: font,
          color: rgb(0.7, 0.7, 0.7),
        });
      });

      // Serialize the PDF to bytes
      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error) {
      console.error("❌ PDF generation error:", error);
      throw new Error(
        `Failed to generate PDF: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Wrap text to fit within a specified width
   */
  private wrapText(
    text: string,
    maxWidth: number,
    fontSize: number,
    font: any
  ): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }
}

export const pdfGeneratorService = new PDFGeneratorService();

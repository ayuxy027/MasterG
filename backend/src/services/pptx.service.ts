import pptxgen from "pptxgenjs";
import { PresentationResponse } from "../types";

/**
 * Service for generating PowerPoint presentations
 */
export class PptxService {
  /**
   * Generate a PPTX file from presentation data
   */
  async generatePptx(presentation: PresentationResponse): Promise<Buffer> {
    const pptx = new pptxgen();

    // Set presentation properties
    pptx.author = "MasterJi Weave";
    pptx.company = "MasterJi";
    pptx.subject = presentation.topic;
    pptx.title = presentation.title;

    // Define template color schemes
    const colorSchemes: Record<
      string,
      { primary: string; secondary: string; bg: string; text: string }
    > = {
      modern: {
        primary: "F97316",
        secondary: "FDBA74",
        bg: "FFF7ED",
        text: "1F2937",
      },
      classic: {
        primary: "3B82F6",
        secondary: "93C5FD",
        bg: "EFF6FF",
        text: "1E3A8A",
      },
      creative: {
        primary: "A855F7",
        secondary: "E879F9",
        bg: "FAF5FF",
        text: "581C87",
      },
      professional: {
        primary: "374151",
        secondary: "6B7280",
        bg: "F3F4F6",
        text: "111827",
      },
      educational: {
        primary: "10B981",
        secondary: "6EE7B7",
        bg: "ECFDF5",
        text: "064E3B",
      },
      minimal: {
        primary: "64748B",
        secondary: "94A3B8",
        bg: "F8FAFC",
        text: "1E293B",
      },
    };

    const colors = colorSchemes[presentation.template] || colorSchemes.modern;

    // Create slides
    for (const slideData of presentation.slides) {
      const slide = pptx.addSlide();

      // Set background color
      slide.background = { color: colors.bg };

      // Add decorative top bar
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: "100%",
        h: 0.1,
        fill: { color: colors.primary },
      });

      // Add slide number
      slide.addText(`${slideData.position} / ${presentation.slides.length}`, {
        x: 8.5,
        y: 6.8,
        w: 1.0,
        h: 0.3,
        fontSize: 12,
        color: colors.text,
        align: "right",
        transparency: 40,
      });

      // Add title with accent bar
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.5,
        y: 0.5,
        w: 0.08,
        h: 0.6,
        fill: { color: colors.primary },
      });

      slide.addText(slideData.title, {
        x: 0.7,
        y: 0.5,
        w: 8.5,
        h: 0.8,
        fontSize: 36,
        bold: true,
        color: colors.text,
        valign: "middle",
      });

      // Parse content into bullet points
      const contentLines = slideData.content
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => line.replace(/^[-•*]\s*/, "").trim());

      // Add content as bullet points
      if (contentLines.length > 0) {
        slide.addText(
          contentLines.map((line) => ({
            text: line,
            options: { bullet: true },
          })),
          {
            x: 0.7,
            y: 1.8,
            w: 5.0,
            h: 4.0,
            fontSize: 18,
            color: colors.text,
            bullet: { code: "2022" },
            valign: "top",
          }
        );
      }

      // Add visual content area indicator
      slide.addShape(pptx.ShapeType.rect, {
        x: 6.2,
        y: 1.8,
        w: 3.3,
        h: 3.5,
        fill: { color: colors.secondary, transparency: 80 },
        line: { color: colors.secondary, width: 2, transparency: 40 },
      });

      slide.addText("Visual Content Area", {
        x: 6.2,
        y: 3.3,
        w: 3.3,
        h: 0.4,
        fontSize: 14,
        color: colors.text,
        align: "center",
        transparency: 60,
      });

      // Add speaker notes if available
      if (slideData.speakerNotes) {
        slide.addNotes(slideData.speakerNotes);
      }

      // Add footer branding
      slide.addText("MasterJi Weave", {
        x: 0.5,
        y: 6.8,
        w: 2.0,
        h: 0.3,
        fontSize: 12,
        color: colors.primary,
        transparency: 40,
      });
    }

    // Generate and return buffer
    const buffer = await pptx.write({ outputType: "nodebuffer" });
    return buffer as Buffer;
  }

  /**
   * Generate PPTX from presentation data without saving to database
   */
  async generatePptxFromData(
    presentationData: PresentationResponse
  ): Promise<Buffer> {
    console.log(`📊 Generating PPTX for: ${presentationData.title}`);
    const buffer = await this.generatePptx(presentationData);
    console.log(`✅ PPTX generated successfully (${buffer.length} bytes)`);
    return buffer;
  }
}

export const pptxService = new PptxService();

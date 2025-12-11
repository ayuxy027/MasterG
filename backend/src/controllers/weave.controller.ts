import { Request, Response } from "express";
import { weaveService } from "../services/weave.service";
import { pptxService } from "../services/pptx.service";
import { PresentationRequest, PresentationResponse } from "../types";

export class WeaveController {
  /**
   * Generate a new presentation
   */
  async generatePresentation(req: Request, res: Response): Promise<void> {
    try {
      const {
        topic,
        language = "en",
        presentationStyle = "academic",
        targetAudience = "school",
        template = "modern",
        numSlides = 5,
        customCriteria = [],
      } = req.body;

      // Validate required fields
      if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: "Topic is required and must be a non-empty string",
        });
        return;
      }

      // Validate slide count
      if (numSlides < 3 || numSlides > 20) {
        res.status(400).json({
          success: false,
          error: "Number of slides must be between 3 and 20",
        });
        return;
      }

      const presentationRequest: PresentationRequest = {
        topic: topic.trim(),
        language,
        presentationStyle,
        targetAudience,
        template,
        numSlides,
        customCriteria,
      };

      const result = await weaveService.generatePresentation(
        presentationRequest
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error generating presentation:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate presentation",
      });
    }
  }

  /**
   * Get a saved presentation by ID
   */
  async getPresentation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: "Presentation ID is required",
        });
        return;
      }

      const presentation = await weaveService.getPresentationById(id);

      if (!presentation) {
        res.status(404).json({
          success: false,
          error: "Presentation not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: presentation,
      });
    } catch (error) {
      console.error("Error getting presentation:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to retrieve presentation",
      });
    }
  }

  /**
   * Save a presentation
   */
  async savePresentation(req: Request, res: Response): Promise<void> {
    try {
      const { presentation, userId } = req.body;

      if (!presentation) {
        res.status(400).json({
          success: false,
          error: "Presentation data is required",
        });
        return;
      }

      if (!userId) {
        res.status(400).json({
          success: false,
          error: "User ID is required",
        });
        return;
      }

      const savedPresentation = await weaveService.savePresentation(
        presentation,
        userId
      );

      res.status(200).json({
        success: true,
        data: savedPresentation,
      });
    } catch (error) {
      console.error("Error saving presentation:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save presentation",
      });
    }
  }

  /**
   * Export presentation as PPTX directly from request data (no DB storage needed)
   */
  async exportPptxDirect(req: Request, res: Response): Promise<void> {
    try {
      const presentationData = req.body as PresentationResponse;

      if (!presentationData || !presentationData.slides) {
        res.status(400).json({
          success: false,
          error: "Presentation data is required",
        });
        return;
      }

      console.log(`📥 Generating PPTX for: ${presentationData.title}`);

      // Generate PPTX buffer
      const pptxBuffer = await pptxService.generatePptxFromData(
        presentationData
      );

      // Set headers for download
      const filename = `${presentationData.title
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase()}_presentation.pptx`;
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Length", pptxBuffer.length);

      // Send the buffer
      res.send(pptxBuffer);
      console.log(
        `✅ PPTX download sent: ${filename} (${pptxBuffer.length} bytes)`
      );
    } catch (error) {
      console.error("Error generating PPTX:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate PPTX",
      });
    }
  }

  /**
   * Export presentation in specified format
   */
  async exportPresentation(req: Request, res: Response): Promise<void> {
    try {
      const { id, format } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: "Presentation ID is required",
        });
        return;
      }

      const lowerCaseFormat = format.toLowerCase();
      if (!format || !["pdf", "pptx", "json"].includes(lowerCaseFormat)) {
        res.status(400).json({
          success: false,
          error: "Export format must be one of: pdf, pptx, json",
        });
        return;
      }

      const exportData = await weaveService.exportPresentation(
        id,
        lowerCaseFormat as "pdf" | "pptx" | "json"
      );

      // Set appropriate content type based on format
      switch (format.toLowerCase()) {
        case "pdf":
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename=presentation-${id}.pdf`
          );
          break;
        case "pptx":
          res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation"
          );
          res.setHeader(
            "Content-Disposition",
            `attachment; filename=presentation-${id}.pptx`
          );
          break;
        case "json":
          res.setHeader("Content-Type", "application/json");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename=presentation-${id}.json`
          );
          break;
        default:
          res.setHeader("Content-Type", "application/json");
      }

      res.send(exportData);
    } catch (error) {
      console.error("Error exporting presentation:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to export presentation",
      });
    }
  }
}

export const weaveController = new WeaveController();

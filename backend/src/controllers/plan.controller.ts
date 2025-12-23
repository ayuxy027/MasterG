import { Request, Response } from "express";
import { planService } from "../services/plan.service";

export class PlanController {
    async generate(req: Request, res: Response): Promise<void> {
        try {
            const { userId, sessionId } = req.body;

            if (!userId || !sessionId) {
                res.status(400).json({ error: "userId and sessionId are required" });
                return;
            }

            const plan = await planService.generatePlan(userId, sessionId);

            res.status(200).json({
                success: true,
                plan
            });
        } catch (error: any) {
            console.error("Plan controller error:", error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async get(req: Request, res: Response): Promise<void> {
        try {
            const { userId, sessionId } = req.query;

            if (!userId || !sessionId) {
                res.status(400).json({ error: "userId and sessionId are required" });
                return;
            }

            const planDoc = await planService.getLatestPlan(userId as string, sessionId as string);

            if (!planDoc) {
                res.status(404).json({ success: false, error: "Plan not found" });
                return;
            }

            // Return both the main plan and available translations
            res.status(200).json({
                success: true,
                plan: planDoc.generatedPlan,
                translations: planDoc.translations ? Object.fromEntries(planDoc.translations) : {},
                createdAt: planDoc.createdAt
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async optimize(req: Request, res: Response): Promise<void> {
        try {
            const { topic, context, documentId, grade } = req.body;

            if (!topic) {
                res.status(400).json({ error: "Topic is required" });
                return;
            }

            const optimizedPrompt = await planService.optimizeStudyPrompt(topic, context || "", documentId || "", grade);

            res.status(200).json({
                success: true,
                optimizedPrompt
            });
        } catch (error: any) {
            console.error("Prompt optimization error:", error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async translate(req: Request, res: Response): Promise<void> {
        try {
            const { userId, sessionId, targetLang } = req.body;

            if (!userId || !sessionId || !targetLang) {
                res.status(400).json({ error: "userId, sessionId, and targetLang are required" });
                return;
            }

            const translatedPlan = await planService.translatePlan(userId, sessionId, targetLang);

            res.status(200).json({
                success: true,
                translatedPlan
            });
        } catch (error: any) {
            console.error("Plan translation error:", error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

export const planController = new PlanController();

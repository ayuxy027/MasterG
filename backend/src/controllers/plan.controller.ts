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

            const plan = await planService.getLatestPlan(userId as string, sessionId as string);

            res.status(200).json({
                success: true,
                plan
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
}

export const planController = new PlanController();

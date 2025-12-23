import { documentService } from "./document.service";
import { ollamaChatService } from "./ollamaChat.service";
// import { PlanModel } from "../models/plan.model"; // Will solve import later
import mongoose from "mongoose";
import { nllbService } from "./nllb.service";
import { languageService } from "./language.service";

// Define the interface for the document
interface IPlan extends mongoose.Document {
    sessionId: string;
    userId: string;
    generatedPlan: string;
    translations: Map<string, string>;
    createdAt: Date;
}

// Define the schema
const PlanSchema = new mongoose.Schema<IPlan>({
    sessionId: { type: String, required: true },
    userId: { type: String, required: true },
    generatedPlan: { type: String, required: true },
    translations: { type: Map, of: String, default: {} },
    createdAt: { type: Date, default: Date.now },
});
// Create or retrieve the model with proper typing
const PlanModel = (mongoose.models.Plan || mongoose.model("Plan", PlanSchema)) as any;

export class PlanService {
    /**
     * Generate a comprehensive study plan / detailed prompt from all documents
     */
    async generatePlan(userId: string, sessionId: string): Promise<string> {
        try {


            // 1. Fetch all documents for the session
            // We use the file info to get IDs, then fetch full content
            const sessionDocs = await documentService.getSessionDocuments(userId, sessionId);

            if (!sessionDocs || sessionDocs.length === 0) {
                throw new Error("No documents found. Please upload documents first.");
            }

            const fileIds = sessionDocs.map(d => d.fileId);
            const contentMap = await documentService.getDocumentsByFileIds(fileIds);

            let fullContext = "";
            for (const [fileId, content] of contentMap.entries()) {
                fullContext += `\n\n--- Document: ${fileId} ---\n${content}`;
            }

            if (fullContext.trim().length === 0) {
                throw new Error("Documents empty. Cannot generate plan.");
            }

            // Truncate context if too massive (DeepSeek 1.5B has limits, maybe 32k context?)
            // Let's safecap at around 150,000 chars (~30-40k tokens) if possible, or less for safety.
            // Deepseek 1.5B might be 4k-8k. Let's be conservative: 12000 chars.
            // User asked for "complete txt". If local model supports it, great. 
            // I'll cap at 20,000 chars for now to prevent OOM/timeouts on local.
            const efficientContext = fullContext.substring(0, 25000);



            // 2. Construct Planner Prompt
            const plannerPrompt = `You are an expert Study Planner and Prompt Engineer.
      
      Your task is to analyze the provided learning material and create a "Master Prompt" that will help a student learn this content perfectly.
      
      # ANALYSIS GOAL
      Read the content and identify:
      1. Key concepts and definitions
      2. Core themes and structure
      3. Critical details often missed
      
      # OUTPUT
      Generate a single, comprehensive "Detailed System Prompt" that I can feed into an AI Chatbot. 
      This prompt should allow the chatbot to answer ANY question about this material with 100% precision.
      
      The prompt should look like:
      "You are an expert on [Topic]. Use the following context: [Summary of Key Points]. When asked about X, explain Y..."
      
      Just give me the DETAILED PROMPT, nothing else.
      
      # DOCUMENT CONTENT:
      ${efficientContext}
      `;

            // 3. Call DeepSeek
            const generatedPlan = await ollamaChatService.chatCompletion([
                { role: "user", content: plannerPrompt }
            ]);

            // 4. Save Plan
            await PlanModel.create({
                userId,
                sessionId,
                generatedPlan,
                translations: {}
            });



            return generatedPlan;

        } catch (error: any) {
            console.error("Plan generation failed:", error);
            throw new Error(`Failed to generate plan: ${error.message}`);
        }
    }

    async getLatestPlan(userId: string, sessionId: string): Promise<IPlan | null> {
        const plan = await PlanModel.findOne({ userId, sessionId }).sort({ createdAt: -1 });
        return plan;
    }

    async translatePlan(userId: string, sessionId: string, targetLang: string, sourceLang: string = "en"): Promise<string> {
        const plan = await this.getLatestPlan(userId, sessionId);

        if (!plan) {
            throw new Error("No plan found for this session.");
        }

        const normalizedTarget = languageService.toNLLBCode(targetLang as any) || targetLang;
        const normalizedSource = languageService.toNLLBCode(sourceLang as any) || "eng_Latn";

        // Check if translation exists
        if (plan.translations) {
            if (plan.translations.get(targetLang)) return plan.translations.get(targetLang)!;
            if (plan.translations.get(normalizedTarget)) return plan.translations.get(normalizedTarget)!;
        }



        // Generate translation
        const translatedText = await nllbService.translate(plan.generatedPlan, {
            srcLang: normalizedSource,
            tgtLang: normalizedTarget
        });

        // Save translation
        if (!plan.translations) {
            plan.translations = new Map();
        }
        plan.translations.set(targetLang, translatedText);

        await PlanModel.updateOne(
            { _id: plan._id },
            { $set: { [`translations.${targetLang}`]: translatedText } }
        );

        return translatedText;
    }

    /**
     * Optimize a study prompt for a specific topic
     */
    async optimizeStudyPrompt(topic: string, context: string, documentId: string, grade?: string): Promise<string> {
        try {


            const gradeInstruction = grade
                ? `Target Audience Level: Grade ${grade} student. Ensure the explanation is appropriate for this academic level.`
                : `Target Audience Level: General audience.`;

            const prompt = `You are a Study Coach. 
            
            OBJECTIVE:
            Convert the following topic and context into a CONCISE, DIRECT query (max 4 lines) that a student would ask an AI.
            
            TOPIC: ${topic}
            GRADE: ${grade || '12'}
            CONTEXT: ${context.substring(0, 1000)}
            
            RULES:
            1. Output ONLY the query. No preamble, no "Here is your prompt".
            2. Format: "Explain ${topic} to me like I'm in grade ${grade || '12'}. Focus on [keyword 1] and [keyword 2]. Provide a real-world example."
            3. STRICT LIMIT: Maximum 4 lines of text.
            4. Style: Direct student-to-teacher query.`;

            const optimizedPrompt = await ollamaChatService.chatCompletion([
                { role: "user", content: prompt }
            ]);

            // Clean up the response to ensure no leftover thinking tags or markdown blocks
            let cleaned = optimizedPrompt;

            // Remove markdown code blocks if the model ignored instructions
            cleaned = cleaned.replace(/```[\s\S]*?```/g, m => m.replace(/```[a-z]*\n?|```/g, ''));
            cleaned = cleaned.split('\n').filter(line => !line.toLowerCase().startsWith('here is') && !line.toLowerCase().startsWith('sure,')).join('\n');

            return cleaned.trim() || `Explain the concept of ${topic} for a grade ${grade || '12'} student using details from the document.`;
        } catch (error: any) {

            // Fallback to simple prompt with error indicator for debugging
            return `[DEBUG: ${error.message}] Explain the concept of ${topic} in detail based on the study material.`;
        }
    }
}

export const planService = new PlanService();

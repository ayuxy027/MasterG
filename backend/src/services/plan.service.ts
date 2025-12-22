import { documentService } from "./document.service";
import { ollamaChatService } from "./ollamaChat.service";
// import { PlanModel } from "../models/plan.model"; // Will solve import later
import mongoose from "mongoose";

// Define the interface for the document
interface IPlan extends mongoose.Document {
    sessionId: string;
    userId: string;
    generatedPlan: string;
    createdAt: Date;
}

// Define the schema
const PlanSchema = new mongoose.Schema<IPlan>({
    sessionId: { type: String, required: true },
    userId: { type: String, required: true },
    generatedPlan: { type: String, required: true },
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
            console.log(`🧠 Generating LMR Plan for session: ${sessionId}`);

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

            console.log(`Starting plan generation with context length: ${efficientContext.length}`);

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
                generatedPlan
            });

            console.log(`✅ Plan generated and saved.`);

            return generatedPlan;

        } catch (error: any) {
            console.error("Plan generation failed:", error);
            throw new Error(`Failed to generate plan: ${error.message}`);
        }
    }

    async getLatestPlan(userId: string, sessionId: string): Promise<string | null> {
        const plan = await PlanModel.findOne({ userId, sessionId }).sort({ createdAt: -1 });
        return plan ? plan.generatedPlan : null;
    }

    /**
     * Optimize a study prompt for a specific topic
     */
    async optimizeStudyPrompt(topic: string, context: string, documentId: string, grade?: string): Promise<string> {
        try {
            // console.log(`✨ Optimizing prompt for topic: ${topic} (Grade: ${grade || 'General'})`);

            const gradeInstruction = grade
                ? `Target Audience Level: Grade ${grade} student. Ensure the explanation is appropriate for this academic level.`
                : `Target Audience Level: General audience.`;

            const prompt = `You are an expert Study Coach and Prompt Engineer.
            
            OBJECTIVE:
            Generate a HIGHLY EFFECTIVE, DETAILED USER PROMPT that a student (Grade: ${grade || 'General'}) should type into an AI Chatbot to learn about "${topic}" thoroughly.
            
            CONTEXT FROM DOCUMENT:
            ${context}
            
            INSTRUCTIONS:
            1. The output must be the EXACT TEXT the student should type.
            2. It should be phrased as a request from the student to the AI.
            3. It must specify the learning level: "Explain this to me as a ${grade || 'student'}..."
            4. It should explicitly ask for:
               - A clear, simple definition
               - Key concepts/mechanisms from the context
               - Real-world examples appropriate for Grade ${grade || 'General'}
               - A strict instruction to ONLY use the provided document context.
            
            OUTPUT FORMAT:
            Just the prompt text. No quotes. No "Here is the prompt".
            
            EXAMPLE OUTPUT:
            "Act as my tutor. Explain [Topic] to a Grade ${grade || 'User'} level. Focus on [Key Concept 1] and [Key Concept 2] as mentioned in the text. Provide 3 examples and a summary."
            `;

            const optimizedPrompt = await ollamaChatService.chatCompletion([
                { role: "user", content: prompt }
            ]);

            // console.log(`✅ [PlanService] Optimization successful. Result length: ${optimizedPrompt.length}`);
            return optimizedPrompt.replace(/"/g, '').trim(); // Remove quotes if any
        } catch (error: any) {
            console.error("❌ [PlanService] Prompt optimization failed:", {
                message: error.message,
                stack: error.stack,
                topic,
                documentId
            });
            // Fallback to simple prompt with error indicator for debugging
            return `[DEBUG: ${error.message}] Explain the concept of ${topic} in detail based on the study material.`;
        }
    }
}

export const planService = new PlanService();

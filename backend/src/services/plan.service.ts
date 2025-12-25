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
const PlanModel = (mongoose.models.Plan ||
  mongoose.model("Plan", PlanSchema)) as any;

export class PlanService {
  /**
   * Generate a comprehensive study plan / detailed prompt from all documents
   */
  async generatePlan(userId: string, sessionId: string): Promise<string> {
    try {
      // 1. Fetch all documents for the session
      // We use the file info to get IDs, then fetch full content
      const sessionDocs = await documentService.getSessionDocuments(
        userId,
        sessionId
      );

      if (!sessionDocs || sessionDocs.length === 0) {
        throw new Error("No documents found. Please upload documents first.");
      }

      const fileIds = sessionDocs.map((d) => d.fileId);
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
      const efficientContext = fullContext.substring(0, 25001);

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

      // 3. Call DeepSeek with proper method
      const result = await ollamaChatService.generateWithMaxOutput(
        plannerPrompt,
        8000
      );
      const generatedPlan = result.answer;

      // 4. Save Plan
      await PlanModel.create({
        userId,
        sessionId,
        generatedPlan,
        translations: {},
      });

      return generatedPlan;
    } catch (error: any) {
      console.error("Plan generation failed:", error);
      throw new Error(`Failed to generate plan: ${error.message}`);
    }
  }

  async getLatestPlan(
    userId: string,
    sessionId: string
  ): Promise<IPlan | null> {
    const plan = await PlanModel.findOne({ userId, sessionId }).sort({
      createdAt: -1,
    });
    return plan;
  }

  async translatePlan(
    userId: string,
    sessionId: string,
    targetLang: string,
    sourceLang: string = "en"
  ): Promise<string> {
    const plan = await this.getLatestPlan(userId, sessionId);

    if (!plan) {
      throw new Error("No plan found for this session.");
    }

    const normalizedTarget =
      languageService.toNLLBCode(targetLang as any) || targetLang;
    const normalizedSource =
      languageService.toNLLBCode(sourceLang as any) || "eng_Latn";

    // Check if translation exists
    if (plan.translations) {
      if (plan.translations.get(targetLang))
        return plan.translations.get(targetLang)!;
      if (plan.translations.get(normalizedTarget))
        return plan.translations.get(normalizedTarget)!;
    }

    // Generate translation
    const translatedText = await nllbService.translate(plan.generatedPlan, {
      srcLang: normalizedSource,
      tgtLang: normalizedTarget,
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
  async optimizeStudyPrompt(
    topic: string,
    context: string,
    documentId: string,
    grade?: string
  ): Promise<string> {
    try {
      // Get detailed grade-specific learning approach
      const gradeLevel = grade || "12";
      const gradeConfig = this.getGradeSpecificConfig(gradeLevel);

      const prompt = `You are an expert Study Coach specializing in ${
        gradeConfig.level
      } education.

OBJECTIVE:
Create a CONCISE study prompt for a Class ${gradeLevel} student.

TOPIC: ${topic}
GRADE LEVEL: Class ${gradeLevel} (${gradeConfig.level})
CONTEXT: ${context.substring(0, 1500)}

STUDENT PROFILE (Class ${gradeLevel}):
- Vocabulary: ${gradeConfig.vocabulary}
- Preferred Examples: ${gradeConfig.exampleType}

PROMPT REQUIREMENTS:
1. Start with: "Explain ${topic} to a Class ${gradeLevel} student"
2. Include 1-2 key aspects to focus on from the context
3. Request ${gradeConfig.exampleType} examples
4. MAXIMUM 3 LINES - Be concise and direct

OUTPUT FORMAT:
Write ONLY the optimized study prompt. No preamble, no "Here is...".
Make it sound like a Class ${gradeLevel} student asking their teacher.

EXAMPLE:
"Explain [topic] to me as a Class ${gradeLevel} student. I want to understand [key aspect] with ${
        gradeConfig.exampleType
      } examples. How does this apply in real life?"`;

      console.log(
        `📝 Optimizing prompt for Class ${gradeLevel} (${gradeConfig.level}): ${topic}`
      );
      // Increase token limit to allow for both DeepSeek's thinking process AND actual response
      const result = await ollamaChatService.generateWithMaxOutput(prompt, 400);
      const optimizedPrompt = result.answer;

      // Clean up the response to ensure no leftover thinking tags or markdown blocks
      let cleaned = optimizedPrompt;

      // If the response is just thinking text (DeepSeek R1 behavior), use detailed fallback
      if (
        (cleaned.length > 500 && cleaned.includes("user wants")) ||
        cleaned.includes("I need to")
      ) {
        console.warn(
          "⚠️ Response appears to be thinking text only, using detailed fallback"
        );
        const gradeConfig = this.getGradeSpecificConfig(grade || "12");
        return `Explain ${topic} to me as a Class ${
          grade || "12"
        } student. Focus on the fundamental concepts using ${
          gradeConfig.vocabulary
        } language and ${
          gradeConfig.exampleType
        } examples. Help me understand how this applies in real-world situations at my grade level. Break it down step-by-step in a way that's easy to grasp.`;
      }

      // Remove markdown code blocks if the model ignored instructions
      cleaned = cleaned.replace(/```[\s\S]*?```/g, (m) =>
        m.replace(/```[a-z]*\n?|```/g, "")
      );

      // Remove common AI preambles
      cleaned = cleaned
        .split("\n")
        .filter(
          (line) =>
            !line.toLowerCase().startsWith("here is") &&
            !line.toLowerCase().startsWith("sure,") &&
            !line.toLowerCase().startsWith("alright,") &&
            !line.toLowerCase().includes("let me") &&
            line.trim().length > 0
        )
        .join("\n");

      const finalPrompt =
        cleaned.trim() ||
        `Explain the concept of ${topic} for a Class ${
          grade || "12"
        } student. Use ${
          this.getGradeSpecificConfig(grade || "12").vocabulary
        } language with ${
          this.getGradeSpecificConfig(grade || "12").exampleType
        } examples.`;

      console.log(`✅ Optimized prompt ready (${finalPrompt.length} chars)`);
      return finalPrompt;
    } catch (error: any) {
      console.error("❌ Prompt optimization failed:", error.message);
      const gradeConfig = this.getGradeSpecificConfig(grade || "12");
      return `Explain ${topic} to me as a Class ${
        grade || "12"
      } student using ${
        gradeConfig.vocabulary
      } language. Focus on the key concepts with ${
        gradeConfig.exampleType
      } examples. Make it easy to understand and relate to real-life scenarios.`;
    }
  }

  /**
   * Get grade-specific configuration for prompt optimization
   */
  private getGradeSpecificConfig(grade: string): {
    level: string;
    cognitiveLevel: string;
    learningStyle: string;
    vocabulary: string;
    exampleType: string;
  } {
    const gradeNum = parseInt(grade);

    // Primary Level (Classes 1-5)
    if (gradeNum >= 1 && gradeNum <= 5) {
      return {
        level: "Primary School",
        cognitiveLevel: "Concrete Operational",
        learningStyle: "Visual and hands-on learning",
        vocabulary: "simple, everyday",
        exampleType: "picture-like, visual",
      };
    }

    // Middle School (Classes 6-8)
    if (gradeNum >= 6 && gradeNum <= 8) {
      return {
        level: "Middle School",
        cognitiveLevel: "Early Formal Operational",
        learningStyle: "Practical examples with some abstract thinking",
        vocabulary: "intermediate, clear",
        exampleType: "everyday life and scientific",
      };
    }

    // Secondary/High School (Classes 9-10)
    if (gradeNum >= 9 && gradeNum <= 10) {
      return {
        level: "Secondary School",
        cognitiveLevel: "Formal Operational",
        learningStyle: "Abstract concepts with practical applications",
        vocabulary: "advanced, technical",
        exampleType: "scientific and analytical",
      };
    }

    // Senior Secondary (Classes 11-12)
    if (gradeNum >= 11 && gradeNum <= 12) {
      return {
        level: "Senior Secondary",
        cognitiveLevel: "Advanced Formal Operational",
        learningStyle: "Deep analytical and critical thinking",
        vocabulary: "technical, academic",
        exampleType: "complex analytical and research-based",
      };
    }

    // Default to Class 10 level
    return {
      level: "Secondary School",
      cognitiveLevel: "Formal Operational",
      learningStyle: "Abstract concepts with practical applications",
      vocabulary: "advanced, clear",
      exampleType: "scientific and analytical",
    };
  }
}

export const planService = new PlanService();

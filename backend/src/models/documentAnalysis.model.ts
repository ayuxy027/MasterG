import mongoose, { Document, Schema } from "mongoose";
import type { Topic } from "../types/topic.types";

export interface IDocumentAnalysis extends Document {
    userId: string;
    sessionId: string;
    documentId: string;
    documentName: string;
    topics: Topic[];
    totalEstimatedMinutes: number;
    analyzedAt: Date;
    updatedAt: Date;
}

const TopicSchema = new Schema({
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        required: true
    },
    estimatedMinutes: { type: Number, required: true },
    pageRange: {
        start: { type: Number, required: true },
        end: { type: Number, required: true }
    },
    keyConceptsList: [{ type: String }],
    suggestedPrompts: [{ type: String }],
    prerequisites: [{ type: String }]
}, { _id: false });

const DocumentAnalysisSchema: Schema = new Schema({
    userId: { type: String, required: true },
    sessionId: { type: String, required: true },
    documentId: { type: String, required: true },
    documentName: { type: String, required: true },
    topics: [TopicSchema],
    totalEstimatedMinutes: { type: Number, default: 0 },
    analyzedAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Compound unique index for document per session
DocumentAnalysisSchema.index({ sessionId: 1, documentId: 1 }, { unique: true });
DocumentAnalysisSchema.index({ userId: 1, sessionId: 1 });
DocumentAnalysisSchema.index({ documentId: 1 });

DocumentAnalysisSchema.pre("save", function (next) {
    this.updatedAt = new Date();
    next();
});

export const DocumentAnalysisModel = mongoose.model<IDocumentAnalysis>(
    "DocumentAnalysis",
    DocumentAnalysisSchema
);

import mongoose, { Document, Schema } from "mongoose";

export interface ILMRHistory extends Document {
  fileId: string;
  fileName: string;
  userId?: string;
  sessionId?: string;
  language: string;
  tone: string;
  hasSummary: boolean;
  hasQuestions: boolean;
  hasQuiz: boolean;
  hasRecallNotes: boolean;
  summary?: any;
  questions?: any[];
  quiz?: any[];
  recallNotes?: any[];
  createdAt: Date;
  updatedAt: Date;
}

const LMRHistorySchema: Schema = new Schema({
  fileId: { type: String, required: true, unique: true },
  fileName: { type: String, required: true },
  userId: { type: String },
  sessionId: { type: String },
  language: { type: String, default: "english" },
  tone: { type: String, default: "professional" },
  hasSummary: { type: Boolean, default: false },
  hasQuestions: { type: Boolean, default: false },
  hasQuiz: { type: Boolean, default: false },
  hasRecallNotes: { type: Boolean, default: false },
  summary: { type: Schema.Types.Mixed },
  questions: [{ type: Schema.Types.Mixed }],
  quiz: [{ type: Schema.Types.Mixed }],
  recallNotes: [{ type: Schema.Types.Mixed }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

LMRHistorySchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Create indexes for efficient querying
LMRHistorySchema.index({ userId: 1, createdAt: -1 });
LMRHistorySchema.index({ sessionId: 1, createdAt: -1 });

export const LMRHistoryModel = mongoose.model<ILMRHistory>(
  "LMRHistory",
  LMRHistorySchema
);

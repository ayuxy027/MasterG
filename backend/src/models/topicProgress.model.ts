import mongoose, { Document, Schema } from "mongoose";

export interface ITopicProgress extends Document {
    userId: string;
    sessionId: string;
    documentId: string;
    topicId: string;
    status: 'pending' | 'in-progress' | 'completed';
    startedAt?: Date;
    completedAt?: Date;
    timeSpentMinutes: number;
    confidenceRating?: number;
    createdAt: Date;
    updatedAt: Date;
}

const TopicProgressSchema: Schema = new Schema({
    userId: { type: String, required: true },
    sessionId: { type: String, required: true },
    documentId: { type: String, required: true },
    topicId: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed'],
        default: 'pending'
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    timeSpentMinutes: { type: Number, default: 0 },
    confidenceRating: { type: Number, min: 1, max: 5 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Compound unique index for topic progress per user/session
TopicProgressSchema.index({ userId: 1, sessionId: 1, topicId: 1 }, { unique: true });
TopicProgressSchema.index({ sessionId: 1, documentId: 1 });
TopicProgressSchema.index({ userId: 1, sessionId: 1 });

TopicProgressSchema.pre("save", function (next) {
    this.updatedAt = new Date();

    // Auto-set timestamps based on status
    if (this.status === 'in-progress' && !this.startedAt) {
        this.startedAt = new Date();
    }
    if (this.status === 'completed' && !this.completedAt) {
        this.completedAt = new Date();
    }

    next();
});

export const TopicProgressModel = mongoose.model<ITopicProgress>(
    "TopicProgress",
    TopicProgressSchema
);

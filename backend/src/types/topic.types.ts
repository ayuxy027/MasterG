// Types for Plan Mode Dashboard - Topic Analysis

export interface Topic {
    id: string;
    title: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedMinutes: number;
    pageRange: { start: number; end: number };
    keyConceptsList: string[];
    suggestedPrompts: string[];
    prerequisites: string[];
}

export interface DocumentAnalysis {
    _id?: string;
    userId: string;
    sessionId: string;
    documentId: string;
    documentName: string;
    topics: Topic[];
    totalEstimatedMinutes: number;
    analyzedAt: Date;
}

export interface TopicProgress {
    _id?: string;
    userId: string;
    sessionId: string;
    documentId: string;
    topicId: string;
    status: 'pending' | 'in-progress' | 'completed';
    startedAt?: Date;
    completedAt?: Date;
    timeSpentMinutes?: number;
    confidenceRating?: number; // 1-5
}

export interface AnalyzeDocumentRequest {
    userId: string;
    sessionId: string;
    documentId: string;
    documentName: string;
}

export interface UpdateProgressRequest {
    userId: string;
    sessionId: string;
    topicId: string;
    status: 'pending' | 'in-progress' | 'completed';
    timeSpentMinutes?: number;
    confidenceRating?: number;
}

export interface SessionProgressResponse {
    documentId: string;
    documentName: string;
    totalTopics: number;
    completedTopics: number;
    inProgressTopics: number;
    overallProgress: number; // percentage
    totalTimeEstimate: number;
    timeSpent: number;
}

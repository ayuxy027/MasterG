// Types for Plan Mode

export interface DocumentInfo {
    id: string;
    fileName: string;
    title: string;
    chunkCount: number;
}

export interface Topic {
    id: string;
    title: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedMinutes: number;
}

export interface AnalysisResult {
    documentId: string;
    documentName: string;
    topics: Topic[];
}

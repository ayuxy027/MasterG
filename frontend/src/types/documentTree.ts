// Types for Document Knowledge Tree

export interface TreeNode {
    id: string;
    title: string;
    description: string;
    type: 'chapter' | 'section' | 'topic';
    difficulty: 'easy' | 'medium' | 'hard';
    weight: number; // 0-100, importance weightage
    estimatedMinutes: number;
    children?: TreeNode[];
    isStudied?: boolean;
    pageReferences?: number[]; // Pages where this topic appears
    keywords?: string[]; // Key terms for this node
}

export interface DocumentTree {
    documentId: string;
    documentName: string;
    rootNodes: TreeNode[];
    totalWeight: number;
    totalEstimatedMinutes: number;
    analyzedAt: string;
}

export interface LearningPathItem {
    nodeId: string;
    nodePath: string[]; // Breadcrumb path to node
    title: string;
    priority: number; // Based on weight + difficulty
    estimatedMinutes: number;
    prerequisites?: string[]; // Node IDs that should be studied first
}

export interface LearningPlan {
    documentId: string;
    items: LearningPathItem[];
    totalMinutes: number;
    generatedAt: string;
}

// For prompt generation
export interface StudyPromptContext {
    nodeTitle: string;
    nodePath: string[];
    weight: number;
    difficulty: string;
    documentName: string;
    relatedTopics?: string[];
}

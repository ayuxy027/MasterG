import React, { useState, useEffect } from 'react';
import type { DocumentTree as DocumentTreeType, TreeNode } from '../../../types/documentTree';
import { extractDocumentTree, getDocumentTree } from '../../../services/documentTreeApi';
import { optimizePrompt } from '../../../services/planApi';
import type { DocumentInfo } from '../../../types/topic';
import TreeNodeComponent from './TreeNode';

interface DocumentTreeProps {
    document: DocumentInfo;
    userId: string;
    sessionId: string;
    onSwitchToStudy: (prompt: string) => void;
    grade?: string;
}

const DocumentTree: React.FC<DocumentTreeProps> = ({
    document,
    userId,
    sessionId,
    onSwitchToStudy,
    grade,
}) => {
    const [tree, setTree] = useState<DocumentTreeType | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingTree, setIsLoadingTree] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [optimizingNodeId, setOptimizingNodeId] = useState<string | null>(null);

    // Load saved tree from MongoDB on mount
    useEffect(() => {
        loadSavedTree();
    }, [document.id]);

    const loadSavedTree = async () => {
        setIsLoadingTree(true);
        try {
            const savedTree = await getDocumentTree(userId, sessionId, document.id);
            if (savedTree) {
                setTree(savedTree);
            }
        } catch (err) {
            // No saved tree, that's fine
        } finally {
            setIsLoadingTree(false);
        }
    };

    const handleExtractTree = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await extractDocumentTree(
                userId,
                sessionId,
                document.id,
                document.fileName
            );
            setTree(result);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStudyNode = async (node: TreeNode) => {
        console.log(`[DocumentTree] Starting study for node: ${node.title} (ID: ${node.id})`);
        try {
            setOptimizingNodeId(node.id);

            // 1. Minimum UX delay to ensure "Optimizing..." state is visible
            // This prevents the UI from flickering if the backend is too fast or fails immediately.
            const minDelayPromise = new Promise(resolve => setTimeout(resolve, 800));

            // 2. Prepare Context (safely)
            const nodeDesc = node.description || '';
            const nodeKeywords = node.keywords?.join(', ') || '';
            const context = `${nodeDesc}. Keywords: ${nodeKeywords}`;
            // console.log(`[DocumentTree] Calling optimizePrompt with grade: ${grade}`);

            // 3. Call Backend (Parallel with min delay)
            const [optimizedPrompt] = await Promise.all([
                optimizePrompt(node.title, context, document.id, grade),
                minDelayPromise
            ]);

            // console.log(`[DocumentTree] Received optimized prompt:`, optimizedPrompt.substring(0, 50) + "...");

            // 4. Switch to Chat with result
            onSwitchToStudy(optimizedPrompt);
        } catch (error: any) {
            console.error("[DocumentTree] Study optimization failed:", error);
            // Fallback with error visibility for debugging
            // User sees: "Error: [Message] -> Explain..."
            // This helps Identify if it's a network error, 500, or logical error.
            const errorMsg = error.message || "Unknown error";
            onSwitchToStudy(`[Optimization Failed: ${errorMsg}] Explain "${node.title}" from ${document.fileName}`);
        } finally {
            setOptimizingNodeId(null);
        }
    };

    // Show loading state while checking for saved tree
    if (isLoadingTree) {
        return (
            <div className="bg-white rounded-xl border-2 border-orange-100 overflow-hidden p-6">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
                    <span className="text-gray-500">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border-2 border-orange-100 overflow-hidden">
            {/* Document Header */}
            <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <h3 className="font-bold text-gray-800 text-lg">{document.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {document.chunkCount} sections • {document.fileName}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Collapse/Expand Button - Only show if tree exists */}
                        {tree && (
                            <button
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                className="p-2 rounded-lg text-gray-500 hover:bg-white hover:text-gray-700 transition-colors"
                                title={isCollapsed ? "Expand" : "Collapse"}
                            >
                                <svg
                                    className={`w-5 h-5 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        )}

                        {!tree && (
                            <button
                                onClick={handleExtractTree}
                                disabled={isLoading}
                                className={`
                                    px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2
                                    ${isLoading
                                        ? 'bg-gray-100 text-gray-400'
                                        : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-md hover:shadow-lg'
                                    }
                                `}
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Analyzing...
                                    </>
                                ) : (
                                    'Build Knowledge Tree'
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border-b border-red-100">
                    <p className="text-red-700 text-sm">{error}</p>
                </div>
            )}

            {/* Tree Content - Only show if not collapsed */}
            {tree && !isCollapsed && (
                <div className="p-4">
                    {/* Quick Actions */}
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                        <button
                            onClick={handleExtractTree}
                            disabled={isLoading}
                            className={`
                                px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2
                                ${isLoading
                                    ? 'bg-gray-100 text-gray-400'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                                }
                            `}
                        >
                            {isLoading ? (
                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            )}
                            {isLoading ? 'Regenerating...' : 'Regenerate Tree'}
                        </button>

                        <div className="text-sm text-gray-500">
                            {tree.totalEstimatedMinutes} min total
                        </div>
                    </div>

                    {/* Tree View */}
                    <div className="space-y-3">
                        {tree.rootNodes.map((node) => (
                            <TreeNodeComponent
                                key={node.id}
                                node={node}
                                depth={0}
                                nodePath={[]}
                                documentName={document.fileName}
                                onStudy={handleStudyNode}
                                optimizingNodeId={optimizingNodeId}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!tree && !isLoading && (
                <div className="p-8 text-center">
                    <p className="text-gray-600 mb-2">
                        Click "Build Knowledge Tree" to analyze this document
                    </p>
                    <p className="text-sm text-gray-400">
                        AI will extract chapters, sections, and topics with importance weights
                    </p>
                </div>
            )}
        </div>
    );
};

export default DocumentTree;

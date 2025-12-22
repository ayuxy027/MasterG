import React, { useState } from 'react';
import type { TreeNode as TreeNodeType } from '../../../types/documentTree';

interface TreeNodeProps {
    node: TreeNodeType;
    depth: number;
    nodePath: string[];
    documentName: string;
    onStudy: (node: TreeNodeType) => void;
    optimizingNodeId?: string | null;
}

const TreeNodeComponent: React.FC<TreeNodeProps> = ({
    node,
    depth,
    nodePath,
    documentName,
    onStudy,
    optimizingNodeId = null,
}) => {
    const [isExpanded, setIsExpanded] = useState(depth < 1);
    const hasChildren = node.children && node.children.length > 0;
    const currentPath = [...nodePath, node.title];
    const isOptimizing = optimizingNodeId === node.id;

    // Difficulty colors
    const difficultyColors = {
        easy: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
        medium: { bg: 'bg-amber-100', text: 'text-amber-700' },
        hard: { bg: 'bg-rose-100', text: 'text-rose-700' },
    };

    // Type icons
    const typeLabels = {
        chapter: 'Chapter',
        section: 'Section',
        topic: 'Topic',
    };

    // Weight visualization (bar width)
    const weightPercentage = Math.min(100, Math.max(5, node.weight));

    const diffStyle = difficultyColors[node.difficulty];

    return (
        <div className={`${depth > 0 ? 'ml-6 border-l-2 border-orange-100' : ''}`}>
            <div
                className={`
                    group relative flex items-start gap-3 p-3 rounded-xl transition-all duration-200
                    bg-white hover:bg-orange-50/50
                    ${depth === 0 ? 'shadow-sm border-2 border-orange-100 hover:border-orange-200' : ''}
                `}
            >
                {/* Expand/Collapse Toggle */}
                {hasChildren && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md bg-orange-100 hover:bg-orange-200 text-orange-600 transition-colors"
                    >
                        <svg
                            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Title Row */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-400 uppercase font-medium">{typeLabels[node.type]}</span>
                        <span className="text-gray-300">•</span>
                        <h4 className="font-semibold text-gray-800">{node.title}</h4>
                    </div>

                    {/* Description */}
                    {node.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{node.description}</p>
                    )}

                    {/* Meta Info Row */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {/* Difficulty Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${diffStyle.bg} ${diffStyle.text}`}>
                            {node.difficulty}
                        </span>

                        {/* Time */}
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {node.estimatedMinutes} min
                        </span>

                        {/* Weight Bar */}
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-400">Weight:</span>
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all"
                                    style={{ width: `${weightPercentage}%` }}
                                />
                            </div>
                            <span className="text-xs text-gray-500">{node.weight}</span>
                        </div>
                    </div>

                    {/* Keywords */}
                    {node.keywords && node.keywords.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                            {node.keywords.slice(0, 4).map((keyword, idx) => (
                                <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md"
                                >
                                    {keyword}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Study Button */}
                <button
                    onClick={() => onStudy(node)}
                    disabled={isOptimizing}
                    className={`
                        flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow
                        ${isOptimizing
                            ? 'bg-orange-100 text-orange-400 cursor-not-allowed'
                            : 'bg-orange-500 text-white hover:bg-orange-600'
                        }
                    `}
                >
                    {isOptimizing ? 'Optimizing...' : 'Study'}
                </button>
            </div>

            {/* Children */}
            {hasChildren && isExpanded && (
                <div className="mt-2 space-y-2 pl-2">
                    {node.children!.map((child) => (
                        <TreeNodeComponent
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            nodePath={currentPath}
                            documentName={documentName}
                            onStudy={onStudy}
                            optimizingNodeId={optimizingNodeId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default TreeNodeComponent;

import React, { useState, useEffect } from 'react';
import type { DocumentInfo } from '../../../types/topic';
import { getDocuments } from '../../../services/analyzeApi';
import DocumentTree from './DocumentTree';

interface PlanDashboardProps {
    userId: string;
    sessionId: string;
    onSwitchToStudy: (prompt: string) => void;
}

const PlanDashboard: React.FC<PlanDashboardProps> = ({
    userId,
    sessionId,
    onSwitchToStudy,
}) => {
    const [documents, setDocuments] = useState<DocumentInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

    useEffect(() => {
        loadDocuments();
    }, [userId, sessionId]);

    const loadDocuments = async () => {
        setIsLoading(true);
        try {
            const docs = await getDocuments(userId, sessionId);
            setDocuments(docs);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-4 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
                    <p className="text-gray-600">Loading documents...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-6 bg-gradient-to-b from-white to-orange-50/30">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            Knowledge Tree
                        </h2>
                        <p className="text-gray-600 mt-1">
                            Build hierarchical learning paths from your documents
                        </p>
                    </div>

                    {documents.length > 0 && (
                        <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-gray-200">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                List
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'grid'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Grid
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                    {error}
                </div>
            )}

            {/* Empty State */}
            {documents.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center">
                        <span className="text-4xl">📄</span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">No documents yet</h3>
                    <p className="text-gray-600 mb-4">
                        Upload documents in Study mode to create knowledge trees
                    </p>
                    <button
                        onClick={() => onSwitchToStudy('')}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                        Go to Study Mode
                    </button>
                </div>
            ) : (
                /* Document Trees */
                <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'space-y-6'}`}>
                    {documents.map((doc) => (
                        <DocumentTree
                            key={doc.id}
                            document={doc}
                            userId={userId}
                            sessionId={sessionId}
                            onSwitchToStudy={onSwitchToStudy}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default PlanDashboard;

import React, { useState, useEffect } from 'react';
import type { DocumentInfo, Topic, AnalysisResult } from '../../../types/topic';
import { getDocuments, extractTopics } from '../../../services/analyzeApi';
import TopicCard from './TopicCard';

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
    const [analyses, setAnalyses] = useState<Record<string, AnalysisResult>>({});
    const [analyzingId, setAnalyzingId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    const handleAnalyze = async (doc: DocumentInfo) => {
        setAnalyzingId(doc.id);
        setError(null);
        try {
            const result = await extractTopics(userId, sessionId, doc.id, doc.fileName);
            setAnalyses((prev) => ({ ...prev, [doc.id]: result }));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setAnalyzingId(null);
        }
    };

    const handleStudyTopic = (topic: Topic, documentName: string) => {
        onSwitchToStudy(`@${documentName} Explain: ${topic.title}`);
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-6 bg-gradient-to-b from-white to-orange-50/30">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">📋 Plan Mode</h2>
                <p className="text-gray-600 mt-1">Analyze documents to extract main topics</p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                    {error}
                </div>
            )}

            {documents.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-2xl">📄</span>
                    </div>
                    <p className="text-gray-600">No documents yet. Upload in Study mode first.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {documents.map((doc) => {
                        const analysis = analyses[doc.id];
                        const isAnalyzing = analyzingId === doc.id;

                        return (
                            <div key={doc.id} className="bg-white rounded-xl border-2 border-orange-100 overflow-hidden">
                                {/* Document Header */}
                                <div className="p-4 flex items-center justify-between bg-orange-50/50">
                                    <div>
                                        <h3 className="font-semibold text-gray-800">{doc.title}</h3>
                                        <p className="text-sm text-gray-500">{doc.chunkCount} sections</p>
                                    </div>

                                    {!analysis && (
                                        <button
                                            onClick={() => handleAnalyze(doc)}
                                            disabled={isAnalyzing}
                                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${isAnalyzing
                                                    ? 'bg-gray-100 text-gray-400'
                                                    : 'bg-orange-500 text-white hover:bg-orange-600'
                                                }`}
                                        >
                                            {isAnalyzing ? (
                                                <span className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                    </svg>
                                                    Analyzing...
                                                </span>
                                            ) : (
                                                '🔍 Analyze'
                                            )}
                                        </button>
                                    )}
                                </div>

                                {/* Topics Grid */}
                                {analysis && (
                                    <div className="p-4 border-t border-orange-100">
                                        <p className="text-sm text-gray-500 mb-3">
                                            {analysis.topics.length} topics found • Click to study
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                            {analysis.topics.map((topic) => (
                                                <TopicCard
                                                    key={topic.id}
                                                    topic={topic}
                                                    documentName={doc.fileName}
                                                    onStudy={handleStudyTopic}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default PlanDashboard;

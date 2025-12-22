import React, { useState, useEffect } from 'react';
import { PlanResponse, generatePlan, getLatestPlan, translatePlan } from '../../../services/planApi';
import { INDIAN_LANGUAGES } from '../../../constants/appConstants';
import MarkdownRenderer from '../../ui/MarkdownRenderer';

interface MasterPlanViewProps {
    userId: string;
    sessionId: string;
}

const MasterPlanView: React.FC<MasterPlanViewProps> = ({ userId, sessionId }) => {
    const [plan, setPlan] = useState<PlanResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [targetLang, setTargetLang] = useState<string>('hi'); // Default Hindi
    const [error, setError] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        loadPlan();
    }, [userId, sessionId]);

    const loadPlan = async () => {
        try {
            const data = await getLatestPlan(userId, sessionId);
            setPlan(data);
        } catch (err: any) {
            // Ignore 404
        }
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const newPlanText = await generatePlan(userId, sessionId);
            // Refresh full plan object
            await loadPlan();
            setIsExpanded(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTranslate = async () => {
        if (!plan) return;
        setIsTranslating(true);
        setError(null);
        try {
            await translatePlan(userId, sessionId, targetLang);
            await loadPlan(); // Refresh to get new translations
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsTranslating(false);
        }
    };

    // Determine what text to show
    const displayContent = plan?.translations[targetLang] || plan?.plan;
    const isTranslated = !!plan?.translations[targetLang];

    if (!plan && !isLoading) {
        return (
            <div className="bg-white rounded-xl border border-orange-200 p-6 mb-8 shadow-sm">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Master Study Plan</h3>
                        <p className="text-gray-600 text-sm mt-1">
                            Generate a comprehensive guide based on all your documents.
                        </p>
                    </div>
                    <button
                        onClick={handleGenerate}
                        className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg hover:from-orange-600 hover:to-amber-600 font-medium shadow-md transition-all whitespace-nowrap"
                    >
                        Generate Study Plan
                    </button>
                </div>
                {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
            </div>
        );
    }

    if (isLoading && !plan) {
        return (
            <div className="bg-white rounded-xl border border-orange-200 p-8 mb-8 shadow-sm text-center">
                <div className="w-8 h-8 mx-auto mb-3 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
                <p className="text-gray-600 font-medium">Drafting your Master Plan...</p>
                <p className="text-gray-400 text-sm mt-1">This uses deep reasoning (DeepSeek R1) and may take a moment.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-orange-200 overflow-hidden mb-8 shadow-sm">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 flex items-center justify-between flex-wrap gap-4">
                <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <svg
                        className={`w-5 h-5 text-orange-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                    <div>
                        <h3 className="font-bold text-gray-800">Master Study Plan</h3>
                        {plan?.createdAt && (
                            <p className="text-xs text-gray-500">
                                Generated {new Date(plan.createdAt).toLocaleDateString()}
                            </p>
                        )}
                    </div>
                </div>

                {isExpanded && (
                    <div className="flex items-center gap-2">
                        <select
                            value={targetLang}
                            onChange={(e) => setTargetLang(e.target.value)}
                            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                        >
                            {INDIAN_LANGUAGES.map(lang => (
                                <option key={lang.code} value={lang.code}>
                                    {lang.name}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={handleTranslate}
                            disabled={isTranslating || isTranslated}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${isTranslated
                                    ? 'bg-green-100 text-green-700 cursor-default'
                                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                }`}
                        >
                            {isTranslating ? (
                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : isTranslated ? (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Translated
                                </>
                            ) : (
                                'Translate'
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            {isExpanded && (
                <div className="p-6 max-h-[500px] overflow-y-auto bg-gray-50/50">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                    <div className="prose prose-orange max-w-none">
                        <MarkdownRenderer content={displayContent || ''} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterPlanView;

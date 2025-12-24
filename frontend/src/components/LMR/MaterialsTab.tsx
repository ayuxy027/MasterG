import React from "react";
import { LMRSummary, KeyTopic, ImportantConcept } from "../../services/lmrApi";

interface MaterialsTabProps {
  summary: LMRSummary | null;
  isLoading?: boolean;
}

const MaterialsTab: React.FC<MaterialsTabProps> = ({ summary, isLoading }) => {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center animate-pulse">
          <svg
            className="w-8 h-8 text-orange-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            ></path>
          </svg>
        </div>
        <p className="text-gray-600">Generating summary...</p>
      </div>
    );
  }

  // Helper to safely get topic display
  const getTopicName = (topic: KeyTopic | string): string => {
    if (typeof topic === 'string') return topic;
    return topic?.name || 'Topic';
  };

  const getTopicDescription = (topic: KeyTopic | string): string => {
    if (typeof topic === 'string') return '';
    return topic?.description || '';
  };

  // Helper to safely get concept display
  const getConceptName = (concept: ImportantConcept | string): string => {
    if (typeof concept === 'string') return concept;
    return concept?.name || 'Concept';
  };

  const getConceptPoints = (concept: ImportantConcept | string): string[] => {
    if (typeof concept === 'string') return [concept];
    return concept?.points || [];
  };

  return (
    <div>
      {!summary ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-orange-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              ></path>
            </svg>
          </div>
          <p className="text-gray-600">
            No summary generated yet. Switch to this tab to generate summary.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Structured Summary - Last Minute Revision Format */}
          <div className="bg-white rounded-xl border-2 border-orange-200 overflow-hidden shadow-md">
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-b-2 border-orange-200 px-6 py-4">
              <h4 className="font-bold text-gray-800 text-xl flex items-center gap-2">
                <svg
                  className="w-6 h-6 text-orange-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  ></path>
                </svg>
                Last Minute Summary
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                Generated in {summary.language} • Quick revision format
              </p>
            </div>
            <div className="p-6 space-y-4">
              {/* Introduction */}
              {summary.introduction && (
                <div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-400">
                  <p className="text-gray-700 leading-relaxed font-medium">
                    {summary.introduction}
                  </p>
                </div>
              )}

              {/* Summary Points - Bullet List */}
              {summary.summaryPoints && summary.summaryPoints.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-semibold text-gray-800 flex items-center gap-2">
                    Key Summary Points
                  </h5>
                  <ul className="space-y-2">
                    {summary.summaryPoints.map((point, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <span className="text-orange-500 font-bold flex-shrink-0">•</span>
                        <span className="text-gray-700">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Conclusion */}
              {summary.conclusion && (
                <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-400">
                  <h5 className="font-semibold text-gray-800 mb-2">Conclusion</h5>
                  <p className="text-gray-700 leading-relaxed">
                    {summary.conclusion}
                  </p>
                </div>
              )}

              {/* Fallback to legacy summary if structured format not available */}
              {!summary.introduction && !summary.summaryPoints?.length && summary.summary && (
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {summary.summary}
                </p>
              )}
            </div>
          </div>

          {/* Key Topics with Descriptions */}
          <div className="bg-white rounded-xl border-2 border-orange-200 overflow-hidden shadow-md">
            <div className="bg-orange-50 border-b-2 border-orange-200 px-6 py-4">
              <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-orange-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  ></path>
                </svg>
                Key Topics
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                Each topic with a quick recall description
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-4">
                {summary.keyTopics.map((topic, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-4 p-4 bg-orange-50 rounded-lg border border-orange-200 hover:shadow-md transition-shadow"
                  >
                    <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <h5 className="text-gray-800 font-semibold text-lg">
                        {getTopicName(topic)}
                      </h5>
                      {getTopicDescription(topic) && (
                        <p className="text-gray-600 text-sm mt-1">
                          {getTopicDescription(topic)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Important Concepts with 5 Bullet Points Each */}
          <div className="bg-white rounded-xl border-2 border-orange-200 overflow-hidden shadow-md">
            <div className="bg-orange-50 border-b-2 border-orange-200 px-6 py-4">
              <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-orange-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  ></path>
                </svg>
                Important Concepts
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                Each concept with 3 key bullet points for quick understanding
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {summary.importantConcepts.map((concept, idx) => {
                  const conceptName = getConceptName(concept);
                  const conceptPoints = getConceptPoints(concept);

                  return (
                    <div
                      key={idx}
                      className="bg-blue-50 rounded-xl border-2 border-blue-200 overflow-hidden"
                    >
                      {/* Concept Header */}
                      <div className="bg-blue-100 px-5 py-3 border-b border-blue-200">
                        <div className="flex items-center gap-3">
                          <svg
                            className="w-5 h-5 text-blue-600 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <h5 className="font-bold text-blue-800 text-lg">
                            {conceptName}
                          </h5>
                        </div>
                      </div>

                      {/* Concept Points */}
                      <div className="p-4">
                        {conceptPoints.length > 0 ? (
                          <ul className="space-y-2">
                            {conceptPoints.map((point, pointIdx) => (
                              <li
                                key={pointIdx}
                                className="flex items-start gap-3 p-2"
                              >
                                <span className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                  {pointIdx + 1}
                                </span>
                                <span className="text-gray-700 text-sm">
                                  {typeof point === 'string' ? point : JSON.stringify(point)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-600 text-sm italic">
                            {typeof concept === 'string' ? concept : 'No detailed points available'}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialsTab;

import React from "react";
import { LMRRecallNote } from "../../services/lmrApi";

interface RecallNotesTabProps {
  recallNotes: LMRRecallNote[];
  isLoading?: boolean;
}

// Helper function to safely convert any value to a displayable string
// This fixes the "[object Object]" bug when AI returns nested objects
const safeToString = (value: any): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    // Try to extract meaningful text from common property names
    if (value.text) return String(value.text);
    if (value.content) return String(value.content);
    if (value.point) return String(value.point);
    if (value.fact) return String(value.fact);
    if (value.value) return String(value.value);
    if (value.description) return String(value.description);
    if (value.name) return String(value.name);
    // Last resort: stringify, but filter out unhelpful results
    const stringified = JSON.stringify(value);
    if (stringified === '{}' || stringified === '[]') return '';
    return stringified;
  }
  return String(value);
};

// Helper function to normalize an array of items to strings
const normalizeItems = (items: any): string[] => {
  if (!items) return [];
  if (!Array.isArray(items)) return [safeToString(items)];
  return items
    .map(item => safeToString(item))
    .filter(item => item && item !== '{}' && item !== '[]' && item !== 'null' && item !== 'undefined');
};

const RecallNotesTab: React.FC<RecallNotesTabProps> = ({
  recallNotes,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center animate-pulse">
          <svg
            className="w-8 h-8 text-orange-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            ></path>
          </svg>
        </div>
        <p className="text-gray-600">Generating recall notes...</p>
      </div>
    );
  }

  if (!recallNotes || recallNotes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-orange-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            ></path>
          </svg>
        </div>
        <p className="text-gray-600">
          No recall notes generated yet. Upload a document to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
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
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <h3 className="text-xl font-bold text-gray-800">
            Quick Revision Notes
          </h3>
        </div>
        <p className="text-sm text-gray-600">
          Comprehensive, memorable notes for last-minute exam preparation • 5 key points & 5-8 quick facts per topic
        </p>
      </div>

      {/* Notes sections */}
      {recallNotes.map((note, index) => {
        // Normalize all arrays to ensure they contain only strings
        const keyPoints = normalizeItems(note.keyPoints);
        const quickFacts = normalizeItems(note.quickFacts);
        const mnemonics = normalizeItems(note.mnemonics);
        const topicName = safeToString(note.topic) || `Topic ${index + 1}`;

        return (
          <div
            key={index}
            className="bg-white rounded-xl border-2 border-orange-200 overflow-hidden hover:shadow-lg transition-all duration-300"
          >
            {/* Topic header */}
            <div className="bg-orange-50 border-b-2 border-orange-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">
                    {index + 1}
                  </span>
                </div>
                <h4 className="text-lg font-bold text-gray-800">{topicName}</h4>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Key Points */}
              {keyPoints.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
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
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <h5 className="font-semibold text-gray-800">Key Points ({keyPoints.length})</h5>
                  </div>
                  <ul className="space-y-2">
                    {keyPoints.map((point, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200"
                      >
                        <span className="flex-shrink-0 w-6 h-6 bg-orange-400 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-gray-700">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Quick Facts - Now with more content */}
              {quickFacts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <svg
                      className="w-5 h-5 text-blue-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <h5 className="font-semibold text-gray-800">Quick Facts ({quickFacts.length})</h5>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {quickFacts.map((fact, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-start gap-2"
                      >
                        <svg
                          className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-sm text-gray-700">{fact}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mnemonics */}
              {mnemonics.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <svg
                      className="w-5 h-5 text-purple-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    <h5 className="font-semibold text-gray-800">Memory Tips</h5>
                  </div>
                  <div className="space-y-2">
                    {mnemonics.map((mnemonic, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">*</span>
                          <p className="text-gray-700 font-medium">
                            {mnemonic}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Study tips footer */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <div>
            <h5 className="font-bold text-gray-800 mb-2">Study Tips for Last-Minute Revision</h5>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• Review these notes 2-3 times for better retention</li>
              <li>• Focus on the Quick Facts section for rapid recall</li>
              <li>• Use mnemonics to remember complex concepts</li>
              <li>• Test yourself using the Quiz section</li>
              <li>• Download the PDF for offline revision on the go</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecallNotesTab;

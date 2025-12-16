import React from 'react';
import type { Topic } from '../../../types/topic';

interface TopicCardProps {
    topic: Topic;
    documentName: string;
    onStudy: (topic: Topic, documentName: string) => void;
}

const TopicCard: React.FC<TopicCardProps> = ({ topic, documentName, onStudy }) => {
    const difficultyStyles = {
        easy: { bg: 'bg-green-100', text: 'text-green-700' },
        medium: { bg: 'bg-orange-100', text: 'text-orange-700' },
        hard: { bg: 'bg-red-100', text: 'text-red-700' },
    };

    const diff = difficultyStyles[topic.difficulty];

    return (
        <div className="bg-white rounded-lg border-2 border-orange-100 p-4 hover:border-orange-300 hover:shadow-md transition-all">
            <h4 className="font-semibold text-gray-800 mb-1">{topic.title}</h4>
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{topic.description}</p>

            <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${diff.bg} ${diff.text}`}>
                    {topic.difficulty}
                </span>
                <span className="text-xs text-gray-500">⏱️ {topic.estimatedMinutes} min</span>
            </div>

            <button
                onClick={() => onStudy(topic, documentName)}
                className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
                Study This Topic
            </button>
        </div>
    );
};

export default TopicCard;

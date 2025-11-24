import React from 'react';
import { List, Target, GitBranch, Layers } from 'lucide-react';

interface CanvasToolbarProps {
    activeOption?: string;
    onOptionChange?: (option: string) => void;
    sidebarOpen?: boolean;
}

const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
    activeOption = 'summarise',
    onOptionChange
}) => {
    const options = [
        { id: 'summarise', label: 'Summarise', icon: List },
        { id: 'action-points', label: 'Action points', icon: Target },
        { id: 'timeline', label: 'Timeline', icon: GitBranch },
        { id: 'breakdown', label: 'Breakdown', icon: Layers }
    ];

    return (
        <div className="flex justify-center mb-6">
            <div className="relative">
                {/* Outer gradient border for premium matte ring */}
                <div className="rounded-2xl bg-transparent">
                    {/* Inner frosted glass panel */}
                    <div
                        className="rounded-2xl px-2 py-2 backdrop-blur-3xl bg-transparent"
                    >
                        <div className="flex items-center gap-1">
                            {options.map((option) => {
                                const IconComponent = option.icon;
                                const isActive = activeOption === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => onOptionChange?.(option.id)}
                                        className={`group flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ease-out focus:outline-none ${isActive
                                                ? 'bg-orange-100 text-orange-600 shadow-[0_8px_24px_rgba(249,115,22,0.15)]'
                                                : 'text-orange-500 hover:bg-orange-50'
                                            }`}
                                        style={{ transform: isActive ? 'translateY(-1px)' : 'translateY(0px)' }}
                                    >
                                        <IconComponent size={16} />
                                        <span className="text-sm font-medium opacity-80">{option.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CanvasToolbar;


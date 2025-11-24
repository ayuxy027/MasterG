import React from 'react';

interface TextSettingsProps {
    id: string;
    fontFamily: string;
    fontSize: number;
    isBold: boolean;
    isItalic: boolean;
    isUnderline: boolean;
    color: string;
    enableMarkdown?: boolean;
    onUpdate: (id: string, updates: Partial<{
        fontFamily: string;
        fontSize: number;
        isBold: boolean;
        isItalic: boolean;
        isUnderline: boolean;
        color: string;
        enableMarkdown: boolean;
    }>) => void;
    onDelete: (id: string) => void;
}

const TextSettings: React.FC<TextSettingsProps> = ({
    id,
    fontFamily,
    fontSize,
    isBold,
    isItalic,
    isUnderline,
    color,
    enableMarkdown = false,
    onUpdate,
    onDelete
}) => {
    // Simple options
    const colors = ['transparent', '#FFFFFF', '#F8F9FA', '#E9ECEF'];
    const fontSizes = [12, 14, 16, 18, 20, 24];
    const fontFamilies = ['Inter', 'Arial', 'Times New Roman'];

    return (
        <div className="absolute top-8 right-0 bg-white rounded-md shadow-lg p-3 border border-gray-200 min-w-[180px]" style={{ zIndex: 99999 }}>
            <div className="space-y-2">
                {/* Font */}
                <div>
                    <label className="block text-xs text-gray-700 mb-1">Font</label>
                    <select
                        value={fontFamily}
                        onChange={(e) => onUpdate(id, { fontFamily: e.target.value })}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                        style={{ zIndex: 999999 }}
                    >
                        {fontFamilies.map((font) => (
                            <option key={font} value={font}>{font}</option>
                        ))}
                    </select>
                </div>

                {/* Size */}
                <div>
                    <label className="block text-xs text-gray-700 mb-1">Size</label>
                    <select
                        value={fontSize}
                        onChange={(e) => onUpdate(id, { fontSize: Number(e.target.value) })}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                        style={{ zIndex: 999999 }}
                    >
                        {fontSizes.map((size) => (
                            <option key={size} value={size}>{size}px</option>
                        ))}
                    </select>
                </div>

                {/* Style */}
                <div>
                    <label className="block text-xs text-gray-700 mb-1">Style</label>
                    <div className="flex gap-1">
                        <button
                            className={`px-2 py-1 text-xs rounded border ${isBold ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-white border-gray-300'}`}
                            onClick={() => onUpdate(id, { isBold: !isBold })}
                            style={{ fontWeight: 'bold' }}
                        >
                            B
                        </button>
                        <button
                            className={`px-2 py-1 text-xs rounded border ${isItalic ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-white border-gray-300'}`}
                            onClick={() => onUpdate(id, { isItalic: !isItalic })}
                            style={{ fontStyle: 'italic' }}
                        >
                            I
                        </button>
                        <button
                            className={`px-2 py-1 text-xs rounded border ${isUnderline ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-white border-gray-300'}`}
                            onClick={() => onUpdate(id, { isUnderline: !isUnderline })}
                            style={{ textDecoration: 'underline' }}
                        >
                            U
                        </button>
                    </div>
                </div>

                {/* Markdown */}
                <div>
                    <label className="block text-xs text-gray-700 mb-1">Markdown</label>
                    <button
                        className={`w-full px-2 py-1 text-xs rounded border ${enableMarkdown ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-white border-gray-300'}`}
                        onClick={() => onUpdate(id, { enableMarkdown: !enableMarkdown })}
                    >
                        {enableMarkdown ? '✓ Enabled' : 'Enable Markdown'}
                    </button>
                </div>

                {/* Background */}
                <div>
                    <label className="block text-xs text-gray-700 mb-1">Background</label>
                    <div className="grid grid-cols-4 gap-1">
                        {colors.map((colorOption) => (
                            <button
                                key={colorOption}
                                className={`w-6 h-6 rounded-full border ${color === colorOption ? 'border-gray-700' : 'border-gray-200'}`}
                                style={{
                                    backgroundColor: colorOption === 'transparent' ? 'white' : colorOption,
                                    backgroundImage: colorOption === 'transparent' ? 'repeating-linear-gradient(45deg, #ccc 0, #ccc 1px, transparent 1px, transparent 4px), repeating-linear-gradient(-45deg, #ccc 0, #ccc 1px, transparent 1px, transparent 4px)' : 'none'
                                }}
                                onClick={() => onUpdate(id, { color: colorOption })}
                                title={colorOption === 'transparent' ? 'Transparent' : colorOption}
                            />
                        ))}
                    </div>
                </div>

                {/* Delete */}
                <button
                    className="w-full text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded"
                    onClick={() => {
                        if (window.confirm('Delete this text box?')) {
                            onDelete(id);
                        }
                    }}
                >
                    Delete
                </button>
            </div>
        </div>
    );
};

export default TextSettings;


import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { FileListItem, MentionedFile } from "../../types/chat";

interface MentionInputProps {
    value: string;
    onChange: (value: string) => void;
    selectedMentions: MentionedFile[];
    onMentionsChange: (mentions: MentionedFile[]) => void;
    availableFiles: FileListItem[];
    placeholder?: string;
    disabled?: boolean;
    onKeyPress?: (e: React.KeyboardEvent) => void;
    className?: string;
}

// Regex to match @filename patterns (with extension)
const MENTION_REGEX = /@([^\s@]+\.[a-zA-Z0-9]+)/g;

/**
 * MentionInput - Textarea with @ file mention support and colored mentions
 */
const MentionInput: React.FC<MentionInputProps> = ({
    value,
    onChange,
    // selectedMentions is tracked internally via prevMentionsRef
    selectedMentions: _selectedMentions,
    onMentionsChange,
    availableFiles,
    placeholder = "Type your message...",
    disabled = false,
    onKeyPress,
    className = "",
}) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [mentionFilter, setMentionFilter] = useState("");
    const [dropdownIndex, setDropdownIndex] = useState(0);
    const [cursorPosition, setCursorPosition] = useState(0);
    const [atPosition, setAtPosition] = useState(0);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const highlightRef = useRef<HTMLDivElement>(null);

    // Filter files based on mention filter text
    const filteredFiles = availableFiles.filter((file) =>
        file.fileName.toLowerCase().includes(mentionFilter.toLowerCase())
    );

    // Extract mentions from value text and sync with selectedMentions
    // Using a ref to track previous mentions to avoid unnecessary updates
    const prevMentionsRef = useRef<string>('');

    useEffect(() => {
        const matches = [...value.matchAll(MENTION_REGEX)];
        const mentionedFileNames = matches.map(m => m[1]);

        const newMentions: MentionedFile[] = [];
        mentionedFileNames.forEach(fileName => {
            const file = availableFiles.find(f => f.fileName === fileName);
            if (file && !newMentions.find(m => m.fileId === file.fileId)) {
                newMentions.push({ fileId: file.fileId, fileName: file.fileName });
            }
        });

        const newIds = newMentions.map(m => m.fileId).sort().join(',');
        if (prevMentionsRef.current !== newIds) {
            prevMentionsRef.current = newIds;
            onMentionsChange(newMentions);
        }
    }, [value, availableFiles, onMentionsChange]);

    // Sync scroll between textarea and highlight div
    const syncScroll = () => {
        if (highlightRef.current && inputRef.current) {
            highlightRef.current.scrollTop = inputRef.current.scrollTop;
            highlightRef.current.scrollLeft = inputRef.current.scrollLeft;
        }
    };

    // Detect @ character and show dropdown
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const cursor = e.target.selectionStart || 0;
        setCursorPosition(cursor);
        onChange(newValue);

        const textBeforeCursor = newValue.substring(0, cursor);
        const lastAtIndex = textBeforeCursor.lastIndexOf("@");

        if (lastAtIndex !== -1) {
            const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
            const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : " ";
            if ((charBeforeAt === " " || charBeforeAt === "\n" || lastAtIndex === 0) && !textAfterAt.includes(" ")) {
                setMentionFilter(textAfterAt);
                setAtPosition(lastAtIndex);
                setShowDropdown(true);
                setDropdownIndex(0);
                return;
            }
        }

        setShowDropdown(false);
        setMentionFilter("");
    };

    // Handle keyboard navigation in dropdown
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showDropdown && filteredFiles.length > 0) {
            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setDropdownIndex((prev) => Math.min(prev + 1, filteredFiles.length - 1));
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setDropdownIndex((prev) => Math.max(prev - 1, 0));
                    break;
                case "Enter":
                    if (showDropdown) {
                        e.preventDefault();
                        selectFile(filteredFiles[dropdownIndex]);
                    }
                    break;
                case "Escape":
                    setShowDropdown(false);
                    break;
                case "Tab":
                    if (showDropdown) {
                        e.preventDefault();
                        selectFile(filteredFiles[dropdownIndex]);
                    }
                    break;
            }
        }
    };

    // Select a file from dropdown
    const selectFile = useCallback((file: FileListItem) => {
        const textBeforeAt = value.substring(0, atPosition);
        const textAfterCursor = value.substring(cursorPosition);
        const newValue = textBeforeAt + "@" + file.fileName + " " + textAfterCursor;
        onChange(newValue);

        const newCursorPos = atPosition + file.fileName.length + 2;
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
                inputRef.current.focus();
            }
        }, 0);

        setShowDropdown(false);
        setMentionFilter("");
    }, [value, atPosition, cursorPosition, onChange]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Check if value contains any mentions - memoized
    const hasMentions = useMemo(() => {
        const regex = new RegExp(MENTION_REGEX.source, 'g');
        return regex.test(value);
    }, [value]);

    // Render text with highlighted mentions - memoized to prevent re-renders
    const highlightedContent = useMemo(() => {
        if (!value || !hasMentions) return null;

        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        let match;
        const regex = new RegExp(MENTION_REGEX.source, 'g');

        while ((match = regex.exec(value)) !== null) {
            const matchStart = match.index;
            const matchEnd = matchStart + match[0].length;
            const fileName = match[1];
            const isValidFile = availableFiles.some(f => f.fileName === fileName);

            // Text before match
            if (matchStart > lastIndex) {
                parts.push(
                    <span key={`t-${lastIndex}`} className="text-gray-900">
                        {value.substring(lastIndex, matchStart)}
                    </span>
                );
            }

            // The mention itself - colored differently
            parts.push(
                <span
                    key={`m-${matchStart}`}
                    className={isValidFile ? "text-orange-600 font-medium" : "text-gray-500"}
                >
                    {match[0]}
                </span>
            );

            lastIndex = matchEnd;
        }

        // Remaining text
        if (lastIndex < value.length) {
            parts.push(
                <span key={`t-${lastIndex}`} className="text-gray-900">
                    {value.substring(lastIndex)}
                </span>
            );
        }

        return parts;
    }, [value, hasMentions, availableFiles]);

    // Build placeholder with @ hint
    const getPlaceholder = () => {
        if (availableFiles.length > 0) {
            return `${placeholder}  •  Type @ to mention files`;
        }
        return placeholder;
    };

    return (
        <div className="relative flex-1">
            <div className="relative">
                {/* Highlight layer - shows colored text */}
                <div
                    ref={highlightRef}
                    className="absolute inset-0 p-3 text-sm whitespace-pre-wrap break-words overflow-hidden pointer-events-none rounded-xl border-2 border-transparent bg-transparent"
                    style={{ lineHeight: '1.5' }}
                    aria-hidden="true"
                >
                    {highlightedContent}
                </div>

                {/* Actual textarea */}
                <textarea
                    ref={inputRef}
                    value={value}
                    onChange={handleInputChange}
                    onScroll={syncScroll}
                    onKeyDown={(e) => {
                        handleKeyDown(e);
                        if (!showDropdown && onKeyPress) {
                            onKeyPress(e);
                        }
                    }}
                    placeholder={getPlaceholder()}
                    disabled={disabled}
                    className={`w-full border-2 border-orange-200 rounded-xl p-3 resize-none min-h-[48px] max-h-[120px] focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all text-sm bg-white placeholder:text-gray-400 ${className}`}
                    style={{
                        caretColor: '#ea580c',
                        lineHeight: '1.5',
                        // Make text transparent only when we have mentions to show
                        color: hasMentions ? 'transparent' : 'inherit',
                    }}
                    rows={1}
                />
            </div>

            {/* Dropdown */}
            {showDropdown && filteredFiles.length > 0 && (
                <div
                    ref={dropdownRef}
                    className="absolute bottom-full left-0 mb-1 w-full max-h-48 overflow-y-auto bg-white rounded-lg shadow-lg border-2 border-orange-200 z-50"
                >
                    <div className="p-2 text-xs text-gray-500 border-b border-gray-100">
                        Select a file to mention
                    </div>
                    {filteredFiles.map((file, index) => (
                        <button
                            key={file.fileId}
                            type="button"
                            onClick={() => selectFile(file)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-orange-50 transition-colors ${index === dropdownIndex ? "bg-orange-50" : ""}`}
                        >
                            <svg className="w-4 h-4 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-800 truncate">{file.fileName}</p>
                                <p className="text-xs text-gray-500">{file.pageCount} pages</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* No files message */}
            {showDropdown && filteredFiles.length === 0 && (
                <div
                    ref={dropdownRef}
                    className="absolute bottom-full left-0 mb-1 w-full bg-white rounded-lg shadow-lg border-2 border-orange-200 z-50 p-3"
                >
                    <p className="text-sm text-gray-500 text-center">
                        {availableFiles.length === 0 ? "No files uploaded yet" : `No files matching "${mentionFilter}"`}
                    </p>
                </div>
            )}
        </div>
    );
};

export default MentionInput;

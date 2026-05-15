import React, { useMemo, useState } from "react";
import { Search, Check, X } from "lucide-react";

export interface LanguageOption {
  code: string;
  name: string;
  native?: string;
}

interface LanguagePickerProps {
  options: LanguageOption[];
  value: string;
  onChange: (code: string) => void;
  storageKey?: string;
  excludeCodes?: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const MAX_RECENTS = 3;

const readRecents = (key: string): string[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
};

const writeRecents = (key: string, codes: string[]): void => {
  try {
    localStorage.setItem(key, JSON.stringify(codes.slice(0, MAX_RECENTS)));
  } catch {
    // ignore
  }
};

const LanguagePicker: React.FC<LanguagePickerProps> = ({
  options,
  value,
  onChange,
  storageKey,
  excludeCodes = [],
  placeholder = "Search languages…",
  disabled = false,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState<string[]>(() =>
    storageKey ? readRecents(storageKey) : []
  );

  const visibleOptions = useMemo(
    () => options.filter((opt) => !excludeCodes.includes(opt.code)),
    [options, excludeCodes]
  );

  const selectedLabel = useMemo(() => {
    const match = visibleOptions.find((opt) => opt.code === value);
    return match ? match.name : value;
  }, [visibleOptions, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visibleOptions;
    return visibleOptions.filter(
      (opt) =>
        opt.name.toLowerCase().includes(q)
        || opt.code.toLowerCase().includes(q)
        || (opt.native ?? "").toLowerCase().includes(q)
    );
  }, [visibleOptions, query]);

  const recentOptions = useMemo(
    () => recents
      .map((code) => visibleOptions.find((o) => o.code === code))
      .filter((o): o is LanguageOption => Boolean(o)),
    [recents, visibleOptions]
  );

  const handleToggle = () => {
    setIsOpen((prev) => {
      if (prev) setQuery("");
      return !prev;
    });
  };

  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
    if (storageKey) {
      const next = [code, ...recents.filter((c) => c !== code)].slice(0, MAX_RECENTS);
      setRecents(next);
      writeRecents(storageKey, next);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="truncate text-gray-800">{selectedLabel}</span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-64 max-w-[90vw] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-sm outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {recentOptions.length > 0 && !query && (
              <>
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Recent
                </div>
                {recentOptions.map((opt) => (
                  <button
                    key={`recent-${opt.code}`}
                    onClick={() => handleSelect(opt.code)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-sm hover:bg-orange-50"
                  >
                    <span className="font-medium text-gray-700">{opt.name}</span>
                    <div className="flex items-center gap-2">
                      {opt.native && <span className="text-xs text-gray-400">{opt.native}</span>}
                      {opt.code === value && <Check className="w-3.5 h-3.5 text-orange-500" />}
                    </div>
                  </button>
                ))}
                <div className="my-1 border-t border-gray-100" />
              </>
            )}

            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-gray-400">No matches</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.code}
                  onClick={() => handleSelect(opt.code)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-sm hover:bg-orange-50"
                >
                  <span className="font-medium text-gray-700">{opt.name}</span>
                  <div className="flex items-center gap-2">
                    {opt.native && <span className="text-xs text-gray-400">{opt.native}</span>}
                    {opt.code === value && <Check className="w-3.5 h-3.5 text-orange-500" />}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguagePicker;

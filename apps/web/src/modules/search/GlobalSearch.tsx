import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Building2, DoorOpen, Users, LifeBuoy, FileText } from 'lucide-react';
import { useSearch } from './api/search.queries';
import type { SearchResultItem } from './api/search.api';

const CATEGORY_CONFIG: Record<
  SearchResultItem['type'],
  { label: string; icon: typeof Building2 }
> = {
  property: { label: 'Nemovitosti', icon: Building2 },
  unit: { label: 'Jednotky', icon: DoorOpen },
  resident: { label: 'Obyvatele', icon: Users },
  ticket: { label: 'Helpdesk', icon: LifeBuoy },
  document: { label: 'Dokumenty', icon: FileText },
};

const CATEGORY_ORDER: SearchResultItem['type'][] = [
  'property',
  'unit',
  'resident',
  'ticket',
  'document',
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data, isLoading } = useSearch(query);

  // Group results by type
  const grouped = data?.results.reduce<
    Record<string, SearchResultItem[]>
  >((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {}) ?? {};

  // Flat list for keyboard navigation
  const allResults: SearchResultItem[] = [];
  for (const type of CATEGORY_ORDER) {
    const items = grouped[type];
    if (items?.length) allResults.push(...items);
  }

  const handleOpen = useCallback(() => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery('');
    setSelectedIdx(-1);
  }, []);

  const handleSelect = useCallback((item: SearchResultItem) => {
    navigate(item.url);
    setOpen(false);
    setQuery('');
    setSelectedIdx(-1);
  }, [navigate]);

  // Reset selectedIdx on query change
  useEffect(() => {
    setSelectedIdx(-1);
  }, [query]);

  // Ctrl+K shortcut + keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (open) {
          handleClose();
        } else {
          handleOpen();
        }
      }
      if (e.key === 'Escape' && open) {
        handleClose();
      }
      if (!open) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, allResults.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, -1));
      }
      if (e.key === 'Enter' && selectedIdx >= 0) {
        e.preventDefault();
        const item = allResults[selectedIdx];
        if (item) handleSelect(item);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, handleOpen, handleClose, handleSelect, allResults, selectedIdx]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, handleClose]);

  // Track global index across categories for keyboard highlight
  let globalIndex = 0;

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-500 shadow-sm hover:bg-gray-50 transition-colors"
      >
        <Search className="h-4 w-4" />
        <span>Hledat...</span>
        <kbd className="ml-2 hidden rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-400 sm:inline-block">
          Ctrl+K
        </kbd>
      </button>

      {/* Overlay + Dropdown */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Search container */}
          <div
            ref={containerRef}
            className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden"
          >
            {/* Input */}
            <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
              <Search className="h-5 w-5 text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                data-testid="global-search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Hledat nemovitosti, obyvatele, požadavky..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-500 hover:bg-gray-200"
              >
                Esc
              </button>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto" data-testid="global-search-results">
              {isLoading && query.trim().length >= 2 && (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  Hledani...
                </div>
              )}

              {!isLoading &&
                query.trim().length >= 2 &&
                data?.total === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-gray-500">
                    Žádné výsledky pro &quot;{query}&quot;
                  </div>
                )}

              {!isLoading &&
                query.trim().length < 2 && (
                  <div className="px-4 py-6 text-center text-sm text-gray-400">
                    Zadejte alespon 2 znaky
                  </div>
                )}

              {CATEGORY_ORDER.map((type) => {
                const items = grouped[type];
                if (!items?.length) return null;
                const config = CATEGORY_CONFIG[type];
                const Icon = config.icon;

                return (
                  <div key={type}>
                    <div className="sticky top-0 bg-gray-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" />
                        {config.label}
                      </div>
                    </div>
                    {items.map((item) => {
                      const idx = globalIndex++;
                      const isSelected = idx === selectedIdx;
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelect(item)}
                          className="flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer"
                          style={{
                            background: isSelected ? '#eff6ff' : 'transparent',
                            outline: isSelected ? '2px solid #6366f1' : 'none',
                            outlineOffset: '-2px',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = '#f9fafb';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-gray-900">
                              {item.title}
                            </div>
                            {item.subtitle && (
                              <div className="truncate text-xs text-gray-500">
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { Filter, SortDesc, X, Check, ChevronDown } from 'lucide-react';
import { cn } from '../../utils';

export interface FilterOption {
  label: string;
  value: string;
  options?: { label: string; value: string }[];
}

export interface SortOption {
  label: string;
  value: string;
  direction?: 'asc' | 'desc';
}

export interface FilterPanelProps {
  /** Opzioni di filtro disponibili */
  filterOptions?: FilterOption[];
  /** Callback chiamato quando i filtri vengono applicati */
  onFilterChange?: (filters: Record<string, string>) => void;
  /** Opzioni di ordinamento disponibili */
  sortOptions?: SortOption[];
  /** Callback chiamato quando l'ordinamento cambia */
  onSortChange?: (sort: { field: string, direction: 'asc' | 'desc' }) => void;
  /** Classi personalizzate aggiuntive */
  className?: string;
  /** Filtri attivi */
  activeFilters?: Record<string, string>;
  /** Ordinamento attivo */
  activeSort?: { field: string, direction: 'asc' | 'desc' };
  /** Tema colore: 'blue' (ElementSicurezza), 'teal' (ElementMedica), 'violet' (Management) */
  theme?: 'blue' | 'teal' | 'violet';
}

const THEME = {
  blue: {
    activeBtn: 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600',
    outlineBtn: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600',
    activeRow: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    applyBtn: 'bg-blue-600 text-white hover:bg-blue-700',
    resetLink: 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300',
  },
  teal: {
    activeBtn: 'bg-teal-600 text-white hover:bg-teal-700 border-teal-600',
    outlineBtn: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600',
    activeRow: 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
    applyBtn: 'bg-teal-600 text-white hover:bg-teal-700',
    resetLink: 'text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300',
  },
  violet: {
    activeBtn: 'bg-violet-600 text-white hover:bg-violet-700 border-violet-600',
    outlineBtn: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600',
    activeRow: 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
    applyBtn: 'bg-violet-600 text-white hover:bg-violet-700',
    resetLink: 'text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300',
  },
};

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filterOptions = [],
  onFilterChange,
  sortOptions = [],
  onSortChange,
  className = '',
  activeFilters = {},
  activeSort,
  theme = 'blue',
}) => {
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [showSortPopup, setShowSortPopup] = useState(false);
  const [tempFilters, setTempFilters] = useState<Record<string, string>>(activeFilters);

  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Chiudi popup quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterPopup(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setShowSortPopup(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync tempFilters con activeFilters quando cambiano dall'esterno
  useEffect(() => {
    setTempFilters(activeFilters);
  }, [activeFilters]);

  const tc = THEME[theme];
  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;

  const handleFilterChange = (field: string, value: string) => {
    setTempFilters(prev => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    if (onFilterChange) onFilterChange(tempFilters);
    setShowFilterPopup(false);
  };

  const resetFilters = () => {
    const emptyFilters = filterOptions.reduce((acc, option) => {
      acc[option.value] = '';
      return acc;
    }, {} as Record<string, string>);
    setTempFilters(emptyFilters);
    if (onFilterChange) onFilterChange(emptyFilters);
  };

  const handleSortChange = (field: string) => {
    if (!onSortChange) return;
    const direction: 'asc' | 'desc' =
      activeSort?.field === field && activeSort.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ field, direction });
    setShowSortPopup(false);
  };

  const hasFilterFunctionality = filterOptions.length > 0 && onFilterChange;
  const hasSortFunctionality = sortOptions.length > 0 && onSortChange;

  return (
    <div className={cn('flex items-center gap-2', className)}>

      {/* ── Filtri button ── */}
      <div className="relative" ref={filterRef}>
        <button
          type="button"
          onClick={() => {
            setShowFilterPopup(v => !v);
            setShowSortPopup(false);
          }}
          className={cn(
            'inline-flex items-center gap-2 h-9 px-3.5 text-sm font-medium rounded-xl border transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-offset-1',
            activeFilterCount > 0 ? tc.activeBtn : tc.outlineBtn
          )}
        >
          <Filter className="h-4 w-4 flex-shrink-0" />
          <span>Filtri</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[11px] font-bold text-white leading-none bg-red-500">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className={cn('h-3.5 w-3.5 ml-0.5 transition-transform duration-150', showFilterPopup && 'rotate-180')} />
        </button>

        {/* Filter popup */}
        {showFilterPopup && hasFilterFunctionality && (
          <div className="absolute left-0 top-full mt-2 w-80 rounded-xl shadow-xl dark:shadow-black/40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-[600]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Filtri di ricerca</span>
              </div>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className={cn('flex items-center gap-1 text-xs font-medium transition-colors', tc.resetLink)}
                  >
                    <X className="h-3 w-3" />
                    Reimposta
                  </button>
                )}
                <button
                  onClick={() => setShowFilterPopup(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Filter options */}
            <div className="p-4 space-y-4">
              {filterOptions.map((filter) => (
                <div key={filter.value}>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    {filter.label}
                  </label>
                  {filter.options ? (
                    <div className="relative">
                      <select
                        value={tempFilters[filter.value] || ''}
                        onChange={(e) => handleFilterChange(filter.value, e.target.value)}
                        className="w-full pl-3 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 appearance-none focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500/30 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                      >
                        <option value="">Tutti</option>
                        {filter.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={tempFilters[filter.value] || ''}
                      onChange={(e) => handleFilterChange(filter.value, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500/30 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                      placeholder={`Cerca per ${filter.label.toLowerCase()}...`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setShowFilterPopup(false)}
                className="h-8 px-3.5 text-sm font-medium rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={applyFilters}
                className={cn('inline-flex items-center gap-1.5 h-8 px-3.5 text-sm font-medium rounded-xl transition-colors', tc.applyBtn)}
              >
                <Check className="h-3.5 w-3.5" />
                Applica
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Ordina button ── */}
      {hasSortFunctionality && (
        <div className="relative" ref={sortRef}>
          <button
            type="button"
            onClick={() => {
              setShowSortPopup(v => !v);
              setShowFilterPopup(false);
            }}
            className={cn(
              'inline-flex items-center gap-2 h-9 px-3.5 text-sm font-medium rounded-xl border transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-offset-1',
              activeSort ? tc.activeBtn : tc.outlineBtn
            )}
          >
            <SortDesc className="h-4 w-4 flex-shrink-0" />
            <span>Ordina</span>
            {activeSort && (
              <span className="text-[11px] opacity-80">
                {activeSort.direction === 'asc' ? '↑' : '↓'}
              </span>
            )}
            <ChevronDown className={cn('h-3.5 w-3.5 ml-0.5 transition-transform duration-150', showSortPopup && 'rotate-180')} />
          </button>

          {showSortPopup && (
            <div className="absolute left-0 top-full mt-2 w-56 rounded-xl shadow-xl dark:shadow-black/40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-[600]">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <SortDesc className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Ordina per</span>
              </div>
              <div className="p-2">
                {sortOptions.map((option) => {
                  const isActive = activeSort?.field === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleSortChange(option.value)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                        isActive
                          ? tc.activeRow
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                      )}
                    >
                      <span>{option.label}</span>
                      {isActive && (
                        <span className="text-xs font-semibold">
                          {activeSort?.direction === 'asc' ? '↑ Crescente' : '↓ Decrescente'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterPanel;

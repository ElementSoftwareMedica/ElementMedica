import React, { useState } from 'react';
import { Filter, SortDesc } from 'lucide-react';
import { Button } from '../../atoms/Button';
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
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filterOptions = [],
  onFilterChange,
  sortOptions = [],
  onSortChange,
  className = '',
  activeFilters = {},
  activeSort,
}) => {
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [showSortPopup, setShowSortPopup] = useState(false);
  const [tempFilters, setTempFilters] = useState<Record<string, string>>(activeFilters);
  
  // Conta i filtri attivi
  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;
  
  // Gestisce il cambio di un filtro
  const handleFilterChange = (field: string, value: string) => {
    setTempFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };
  
  // Applica i filtri
  const applyFilters = () => {
    if (onFilterChange) {
      onFilterChange(tempFilters);
    }
    setShowFilterPopup(false);
  };
  
  // Resetta i filtri
  const resetFilters = () => {
    const emptyFilters = filterOptions.reduce((acc, option) => {
      acc[option.value] = '';
      return acc;
    }, {} as Record<string, string>);
    
    setTempFilters(emptyFilters);
    if (onFilterChange) {
      onFilterChange(emptyFilters);
    }
  };
  
  // Gestisce il cambio di ordinamento
  const handleSortChange = (field: string) => {
    if (!onSortChange) return;
    
    let direction: 'asc' | 'desc' = 'asc';
    
    // Se il campo è già selezionato, inverti la direzione
    if (activeSort && activeSort.field === field) {
      direction = activeSort.direction === 'asc' ? 'desc' : 'asc';
    }
    
    onSortChange({ field, direction });
    setShowSortPopup(false);
  };
  
  // Determina se un filtro è attivo
  const isFilterActive = (field: string, value: string) => {
    return activeFilters[field] === value;
  };
  
  // Determina se un ordinamento è attivo
  const isSortActive = (field: string) => {
    return activeSort?.field === field;
  };
  
  // Per garantire che i filtri funzionino anche senza opzioni
  const hasFilterFunctionality = filterOptions.length > 0 && onFilterChange;
  const hasSortFunctionality = sortOptions.length > 0 && onSortChange;
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Pulsante di filtro - sempre mostrato */}
      <div className="relative">
        <Button
          variant={activeFilterCount > 0 ? 'primary' : 'outline'}
          leftIcon={<Filter className="h-4 w-4" />}
          onClick={() => {
            setShowFilterPopup(!showFilterPopup);
            setShowSortPopup(false);
          }}
          className="relative h-10"
        >
          Filtri
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
        
        {/* Popup di filtro - mostrato solo se ci sono opzioni di filtro */}
        {showFilterPopup && hasFilterFunctionality && (
          <div className="absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Filtri</h3>
                <button 
                  onClick={resetFilters}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Reimposta
                </button>
              </div>
              
              <div className="space-y-3">
                {filterOptions.map((filter) => (
                  <div key={filter.value} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {filter.label}
                    </label>
                    
                    {filter.options ? (
                      <select
                        value={tempFilters[filter.value] || ''}
                        onChange={(e) => handleFilterChange(filter.value, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Tutti</option>
                        {filter.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={tempFilters[filter.value] || ''}
                        onChange={(e) => handleFilterChange(filter.value, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`Cerca per ${filter.label.toLowerCase()}`}
                      />
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowFilterPopup(false)}
                  size="sm"
                >
                  Annulla
                </Button>
                <Button
                  variant="primary"
                  onClick={applyFilters}
                  size="sm"
                >
                  Applica
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Pulsante di ordinamento - sempre mostrato */}
      <div className="relative">
        <Button
          variant={activeSort ? 'primary' : 'outline'}
          leftIcon={<SortDesc className="h-4 w-4" />}
          onClick={() => {
            setShowSortPopup(!showSortPopup);
            setShowFilterPopup(false);
          }}
          className="h-10"
        >
          Ordina
        </Button>
        
        {/* Popup di ordinamento - mostrato solo se ci sono opzioni di ordinamento */}
        {showSortPopup && hasSortFunctionality && (
          <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
            <div className="p-2">
              <div className="space-y-1">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSortChange(option.value)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                      isSortActive(option.value)
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option.label}</span>
                      {isSortActive(option.value) && (
                        <span className="text-xs">
                          {activeSort?.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterPanel;
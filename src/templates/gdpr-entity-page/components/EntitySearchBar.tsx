import React from 'react';
import { Button } from '../../../design-system/atoms/Button';
import { Badge } from '../../../design-system/atoms/Badge';
import { Search, Filter, X, ChevronDown } from 'lucide-react';

/**
 * Componente per la barra di ricerca e filtri avanzati
 * Gestisce ricerca testuale e filtri multipli
 */
export interface FilterOption {
  key: string;
  label: string;
  options: Array<{ label: string; value: string }>;
}

export interface EntitySearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilters: Record<string, string>;
  onFilterChange: (filters: Record<string, string>) => void;
  filterOptions: FilterOption[];
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  placeholder?: string;
}

export const EntitySearchBar: React.FC<EntitySearchBarProps> = ({
  searchQuery,
  onSearchChange,
  activeFilters,
  onFilterChange,
  filterOptions,
  onClearFilters,
  hasActiveFilters,
  placeholder = "Cerca..."
}) => {
  // Gestione cambio filtro
  const handleFilterChange = (filterKey: string, value: string) => {
    onFilterChange({
      ...activeFilters,
      [filterKey]: value
    });
  };

  // Conta filtri attivi
  const activeFilterCount = Object.values(activeFilters).filter(value => value !== '').length;

  return (
    <div className="space-y-4">
      {/* Barra di ricerca principale */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filtri avanzati */}
      {filterOptions.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Filter className="h-4 w-4" />
            <span>Filtri:</span>
          </div>

          {filterOptions.map((filter) => (
            <div key={filter.key} className="relative">
              <select
                value={activeFilters[filter.key] || ''}
                onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded px-3 py-1 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">{filter.label}</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
            </div>
          ))}

          {/* Badge contatore filtri attivi */}
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount} filtri attivi
            </Badge>
          )}

          {/* Pulsante pulisci filtri */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Pulisci tutto
            </Button>
          )}
        </div>
      )}

      {/* Indicatori filtri attivi */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1">
          {Object.entries(activeFilters)
            .filter(([_, value]) => value !== '')
            .map(([key, value]) => {
              const filter = filterOptions.find(f => f.key === key);
              const option = filter?.options.find(o => o.value === value);
              
              return (
                <Badge
                  key={key}
                  variant="outline"
                  className="text-xs flex items-center gap-1"
                >
                  <span>{filter?.label}: {option?.label || value}</span>
                  <button
                    onClick={() => handleFilterChange(key, '')}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
        </div>
      )}
    </div>
  );
};
import React from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '../../../design-system/atoms/Button';
import { cn } from '../../../design-system/utils';

interface FilterConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number' | 'boolean';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface FilterPanelProps {
  filters: FilterConfig[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  className?: string;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  values,
  onChange,
  className
}) => {
  const handleFilterChange = (key: string, value: any) => {
    onChange({
      ...values,
      [key]: value
    });
  };

  const handleClearFilter = (key: string) => {
    const newValues = { ...values };
    delete newValues[key];
    onChange(newValues);
  };

  const handleClearAll = () => {
    onChange({});
  };

  const hasActiveFilters = Object.keys(values).length > 0;

  const renderFilterInput = (filter: FilterConfig) => {
    const value = values[filter.key] || '';

    switch (filter.type) {
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">{filter.placeholder || `Seleziona ${filter.label.toLowerCase()}`}</option>
            {filter.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            placeholder={filter.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        );

      case 'boolean':
        return (
          <select
            value={value}
            onChange={(e) => handleFilterChange(filter.key, e.target.value === 'true')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">{filter.placeholder || `Seleziona ${filter.label.toLowerCase()}`}</option>
            <option value="true">Sì</option>
            <option value="false">No</option>
          </select>
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            placeholder={filter.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        );
    }
  };

  return (
    <div className={cn('bg-gray-50 border border-gray-200 rounded-lg p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filtri</span>
        </div>
        
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="text-xs"
          >
            Cancella tutti
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filters.map(filter => (
          <div key={filter.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                {filter.label}
              </label>
              {values[filter.key] && (
                <button
                  onClick={() => handleClearFilter(filter.key)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            {renderFilterInput(filter)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FilterPanel;
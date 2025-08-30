import React from 'react';
import { Search, Filter as FilterIcon } from 'lucide-react';
import { cn } from '../../../design-system/utils';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../design-system/atoms/Button';

interface TableFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterActive: boolean;
  onToggleFilter: () => void;
  filterContent?: React.ReactNode;
  className?: string;
  filterButtonText?: string;
  sortBy?: string;
  onSortChange?: (value: string) => void;
  sortOptions?: { value: string; label: string }[];
}

/**
 * A reusable component for filtering table data with search, custom filters, and sorting
 */
const TableFilter: React.FC<TableFilterProps> = ({
  searchTerm,
  onSearchChange,
  filterActive,
  onToggleFilter,
  filterContent,
  className = '',
  filterButtonText,
  sortBy,
  onSortChange,
  sortOptions = []
}) => {
  const { t } = useTranslation();
  
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-1 items-center gap-2 bg-white rounded-xl border border-gray-200 px-4 py-2 shadow-sm">
        <Search className="h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder={t('common.search')}
          className="flex-1 border-0 focus:ring-0 text-gray-700 bg-transparent placeholder-gray-400"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        
        {filterContent && (
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<FilterIcon className="h-4 w-4" />}
            className={cn(
              filterActive ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-300 text-gray-700'
            )}
            onClick={onToggleFilter}
          >
            {filterButtonText || t('filters.filterBy')}
          </Button>
        )}
        
        {sortOptions.length > 0 && onSortChange && (
          <select
            className="ml-2 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-700"
            value={sortBy || ''}
            onChange={(e) => onSortChange(e.target.value)}
          >
            <option value="">{t('common.sortBy')}</option>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </div>
      
      {filterActive && filterContent && (
        <div className="bg-white p-4 rounded-xl shadow border border-gray-200">
          {filterContent}
        </div>
      )}
    </div>
  );
};

export default TableFilter;
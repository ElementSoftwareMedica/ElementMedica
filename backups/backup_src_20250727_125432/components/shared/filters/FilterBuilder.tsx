import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Filter } from 'lucide-react';
import { Button } from '../../../design-system/atoms/Button';

export type FilterOperator = 
  | 'eq' // equals
  | 'neq' // not equals
  | 'gt' // greater than
  | 'gte' // greater than or equal
  | 'lt' // less than
  | 'lte' // less than or equal
  | 'contains' // string contains
  | 'startsWith' // string starts with
  | 'endsWith' // string ends with
  | 'isEmpty' // is null or empty string
  | 'isNotEmpty'; // is not null and not empty string

export interface FilterField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'select';
  options?: { value: string; label: string }[]; // For 'select' type
}

export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string | number | boolean | null;
}

export interface FilterBuilderProps {
  fields: FilterField[];
  onFilterChange: (filters: FilterCondition[]) => void;
  className?: string;
  initialFilters?: FilterCondition[];
  showApplyButton?: boolean;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

const FilterBuilder: React.FC<FilterBuilderProps> = ({
  fields,
  onFilterChange,
  className = '',
  initialFilters = [],
  showApplyButton = true,
}) => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterCondition[]>(initialFilters);
  const [isOpen, setIsOpen] = useState(false);

  // Get valid operators for a field type
  const getOperatorsForType = useCallback((type: string): { value: FilterOperator; label: string }[] => {
    const commonOperators: { value: FilterOperator; label: string }[] = [
      { value: 'eq', label: t('filters.equals') },
      { value: 'neq', label: t('filters.notEquals') },
      { value: 'isEmpty', label: t('filters.isEmpty') },
      { value: 'isNotEmpty', label: t('filters.isNotEmpty') },
    ];

    switch (type) {
      case 'string':
        return [
          ...commonOperators,
          { value: 'contains', label: t('filters.contains') },
          { value: 'startsWith', label: t('filters.startsWith') },
          { value: 'endsWith', label: t('filters.endsWith') },
        ];
      case 'number':
      case 'date':
        return [
          ...commonOperators,
          { value: 'gt', label: t('filters.greaterThan') },
          { value: 'gte', label: t('filters.greaterThanOrEqual') },
          { value: 'lt', label: t('filters.lessThan') },
          { value: 'lte', label: t('filters.lessThanOrEqual') },
        ];
      case 'boolean':
        return [
          { value: 'eq', label: t('filters.equals') },
          { value: 'neq', label: t('filters.notEquals') },
        ];
      case 'select':
        return [
          { value: 'eq', label: t('filters.equals') },
          { value: 'neq', label: t('filters.notEquals') },
          { value: 'isEmpty', label: t('filters.isEmpty') },
          { value: 'isNotEmpty', label: t('filters.isNotEmpty') },
        ];
      default:
        return commonOperators;
    }
  }, [t]);

  // Get initial operator for a field type
  const getInitialOperator = (type: string): FilterOperator => {
    switch (type) {
      case 'string':
        return 'contains';
      case 'number':
      case 'date':
      case 'boolean':
      case 'select':
      default:
        return 'eq';
    }
  };

  // Add an empty filter
  const handleAddFilter = () => {
    const defaultField = fields[0];
    const newFilter: FilterCondition = {
      id: generateId(),
      field: defaultField.key,
      operator: getInitialOperator(defaultField.type),
      value: '',
    };
    setFilters([...filters, newFilter]);
  };

  // Remove a filter
  const handleRemoveFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id));
  };

  // Update a filter field
  const handleFieldChange = (id: string, fieldKey: string) => {
    const field = fields.find(f => f.key === fieldKey);
    if (!field) return;

    setFilters(filters.map(f => {
      if (f.id === id) {
        return {
          ...f,
          field: fieldKey,
          operator: getInitialOperator(field.type),
          value: field.type === 'boolean' ? false : '',
        };
      }
      return f;
    }));
  };

  // Update a filter operator
  const handleOperatorChange = (id: string, operator: FilterOperator) => {
    setFilters(filters.map(f => {
      if (f.id === id) {
        const needsValue = !['isEmpty', 'isNotEmpty'].includes(operator);
        return {
          ...f,
          operator,
          value: needsValue ? f.value : null,
        };
      }
      return f;
    }));
  };

  // Update a filter value
  const handleValueChange = (id: string, value: string | number | boolean) => {
    setFilters(filters.map(f => {
      if (f.id === id) {
        return { ...f, value };
      }
      return f;
    }));
  };

  // Apply filters
  const handleApplyFilters = () => {
    onFilterChange(filters);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilters([]);
    onFilterChange([]);
  };

  // Determine if the apply button should be enabled
  const isApplyEnabled = useMemo(() => {
    return filters.every(f => {
      if (['isEmpty', 'isNotEmpty'].includes(f.operator)) {
        return true;
      }
      
      if (typeof f.value === 'boolean') {
        return true;
      }
      
      return f.value !== null && f.value !== '';
    });
  }, [filters]);

  // Render value input based on field type
  const renderValueInput = (filter: FilterCondition) => {
    const field = fields.find(f => f.key === filter.field);
    if (!field) return null;

    // No value needed for isEmpty/isNotEmpty
    if (['isEmpty', 'isNotEmpty'].includes(filter.operator)) {
      return null;
    }

    switch (field.type) {
      case 'string':
        return (
          <input
            type="text"
            className="border rounded px-2 py-1 w-full"
            value={filter.value as string || ''}
            onChange={e => handleValueChange(filter.id, e.target.value)}
            placeholder={t('filters.value')}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            className="border rounded px-2 py-1 w-full"
            value={filter.value as number || ''}
            onChange={e => handleValueChange(filter.id, Number(e.target.value))}
            placeholder={t('filters.value')}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            className="border rounded px-2 py-1 w-full"
            value={filter.value as string || ''}
            onChange={e => handleValueChange(filter.id, e.target.value)}
          />
        );
      case 'boolean':
        return (
          <select
            className="border rounded px-2 py-1 w-full"
            value={String(filter.value)}
            onChange={e => handleValueChange(filter.id, e.target.value === 'true')}
          >
            <option value="true">{t('common.yes')}</option>
            <option value="false">{t('common.no')}</option>
          </select>
        );
      case 'select':
        return (
          <select
            className="border rounded px-2 py-1 w-full"
            value={filter.value as string || ''}
            onChange={e => handleValueChange(filter.id, e.target.value)}
          >
            <option value="">{t('filters.selectValue')}</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`filter-builder ${className}`}>
      <div className="flex items-center mb-4">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Filter size={18} />}
          onClick={() => setIsOpen(!isOpen)}
        >
          {t('filters.filterBy')}
          {filters.length > 0 && (
            <span className="ml-2 text-gray-500">({filters.length})</span>
          )}
        </Button>
        
        {filters.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="ml-4 text-gray-500"
          >
            {t('filters.clear')}
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="bg-white border rounded-md p-4 mb-4 shadow-sm">
          {filters.length === 0 ? (
            <p className="text-gray-500 text-sm mb-4">{t('filters.noFilters')}</p>
          ) : (
            <div className="space-y-3 mb-4">
              {filters.map(filter => {
                const field = fields.find(f => f.key === filter.field);
                if (!field) return null;

                return (
                  <div key={filter.id} className="flex items-center gap-2 flex-wrap">
                    <select
                      className="border rounded px-2 py-1"
                      value={filter.field}
                      onChange={e => handleFieldChange(filter.id, e.target.value)}
                    >
                      {fields.map(f => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </select>

                    <select
                      className="border rounded px-2 py-1"
                      value={filter.operator}
                      onChange={e => handleOperatorChange(filter.id, e.target.value as FilterOperator)}
                    >
                      {getOperatorsForType(field.type).map(op => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>

                    {renderValueInput(filter)}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 text-gray-400 hover:text-red-500"
                      onClick={() => handleRemoveFilter(filter.id)}
                      aria-label={t('filters.removeFilter')}
                      leftIcon={<X size={16} />}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Plus size={16} />}
              onClick={handleAddFilter}
              className="text-blue-600 hover:text-blue-800"
            >
              {t('filters.addFilter')}
            </Button>

            {showApplyButton && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleApplyFilters}
                disabled={!isApplyEnabled}
              >
                {t('filters.apply')}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBuilder;
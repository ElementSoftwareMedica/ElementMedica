/**
 * GDPR Entity Filters - Componente filtri avanzati
 * 
 * Componente per gestire filtri avanzati delle entità:
 * - Filtri per campo
 * - Filtri per data
 * - Filtri per stato
 * - Filtri GDPR
 * - Reset filtri
 * 
 * @version 1.0
 * @date 30 Dicembre 2024
 */

import React, { useState } from 'react';
import { Button, Input, Select, Badge } from '../../../design-system';
import { Card } from '../../../design-system';
import { 
  X, 
  Filter, 
  Search,
  RotateCcw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { FilterConfig, EntityField } from '../types';

/**
 * Tipo per valore filtro
 */
export type FilterValue = string | number | boolean | Date | null | undefined;

/**
 * Tipo per tipo di filtro supportato
 */
export type FilterType = 'text' | 'number' | 'boolean' | 'date' | 'select';

/**
 * Interfaccia per filtro attivo
 */
export interface ActiveFilter {
  key: string;
  label: string;
  value: FilterValue;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'gte' | 'lte' | 'between';
  type: FilterType;
}

/**
 * Props del componente GDPREntityFilters
 */
export interface GDPREntityFiltersProps {
  /** Configurazione filtri disponibili */
  filterConfig: FilterConfig[];
  
  /** Campi entità per filtri dinamici */
  fields: EntityField[];
  
  /** Filtri attivi */
  activeFilters: ActiveFilter[];
  
  /** Callback per aggiornamento filtri */
  onFiltersChange: (filters: ActiveFilter[]) => void;
  
  /** Callback per reset filtri */
  onResetFilters: () => void;
  
  /** Mostra filtri compatti */
  compact?: boolean;
  
  /** Mostra contatore filtri */
  showCount?: boolean;
  
  /** Classi CSS personalizzate */
  className?: string;
}

/**
 * Componente per gestire i filtri avanzati
 */
export function GDPREntityFilters({
  filterConfig,
  fields,
  activeFilters,
  onFiltersChange,
  onResetFilters,
  compact = false,
  showCount = true,
  className
}: GDPREntityFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [selectedField, setSelectedField] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');
  const [filterOperator, setFilterOperator] = useState<string>('contains');
  
  // Operatori disponibili per tipo
  const operatorsByType = {
    text: [
      { value: 'contains', label: 'Contiene' },
      { value: 'equals', label: 'Uguale a' },
      { value: 'startsWith', label: 'Inizia con' },
      { value: 'endsWith', label: 'Finisce con' }
    ],
    number: [
      { value: 'equals', label: 'Uguale a' },
      { value: 'gt', label: 'Maggiore di' },
      { value: 'lt', label: 'Minore di' },
      { value: 'gte', label: 'Maggiore o uguale' },
      { value: 'lte', label: 'Minore o uguale' }
    ],
    date: [
      { value: 'equals', label: 'Uguale a' },
      { value: 'gt', label: 'Dopo' },
      { value: 'lt', label: 'Prima' },
      { value: 'gte', label: 'Da' },
      { value: 'lte', label: 'Fino a' }
    ],
    boolean: [
      { value: 'equals', label: 'Uguale a' }
    ],
    select: [
      { value: 'equals', label: 'Uguale a' }
    ]
  };
  
  // Aggiungi nuovo filtro
  const handleAddFilter = () => {
    if (!selectedField || !filterValue) return;
    
    const field = fields.find(f => f.key === selectedField);
    if (!field) return;
    
    // Mappa i tipi di campo ai tipi di filtro supportati
    const getFilterType = (fieldType: string | undefined): FilterType => {
      switch (fieldType) {
        case 'number':
          return 'number';
        case 'boolean':
          return 'boolean';
        case 'date':
          return 'date';
        case 'select':
          return 'select';
        case 'email':
        case 'phone':
        case 'textarea':
        case 'text':
        default:
          return 'text';
      }
    };
    
    const newFilter: ActiveFilter = {
      key: selectedField,
      label: field.label,
      value: filterValue,
      operator: filterOperator as ActiveFilter['operator'],
      type: getFilterType(field.type)
    };
    
    // Evita duplicati
    const existingIndex = activeFilters.findIndex(f => f.key === selectedField);
    if (existingIndex >= 0) {
      const updatedFilters = [...activeFilters];
      updatedFilters[existingIndex] = newFilter;
      onFiltersChange(updatedFilters);
    } else {
      onFiltersChange([...activeFilters, newFilter]);
    }
    
    // Reset form
    setSelectedField('');
    setFilterValue('');
    setFilterOperator('contains');
  };
  
  // Rimuovi filtro
  const handleRemoveFilter = (index: number) => {
    const updatedFilters = activeFilters.filter((_, i) => i !== index);
    onFiltersChange(updatedFilters);
  };
  
  // Campi filtrabili
  const filterableFields = fields.filter(field => 
    field.filterable !== false && 
    !['id', 'createdAt', 'updatedAt'].includes(field.key)
  );
  
  // Campo selezionato
  const selectedFieldConfig = filterableFields.find(f => f.key === selectedField);
  
  // Mappa il tipo di campo al tipo di filtro supportato
  const getFilterType = (fieldType: string | undefined): FilterType => {
    switch (fieldType) {
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'date':
        return 'date';
      case 'select':
        return 'select';
      case 'email':
      case 'phone':
      case 'textarea':
      case 'text':
      default:
        return 'text';
    }
  };
  
  const selectedFieldType = selectedFieldConfig ? getFilterType(selectedFieldConfig.type) : 'text';
  const availableOperators = operatorsByType[selectedFieldType] || operatorsByType.text;
  
  // Renderizza valore filtro
  const renderFilterValue = (filter: ActiveFilter) => {
    if (filter.type === 'boolean') {
      return filter.value ? 'Sì' : 'No';
    }
    
    if (filter.type === 'date' && filter.value instanceof Date) {
      return filter.value.toLocaleDateString('it-IT');
    }
    
    return String(filter.value);
  };
  
  return (
    <div className={`gdpr-entity-filters ${className || ''}`}>
      {/* Header con toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="font-medium">Filtri</span>
          {showCount && activeFilters.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFilters.length}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {activeFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
          
          {compact && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>
      
      {/* Filtri attivi */}
      {activeFilters.length > 0 && (
        <div className="mb-4">
          <div className="text-sm text-muted-foreground mb-2">Filtri attivi:</div>
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter, index) => (
              <Badge
                key={`${filter.key}-${index}`}
                variant="outline"
                className="flex items-center gap-1 pr-1"
              >
                <span className="text-xs">
                  {filter.label}: {renderFilterValue(filter)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveFilter(index)}
                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* Form aggiunta filtri */}
      {isExpanded && (
        <Card className="p-4">
          <div className="space-y-4">
            <div className="text-sm font-medium">Aggiungi filtro</div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Selezione campo */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Campo
                </label>
                <select
                  value={selectedField}
                  onChange={(e) => setSelectedField(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Seleziona campo</option>
                  {filterableFields.map((field) => (
                    <option key={field.key} value={field.key}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Selezione operatore */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Operatore
                </label>
                <select
                  value={filterOperator}
                  onChange={(e) => setFilterOperator(e.target.value)}
                  disabled={!selectedField}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
                >
                  {availableOperators.map((op: { value: string; label: string }) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Input valore */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Valore
                </label>
                {selectedFieldConfig?.type === 'boolean' ? (
                  <select
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Seleziona valore</option>
                    <option value="true">Sì</option>
                    <option value="false">No</option>
                  </select>
                ) : selectedFieldConfig?.type === 'date' ? (
                  <Input
                    type="date"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    placeholder="Seleziona data"
                  />
                ) : selectedFieldConfig?.type === 'number' ? (
                  <Input
                    type="number"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    placeholder="Inserisci numero"
                  />
                ) : selectedFieldConfig?.options ? (
                  <select
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Seleziona opzione</option>
                    {selectedFieldConfig.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type="text"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    placeholder="Inserisci valore"
                  />
                )}
              </div>
              
              {/* Pulsante aggiungi */}
              <div className="flex items-end">
                <Button
                  onClick={handleAddFilter}
                  disabled={!selectedField || !filterValue}
                  className="w-full"
                >
                  <Search className="h-4 w-4 mr-1" />
                  Aggiungi
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
      
      {/* Filtri predefiniti */}
      {filterConfig.length > 0 && isExpanded && (
        <div className="mt-4">
          <div className="text-sm font-medium mb-2">Filtri rapidi</div>
          <div className="flex flex-wrap gap-2">
            {filterConfig.map((config) => (
              <Button
                key={config.key}
                variant="outline"
                size="sm"
                onClick={() => {
                  const newFilter: ActiveFilter = {
                    key: config.key,
                    label: config.label,
                    value: config.defaultValue,
                    operator: 'equals',
                    type: config.type === 'dateRange' ? 'date' : (config.type as FilterType) || 'text'
                  };
                  onFiltersChange([...activeFilters, newFilter]);
                }}
                className="text-xs"
              >
                {config.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default GDPREntityFilters;
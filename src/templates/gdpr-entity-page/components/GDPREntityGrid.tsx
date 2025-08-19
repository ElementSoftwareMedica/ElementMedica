/**
 * GDPR Entity Grid - Componente griglia per visualizzare le entità
 * 
 * Componente griglia che include:
 * - Visualizzazione dati in formato card
 * - Layout responsive
 * - Selezione card
 * - Azioni per card
 * - Supporto GDPR
 * 
 * @version 1.0
 * @date 30 Dicembre 2024
 */

import React from 'react';
import { Button, Badge, Card } from '../../../design-system';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem
} from '../../../design-system';
import { 
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Download,
  Check
} from 'lucide-react';
import { EntityField, EntityAction, BaseEntity } from '../types';

/**
 * Props del componente GDPREntityGrid
 */
export interface GDPREntityGridProps<T extends BaseEntity = BaseEntity> {
  /** Dati da visualizzare */
  data: T[];
  
  /** Configurazione campi principali */
  fields: EntityField[];
  
  /** Configurazione campi aggiuntivi */
  additionalFields?: EntityField[];
  
  /** Elementi selezionati */
  selectedItems: string[];
  
  /** Callback per selezione elementi */
  onSelectionChange: (selectedIds: string[]) => void;
  
  /** Azioni disponibili per card */
  cardActions?: EntityAction[];
  
  /** Callback per azioni card */
  onCardAction?: (actionKey: string, entity: T) => void;
  
  /** Stato di caricamento */
  loading?: boolean;
  
  /** Messaggio stato vuoto */
  emptyMessage?: string;
  
  /** Mostra checkbox selezione */
  showSelection?: boolean;
  
  /** Mostra azioni */
  showActions?: boolean;
  
  /** Numero colonne griglia */
  columns?: 1 | 2 | 3 | 4 | 6;
  
  /** Classi CSS personalizzate */
  className?: string;
}

/**
 * Componente griglia per visualizzare le entità
 */
export function GDPREntityGrid<T extends BaseEntity = BaseEntity>({
  data,
  fields,
  additionalFields = [],
  selectedItems,
  onSelectionChange,
  cardActions,
  onCardAction,
  loading = false,
  emptyMessage = 'Nessun elemento trovato',
  showSelection = true,
  showActions = true,
  columns = 3,
  className
}: GDPREntityGridProps<T>) {
  
  // Gestione selezione
  const handleSelectItem = (id: string) => {
    if (selectedItems.includes(id)) {
      onSelectionChange(selectedItems.filter(itemId => itemId !== id));
    } else {
      onSelectionChange([...selectedItems, id]);
    }
  };
  
  // Renderizza valore campo
  const renderFieldValue = (field: EntityField, entity: T) => {
    const value = (entity as Record<string, unknown>)[field.key];
    
    if (field.formatter) {
      return field.formatter(value, entity);
    }
    
    // Formattazione di default per tipi comuni
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground">-</span>;
    }
    
    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? 'secondary' : 'outline'} className="text-xs">
          {value ? 'Sì' : 'No'}
        </Badge>
      );
    }
    
    if (value instanceof Date) {
      return <span className="text-sm">{value.toLocaleDateString('it-IT')}</span>;
    }
    
    if (typeof value === 'string' && value.includes('@')) {
      return <span className="font-mono text-xs text-muted-foreground">{value}</span>;
    }
    
    if (typeof value === 'string' && value.length > 50) {
      return (
        <span className="text-sm" title={value}>
          {value.substring(0, 50)}...
        </span>
      );
    }
    
    return <span className="text-sm">{String(value)}</span>;
  };
  
  // Classi CSS per il grid
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6'
  };
  
  if (loading) {
    return (
      <div className={`gdpr-entity-grid ${className || ''}`}>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento dati...</p>
        </div>
      </div>
    );
  }
  
  if (data.length === 0) {
    return (
      <div className={`gdpr-entity-grid ${className || ''}`}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`gdpr-entity-grid ${className || ''}`}>
      <div className={`grid gap-4 ${gridClasses[columns]}`}>
        {data.map((entity) => {
          const isSelected = selectedItems.includes(entity.id);
          
          return (
            <Card
              key={entity.id}
              className={`relative transition-all duration-200 hover:shadow-md ${
                isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
              }`}
            >
              {/* Header card con selezione e azioni */}
              <div className="flex items-center justify-between p-4 pb-2">
                {/* Checkbox selezione */}
                {showSelection && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectItem(entity.id)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary ml-2" />
                    )}
                  </div>
                )}
                
                {/* Menu azioni */}
                {showActions && cardActions && cardActions.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {cardActions
                        .filter(action => 
                          typeof action.visible === 'function' 
                            ? action.visible(entity) 
                            : action.visible !== false
                        )
                        .map((action) => (
                          <DropdownMenuItem
                            key={action.key}
                            onClick={() => onCardAction?.(action.key, entity)}
                            disabled={
                              typeof action.disabled === 'function' 
                                ? action.disabled(entity) 
                                : action.disabled
                            }
                            className="flex items-center gap-2"
                          >
                            {action.icon && <span>{action.icon}</span>}
                            {action.label}
                          </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              
              {/* Contenuto principale */}
              <div className="px-4 pb-4 space-y-3">
                {/* Campi principali */}
                {fields.slice(0, 3).map((field) => {
                  const value = (entity as Record<string, unknown>)[field.key];
                  if (value === null || value === undefined || value === '') return null;
                  
                  return (
                    <div key={field.key} className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {field.label}
                      </div>
                      <div className="font-medium">
                        {renderFieldValue(field, entity)}
                      </div>
                    </div>
                  );
                })}
                
                {/* Campi aggiuntivi (compatti) */}
                {additionalFields.length > 0 && (
                  <div className="pt-2 border-t space-y-2">
                    {additionalFields.slice(0, 4).map((field) => {
                      const value = (entity as Record<string, unknown>)[field.key];
                      if (value === null || value === undefined || value === '') return null;
                      
                      return (
                        <div key={field.key} className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">
                            {field.label}:
                          </span>
                          <div className="text-xs">
                            {renderFieldValue(field, entity)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Badge di stato (se presente) */}
                {(entity as Record<string, unknown>).status && (
                  <div className="pt-2">
                    <Badge 
                      variant={
                        (entity as Record<string, unknown>).status === 'active' ? 'secondary' : 'outline'
                      }
                      className="text-xs"
                    >
                      {String((entity as Record<string, unknown>).status)}
                    </Badge>
                  </div>
                )}
              </div>
              
              {/* Footer con azioni rapide */}
              {showActions && cardActions && cardActions.length > 0 && (
                <div className="px-4 py-3 bg-muted/25 border-t flex justify-end gap-2">
                  {cardActions.slice(0, 3).map((action) => {
                    const isVisible = typeof action.visible === 'function' 
                      ? action.visible(entity) 
                      : action.visible !== false;
                    
                    const isDisabled = typeof action.disabled === 'function' 
                      ? action.disabled(entity) 
                      : action.disabled;
                    
                    if (!isVisible) return null;
                    
                    return (
                      <Button
                        key={action.key}
                        variant="ghost"
                        size="sm"
                        onClick={() => onCardAction?.(action.key, entity)}
                        disabled={isDisabled}
                        className="h-8 px-2 text-xs"
                        title={action.label}
                      >
                        {action.icon || <Eye className="h-3 w-3" />}
                      </Button>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default GDPREntityGrid;
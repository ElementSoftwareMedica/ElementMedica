import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../design-system/molecules/Card';
import { Badge } from '../../../design-system/atoms/Badge';
import { Button } from '../../../design-system/atoms/Button';
import { Eye, Edit, Trash2, Download } from 'lucide-react';

/**
 * Componente per il rendering delle card nella vista griglia
 * Gestisce la visualizzazione delle entità in formato card con azioni
 */
export interface CardConfig<T> {
  title: string | ((entity: T) => string);
  subtitle?: string | ((entity: T) => string);
  description?: string | ((entity: T) => string);
  badge?: {
    field: string | ((entity: T) => string);
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  icon?: React.ComponentType<{ className?: string }>;
}

export interface EntityCardProps<T> {
  entity: T;
  config: CardConfig<T>;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onView?: (entity: T) => void;
  onEdit?: (entity: T) => void;
  onDelete?: (id: string) => void;
  onExport?: (entity: T) => void;
  showActions: {
    view: boolean;
    edit: boolean;
    delete: boolean;
    export: boolean;
  };
  selectionMode: boolean;
}

export const EntityCard = <T extends Record<string, any>>({
  entity,
  config,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onExport,
  showActions,
  selectionMode
}: EntityCardProps<T>) => {
  // Helper per ottenere il valore da una configurazione
  const getValue = (value: string | ((entity: T) => string)): string => {
    return typeof value === 'function' ? value(entity) : entity[value] || '';
  };

  // Gestione click sulla card
  const handleCardClick = () => {
    if (selectionMode) {
      onSelect(entity.id);
    } else if (onView) {
      onView(entity);
    }
  };

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold">
              {getValue(config.title)}
            </CardTitle>
            {config.subtitle && (
              <p className="text-sm text-muted-foreground mt-1">
                {getValue(config.subtitle)}
              </p>
            )}
          </div>
          
          {/* Icona e badge */}
          <div className="flex items-center gap-2">
            {config.icon && (
              <config.icon className="h-5 w-5 text-muted-foreground" />
            )}
            {config.badge && (
              <Badge variant={config.badge.variant || 'default'}>
                {getValue(config.badge.field)}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Descrizione */}
        {config.description && (
          <p className="text-sm text-muted-foreground mb-4">
            {getValue(config.description)}
          </p>
        )}

        {/* Azioni */}
        <div className="flex items-center justify-between">
          {/* Checkbox per selezione */}
          {selectionMode && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect(entity.id)}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          )}

          {/* Pulsanti azioni */}
          <div className="flex gap-1 ml-auto">
            {showActions.view && onView && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onView(entity);
                }}
                title="Visualizza"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            
            {showActions.edit && onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onEdit(entity);
                }}
                title="Modifica"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            
            {showActions.delete && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onDelete(entity.id);
                }}
                title="Elimina"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            
            {showActions.export && onExport && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onExport(entity);
                }}
                title="Esporta"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
import React from 'react';
import { Button } from '../../../design-system/atoms/Button';
import { Badge } from '../../../design-system/atoms/Badge';
import { Trash2, Download, X } from 'lucide-react';

/**
 * Componente per le azioni batch (operazioni multiple)
 * Gestisce eliminazione e esportazione di entità selezionate
 */
export interface EntityBatchActionsProps {
  selectedCount: number;
  onDeleteSelected: () => void;
  onExportSelected?: () => void;
  onClearSelection: () => void;
  canDelete: boolean;
  canExport: boolean;
  entityDisplayNamePlural: string;
}

export const EntityBatchActions: React.FC<EntityBatchActionsProps> = ({
  selectedCount,
  onDeleteSelected,
  onExportSelected,
  onClearSelection,
  canDelete,
  canExport,
  entityDisplayNamePlural
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm">
            {selectedCount} {entityDisplayNamePlural.toLowerCase()} selezionati
          </Badge>
          
          <div className="flex gap-2">
            {canDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onDeleteSelected}
                className="flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" />
                Elimina selezionati
              </Button>
            )}
            
            {canExport && onExportSelected && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExportSelected}
                className="flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Esporta selezionati
              </Button>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="flex items-center gap-1"
        >
          <X className="h-4 w-4" />
          Deseleziona tutto
        </Button>
      </div>
    </div>
  );
};
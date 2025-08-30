import React from 'react';
import { Button } from '../../../design-system/atoms/Button';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '../../../design-system/molecules/Table';
import { Card, CardContent } from '../../../design-system/molecules/Card';
import { Grid, List, Eye, Edit, Trash2, Download } from 'lucide-react';
import { cn } from '../../../design-system/utils';
import { ColumnConfig } from '../hooks/useTableColumns';
import { GDPRPermissions } from '../hooks/useGDPRPermissions';

export type ViewMode = 'table' | 'grid';

export interface EntityViewProps<T> {
  entities: T[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  columns: ColumnConfig[];
  permissions: GDPRPermissions;
  selectedEntities: Set<string>;
  onEntitySelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onEntityAction: (action: string, entity: T) => void;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  className?: string;
}

/**
 * Componente per la visualizzazione delle entità GDPR
 * Supporta modalità tabella e griglia con azioni personalizzabili
 */
export function EntityView<T extends { id: string; [key: string]: any }>({
  entities,
  viewMode,
  onViewModeChange,
  columns,
  permissions,
  selectedEntities,
  onEntitySelect,
  onSelectAll,
  onClearSelection,
  onEntityAction,
  loading = false,
  error = null,
  emptyMessage = 'Nessuna entità trovata',
  className
}: EntityViewProps<T>) {

  // Rendering della modalità tabella
  const renderTableView = () => {
    return (
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            {/* Colonna di selezione */}
            {(permissions.canUpdate || permissions.canDelete) && (
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={entities.length > 0 && selectedEntities.size === entities.length}
                  onChange={() => {
                    if (selectedEntities.size === entities.length) {
                      onClearSelection();
                    } else {
                      onSelectAll();
                    }
                  }}
                  className="rounded border-gray-300"
                />
              </TableHead>
            )}
            
            {/* Colonne dati */}
            {columns.map((col) => (
              <TableHead key={col.key} style={{ width: col.width }}>
                {col.label}
              </TableHead>
            ))}
            
            {/* Colonna azioni */}
            <TableHead className="w-32">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        
        <TableBody>
          {entities.map((entity) => (
            <TableRow key={entity.id}>
              {/* Checkbox di selezione */}
              {(permissions.canUpdate || permissions.canDelete) && (
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedEntities.has(entity.id)}
                    onChange={() => onEntitySelect(entity.id)}
                    className="rounded border-gray-300"
                  />
                </TableCell>
              )}
              
              {/* Celle dati */}
              {columns.map((col) => {
                const value = entity[col.key];
                const displayValue = col.render 
                  ? col.render(value, entity)
                  : value?.toString() || '-';
                
                return (
                  <TableCell key={col.key}>
                    {displayValue}
                  </TableCell>
                );
              })}
              
              {/* Celle azioni */}
              <TableCell>
                <div className="flex items-center gap-1">
                  {permissions.canRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEntityAction('view', entity)}
                      title="Visualizza"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {permissions.canUpdate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEntityAction('edit', entity)}
                      title="Modifica"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {permissions.canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEntityAction('delete', entity)}
                      title="Elimina"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  {permissions.canExport && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEntityAction('export', entity)}
                      title="Esporta"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  // Rendering della modalità griglia
  const renderGridView = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {entities.map((entity) => (
          <Card
            key={entity.id}
            className={cn(
              'relative hover:shadow-md transition-shadow',
              selectedEntities.has(entity.id) && 'ring-2 ring-blue-500'
            )}
          >
            <CardContent className="p-4">
              {/* Checkbox di selezione */}
              {(permissions.canUpdate || permissions.canDelete) && (
                <div className="absolute top-2 left-2">
                  <input
                    type="checkbox"
                    checked={selectedEntities.has(entity.id)}
                    onChange={() => onEntitySelect(entity.id)}
                    className="rounded border-gray-300"
                  />
                </div>
              )}

              {/* Contenuto della card */}
              <div className="space-y-2">
                {columns
                  .filter(col => col.key !== 'actions' && col.key !== 'select')
                  .slice(0, 4) // Mostra solo i primi 4 campi
                  .map((col) => {
                    const value = entity[col.key];
                    const displayValue = col.render 
                      ? col.render(value, entity)
                      : value?.toString() || '-';

                    return (
                      <div key={col.key} className="text-sm">
                        <span className="font-medium text-gray-600">{col.label}:</span>
                        <span className="ml-2 text-gray-900">{displayValue}</span>
                      </div>
                    );
                  })}
              </div>

              {/* Azioni della card */}
              <div className="flex justify-end gap-1 mt-4 pt-2 border-t border-gray-200">
                {permissions.canRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEntityAction('view', entity)}
                    title="Visualizza"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                {permissions.canUpdate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEntityAction('edit', entity)}
                    title="Modifica"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {permissions.canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEntityAction('delete', entity)}
                    title="Elimina"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {permissions.canExport && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEntityAction('export', entity)}
                    title="Esporta"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Rendering degli stati di caricamento ed errore
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Caricamento...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium mb-2">Errore</div>
          <div className="text-gray-600">{error}</div>
        </div>
      </div>
    );
  }

  if (entities.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-gray-400 text-lg font-medium mb-2">Nessun risultato</div>
          <div className="text-gray-500">{emptyMessage}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Toggle modalità visualizzazione */}
      <div className="flex justify-end">
        <div className="flex rounded-lg border border-gray-300 p-1">
          <Button
            variant={viewMode === 'table' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('table')}
            className="rounded-md"
          >
            <List className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Tabella</span>
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('grid')}
            className="rounded-md"
          >
            <Grid className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Griglia</span>
          </Button>
        </div>
      </div>

      {/* Contenuto principale */}
      {viewMode === 'table' ? renderTableView() : renderGridView()}
    </div>
  );
}
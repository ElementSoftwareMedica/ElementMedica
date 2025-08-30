/**
 * GDPR Entity Toolbar - Toolbar con controlli di ricerca, filtri e azioni
 * 
 * Componente toolbar che include:
 * - Barra di ricerca
 * - Toggle vista (tabella/griglia)
 * - Pulsanti azioni batch
 * - Dropdown per aggiungere entità
 * 
 * @version 1.0
 * @date 30 Dicembre 2024
 */

import React from 'react';
import { Button, Input, Badge } from '../../../design-system';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem
} from '../../../design-system';
import { 
  ChevronDown,
  Columns,
  Download,
  Filter,
  Grid,
  Plus,
  Search,
  Settings,
  Table,
  X
} from 'lucide-react';
import { FilterState, ColumnConfig, EntityAction } from '../types';

export type ViewMode = 'table' | 'grid';

/**
 * Props del componente GDPREntityToolbar
 */
export interface GDPREntityToolbarProps {
  /** Valore corrente della ricerca */
  searchValue: string;
  
  /** Callback per cambio ricerca */
  onSearchChange: (value: string) => void;
  
  /** Stato corrente dei filtri */
  filters: FilterState;
  
  /** Callback per cambio filtri */
  onFiltersChange: (filters: FilterState) => void;
  
  /** Configurazione colonne disponibili */
  columns: ColumnConfig[];
  
  /** Colonne visibili */
  visibleColumns: string[];
  
  /** Callback per cambio visibilità colonne */
  onColumnsChange: (columns: string[]) => void;
  
  /** Modalità vista corrente */
  viewMode: ViewMode;
  
  /** Callback per cambio modalità vista */
  onViewModeChange: (mode: ViewMode) => void;
  
  /** Numero di elementi selezionati */
  selectedCount: number;
  
  /** Azioni disponibili per aggiungere entità */
  addActions?: EntityAction[];
  
  /** Azioni batch disponibili */
  batchActions?: EntityAction[];
  
  /** Callback per azioni batch */
  onBatchAction?: (actionKey: string) => void;
  
  /** Mostra controlli GDPR */
  showGDPRControls?: boolean;
  
  /** Callback per export GDPR */
  onGDPRExport?: () => void;
  
  /** Callback per audit */
  onAuditAction?: () => void;
  
  /** Classi CSS personalizzate */
  className?: string;
}

/**
 * Toolbar con controlli per la gestione delle entità
 */
export function GDPREntityToolbar({
  searchValue,
  onSearchChange,
  filters,
  onFiltersChange,
  columns,
  visibleColumns,
  onColumnsChange,
  viewMode,
  onViewModeChange,
  selectedCount,
  addActions,
  batchActions,
  onBatchAction,
  showGDPRControls = true,
  onGDPRExport,
  onAuditAction,
  className
}: GDPREntityToolbarProps) {
  
  // Conta filtri attivi
  const activeFiltersCount = Object.values(filters).filter(value => 
    value !== null && value !== undefined && value !== '' && 
    (Array.isArray(value) ? value.length > 0 : true)
  ).length;
  
  return (
    <div className={`gdpr-entity-toolbar space-y-4 ${className || ''}`}>
      {/* Prima riga: Ricerca e azioni principali */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Sezione sinistra: Ricerca */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca entità..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
            {searchValue && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSearchChange('')}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Sezione destra: Azioni principali */}
        <div className="flex items-center gap-2">
          {/* Dropdown Aggiungi Entità */}
          {addActions && addActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Aggiungi
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {addActions.map((action) => (
                  <DropdownMenuItem
                    key={action.key}
                    onClick={() => action.onClick({})}
                    disabled={typeof action.disabled === 'function' ? action.disabled({}) : action.disabled}
                    className="flex items-center gap-2"
                  >
                    {action.icon && <span>{action.icon}</span>}
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Controlli GDPR */}
          {showGDPRControls && (
            <>
              {onGDPRExport && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onGDPRExport}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export GDPR
                </Button>
              )}
              
              {onAuditAction && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAuditAction}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Audit
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Seconda riga: Filtri e controlli vista */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Sezione sinistra: Filtri */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Pulsante Filtri */}
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtri
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
          
          {/* Badge filtri attivi */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {Object.entries(filters).map(([key, value]) => {
                if (!value || (Array.isArray(value) && value.length === 0)) return null;
                
                return (
                  <Badge
                    key={key}
                    variant="secondary"
                    className="flex items-center gap-1 text-xs"
                  >
                    {key}: {Array.isArray(value) ? value.join(', ') : String(value)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onFiltersChange({ ...filters, [key]: null })}
                      className="h-3 w-3 p-0 ml-1"
                    >
                      <X className="h-2 w-2" />
                    </Button>
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Sezione destra: Controlli vista */}
        <div className="flex items-center gap-2">
          {/* Selettore Colonne */}
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Columns className="h-4 w-4" />
            Colonne
          </Button>
          
          {/* Toggle Vista */}
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'table' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('table')}
              className="rounded-r-none border-r"
            >
              <Table className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('grid')}
              className="rounded-l-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Terza riga: Azioni batch (visibile solo se ci sono elementi selezionati) */}
      {selectedCount > 0 && batchActions && batchActions.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {selectedCount} {selectedCount === 1 ? 'elemento selezionato' : 'elementi selezionati'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {batchActions.map((action) => {
              // Mappa i variant non supportati a quelli supportati
              let buttonVariant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' = 'outline';
              if (action.variant === 'danger') {
                buttonVariant = 'destructive';
              } else if (action.variant && ['primary', 'secondary', 'outline'].includes(action.variant)) {
                buttonVariant = action.variant as 'primary' | 'secondary' | 'outline';
              }
              
              return (
                <Button
                  key={action.key}
                  variant={buttonVariant}
                  size="sm"
                  onClick={() => onBatchAction?.(action.key)}
                  disabled={typeof action.disabled === 'function' ? action.disabled({}) : action.disabled}
                  className="flex items-center gap-2"
                >
                  {action.icon && <span>{action.icon}</span>}
                  {action.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default GDPREntityToolbar;
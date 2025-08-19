/**
 * GDPR Entity Actions - Componente azioni batch
 * 
 * Componente per gestire le azioni batch sulle entità:
 * - Azioni di selezione
 * - Azioni batch
 * - Azioni GDPR
 * - Conferme e validazioni
 * 
 * @version 1.0
 * @date 30 Dicembre 2024
 */

import React, { useState } from 'react';
import { Button, Badge } from '../../../design-system';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem
} from '../../../design-system';
import { 
  CheckSquare,
  Square,
  Trash2,
  Download,
  Archive,
  Mail,
  Shield,
  AlertTriangle,
  ChevronDown,
  X
} from 'lucide-react';
import { EntityAction, BaseEntity } from '../types';

/**
 * Props del componente GDPREntityActions
 */
export interface GDPREntityActionsProps<T extends BaseEntity = BaseEntity> {
  /** Elementi selezionati */
  selectedItems: string[];
  
  /** Totale elementi */
  totalItems: number;
  
  /** Dati completi per validazioni */
  allData: T[];
  
  /** Azioni batch disponibili */
  batchActions?: EntityAction[];
  
  /** Callback per selezione tutti */
  onSelectAll: () => void;
  
  /** Callback per deseleziona tutti */
  onDeselectAll: () => void;
  
  /** Callback per azioni batch */
  onBatchAction?: (actionKey: string, selectedIds: string[]) => void;
  
  /** Mostra contatori */
  showCounters?: boolean;
  
  /** Mostra azioni GDPR */
  showGDPRActions?: boolean;
  
  /** Classi CSS personalizzate */
  className?: string;
}

/**
 * Componente per gestire le azioni batch
 */
export function GDPREntityActions<T extends BaseEntity = BaseEntity>({
  selectedItems,
  totalItems,
  allData,
  batchActions = [],
  onSelectAll,
  onDeselectAll,
  onBatchAction,
  showCounters = true,
  showGDPRActions = true,
  className
}: GDPREntityActionsProps<T>) {
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  
  // Stato selezione
  const hasSelection = selectedItems.length > 0;
  const isAllSelected = selectedItems.length === totalItems && totalItems > 0;
  const isPartiallySelected = selectedItems.length > 0 && selectedItems.length < totalItems;
  
  // Azioni GDPR predefinite
  const gdprActions: EntityAction[] = [
    {
      key: 'export-data',
      label: 'Esporta Dati Selezionati',
      icon: <Download className="h-4 w-4" />,
      variant: 'secondary',
      visible: true
    },
    {
      key: 'request-consent',
      label: 'Richiedi Consenso',
      icon: <Shield className="h-4 w-4" />,
      variant: 'secondary',
      visible: true
    },
    {
      key: 'anonymize',
      label: 'Anonimizza Dati',
      icon: <Archive className="h-4 w-4" />,
      variant: 'secondary',
      visible: true
    },
    {
      key: 'delete-gdpr',
      label: 'Cancellazione GDPR',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'danger',
      visible: true
    }
  ];
  
  // Combina azioni batch e GDPR
  const allActions = [
    ...batchActions,
    ...(showGDPRActions ? gdprActions : [])
  ];
  
  // Azioni che richiedono conferma
  const actionsRequiringConfirmation = ['request-consent', 'anonymize', 'delete-gdpr'];
  
  // Gestione azioni
  const handleAction = (actionKey: string) => {
    if (actionsRequiringConfirmation.includes(actionKey)) {
      setConfirmAction(actionKey);
    } else {
      onBatchAction?.(actionKey, selectedItems);
    }
  };
  
  // Conferma azione
  const handleConfirmAction = () => {
    if (confirmAction) {
      onBatchAction?.(confirmAction, selectedItems);
      setConfirmAction(null);
    }
  };
  
  // Annulla conferma
  const handleCancelAction = () => {
    setConfirmAction(null);
  };
  
  // Filtra azioni visibili
  const visibleActions = allActions.filter(action => {
    if (typeof action.visible === 'function') {
      // Per azioni batch, verifica su tutti gli elementi selezionati
      const selectedData = allData.filter(item => selectedItems.includes(item.id));
      return selectedData.every(item => action.visible!(item));
    }
    return action.visible !== false;
  });
  
  // Azioni principali (prime 3)
  const primaryActions = visibleActions.slice(0, 3);
  const secondaryActions = visibleActions.slice(3);
  
  if (!hasSelection && !showCounters) {
    return null;
  }
  
  return (
    <div className={`gdpr-entity-actions ${className || ''}`}>
      <div className="flex items-center justify-between p-4 bg-muted/25 border rounded-lg">
        {/* Selezione e contatori */}
        <div className="flex items-center gap-4">
          {/* Checkbox selezione tutti */}
          <div className="flex items-center gap-2">
            <button
              onClick={isAllSelected ? onDeselectAll : onSelectAll}
              className="flex items-center justify-center w-5 h-5 border-2 border-gray-300 rounded hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
            >
              {isAllSelected ? (
                <CheckSquare className="h-4 w-4 text-primary" />
              ) : isPartiallySelected ? (
                <div className="w-2 h-2 bg-primary rounded-sm" />
              ) : (
                <Square className="h-4 w-4 text-gray-400" />
              )}
            </button>
            
            <span className="text-sm font-medium">
              {isAllSelected ? 'Deseleziona tutto' : 'Seleziona tutto'}
            </span>
          </div>
          
          {/* Contatori */}
          {showCounters && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {selectedItems.length} di {totalItems} selezionati
              </Badge>
              
              {hasSelection && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDeselectAll}
                  className="h-6 px-2 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Deseleziona
                </Button>
              )}
            </div>
          )}
        </div>
        
        {/* Azioni batch */}
        {hasSelection && visibleActions.length > 0 && (
          <div className="flex items-center gap-2">
            {/* Azioni principali */}
            {primaryActions.map((action) => (
              <Button
                key={action.key}
                variant={action.variant === 'danger' ? 'danger' : 'outline'}
                size="sm"
                onClick={() => handleAction(action.key)}
                disabled={
                  typeof action.disabled === 'function'
                    ? allData
                        .filter(item => selectedItems.includes(item.id))
                        .some(item => action.disabled!(item))
                    : action.disabled
                }
                className="flex items-center gap-1"
              >
                {action.icon}
                <span className="hidden sm:inline">{action.label}</span>
              </Button>
            ))}
            
            {/* Menu azioni secondarie */}
            {secondaryActions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <span className="hidden sm:inline">Altre azioni</span>
                    <ChevronDown className="h-4 w-4 sm:ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {secondaryActions.map((action) => (
                    <DropdownMenuItem
                      key={action.key}
                      onClick={() => handleAction(action.key)}
                      disabled={
                        typeof action.disabled === 'function'
                          ? allData
                              .filter(item => selectedItems.includes(item.id))
                              .some(item => action.disabled!(item))
                          : action.disabled
                      }
                      className="flex items-center gap-2"
                    >
                      {action.icon}
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>
      
      {/* Modal conferma azione */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <h3 className="text-lg font-semibold">Conferma Azione</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Sei sicuro di voler eseguire l'azione "{allActions.find(a => a.key === confirmAction)?.label}" 
              su {selectedItems.length} elementi selezionati?
              {confirmAction === 'delete-gdpr' && (
                <span className="block mt-2 text-red-600 font-medium">
                  Questa azione non può essere annullata e comporterà la cancellazione permanente dei dati.
                </span>
              )}
            </p>
            
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleCancelAction}
              >
                Annulla
              </Button>
              <Button
                variant={confirmAction === 'delete-gdpr' ? 'destructive' : 'primary'}
                onClick={handleConfirmAction}
              >
                Conferma
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GDPREntityActions;
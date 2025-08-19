import React, { ReactNode } from 'react';
import { X, Check, Trash2, CheckSquare, Square } from 'lucide-react';
import { cn } from '../../utils';

export interface SelectionPillAction {
  /** Etichetta dell'azione */
  label: string;
  /** Funzione da eseguire quando l'azione viene selezionata */
  onClick: () => void;
  /** Icona opzionale da mostrare accanto all'etichetta */
  icon?: ReactNode;
  /** Variante di stile */
  variant: 'primary' | 'secondary' | 'danger' | 'default';
}

export interface SelectionPillsProps {
  /** Lista delle azioni mostrate come pill */
  actions: SelectionPillAction[];
  /** Funzione chiamata quando l'utente vuole pulire la selezione */
  onClear?: () => void;
  /** Numero di elementi selezionati */
  count?: number;
  /** Nome dell'entità (es. "righe", "utenti", "aziende") */
  entityName?: string;
  /** Funzione da chiamare quando si vuole cancellare la selezione */
  onClearSelection?: () => void;
  /** Classi CSS aggiuntive */
  className?: string;
}

export const SelectionPills: React.FC<SelectionPillsProps> = ({
  actions,
  onClear,
  count = 0,
  entityName = 'elementi',
  onClearSelection,
  className = '',
}) => {
  // Stili per le diverse varianti
  const getVariantStyle = (variant: SelectionPillAction['variant']) => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'secondary':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'danger':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (actions.length === 0 && count === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {/* Pill per il conteggio selezione */}
      {count > 0 && (
        <div className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-sm font-medium">
          <Check className="w-4 h-4" />
          <span>
            {count} {entityName} selezionat{count === 1 ? 'o' : 'i'}
          </span>
          {(onClear || onClearSelection) && (
            <button
              onClick={onClear || onClearSelection}
              className="ml-1 p-0.5 hover:bg-blue-100 rounded-full transition-colors"
              aria-label="Cancella selezione"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Pills per le azioni */}
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={action.onClick}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1 border rounded-full text-sm font-medium',
            'transition-all duration-200 hover:shadow-sm',
            getVariantStyle(action.variant)
          )}
        >
          {action.icon && (
            <span className="w-4 h-4 flex items-center justify-center">
              {action.icon}
            </span>
          )}
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
};

// Helper functions for common actions
export const selectAllAction = (onClick: () => void, label: string): SelectionPillAction => ({
  label,
  onClick,
  icon: <CheckSquare className="w-4 h-4" />,
  variant: 'secondary'
});

export const deselectAllAction = (onClick: () => void, label: string): SelectionPillAction => ({
  label,
  onClick,
  icon: <Square className="w-4 h-4" />,
  variant: 'secondary'
});

export const deleteSelectedAction = (onClick: () => void, label: string): SelectionPillAction => ({
  label,
  onClick,
  icon: <Trash2 className="w-4 h-4" />,
  variant: 'danger'
});
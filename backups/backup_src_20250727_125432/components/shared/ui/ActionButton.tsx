import React from 'react';
import { Dropdown, DropdownAction } from '../../../design-system/molecules/Dropdown';
import { cn } from '../../../design-system/utils';
import { MoreVertical, ChevronDown } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export interface ActionButtonProps {
  /** Lista delle azioni disponibili */
  actions: DropdownAction[];
  /** Classi personalizzate aggiuntive */
  className?: string;
  /** Se mostrare il pulsante come pillola blu invece che come icona (default: true) */
  asPill?: boolean;
}

/**
 * Bottone di azioni specializzato per la prima colonna delle tabelle.
 * Mostra un menu dropdown di azioni quando viene cliccato.
 * 
 * IMPORTANTE: I pulsanti devono essere SEMPRE a forma di pillola (pill=true) di default.
 * Questo è uno standard del progetto per mantenere consistenza nell'UI.
 */
export const ActionButton: React.FC<ActionButtonProps> = ({
  actions,
  className = '',
  asPill = true,
}) => {
  return (
    <div 
      className="relative inline-block" 
      onClick={(e) => e.stopPropagation()}
      style={{ zIndex: 100 }}
    >
      {asPill ? (
        <Dropdown
          actions={actions}
          label="Azioni"
          icon={undefined}
          showArrow={true}
          variant="outline"
          pill={true}
          className={cn(
            'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200',
            className
          )}
        />
      ) : (
        <Dropdown
          actions={actions}
          icon={undefined}
          label="Azioni"
          showArrow={true}
          customStyle={true}
          pill={true}
          className={cn(
            'text-blue-600 hover:text-blue-800 focus:text-blue-800',
            'bg-blue-50 hover:bg-blue-100 active:bg-blue-200',
            className
          )}
        />
      )}
    </div>
  );
};

export default ActionButton;
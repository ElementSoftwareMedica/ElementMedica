import React from 'react';
import { Dropdown, DropdownAction } from '../../design-system/molecules/Dropdown';
import { cn } from '../../design-system/utils';

export type ActionButtonTheme = 'blue' | 'teal' | 'violet';

// Theme configurations for ActionButton
const THEME_CLASSES: Record<ActionButtonTheme, { pill: string; icon: string }> = {
  blue: {
    pill: 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200',
    icon: 'text-blue-600 hover:text-blue-800 focus:text-blue-800 bg-blue-50 hover:bg-blue-100 active:bg-blue-200'
  },
  teal: {
    pill: 'text-teal-600 bg-teal-50 hover:bg-teal-100 border-teal-200',
    icon: 'text-teal-600 hover:text-teal-800 focus:text-teal-800 bg-teal-50 hover:bg-teal-100 active:bg-teal-200'
  },
  violet: {
    pill: 'text-violet-600 bg-violet-50 hover:bg-violet-100 border-violet-200',
    icon: 'text-violet-600 hover:text-violet-800 focus:text-violet-800 bg-violet-50 hover:bg-violet-100 active:bg-violet-200'
  }
};

export interface ActionButtonProps {
  /** Lista delle azioni disponibili */
  actions: DropdownAction[];
  /** Classi personalizzate aggiuntive */
  className?: string;
  /** Se mostrare il pulsante come pillola invece che come icona (default: true) */
  asPill?: boolean;
  /** Tema colore: 'blue' (ElementSicurezza default), 'teal' (ElementMedica), 'violet' (Management) */
  theme?: ActionButtonTheme;
}

/**
 * Bottone di azioni specializzato con supporto per diversi temi.
 * Mostra un menu dropdown di azioni quando viene cliccato.
 * 
 * IMPORTANTE: I pulsanti devono essere SEMPRE a forma di pillola (pill=true) di default.
 * Questo è uno standard del progetto per mantenere consistenza nell'UI.
 * 
 * Temi disponibili:
 * - 'blue': ElementSicurezza (default)
 * - 'teal': ElementMedica
 * - 'violet': Management
 */
export const ActionButton: React.FC<ActionButtonProps> = ({
  actions,
  className = '',
  asPill = true,
  theme = 'blue',
}) => {
  const themeClasses = THEME_CLASSES[theme];

  return (
    <div
      className="relative inline-block"
      onClick={(e) => e.stopPropagation()}
    >
      {asPill ? (
        <Dropdown
          actions={actions}
          label="Azioni"
          icon={undefined}
          showArrow={true}
          variant="outline"
          pill={true}
          className={cn(themeClasses.pill, className)}
        />
      ) : (
        <Dropdown
          actions={actions}
          icon={undefined}
          label="Azioni"
          showArrow={true}
          customStyle={true}
          pill={true}
          className={cn(themeClasses.icon, className)}
        />
      )}
    </div>
  );
};

export default ActionButton;
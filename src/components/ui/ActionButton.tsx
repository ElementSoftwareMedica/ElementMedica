import React from 'react';
import { Dropdown, DropdownAction } from '../../design-system/molecules/Dropdown';
import { cn } from '../../design-system/utils';

export type ActionButtonTheme = 'blue' | 'teal' | 'violet';

// Theme configurations for ActionButton
const THEME_CLASSES: Record<ActionButtonTheme, { pill: string; icon: string }> = {
  blue: {
    pill: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 border-blue-200 dark:border-blue-700',
    icon: 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 focus:text-blue-800 dark:focus:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 active:bg-blue-200 dark:active:bg-blue-800/50'
  },
  teal: {
    pill: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-900/50 border-teal-200 dark:border-teal-700',
    icon: 'text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 focus:text-teal-800 dark:focus:text-teal-300 bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-900/50 active:bg-teal-200 dark:active:bg-teal-800/50'
  },
  violet: {
    pill: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 hover:bg-violet-100 dark:hover:bg-violet-900/50 border-violet-200 dark:border-violet-700',
    icon: 'text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 focus:text-violet-800 dark:focus:text-violet-300 bg-violet-50 dark:bg-violet-900/30 hover:bg-violet-100 dark:hover:bg-violet-900/50 active:bg-violet-200 dark:active:bg-violet-800/50'
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
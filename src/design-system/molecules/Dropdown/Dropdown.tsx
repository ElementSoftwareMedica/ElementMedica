import React, { ReactNode, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export interface DropdownAction {
  /** Etichetta dell'azione */
  label: string;
  /** Funzione da eseguire quando l'azione viene selezionata */
  onClick: (e?: React.MouseEvent) => void;
  /** Icona opzionale da mostrare accanto all'etichetta */
  icon?: ReactNode;
  /** Variante di stile (default, danger) */
  variant?: 'default' | 'danger' | 'secondary' | 'primary';
  /** Whether the action is disabled */
  disabled?: boolean;
}

export interface DropdownProps {
  /** Lista delle azioni da mostrare nel dropdown */
  actions: DropdownAction[];
  /** Etichetta del bottone che attiva il dropdown */
  label?: string;
  /** Icona da mostrare nel bottone (opzionale) */
  icon?: ReactNode;
  /** Variante di stile del bottone */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  /** Classi CSS personalizzate */
  className?: string;
  /** Se usare stili personalizzati (ignora la variante) */
  customStyle?: boolean;
  /** Se il bottone deve avere forma a pillola */
  pill?: boolean;
  /** Se mostrare la freccia nel bottone */
  showArrow?: boolean;
}

/**
 * Componente dropdown per mostrare un elenco di azioni
 * 
 * Esempio di utilizzo:
 * ```tsx
 * <Dropdown
 *   label="Azioni"
 *   variant="outline"
 *   pill={true}
 *   actions={[
 *     { label: 'Modifica', onClick: handleEdit, icon: <PencilIcon /> },
 *     { label: 'Elimina', onClick: handleDelete, variant: 'danger', icon: <TrashIcon /> }
 *   ]}
 * />
 * ```
 */
export const Dropdown: React.FC<DropdownProps> = ({
  actions,
  label = 'Azioni',
  icon,
  variant = 'outline',
  className = '',
  customStyle = false,
  pill = true,
  showArrow = true,
}) => {
  // Memoizza le azioni per evitare re-render inutili
  const memoizedActions = useMemo(() => actions, [actions]);
  
  // Varianti di stile per il bottone
  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    outline: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={
          customStyle 
            ? className 
            : cn(
                'inline-flex items-center justify-center text-sm font-medium',
                pill ? 'rounded-full' : 'rounded-md',
                variantStyles[variant],
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50',
                'py-1.5 px-3',
                className
              )
        }
      >
        <span className="inline-flex items-center">
          {/* Icona opzionale a sinistra */}
          {icon && <span className="mr-1.5">{icon}</span>}
          
          {/* Label del bottone */}
          {label && <span className="whitespace-nowrap">{label}</span>}
          
          {/* Freccia (opzionale) */}
          {showArrow && <ChevronDown className="ml-1.5 h-4 w-4" aria-hidden="true" />}
        </span>
      </DropdownMenu.Trigger>
      
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={5}
          className="z-50 min-w-[200px] overflow-hidden rounded-md border border-gray-200 bg-white p-1 shadow-md animate-in fade-in-80 data-[side=right]:slide-in-from-left-2 data-[side=left]:slide-in-from-right-2 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
        >
          {memoizedActions.map((action, index) => (
            <DropdownMenu.Item
              key={index}
              disabled={action.disabled}
              onClick={() => {
                // Call the action's onClick handler if provided
                if (action.onClick) {
                  action.onClick();
                }
              }}
              className={cn(
                'relative flex cursor-default select-none items-center rounded-sm px-3 py-1.5 text-sm outline-none transition-colors focus:bg-gray-100 focus:text-gray-900',
                action.disabled && 'pointer-events-none opacity-50',
                action.variant === 'danger' && 'text-red-600',
                action.variant === 'secondary' && 'text-gray-500',
                action.variant === 'primary' && 'text-blue-600',
              )}
            >
              {action.icon && (
                <span className="mr-2">{action.icon}</span>
              )}
              <span>{action.label}</span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default Dropdown;
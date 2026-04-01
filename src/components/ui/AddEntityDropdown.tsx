import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Plus
} from 'lucide-react';
import { cn } from '../../design-system/utils';
import { useTenantModeOptional } from '../../contexts/TenantModeContext';

export interface AddEntityOption {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  /** Se true, questa opzione è un'operazione CRUD e sarà disabilitata in viewMode='all' */
  isCRUDOperation?: boolean;
}

export interface AddEntityDropdownProps {
  /** Etichetta del pulsante */
  label?: string;
  /** Opzioni del dropdown */
  options: AddEntityOption[];
  /** Classe CSS personalizzata per il pulsante */
  buttonClassName?: string;
  /** Classe CSS personalizzata per il menu */
  menuClassName?: string;
  /** Icona iniziale (default: Plus) */
  icon?: React.ReactNode;
  /** Variante del pulsante */
  variant?: 'primary' | 'secondary' | 'outline';
  /** Se true, disabilita il dropdown quando TenantMode non permette CRUD (default: true) */
  respectTenantMode?: boolean;
  /** Tema colore del brand: 'blue' (sicurezza, default), 'teal' (clinica), 'violet' (management) */
  colorTheme?: 'blue' | 'teal' | 'violet';
}

const THEME_VARIANTS = {
  blue: {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600',
    secondary: 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200',
    outline: 'bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100',
    menuHover: 'hover:bg-blue-50 hover:text-blue-700',
    icon: 'text-blue-500',
    focus: 'focus:ring-blue-500',
  },
  teal: {
    primary: 'bg-teal-600 text-white hover:bg-teal-700 border-teal-600',
    secondary: 'bg-teal-50 text-teal-600 hover:bg-teal-100 border-teal-200',
    outline: 'bg-teal-50 border border-teal-200 text-teal-600 hover:bg-teal-100',
    menuHover: 'hover:bg-teal-50 hover:text-teal-700',
    icon: 'text-teal-500',
    focus: 'focus:ring-teal-500',
  },
  violet: {
    primary: 'bg-violet-600 text-white hover:bg-violet-700 border-violet-600',
    secondary: 'bg-violet-50 text-violet-600 hover:bg-violet-100 border-violet-200',
    outline: 'bg-violet-50 border border-violet-200 text-violet-600 hover:bg-violet-100',
    menuHover: 'hover:bg-violet-50 hover:text-violet-700',
    icon: 'text-violet-500',
    focus: 'focus:ring-violet-500',
  },
};

/**
 * Dropdown menu per aggiungere nuove entità.
 * Pulsante singolo unificato: click apre il menu con TUTTE le opzioni.
 * Se c'è una sola opzione, il click esegue direttamente l'azione senza dropdown.
 *
 * INTEGRAZIONE TENANT MODE:
 * - Se respectTenantMode=true (default), il dropdown viene disabilitato quando viewMode='all'
 * - Un tooltip spiega perché il bottone è disabilitato
 */
const AddEntityDropdown: React.FC<AddEntityDropdownProps> = ({
  label = 'Aggiungi',
  options,
  buttonClassName = '',
  menuClassName = '',
  icon = <Plus className="h-4 w-4" />,
  variant = 'primary',
  respectTenantMode = true,
  colorTheme = 'blue',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Integrazione TenantMode
  const tenantMode = useTenantModeOptional();
  const canPerformCRUD = tenantMode?.canPerformCRUD ?? true;
  const hasMultipleTenants = tenantMode?.hasMultipleTenants ?? false;
  const isDisabledByTenantMode = respectTenantMode && hasMultipleTenants && !canPerformCRUD;

  const theme = THEME_VARIANTS[colorTheme];
  const isSingleOption = options.length === 1;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleButtonClick = () => {
    if (isDisabledByTenantMode) return;
    if (isSingleOption && options[0]) {
      options[0].onClick();
    } else {
      setIsOpen(prev => !prev);
    }
  };

  const buttonBase = cn(
    'inline-flex items-center justify-center gap-2 text-sm font-medium',
    'transition-all duration-150 ease-in-out',
    'focus:outline-none focus:ring-2 focus:ring-offset-1',
    'rounded-xl py-2 px-4',
    theme.focus,
    isDisabledByTenantMode
      ? 'opacity-50 cursor-not-allowed bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
      : theme[variant],
    buttonClassName
  );

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={isDisabledByTenantMode}
        title={isDisabledByTenantMode ? 'Seleziona un tenant specifico per creare nuovi elementi' : undefined}
        aria-expanded={!isSingleOption ? isOpen : undefined}
        aria-haspopup={!isSingleOption ? 'true' : undefined}
        className={buttonBase}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span>{label}</span>
        {!isSingleOption && (
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 transition-transform duration-200',
              isOpen ? 'rotate-180' : 'rotate-0'
            )}
          />
        )}
      </button>

      {isOpen && !isSingleOption && !isDisabledByTenantMode && (
        <div
          className={cn(
            'absolute right-0 top-full mt-2 w-60 rounded-xl shadow-xl dark:shadow-black/30',
            'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
            'overflow-hidden z-[600]',
            menuClassName
          )}
          role="menu"
        >
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Opzioni
            </p>
          </div>
          <div className="py-1">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => { option.onClick(); setIsOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm',
                  'text-gray-700 dark:text-gray-300',
                  theme.menuHover,
                  'dark:hover:bg-gray-700/50 transition-colors'
                )}
                role="menuitem"
              >
                {option.icon
                  ? <span className={cn('flex-shrink-0', theme.icon)}>{option.icon}</span>
                  : <span className={cn('flex-shrink-0 h-4 w-4', theme.icon)}><Plus className="h-4 w-4" /></span>
                }
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AddEntityDropdown;
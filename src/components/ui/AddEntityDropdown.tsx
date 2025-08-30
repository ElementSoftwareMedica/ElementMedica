import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronDown,
  Plus
} from 'lucide-react';
import { cn } from '../../design-system/utils';

export interface AddEntityOption {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
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
}

/**
 * Dropdown menu per aggiungere nuove entità,
 * con icona Plus a sinistra e freccia a destra
 */
const AddEntityDropdown: React.FC<AddEntityDropdownProps> = ({
  label = 'Aggiungi',
  options,
  buttonClassName = '',
  menuClassName = '',
  icon = <Plus className="h-4 w-4" />,
  variant = 'primary',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Varianti di stile per il bottone - sempre pillola blu
  const buttonVariants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 border-blue-600',
    secondary: 'bg-blue-50 text-blue-600 hover:bg-blue-100 focus:ring-blue-500 border-blue-200',
    outline: 'bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 focus:ring-blue-500',
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'inline-flex items-center justify-between rounded-full py-2 px-4 text-sm font-medium',
          'transition duration-200 ease-in-out',
          'focus:outline-none focus:ring-2 focus:ring-opacity-50',
          buttonVariants[variant],
          buttonClassName
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="flex items-center">
          {icon && <span className="mr-2">{icon}</span>}
          {label}
        </span>
        <ChevronDown className="ml-2 h-4 w-4" />
      </button>
      
      {isOpen && (
        <div
          className={cn(
            'absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50',
            menuClassName
          )}
        >
          <div className="py-1" role="menu" aria-orientation="vertical">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => {
                  option.onClick();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                role="menuitem"
              >
                {option.icon && <span>{option.icon}</span>}
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
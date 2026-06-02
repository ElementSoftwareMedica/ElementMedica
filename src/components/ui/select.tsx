import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../design-system/utils';
import { ChevronDown } from 'lucide-react';

interface SelectContextType {
  value?: string;
  displayValue?: string;
  onValueChange?: (value: string, displayValue?: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  setDisplayValue?: (displayValue: string) => void;
  triggerRef: React.MutableRefObject<HTMLButtonElement | null>;
}

const SelectContext = createContext<SelectContextType | undefined>(undefined);

const useSelect = () => {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error('Select components must be used within a Select');
  }
  return context;
};

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({ value, onValueChange, children }) => {
  const [open, setOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState<string | undefined>(undefined);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // S67: Reset displayValue when value is cleared
  useEffect(() => {
    if (!value) {
      setDisplayValue(undefined);
    }
  }, [value]);

  const handleValueChange = (newValue: string, newDisplayValue?: string) => {
    onValueChange?.(newValue);
    if (newDisplayValue) {
      setDisplayValue(newDisplayValue);
    }
  };

  return (
    <SelectContext.Provider value={{ value, displayValue, onValueChange: handleValueChange, open, setOpen, setDisplayValue, triggerRef }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
};

export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen, triggerRef } = useSelect();

    return (
      <button
        ref={(node) => {
          triggerRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
        }}
        type="button"
        role="combobox"
        aria-expanded={open}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        onClick={() => setOpen(!open)}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
    );
  }
);
SelectTrigger.displayName = 'SelectTrigger';

export interface SelectValueProps {
  placeholder?: string;
}

export const SelectValue: React.FC<SelectValueProps> = ({ placeholder }) => {
  const { displayValue } = useSelect();
  return <span className="truncate">{displayValue || placeholder}</span>;
};

export interface SelectContentProps {
  children: React.ReactNode;
}

export const SelectContent: React.FC<SelectContentProps> = ({ children }) => {
  const { open, setOpen, triggerRef } = useSelect();
  const contentRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    };
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, triggerRef]);

  // Chiudi il dropdown quando si clicca fuori
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      // Verifica se il click è avvenuto all'interno del content o del trigger
      const target = event.target as Node;
      const isInsideContent = contentRef.current?.contains(target);
      const isInsideTrigger = triggerRef.current?.contains(target);

      if (!isInsideContent && !isInsideTrigger) {
        setOpen(false);
      }
    };

    // Usa setTimeout per evitare che il click che apre il dropdown lo chiuda subito
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, setOpen]);

  // S67: Always render children (hidden when closed) so SelectItem useEffect
  // can sync displayValue when value is set programmatically (e.g., pre-compila)
  const content = (
    <div
      ref={contentRef}
      style={{ top: position.top, left: position.left, width: position.width }}
      className={cn(
        'fixed z-[9999] max-h-72 overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg',
        !open && 'hidden'
      )}
    >
      {children}
    </div>
  );

  return createPortal(content, document.body);
};

export interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

export const SelectItem: React.FC<SelectItemProps> = ({ value, children }) => {
  const { onValueChange, setOpen, value: selectedValue, setDisplayValue } = useSelect();

  // Estrai il testo display dai children
  const getDisplayText = (children: React.ReactNode): string => {
    if (typeof children === 'string') return children;
    if (typeof children === 'number') return String(children);
    if (Array.isArray(children)) {
      return children.map(getDisplayText).join('');
    }
    if (React.isValidElement(children) && children.props.children) {
      return getDisplayText(children.props.children);
    }
    return '';
  };

  const displayText = getDisplayText(children);

  // Se questo item è selezionato, aggiorna il displayValue
  React.useEffect(() => {
    if (selectedValue === value && setDisplayValue) {
      setDisplayValue(displayText);
    }
  }, [selectedValue, value, displayText, setDisplayValue]);

  const handleSelect = () => {
    onValueChange?.(value, displayText);
    setOpen(false);
  };

  return (
    <div
      className={cn(
        'cursor-pointer px-3 py-2 text-sm hover:bg-gray-100',
        selectedValue === value && 'bg-gray-100 font-medium'
      )}
      onClick={handleSelect}
    >
      {children}
    </div>
  );
};

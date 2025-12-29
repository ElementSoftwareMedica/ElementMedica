import React, { createContext, useContext, useState } from 'react';
import { cn } from '../../design-system/utils';
import { ChevronDown } from 'lucide-react';

interface SelectContextType {
  value?: string;
  displayValue?: string;
  onValueChange?: (value: string, displayValue?: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  setDisplayValue?: (displayValue: string) => void;
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

  const handleValueChange = (newValue: string, newDisplayValue?: string) => {
    onValueChange?.(newValue);
    if (newDisplayValue) {
      setDisplayValue(newDisplayValue);
    }
  };

  return (
    <SelectContext.Provider value={{ value, displayValue, onValueChange: handleValueChange, open, setOpen, setDisplayValue }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
};

export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen } = useSelect();

    return (
      <button
        ref={ref}
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
  const { open } = useSelect();

  if (!open) return null;

  return (
    <div className="absolute top-full z-50 w-full rounded-md border border-gray-200 bg-white py-1 shadow-lg">
      {children}
    </div>
  );
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
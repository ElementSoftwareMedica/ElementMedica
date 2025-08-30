import React, { createContext, useContext } from 'react';
import { cn } from '../../utils';

interface TabsContextProps {
  value: string;
  onValueChange: (value: string) => void;
}

// Tabs Context
const TabsContext = createContext<TabsContextProps | undefined>(undefined);

// Hook to use Tabs context
const useTabsContext = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs compound components cannot be rendered outside the Tabs component');
  }
  return context;
};

// Props for the Tabs component
export interface TabsProps {
  /** Contenuto dei tabs */
  children: React.ReactNode;
  /** Valore del tab attivo */
  value: string;
  /** Callback chiamato quando cambia il tab attivo */
  onValueChange: (value: string) => void;
  /** Classi CSS personalizzate */
  className?: string;
  /** Orientamento dei tabs */
  orientation?: 'horizontal' | 'vertical';
}

// Props for the TabsList component
export interface TabsListProps {
  /** Contenuto della lista tabs */
  children: React.ReactNode;
  /** Classi CSS personalizzate */
  className?: string;
}

// Props for the TabsTrigger component
export interface TabsTriggerProps {
  /** Contenuto del trigger */
  children: React.ReactNode;
  /** Valore che identifica questo tab */
  value: string;
  /** Classi CSS personalizzate */
  className?: string;
  /** Se il tab è disabilitato */
  disabled?: boolean;
}

// Props for the TabsContent component
export interface TabsContentProps {
  /** Contenuto del pannello */
  children: React.ReactNode;
  /** Valore che identifica questo contenuto */
  value: string;
  /** Classi CSS personalizzate */
  className?: string;
}

/**
 * Componente Tabs principale (container).
 * 
 * Implementa il pattern compound component per massima flessibilità.
 * 
 * @example
 * ```tsx
 * <Tabs value={activeTab} onValueChange={setActiveTab}>
 *   <TabsList>
 *     <TabsTrigger value="tab1">Tab 1</TabsTrigger>
 *     <TabsTrigger value="tab2">Tab 2</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="tab1">
 *     Contenuto del primo tab
 *   </TabsContent>
 *   <TabsContent value="tab2">
 *     Contenuto del secondo tab
 *   </TabsContent>
 * </Tabs>
 * ```
 */
export const Tabs: React.FC<TabsProps> = ({ 
  children, 
  value, 
  onValueChange,
  className = '',
  orientation = 'horizontal'
}) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div 
        className={cn(
          'tabs-root',
          orientation === 'vertical' && 'flex gap-4',
          className
        )}
        data-orientation={orientation}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
};

/**
 * Container per i trigger dei tabs.
 */
export const TabsList: React.FC<TabsListProps> = ({
  children,
  className = ''
}) => {
  return (
    <div 
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500',
        className
      )}
      role="tablist"
    >
      {children}
    </div>
  );
};

/**
 * Singolo trigger per attivare un tab.
 */
export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  children,
  value,
  className = '',
  disabled = false
}) => {
  const { value: selectedValue, onValueChange } = useTabsContext();
  const isSelected = value === selectedValue;

  const handleClick = () => {
    if (!disabled && !isSelected) {
      onValueChange(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      aria-controls={`tabpanel-${value}`}
      tabIndex={isSelected ? 0 : -1}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        isSelected
          ? 'bg-white text-gray-950 shadow-sm'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {children}
    </button>
  );
};

/**
 * Contenuto di un singolo tab.
 */
export const TabsContent: React.FC<TabsContentProps> = ({
  children,
  value,
  className = ''
}) => {
  const { value: selectedValue } = useTabsContext();
  const isSelected = value === selectedValue;

  if (!isSelected) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${value}`}
      aria-labelledby={`tab-${value}`}
      className={cn(
        'mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        className
      )}
      tabIndex={0}
    >
      {children}
    </div>
  );
};

// Export compound component
Tabs.List = TabsList;
Tabs.Trigger = TabsTrigger;
Tabs.Content = TabsContent;

export default Tabs;
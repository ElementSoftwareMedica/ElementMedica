import React from 'react';
import { List, LayoutGrid } from 'lucide-react';
import { cn } from '../../utils';

export interface ViewModeToggleProps {
  /** Modalità di visualizzazione corrente */
  viewMode: 'table' | 'grid';
  /** Funzione chiamata quando la modalità viene cambiata */
  onChange: (mode: 'table' | 'grid') => void;
  /** Etichetta per la modalità griglia (default: "Grid") */
  gridLabel?: string;
  /** Etichetta per la modalità tabella (default: "Table") */
  tableLabel?: string;
  /** Classi CSS aggiuntive per il container */
  className?: string;
}

/**
 * Toggle per passare tra visualizzazione tabella e griglia.
 * Design a forma di pillola con slider animato.
 */
export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  viewMode = 'table',
  onChange,
  gridLabel = 'Grid',
  tableLabel = 'Table',
  className = '',
}) => {
  return (
    <div className={cn('inline-flex', className)}>
      <div
        className={cn(
          'relative flex items-center h-10 bg-gray-100 rounded-full p-1',
          'shadow-inner transition-all duration-200 ease-in-out'
        )}
      >
        {/* Background animato slider */}
        <div
          className={cn(
            'absolute h-8 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out',
            'transform',
            viewMode === 'table' 
              ? 'translate-x-0' 
              : 'translate-x-[calc(100%)]',
            'w-[calc(50%-2px)]'
          )}
        />

        {/* Pulsante Tabella */}
        <button
          onClick={() => onChange('table')}
          className={cn(
            'relative z-10 flex items-center justify-center px-4 py-2 rounded-full',
            'text-sm font-medium transition-colors duration-200',
            'min-w-[80px] gap-2',
            viewMode === 'table'
              ? 'text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          )}
          aria-pressed={viewMode === 'table'}
        >
          <List className="w-4 h-4" />
          <span className="hidden sm:inline">{tableLabel}</span>
        </button>

        {/* Pulsante Griglia */}
        <button
          onClick={() => onChange('grid')}
          className={cn(
            'relative z-10 flex items-center justify-center px-4 py-2 rounded-full',
            'text-sm font-medium transition-colors duration-200',
            'min-w-[80px] gap-2',
            viewMode === 'grid'
              ? 'text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          )}
          aria-pressed={viewMode === 'grid'}
        >
          <LayoutGrid className="w-4 h-4" />
          <span className="hidden sm:inline">{gridLabel}</span>
        </button>
      </div>
    </div>
  );
};
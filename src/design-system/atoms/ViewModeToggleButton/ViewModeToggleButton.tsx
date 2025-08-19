import React from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { cn } from '../../utils';

export interface ViewModeToggleButtonProps {
  viewMode: 'grid' | 'table';
  onChange: (mode: 'grid' | 'table') => void;
  className?: string;
  gridLabel?: string;
  tableLabel?: string;
}

/**
 * A standardized button component for toggling between grid and table views
 * with consistent styling and behavior across the application.
 */
export const ViewModeToggleButton: React.FC<ViewModeToggleButtonProps> = ({
  viewMode,
  onChange,
  className = '',
  gridLabel = 'Card',
  tableLabel = 'Table'
}) => {
  return (
    <div className={cn("flex items-center bg-gray-100 rounded-full p-1 relative", className)} style={{ minWidth: 180 }}>
      <button
        onClick={() => onChange('grid')}
        className={cn(
          "relative z-10 px-3 py-2 rounded-full flex items-center font-medium transition",
          viewMode === 'grid' ? 'text-primary-700' : 'text-gray-500'
        )}
        type="button"
      >
        <LayoutGrid className="h-5 w-5" />
        <span className="ml-2 text-sm">{gridLabel}</span>
      </button>
      <button
        onClick={() => onChange('table')}
        className={cn(
          "relative z-10 px-3 py-2 rounded-full flex items-center font-medium transition ml-1",
          viewMode === 'table' ? 'text-primary-700' : 'text-gray-500'
        )}
        type="button"
      >
        <List className="h-5 w-5" />
        <span className="ml-2 text-sm">{tableLabel}</span>
      </button>
      <span
        className={cn(
          "absolute top-1 left-1 h-8 w-[calc(50%-0.25rem)] bg-white rounded-full shadow transition-transform duration-300",
          viewMode === 'table' ? 'translate-x-full' : 'translate-x-0'
        )}
      />
    </div>
  );
};
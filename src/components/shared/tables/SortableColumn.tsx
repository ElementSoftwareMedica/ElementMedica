import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortableColumnProps {
  label: string;
  sortKey: string;
  currentSortKey?: string;
  currentDirection?: SortDirection;
  onSort: (key: string, direction: SortDirection) => void;
  className?: string;
}

const SortableColumn: React.FC<SortableColumnProps> = ({
  label,
  sortKey,
  currentSortKey,
  currentDirection,
  onSort,
  className = '',
}) => {
  const isActive = currentSortKey === sortKey;
  
  const handleSort = () => {
    if (!isActive) {
      // Se non è la colonna attiva, imposta ordinamento ascendente
      onSort(sortKey, 'asc');
    } else if (currentDirection === 'asc') {
      // Se è già ascendente, passa a discendente
      onSort(sortKey, 'desc');
    } else {
      // Se è discendente, rimuovi ordinamento
      onSort(sortKey, null);
    }
  };
  
  // Determina quale icona mostrare
  const renderIcon = () => {
    if (!isActive || currentDirection === null) {
      return <ArrowUpDown className="h-4 w-4 ml-1 text-gray-400" />;
    }
    
    if (currentDirection === 'asc') {
      return <ArrowUp className="h-4 w-4 ml-1 text-blue-600" />;
    }
    
    return <ArrowDown className="h-4 w-4 ml-1 text-blue-600" />;
  };
  
  return (
    <button
      type="button"
      className={`flex items-center text-left focus:outline-none ${
        isActive ? 'text-blue-700 font-medium' : 'text-gray-500'
      } ${className}`}
      onClick={handleSort}
    >
      <span>{label}</span>
      {renderIcon()}
    </button>
  );
};

export default SortableColumn; 
import React, { useState, useRef, useEffect } from 'react';
import { Columns, GripVertical } from 'lucide-react';
import { Button } from '../../design-system/atoms/Button';

interface ColumnOption {
  key: string;
  label: string;
  required?: boolean;
  width?: number;
  order?: number;
}

interface ColumnSelectorProps {
  columns: ColumnOption[];
  hiddenColumns: string[];
  onChange: (hiddenColumns: string[]) => void;
  onOrderChange?: (columnOrder: Record<string, number>) => void;
  columnOrder?: Record<string, number>;
  className?: string;
  buttonClassName?: string;
}

export const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  columns,
  hiddenColumns,
  onChange,
  onOrderChange,
  columnOrder = {},
  className = '',
  buttonClassName = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Track visible columns locally - initialize ONCE from props
  const [localHiddenColumns, setLocalHiddenColumns] = useState<string[]>(hiddenColumns);
  
  // Track column order locally - initialize ONCE from props
  const [localColumnOrder, setLocalColumnOrder] = useState<Record<string, number>>(columnOrder);
  
  // Drag state
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  
  // Update local state when props change (but avoid infinite loops)
  useEffect(() => {
    if (JSON.stringify(hiddenColumns) !== JSON.stringify(localHiddenColumns)) {
      setLocalHiddenColumns(hiddenColumns);
    }
  }, [hiddenColumns, localHiddenColumns]);
  
  useEffect(() => {
    if (JSON.stringify(columnOrder) !== JSON.stringify(localColumnOrder)) {
      setLocalColumnOrder(columnOrder);
    }
  }, [columnOrder, localColumnOrder]);
  
  // Get sorted columns for display
  const sortedColumns = [...columns].sort((a, b) => {
    const orderA = localColumnOrder[a.key] ?? columns.findIndex(c => c.key === a.key);
    const orderB = localColumnOrder[b.key] ?? columns.findIndex(c => c.key === b.key);
    return orderA - orderB;
  });

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Toggle column visibility
  const handleToggleColumn = (key: string, isRequired: boolean) => {
    if (isRequired) return; // Non permettere di nascondere colonne obbligatorie
    
    setLocalHiddenColumns(prev => {
      if (prev.includes(key)) {
        return prev.filter(k => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  // Apply changes and close
  const handleApply = () => {
    // Apply changes to parent component
    onChange(localHiddenColumns);
    
    if (onOrderChange) {
      onOrderChange(localColumnOrder);
    }
    
    // Close dropdown after applying changes
    setIsOpen(false);
  };
  
  // Show all columns that aren't required to be hidden
  const handleShowAll = () => {
    const requiredHidden = columns.filter(col => col.required && localHiddenColumns.includes(col.key)).map(col => col.key);
    setLocalHiddenColumns(requiredHidden);
  };
  
  // Reset column order to default
  const handleResetOrder = () => {
    // Reset order to default (based on original array order)
    const defaultOrder: Record<string, number> = {};
    columns.forEach((col, index) => {
      defaultOrder[col.key] = index;
    });
    setLocalColumnOrder(defaultOrder);
  };
  
  // Handle column dragging for reordering
  const handleDragStart = (e: React.DragEvent, key: string) => {
    setDraggedColumn(key);
    
    // Create a custom drag image
    const ghostElement = document.createElement('div');
    ghostElement.textContent = columns.find(col => col.key === key)?.label || '';
    ghostElement.style.padding = '8px 12px';
    ghostElement.style.background = '#3b82f6';
    ghostElement.style.color = '#fff';
    ghostElement.style.borderRadius = '4px';
    ghostElement.style.fontSize = '14px';
    ghostElement.style.position = 'absolute';
    ghostElement.style.top = '-1000px';
    document.body.appendChild(ghostElement);
    e.dataTransfer.setDragImage(ghostElement, 0, 0);
    setTimeout(() => document.body.removeChild(ghostElement), 0);
  };
  
  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    setDragOverColumn(key);
    
    if (draggedColumn && draggedColumn !== key) {
      const currentOrder = [...sortedColumns].map(col => col.key);
      const fromIndex = currentOrder.indexOf(draggedColumn);
      const toIndex = currentOrder.indexOf(key);
      
      if (fromIndex !== -1 && toIndex !== -1) {
        // Create new order
        const newOrder = [...currentOrder];
        newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, draggedColumn);
        
        // Update order values
        const newColumnOrder: Record<string, number> = {};
        newOrder.forEach((colKey, index) => {
          newColumnOrder[colKey] = index;
        });
        
        setLocalColumnOrder(newColumnOrder);
      }
    }
  };
  
  const handleDragEnd = () => {
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  return (
    <div className={`relative ${className}`} ref={ref}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        leftIcon={<Columns className="h-4 w-4" />}
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
        className={`h-10 px-4 min-w-[100px] whitespace-nowrap ${buttonClassName || ''}`}
      >
        Colonne
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-50 border border-gray-200">
          <div className="p-3 text-sm font-medium text-blue-700 border-b bg-gradient-to-r from-blue-50 to-blue-100 rounded-t-md">
            Gestisci colonne
          </div>
          
          <div className="p-2 max-h-[400px] overflow-y-auto">
            <div className="flex items-center justify-between mb-2 px-2 py-1 text-xs text-gray-500">
              <span>Trascina per riordinare le colonne</span>
              <button 
                onClick={handleShowAll}
                className="text-blue-600 hover:underline text-xs font-medium"
              >
                Mostra tutto
              </button>
            </div>
            
            <div className="space-y-1">
              {sortedColumns.map((column) => {
                const isHidden = localHiddenColumns.includes(column.key);
                const isRequired = !!column.required;
                
                return (
                  <div
                    key={column.key}
                    className={`
                      flex items-center justify-between px-3 py-2 rounded-md
                      transition-colors duration-150
                      ${column.required ? 'opacity-75' : 'hover:bg-gray-100'}
                      ${draggedColumn === column.key ? 'bg-blue-100' : ''}
                      ${dragOverColumn === column.key ? 'border border-blue-500 bg-blue-50' : ''}
                    `}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, column.key)}
                    onDragOver={(e) => handleDragOver(e, column.key)}
                    onDragEnd={handleDragEnd}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setDragOverColumn(column.key);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      if (dragOverColumn === column.key) {
                        setDragOverColumn(null);
                      }
                    }}
                  >
                    <label className="flex items-center gap-2 flex-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={!isHidden}
                        onChange={() => handleToggleColumn(column.key, isRequired)}
                        disabled={isRequired}
                      />
                      <span className={isRequired ? "font-medium" : ""}>
                        {column.label}
                      </span>
                    </label>
                    
                    <div className="cursor-grab text-gray-400 hover:text-gray-600">
                      <GripVertical size={16} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="p-3 border-t bg-gray-50 flex items-center justify-between rounded-b-md">
            <button
              onClick={handleResetOrder}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              Ripristina ordine
            </button>
            
            <Button
              variant="primary"
              size="sm"
              onClick={handleApply}
              className="ml-auto"
            >
              Applica
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnSelector;
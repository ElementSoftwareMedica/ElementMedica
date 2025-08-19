import React from 'react';
import { CheckSquare, Square, Trash2 } from 'lucide-react';

interface SelectionToolbarProps {
  /** Number of selected items */
  selectedCount: number;
  /** Select all handler */
  onSelectAll: () => void;
  /** Deselect all handler */
  onDeselectAll: () => void;
  /** Delete selected items handler */
  onDelete?: () => void;
  /** Delete selected items handler (legacy name) */
  onDeleteSelected?: () => void;
  /** Custom actions to add to the toolbar */
  extraActions?: React.ReactNode;
}

/**
 * Standardized toolbar for selection mode actions
 * Displays consistent selection actions across all pages
 */
const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onDeleteSelected,
  onDelete,
  extraActions,
}) => {
  // Usa onDelete se disponibile, altrimenti onDeleteSelected (per compatibilità)
  const handleDelete = onDelete || onDeleteSelected;

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <button
        onClick={onSelectAll}
        className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium flex items-center gap-1"
        aria-label="Seleziona tutti"
      >
        <CheckSquare className="h-3 w-3" />
        Seleziona tutti
      </button>
      
      <button
        onClick={onDeselectAll}
        className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium flex items-center gap-1"
        aria-label="Deseleziona tutti"
      >
        <Square className="h-3 w-3" />
        Deseleziona tutti
      </button>
      
      {handleDelete && (
        <button
          onClick={handleDelete}
          disabled={selectedCount === 0}
          className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
            selectedCount > 0 
              ? 'bg-red-100 text-red-700 hover:bg-red-200' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          aria-label="Elimina selezionati"
        >
          <Trash2 className="h-3 w-3" />
          Elimina selezionati {selectedCount > 0 && `(${selectedCount})`}
        </button>
      )}
      
      {extraActions}
    </div>
  );
};

export default SelectionToolbar;
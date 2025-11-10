import React from 'react';
import type { ImportPreviewColumn } from '../hooks/useResizableColumns';

interface TableHeaderProps {
  columns: ImportPreviewColumn[];
  colWidths: Record<string, number>;
  onResizeStart: (colKey: string, e: React.MouseEvent) => void;
  areAllRowsSelected: boolean;
  areSomeRowsSelected: boolean;
  onSelectAllRows: () => void;
  useSingleCheckboxColumn?: boolean;
}

/**
 * Table header component with resizable columns
 * 
 * Displays column headers with resize handles and select-all checkbox
 */
export function TableHeader({
  columns,
  colWidths,
  onResizeStart,
  areAllRowsSelected,
  areSomeRowsSelected,
  onSelectAllRows,
  useSingleCheckboxColumn = false
}: TableHeaderProps) {
  return (
    <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
      <tr>
        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
          <div className="flex flex-col items-center space-y-1">
            <span className="text-xs font-medium">Stato</span>
            <div className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={areAllRowsSelected}
                ref={(el) => {
                  if (el) {
                    el.indeterminate = areSomeRowsSelected && !areAllRowsSelected;
                  }
                }}
                onChange={onSelectAllRows}
                className="accent-blue-600"
                title={areAllRowsSelected ? "Deseleziona tutto" : "Seleziona tutto"}
              />
              <span className="text-xs text-gray-600">Tutti</span>
            </div>
          </div>
        </th>
        {columns.map(col => (
          <th 
            key={col.key}
            className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative group select-none"
          >
            {col.label}
            <div
              onMouseDown={(e) => onResizeStart(col.key, e)}
              className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded bg-gray-300 group-hover:bg-blue-500 cursor-col-resize transition"
              style={{ zIndex: 2 }}
              role="separator"
              aria-orientation="vertical"
              tabIndex={-1}
            />
          </th>
        ))}
        {/* Se non unifichiamo le colonne, aggiungiamo l'header per l'indicatore di sovrascrittura */}
        {!useSingleCheckboxColumn && (
          <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
            Sovr.
          </th>
        )}
      </tr>
    </thead>
  );
}

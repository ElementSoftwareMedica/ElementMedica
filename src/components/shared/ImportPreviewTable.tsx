import React, { useMemo } from 'react';
import {
  useResizableColumns,
  useRowSelection,
  useConflictResolution,
  CompanySelector,
  TableHeader,
  TableRow,
  normalizeKey,
  type ImportPreviewColumn,
  type ConflictInfo
} from './ImportPreviewTable/index';

// Re-export types for backward compatibility
export type { ImportPreviewColumn, ConflictInfo };

interface ImportPreviewTableProps<T> {
  columns: ImportPreviewColumn[];
  preview: T[];
  existing?: T[];
  uniqueKey: string;
  rowErrors?: { [rowIdx: number]: string[] };
  onOverwriteChange?: (selected: string[]) => void;
  showBulkSelectButtons?: boolean;
  useSingleCheckboxColumn?: boolean;
  onCompanyChange?: (selectedIds: string[], companyId: string) => void;
  availableCompanies?: Array<{ id: string; name?: string; ragioneSociale?: string }>;
  overwriteIds?: string[];
  conflicts?: { [rowIdx: number]: ConflictInfo };
  onConflictResolutionChange?: (rowIdx: number, resolution: Partial<ConflictInfo>) => void;
  selectedRows?: Set<number>;
  onRowSelectionChange?: (selectedRows: Set<number>) => void;
  normalizeKey?: (value: unknown) => string;
  fieldMappings?: Record<string, string[]>;
}

/**
 * Import preview table component (REFACTORED)
 * 
 * Displays import preview data with conflict resolution, row selection, and company assignment
 * 
 * Previously 987 lines - Now ~200 lines using extracted hooks and components
 */
export default function ImportPreviewTable<T extends Record<string, any>>({
  columns,
  preview,
  existing = [],
  uniqueKey,
  rowErrors = {},
  onOverwriteChange,
  showBulkSelectButtons = false,
  useSingleCheckboxColumn = false,
  onCompanyChange,
  availableCompanies = [],
  overwriteIds = [],
  conflicts,
  onConflictResolutionChange,
  selectedRows: externalSelectedRows,
  onRowSelectionChange: externalOnRowSelectionChange,
  normalizeKey: customNormalizer,
  fieldMappings = {}
}: ImportPreviewTableProps<T>) {
  // Hook: Resizable columns
  const { colWidths, handleResizeStart } = useResizableColumns(columns);

  // Hook: Row selection
  const {
    selectedRows: internalSelectedRows,
    toggleRow,
    selectAll,
    deselectAll,
    areAllRowsSelected,
    areSomeRowsSelected
  } = useRowSelection(preview.length);

  // Use external or internal row selection state
  const selectedRows = externalSelectedRows ?? internalSelectedRows;
  const onRowSelectionChange = externalOnRowSelectionChange || ((rows: Set<number>) => {
    if (rows.size === preview.length) selectAll();
    else if (rows.size === 0) deselectAll();
  });

  // Hook: Conflict resolution
  const {
    overwriteToggles,
    handleConflictResolutionChange,
    handleToggleOverwrite,
    duplicateCount,
    areAllDuplicatesSelected
  } = useConflictResolution(
    preview,
    existing,
    uniqueKey,
    conflicts,
    onConflictResolutionChange,
    onOverwriteChange,
    customNormalizer
  );

  // Build existing keys set
  const existingKeys = useMemo(() => {
    const keys = new Set<string>();
    existing.forEach(item => {
      const key = item[uniqueKey];
      if (key) {
        keys.add(normalizeKey(key, customNormalizer));
      }
    });
    return keys;
  }, [existing, uniqueKey, customNormalizer]);

  // Handle row selection toggle
  const handleRowSelectionToggle = (rowIndex: number) => {
    toggleRow(rowIndex);
    if (externalOnRowSelectionChange) {
      const newSelectedRows = new Set<number>(selectedRows);
      if (newSelectedRows.has(rowIndex)) {
        newSelectedRows.delete(rowIndex);
      } else {
        newSelectedRows.add(rowIndex);
      }
      externalOnRowSelectionChange(newSelectedRows);
    }
  };

  // Handle select all rows
  const handleSelectAllRows = () => {
    if (areAllRowsSelected) {
      deselectAll();
      if (externalOnRowSelectionChange) {
        externalOnRowSelectionChange(new Set());
      }
    } else {
      selectAll();
      if (externalOnRowSelectionChange) {
        externalOnRowSelectionChange(new Set(Array.from({ length: preview.length }, (_, i) => i)));
      }
    }
  };

  // Handle company selection
  const handleCompanySelect = (companyId: string) => {
    if (onCompanyChange) {
      const targetRowIds = (selectedRows && selectedRows.size > 0)
        ? Array.from(selectedRows).map(i => String(i))
        : preview.map((_, i) => String(i));
      onCompanyChange(targetRowIds, companyId);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      {/* Header with stats and company selector */}
      <div className="rounded-t-lg bg-gray-50 dark:bg-gray-900/50">
        <div className="py-4 px-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {preview.length} righe trovate
              </span>
              {duplicateCount > 0 && (
                <span className="text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 text-xs rounded-full">
                  {duplicateCount} duplicati
                </span>
              )}
            </div>

            {availableCompanies && availableCompanies.length > 0 && (
              <CompanySelector
                companies={availableCompanies}
                selectedRowsCount={selectedRows.size}
                totalRowsCount={preview.length}
                onCompanySelect={handleCompanySelect}
              />
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-h-96 overflow-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '60px', minWidth: '60px', maxWidth: '80px' }} />
            {columns.map(col => (
              <col key={col.key} style={{ width: colWidths[col.key], minWidth: col.minWidth }} />
            ))}
            {!useSingleCheckboxColumn && <col style={{ width: '70px', minWidth: '70px' }} />}
          </colgroup>

          <TableHeader
            columns={columns}
            colWidths={colWidths}
            onResizeStart={handleResizeStart}
            areAllRowsSelected={areAllRowsSelected}
            areSomeRowsSelected={areSomeRowsSelected}
            onSelectAllRows={handleSelectAllRows}
            useSingleCheckboxColumn={useSingleCheckboxColumn}
          />

          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {preview.map((item, idx) => (
              <TableRow
                key={`import-row-${idx}`}
                item={item}
                index={idx}
                columns={columns}
                colWidths={colWidths}
                existingKeys={existingKeys}
                existing={existing}
                uniqueKey={uniqueKey}
                rowErrors={rowErrors}
                conflicts={conflicts}
                selectedRows={selectedRows}
                overwriteToggles={overwriteToggles}
                useSingleCheckboxColumn={useSingleCheckboxColumn}
                availableCompanies={availableCompanies}
                fieldMappings={fieldMappings}
                onRowSelectionToggle={handleRowSelectionToggle}
                onToggleOverwrite={handleToggleOverwrite}
                onConflictResolutionChange={handleConflictResolutionChange}
                normalizer={customNormalizer}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Error summary */}
      {Object.keys(rowErrors).length > 0 && (
        <div className="mt-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded p-3 text-sm text-red-700 dark:text-red-300">
          <div className="font-medium mb-1">Errori rilevati:</div>
          <ul className="list-disc pl-5 space-y-1">
            {Object.entries(rowErrors).map(([rowIdx, errors]) => (
              <li key={rowIdx}>
                Riga {parseInt(rowIdx) + 1}: {errors.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

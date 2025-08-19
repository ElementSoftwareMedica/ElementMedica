import React from 'react';
import ResizableDataTable from './ResizableDataTable';
import { DataTableColumn } from './DataTable';

export interface ResizableTableColumn<T = any> {
  key: string;
  label: string;
  width?: number;
  minWidth?: number;
  renderHeader?: (col: ResizableTableColumn<T>) => React.ReactNode;
  renderCell?: (row: T, col: ResizableTableColumn<T>, rowIndex: number) => React.ReactNode;
}

interface ResizableTableProps<T = any> {
  columns: ResizableTableColumn<T>[];
  data: T[];
  tableProps?: React.TableHTMLAttributes<HTMLTableElement>;
  tbodyProps?: React.HTMLAttributes<HTMLTableSectionElement>;
  onWidthsChange?: (widths: Record<string, number>) => void;
  initialWidths?: Record<string, number>;
}

/**
 * Legacy compatibility component to maintain backward compatibility with
 * the old ResizableTable while using the newer ResizableDataTable internally.
 */
const LegacyResizableTable = <T extends { id?: string } = any>({
  columns,
  data,
  tableProps = {},
  tbodyProps = {},
  onWidthsChange,
  initialWidths = {},
}: ResizableTableProps<T>) => {
  // Convert from old column format to new format
  const convertedColumns: DataTableColumn<T>[] = columns.map(col => ({
    key: col.key,
    label: col.label,
    width: col.width,
    minWidth: col.minWidth,
    initialWidth: col.width,
    sortable: false,
    renderHeader: col.renderHeader ? 
      () => col.renderHeader!(col) : 
      undefined,
    renderCell: (row: T, rowIndex: number) => 
      col.renderCell ? 
        col.renderCell(row, col, rowIndex) : 
        (row as any)[col.key]
  }));

  // Handle row click from tbodyProps
  const onRowClick = tbodyProps.onClick ? 
    (row: T, index: number) => {
      // This simulates the old behavior by triggering the onClick on the tbody
      if (tbodyProps.onClick) {
        // We can't fully recreate the exact event but we provide the row and index
        tbodyProps.onClick({ 
          target: { closest: () => ({ parentElement: { children: [{ dataset: { index } }] } }) } 
        } as any);
      }
    } : undefined;
  
  return (
    <ResizableDataTable
      columns={convertedColumns}
      data={data}
      tableClassName={tableProps.className}
      onRowClick={onRowClick}
      pagination={false}
      stickyHeader={false}
    />
  );
};

export default LegacyResizableTable; 
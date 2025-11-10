/**
 * @file useImportValidation.ts
 * @description Hook for row validation and error management
 */

import { useState, useCallback, useMemo } from 'react';
import { validateRowsByEntityType } from '../utils/validationHelpers';
import type { ImportPreviewColumn } from '../../ImportPreviewTable/hooks/useResizableColumns';

interface UseImportValidationProps {
  entityType: string;
  csvHeaderMap: Record<string, string>;
  columnOrder?: string[];
  customValidation?: (row: any, index: number) => string[];
}

export const useImportValidation = ({
  entityType,
  csvHeaderMap,
  columnOrder,
  customValidation,
}: UseImportValidationProps) => {
  const [rowErrors, setRowErrors] = useState<{ [rowIdx: number]: string[] }>({});
  const [validationErrors, setValidationErrors] = useState<{ [rowIdx: number]: string[] }>({});

  /**
   * Validate all rows
   */
  const validateRows = useCallback((rows: any[]): { [rowIdx: number]: string[] } => {
    const errors = validateRowsByEntityType(rows, entityType, customValidation);
    setValidationErrors(errors);
    return errors;
  }, [entityType, customValidation]);

  /**
   * Preview columns definition (memoized)
   */
  const previewColumns = useMemo(() => {
    const columns: ImportPreviewColumn[] = [];
    const usedKeys = new Set<string>();
    const fieldToLabelMap = new Map<string, string>();

    // Create map of fields to their preferred labels
    Object.entries(csvHeaderMap).forEach(([header, key]) => {
      if (!fieldToLabelMap.has(key)) {
        fieldToLabelMap.set(key, header);
      } else {
        const currentLabel = fieldToLabelMap.get(key)!;
        // Replace if new header is more readable (contains spaces or uppercase)
        if (header.includes(' ') || /[A-Z]/.test(header)) {
          if (!currentLabel.includes(' ') && !/[A-Z]/.test(currentLabel)) {
            fieldToLabelMap.set(key, header);
          }
        }
      }
    });

    // Use custom column order if provided
    if (columnOrder && columnOrder.length > 0) {
      // Add columns in specified order
      columnOrder.forEach((key: string) => {
        if (fieldToLabelMap.has(key) && !usedKeys.has(key)) {
          const label = fieldToLabelMap.get(key)!;
          columns.push({
            key: key,
            label: label,
            minWidth: 80,
            width: 120,
          });
          usedKeys.add(key);
        }
      });
      
      // Add remaining columns not in order
      fieldToLabelMap.forEach((label, key) => {
        if (!usedKeys.has(key)) {
          columns.push({
            key: key,
            label: label,
            minWidth: 80,
            width: 120,
          });
          usedKeys.add(key);
        }
      });
    } else {
      // Default behavior if no order specified
      fieldToLabelMap.forEach((label, key) => {
        if (!usedKeys.has(key)) {
          columns.push({
            key: key,
            label: label,
            minWidth: 80,
            width: 120,
          });
          usedKeys.add(key);
        }
      });
    }

    return columns;
  }, [csvHeaderMap, columnOrder]);

  /**
   * Clear all validation errors
   */
  const clearErrors = useCallback(() => {
    setRowErrors({});
    setValidationErrors({});
  }, []);

  /**
   * Set errors for specific row
   */
  const setRowError = useCallback((rowIdx: number, errors: string[]) => {
    setRowErrors(prev => ({
      ...prev,
      [rowIdx]: errors,
    }));
  }, []);

  return {
    rowErrors,
    validationErrors,
    previewColumns,
    validateRows,
    clearErrors,
    setRowError,
    setRowErrors,
    setValidationErrors,
  };
};

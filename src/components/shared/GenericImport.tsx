/**
 * @file GenericImport.tsx
 * @description Generic import component with hooks composition
 * Refactored from 748L monolithic component to modular architecture
 * 
 * @pattern Hooks Composition
 * - useImportData: File processing and data management
 * - useImportValidation: Row validation and error handling
 * - useImportState: Import operation state management
 * - useRowSelection: Row selection and operations
 */

import React, { useEffect } from 'react';
import { useToast } from '../../hooks/ui/useToast';
import ImportModal from './modals/ImportModal';
import { normalizeString } from './GenericImport/utils/csvHelpers';
import { useImportData } from './GenericImport/hooks/useImportData';
import { useImportValidation } from './GenericImport/hooks/useImportValidation';
import { useImportState } from './GenericImport/hooks/useImportState';
import { useRowSelection } from './GenericImport/hooks/useRowSelection';
import type { GenericImportProps } from './GenericImport/types';

/**
 * Generic import component for CSV data
 * Supports any entity type with customizable validation and processing
 */
export default function GenericImport<T extends Record<string, any>>({
  entityType,
  uniqueField,
  onImport,
  onClose,
  existingEntities = [],
  csvHeaderMap = {},
  columnOrder,
  title,
  subtitle,
  customValidation,
  csvDelimiter = ';',
  customProcessFile,
  customWarningPanel,
  onSelectedRowsChange,
  availableCompanies,
  onCompanyChange,
  initialPreviewData,
  requiredFields = [],
  conflicts,
  onConflictResolutionChange,
  normalizeKey,
}: GenericImportProps<T>) {
  const toast = useToast();
  const norm = normalizeKey || normalizeString;

  // Default titles
  const defaultTitle = `Importa ${entityType && typeof entityType === 'string' ? entityType.charAt(0).toUpperCase() + entityType.slice(1) : 'Elementi'}`;
  const defaultSubtitle = `Carica un file CSV con i dati dei ${entityType || 'elementi'} da importare`;

  // Hook 1: Data management
  const {
    previewData,
    processFile,
    processImportData,
    updatePreviewData,
    setPreviewData,
  } = useImportData({
    entityType,
    uniqueField,
    existingEntities,
    csvHeaderMap,
    csvDelimiter,
    customProcessFile,
    normalizeKey: norm,
    initialPreviewData,
  });

  // Hook 2: Validation
  const {
    rowErrors,
    validationErrors,
    previewColumns,
    validateRows,
    setRowErrors,
    setValidationErrors,
  } = useImportValidation({
    entityType,
    csvHeaderMap,
    columnOrder,
    customValidation,
  });

  // Hook 3: Import state
  const {
    importing,
    error,
    setImportError,
    setImporting,
    setError,
  } = useImportState({ initialPreviewData });

  // Hook 4: Row selection
  const {
    selectedRows,
    selectedRowsForImport,
    handleToggleOverwrite,
    handleRowSelectionChange,
    setSelectedRows,
    setSelectedRowsForImport,
  } = useRowSelection({
    previewData,
    onSelectedRowsChange,
  });

  /**
   * Sync preview data with initialPreviewData prop
   */
  useEffect(() => {
    if (initialPreviewData !== undefined) {
      setPreviewData([...initialPreviewData]); // Force re-render with new copy
    }
  }, [initialPreviewData, setPreviewData]);

  /**
   * Handle import operation
   */
  const handleImport = async (entities: any[], overwriteIds?: string[]) => {
    if (!entities || entities.length === 0) {
      setError('Nessun dato da importare');
      setImporting(false);
      return;
    }

    // Pass all data - let custom function handle filtering
    const selectedEntities = entities;

    // Verify rows are selected for import
    if (selectedRowsForImport.size === 0) {
      setError('Nessuna riga selezionata per l\'importazione');
      setImporting(false);
      return;
    }

    setImporting(true);
    setError('');

    try {
      const dataToProcess = [...selectedEntities];
      const idsToOverwrite = overwriteIds || [];

      // Process and classify import data
      const { finalPayload } = processImportData(dataToProcess, idsToOverwrite);

      try {
        // Pass selection info to custom function for flexible handling
        await onImport(finalPayload as T[], idsToOverwrite, selectedRowsForImport);

        // Don't show success toast automatically - let parent component decide
        // This allows components to handle conflict modals or other interactions

        // Don't close modal automatically - let parent component decide
        // This allows components to handle conflict modals or other interactions
      } catch (error: unknown) {
        const errorMessage = "Errore durante l'importazione";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error: unknown) {
      setError("Errore imprevisto durante l'importazione");
    } finally {
      setImporting(false);
    }
  };

  return (
    <ImportModal
      title={title || defaultTitle}
      subtitle={subtitle || defaultSubtitle}
      onImport={handleImport}
      onClose={onClose}
      processFile={processFile}
      uniqueKey={String(uniqueField)}
      existingData={existingEntities}
      previewColumns={previewColumns}
      validateRows={validateRows}
      supportedFormats={['.csv']}
      formatsMessage="Formato supportato: CSV (separatore punto e virgola)"
      showBulkSelectButtons={true}
      extraControls={customWarningPanel}
      hidePreviewTable={false}
      useSingleCheckboxColumn={true}
      availableCompanies={availableCompanies}
      initialPreviewData={previewData}
      onOverwriteChange={onSelectedRowsChange}
      selectedRows={selectedRowsForImport}
      onRowSelectionChange={handleRowSelectionChange}
      normalizeKey={norm}
    />
  );
}

// Export utilities for external use
export { defaultProcessFile, normalizeString, normalizeItemFields } from './GenericImport/utils/csvHelpers';
export type { GenericImportProps } from './GenericImport/types';

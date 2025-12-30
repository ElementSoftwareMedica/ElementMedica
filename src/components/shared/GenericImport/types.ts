/**
 * @file types.ts
 * @description TypeScript type definitions for GenericImport component
 */

import { ImportPreviewColumn } from '../ImportPreviewTable';

/**
 * Configuration props for GenericImport component
 * Supports generic entity type T for type-safe imports
 */
export interface GenericImportProps<T extends Record<string, any>> {
  /** Type of entity being imported (e.g., 'dipendenti', 'aziende', 'corsi') */
  entityType: string;
  
  /** Field name used for uniqueness validation and conflict detection */
  uniqueField: keyof T | string;
  
  /** Callback invoked when import is confirmed */
  onImport: (
    data: T[], 
    overwriteIds?: string[], 
    selectedRows?: Set<number>
  ) => Promise<void>;
  
  /** Callback to close the import modal */
  onClose: () => void;
  
  /** Array of existing entities for conflict detection */
  existingEntities?: T[];
  
  /** Mapping from CSV headers to entity field names */
  csvHeaderMap?: Record<string, string>;
  
  /** Custom column ordering for preview table */
  columnOrder?: string[];
  
  /** Custom title for the import modal */
  title?: string;
  
  /** Custom subtitle for the import modal */
  subtitle?: string;
  
  /** Custom validation function for each row */
  customValidation?: (row: any, index: number) => string[];
  
  /** CSV delimiter character (default: ';') */
  csvDelimiter?: string;
  
  /** Custom file processing function (overrides default CSV parsing) */
  customProcessFile?: (file: File) => Promise<any[]>;
  
  /** Custom warning panel React node */
  customWarningPanel?: React.ReactNode;
  
  /** Callback when selected rows for overwrite change */
  onSelectedRowsChange?: (selectedIds: string[]) => void;
  
  /** Available companies for batch assignment */
  availableCompanies?: Array<{ id: string; name: string }>;
  
  /** Callback when company assignment changes */
  onCompanyChange?: (companyId: string, rowIndices: number[]) => void;
  
  /** Initial preview data (for pre-populated imports) */
  initialPreviewData?: any[];
  
  /** Required fields that must be present in each row */
  requiredFields?: string[];
  
  /** Conflict information for specific rows */
  conflicts?: { [rowIdx: number]: ConflictInfo };
  
  /** Callback when conflict resolution changes */
  onConflictResolutionChange?: (rowIdx: number, resolution: ConflictResolution) => void;
  
  /** Custom normalization function for unique field comparison */
  normalizeKey?: (value: any) => string;
}

/**
 * Import state management
 */
export interface ImportState {
  /** Preview data from parsed CSV */
  previewData: any[];
  
  /** Rows selected for overwrite */
  selectedRows: string[];
  
  /** Row indices selected for import */
  selectedRowsForImport: Set<number>;
  
  /** Import operation in progress */
  importing: boolean;
  
  /** Global error message */
  error: string;
  
  /** Row-specific errors */
  rowErrors: { [rowIdx: number]: string[] };
  
  /** Validation errors for each row */
  validationErrors: { [rowIdx: number]: string[] };
}

/**
 * Validation result for a single row
 */
export interface ValidationResult {
  /** Row index */
  index: number;
  
  /** Array of error messages */
  errors: string[];
  
  /** Whether the row is valid */
  isValid: boolean;
}

/**
 * Conflict information for duplicate entities
 */
export interface ConflictInfo {
  /** Existing entity that conflicts */
  existingEntity: any;
  
  /** Type of conflict */
  type: 'duplicate' | 'partial';
  
  /** Field that caused the conflict */
  field: string;
  
  /** Suggested resolution */
  suggestedResolution?: ConflictResolution;
}

/**
 * Conflict resolution options
 */
export type ConflictResolution = 'skip' | 'overwrite' | 'merge' | 'create-new';

/**
 * Processed import data classification
 */
export interface ProcessedImportData {
  /** New entities to create */
  newEntities: any[];
  
  /** Entities to update (with IDs) */
  updateEntities: any[];
  
  /** Entities skipped due to conflicts */
  skippedEntities: any[];
  
  /** Final payload for API call */
  finalPayload: any[];
  
  /** IDs to overwrite */
  idsToOverwrite: string[];
}

/**
 * CSV parsing configuration
 */
export interface CsvParseConfig {
  /** Delimiter character */
  delimiter: string;
  
  /** Header row present */
  header: boolean;
  
  /** Skip empty lines */
  skipEmptyLines: boolean;
  
  /** Transform headers callback */
  transformHeader?: (header: string) => string;
}

/**
 * CSV parsing result
 */
export interface CsvParseResult {
  /** Parsed data rows */
  data: any[];
  
  /** Detected headers */
  headers: string[];
  
  /** Parsing errors */
  errors: Array<{ message: string; row?: number }>;
  
  /** Metadata */
  meta: {
    delimiter: string;
    linebreak: string;
    aborted: boolean;
    truncated: boolean;
  };
}

/**
 * Entity field mapping
 */
export interface FieldMapping {
  /** CSV header name */
  csvHeader: string;
  
  /** Entity field name */
  entityField: string;
  
  /** Required field */
  required: boolean;
  
  /** Data type */
  type?: 'string' | 'number' | 'date' | 'boolean';
  
  /** Transformation function */
  transform?: (value: any) => any;
}

/**
 * Import statistics
 */
export interface ImportStats {
  /** Total rows in CSV */
  totalRows: number;
  
  /** Valid rows */
  validRows: number;
  
  /** Invalid rows */
  invalidRows: number;
  
  /** New entities */
  newEntities: number;
  
  /** Updated entities */
  updatedEntities: number;
  
  /** Skipped entities */
  skippedEntities: number;
  
  /** Conflicts detected */
  conflicts: number;
}

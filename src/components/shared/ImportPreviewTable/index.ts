// Hooks
export { useResizableColumns } from './hooks/useResizableColumns';
export { useRowSelection } from './hooks/useRowSelection';
export { useConflictResolution } from './hooks/useConflictResolution';
export type { ImportPreviewColumn } from './hooks/useResizableColumns';
export type { ConflictInfo } from './hooks/useConflictResolution';

// Components
export { CompanySelector } from './components/CompanySelector';
export { ConflictResolver } from './components/ConflictResolver';
export { TableHeader } from './components/TableHeader';
export { TableRow } from './components/TableRow';

// Utils
export {
  normalizeKey,
  arraysEqual,
  togglesShallowEqual,
  detectDuplicates,
  formatDateForComparison,
  normalizeBoolean,
  formatBooleanForDisplay
} from './utils/importHelpers';

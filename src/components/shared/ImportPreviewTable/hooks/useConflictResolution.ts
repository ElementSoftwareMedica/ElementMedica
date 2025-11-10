import { useState, useMemo, useEffect, useRef } from 'react';
import { normalizeKey, detectDuplicates, arraysEqual, togglesShallowEqual } from '../utils/importHelpers';

export interface ConflictInfo {
  type: 'duplicate' | 'invalid_company';
  existingPerson?: any;
  suggestedCompanies?: Array<{ id: string; name?: string; ragioneSociale?: string }>;
  resolution?: 'skip' | 'overwrite' | 'assign_company';
  selectedCompanyId?: string;
  selectedCompanyName?: string;
}

interface UseConflictResolutionReturn {
  conflicts: { [rowIdx: number]: ConflictInfo };
  overwriteToggles: { [id: string]: boolean };
  handleConflictResolutionChange: (rowIdx: number, resolution: Partial<ConflictInfo>) => void;
  handleToggleOverwrite: (id: string) => void;
  selectAllOverwrites: () => void;
  deselectAllOverwrites: () => void;
  duplicateCount: number;
  areAllDuplicatesSelected: boolean;
}

/**
 * Hook for managing conflict resolution in import preview
 * 
 * Handles duplicate detection, conflict resolution state, and overwrite toggles
 * 
 * @param preview - Preview data array
 * @param existing - Existing data array
 * @param uniqueKey - Key field to check for duplicates
 * @param conflicts - External conflicts object
 * @param onConflictResolutionChange - Callback for conflict resolution changes
 * @param onOverwriteChange - Callback for overwrite selection changes
 * @param normalizer - Optional key normalizer function
 * @returns Conflict state and manipulation methods
 */
export function useConflictResolution<T extends Record<string, any>>(
  preview: T[],
  existing: T[],
  uniqueKey: string,
  conflicts: { [rowIdx: number]: ConflictInfo } | undefined,
  onConflictResolutionChange?: (rowIdx: number, resolution: Partial<ConflictInfo>) => void,
  onOverwriteChange?: (selected: string[]) => void,
  normalizer?: (v: unknown) => string
): UseConflictResolutionReturn {
  const [overwriteToggles, setOverwriteToggles] = useState<{ [id: string]: boolean }>({});

  // Normalize function
  const norm = (v: any) => normalizeKey(v, normalizer);

  // Build existing keys set for duplicate detection
  const existingKeys = useMemo(() => {
    const keys = new Set<string>();
    existing.forEach(item => {
      const key = item[uniqueKey];
      if (key) {
        keys.add(norm(key));
      }
    });
    return keys;
  }, [existing, uniqueKey, normalizer]);

  // Signature for tracking changes to preview/existing
  const previewSignature = useMemo(() => {
    try {
      return preview.map(item => (item && item[uniqueKey] ? norm(item[uniqueKey]) : '')).join('|');
    } catch {
      return String(preview.length);
    }
  }, [preview, uniqueKey, normalizer]);

  const existingSignature = useMemo(() => {
    const arr = Array.from(existingKeys);
    arr.sort();
    return arr.join('|');
  }, [existingKeys]);

  const prevPreviewSigRef = useRef<string>('');
  const prevExistingSigRef = useRef<string>('');
  const lastReportedIdsRef = useRef<string[]>([]);

  // Initialize/sync overwrite toggles when preview/existing change
  useEffect(() => {
    const previewChanged = prevPreviewSigRef.current !== previewSignature;
    const existingChanged = prevExistingSigRef.current !== existingSignature;

    if (!previewChanged && !existingChanged) return;

    setOverwriteToggles(prev => {
      const computed: { [id: string]: boolean } = { ...prev };

      preview.forEach(item => {
        if (item && (item as any).id) {
          const idStr = String((item as any).id);
          if (!(idStr in computed)) computed[idStr] = true;
          return;
        }
        const key = item?.[uniqueKey];
        if (key && existingKeys.has(norm(key))) {
          const existingItem = existing.find(e => norm(e[uniqueKey]) === norm(key));
          const exId = existingItem && (existingItem as any).id ? String((existingItem as any).id) : undefined;
          if (exId && !(exId in computed)) {
            computed[exId] = true;
          }
        }
      });

      if (togglesShallowEqual(prev, computed)) return prev;
      return computed;
    });

    prevPreviewSigRef.current = previewSignature;
    prevExistingSigRef.current = existingSignature;
  }, [previewSignature, existingSignature, preview, existing, uniqueKey, existingKeys, norm]);

  // Notify changes to parent
  useEffect(() => {
    if (!onOverwriteChange) return;
    const selectedIds = Object.keys(overwriteToggles).filter(key => overwriteToggles[key]);
    if (arraysEqual(selectedIds, lastReportedIdsRef.current)) return;
    lastReportedIdsRef.current = selectedIds;
    onOverwriteChange(selectedIds);
  }, [overwriteToggles, onOverwriteChange]);

  // Handle conflict resolution change
  const handleConflictResolutionChange = (rowIdx: number, resolution: Partial<ConflictInfo>) => {
    if (onConflictResolutionChange) {
      onConflictResolutionChange(rowIdx, resolution);
    }
  };

  // Handle toggle overwrite
  const handleToggleOverwrite = (id: string) => {
    setOverwriteToggles(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Select all overwrites
  const selectAllOverwrites = () => {
    const allToggles: { [id: string]: boolean } = {};
    
    preview.forEach(item => {
      const key = item[uniqueKey];
      if (key && existingKeys.has(norm(key))) {
        const existingItem = existing.find(e => norm(e[uniqueKey]) === norm(key));
        if (existingItem && existingItem.id) {
          allToggles[String(existingItem.id)] = true;
        }
      }
    });
    
    setOverwriteToggles(allToggles);
    
    if (onOverwriteChange) {
      const selectedIds = Object.keys(allToggles).filter(key => allToggles[key]);
      onOverwriteChange(selectedIds);
    }
  };

  // Deselect all overwrites
  const deselectAllOverwrites = () => {
    const noToggles: { [id: string]: boolean } = {};
    
    preview.forEach(item => {
      const key = item[uniqueKey];
      if (key && existingKeys.has(norm(key))) {
        const existingItem = existing.find(e => norm(e[uniqueKey]) === norm(key));
        if (existingItem && existingItem.id) {
          noToggles[String(existingItem.id)] = false;
        }
      }
    });
    
    setOverwriteToggles(noToggles);
    
    if (onOverwriteChange) {
      onOverwriteChange([]);
    }
  };

  // Calculate duplicate count and selection state
  const duplicateCount = preview.filter(item => 
    item[uniqueKey] && existingKeys.has(norm(item[uniqueKey]))
  ).length;

  const selectedCount = Object.values(overwriteToggles).filter(Boolean).length;
  const areAllDuplicatesSelected = duplicateCount > 0 && selectedCount === duplicateCount;

  return {
    conflicts: conflicts || {},
    overwriteToggles,
    handleConflictResolutionChange,
    handleToggleOverwrite,
    selectAllOverwrites,
    deselectAllOverwrites,
    duplicateCount,
    areAllDuplicatesSelected
  };
}

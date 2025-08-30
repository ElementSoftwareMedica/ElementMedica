import { useState, useCallback } from 'react';
import { PersonData, ConflictInfo, ImportValidationResult } from '../../types/import/personImportTypes';
import { ValidationService } from '../../services/import/validationService';
import { 
  detectDuplicates,
  detectInvalidCompanies,
  updateConflictResolution,
  resolveConflicts,
  getConflictSummary,
  autoDeselectDuplicateConflicts
} from '../../services/import/conflictDetectionService';
import { CsvMappingService } from '../../services/import/csvMappingService';

/**
 * Hook personalizzato per gestire la logica di importazione delle persone
 */
export const usePersonImport = () => {
  // Stati per la gestione dell'importazione
  const [isLoading, setIsLoading] = useState(false);
  const [validatedData, setValidatedData] = useState<PersonData[]>([]);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [validationErrors, setValidationErrors] = useState<ImportValidationResult>({});
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  /**
   * Rileva tutti i tipi di conflitti
   */
  const detectConflicts = useCallback((
    persons: PersonData[], 
    existingCompanies: Array<{ id: string; name: string }>,
    existingPersons: Array<{ id: string; email: string; firstName: string; lastName: string }> = []
  ): ConflictInfo[] => {
    const companyOptions = CsvMappingService.convertCompaniesToOptions(existingCompanies);
    const duplicateConflicts = detectDuplicates(persons, existingPersons);
    const companyConflicts = detectInvalidCompanies(persons, companyOptions);
    
    return [...duplicateConflicts, ...companyConflicts];
  }, []);

  /**
   * Processa il file CSV e valida i dati
   */
  const processFile = useCallback(async (
    csvData: Array<Record<string, unknown>>, 
    existingCompanies: Array<{ id: string; name: string }>,
    existingPersons: Array<{ id: string; email: string; firstName: string; lastName: string }> = []
  ): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    
    try {
      // Valida la struttura dei dati
      const structureValidation = CsvMappingService.validateImportStructure(csvData);
      if (!structureValidation.isValid) {
        return { 
          success: false, 
          message: structureValidation.errors.join(', ') 
        };
      }

      // Pulisce e normalizza i dati
      const cleanedData = csvData
        .filter((person: Record<string, unknown>) => !CsvMappingService.isEmptyTemplate(person))
        .map((person: Record<string, unknown>) => {
          const cleaned = CsvMappingService.cleanPersonData(person);
          const formatted = CsvMappingService.applyTitleCaseFormatting(cleaned);
          return CsvMappingService.resolveCompanyId(formatted, existingCompanies);
        });

      // Valida i dati delle persone
      const validationResult = ValidationService.validatePersons(cleanedData);
      setValidationErrors(validationResult);

      // Rileva i conflitti
      const detectedConflicts = detectConflicts(cleanedData, existingCompanies, existingPersons);
      setConflicts(detectedConflicts);

      // Deseleziona automaticamente le righe con conflitti di duplicato
      const initialSelection = cleanedData.map(() => true);
      const autoDeselected = autoDeselectDuplicateConflicts(initialSelection, detectedConflicts);
      const selectedSet = new Set<number>();
      autoDeselected.forEach((selected, index) => {
        if (selected) selectedSet.add(index);
      });
      setSelectedRows(selectedSet);

      setValidatedData(cleanedData);
      
      return { success: true };
    } catch (error) {
      console.error('Errore durante il processamento del file:', error);
      return { 
        success: false, 
        message: 'Errore durante il processamento del file' 
      };
    } finally {
      setIsLoading(false);
    }
  }, [detectConflicts]);

  /**
   * Risolve un conflitto specifico
   */
  const resolveConflict = useCallback((
    conflictIndex: number, 
    resolution: 'skip' | 'overwrite' | 'company',
    companyId?: string
  ) => {
    setConflicts(prevConflicts => 
      updateConflictResolution(prevConflicts, conflictIndex, resolution, companyId)
    );
  }, []);

  /**
   * Aggiorna la selezione delle righe
   */
  const updateRowSelection = useCallback((rowIndex: number, selected: boolean) => {
    setSelectedRows(prev => {
      const newSelection = new Set(prev);
      if (selected) {
        newSelection.add(rowIndex);
      } else {
        newSelection.delete(rowIndex);
      }
      return newSelection;
    });
  }, []);

  /**
   * Prepara i dati per l'importazione finale
   */
  const prepareImportData = useCallback(() => {
    // Filtra solo le righe selezionate
    const selectedData = validatedData.filter((_, index) => selectedRows.has(index));
    
    // Risolve i conflitti
    const resolvedData = resolveConflicts(selectedData, conflicts);

    // Prepara i dati per l'API
    return resolvedData.map((person: PersonData) => CsvMappingService.prepareForAPI(person));
  }, [validatedData, conflicts, selectedRows]);

  /**
   * Resetta lo stato dell'hook
   */
  const resetState = useCallback(() => {
    setValidatedData([]);
    setConflicts([]);
    setValidationErrors({});
    setSelectedRows(new Set());
    setIsLoading(false);
  }, []);

  /**
   * Ottiene le statistiche di importazione
   */
  const getImportStats = useCallback(() => {
    const validationSummary = ValidationService.getValidationSummary(validationErrors);
    const conflictSummary = getConflictSummary(conflicts);
    
    return {
      totalRows: validatedData.length,
      selectedRows: selectedRows.size,
      validRows: validatedData.length - validationSummary.affectedRows,
      conflictsCount: conflictSummary.total,
      errorsCount: validationSummary.totalErrors
    };
  }, [validatedData, selectedRows, validationErrors, conflicts]);

  return {
    // Stati
    isLoading,
    validatedData,
    conflicts,
    validationErrors,
    selectedRows,
    
    // Azioni
    processFile,
    resolveConflict,
    updateRowSelection,
    prepareImportData,
    resetState,
    
    // Utility
    getImportStats
  };
};
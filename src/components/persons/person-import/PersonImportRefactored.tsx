/**
 * Componente PersonImport refactorizzato - Versione modulare e ottimizzata
 * 
 * Questo componente è stato refactorizzato per migliorare:
 * - Manutenibilità: Codice diviso in moduli specializzati
 * - Leggibilità: Logica separata per responsabilità
 * - Testabilità: Funzioni pure e componenti isolati
 * - Performance: Ottimizzazione delle operazioni sui dati
 */

import React, { useState, useCallback, useEffect } from 'react';
import ImportModal from '../../shared/modals/ImportModal';
import PersonImportConflictModal from '../PersonImportConflictModal';
import { PersonData } from '../../../types/import/personImportTypes';
import { Company } from '../../../types';

// Import dei moduli specializzati
import { PREVIEW_COLUMNS } from './constants';
import { validatePersons } from './validationUtils';
import { ConflictInfo } from './conflictUtils';
import { 
  processPersonImportFile, 
  prepareDataForImport, 
  formatPersonsForAPI 
} from './dataProcessing';

interface PersonImportProps {
  onImport: (persons: PersonData[], overwriteIds?: string[]) => Promise<void>;
  onClose: () => void;
  existingPersons?: PersonData[];
  existingCompanies?: Company[];
  onRefreshData?: () => Promise<void>;
}

const PersonImportRefactored: React.FC<PersonImportProps> = ({
  onImport,
  onClose,
  existingPersons = [],
  existingCompanies = [],
  onRefreshData
}) => {
  // State management
  const [previewData, setPreviewData] = useState<PersonData[]>([]);
  const [conflicts, setConflicts] = useState<{ [index: number]: ConflictInfo }>({});
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Inizializza tutte le righe come selezionate quando cambiano i dati di preview
  useEffect(() => {
    if (previewData.length > 0) {
      setSelectedRows(new Set(Array.from({ length: previewData.length }, (_, i) => i)));
    }
  }, [previewData]);

  // Gestore per il cambio di selezione delle righe
  const handleRowSelectionChange = (newSelectedRows: Set<number>) => {
    setSelectedRows(newSelectedRows);
  };

  // Funzione personalizzata per processare il file
  const customProcessFile = useCallback(async (file: File) => {
    const result = await processPersonImportFile(file, existingCompanies, existingPersons);
    
    setConflicts(result.conflicts);
    setPreviewData(result.data);
    setSelectedRows(result.selectedRows);
    
    return result.data;
  }, [existingCompanies, existingPersons]);

  // Aggiorna la risoluzione di un conflitto
  const updateConflictResolution = (index: number, resolution: Partial<ConflictInfo>) => {
    setConflicts(prev => ({
      ...prev,
      [index]: { ...prev[index], ...resolution }
    }));
  };

  // Gestione dell'import
  const handleImport = useCallback(async (persons: PersonData[], overwriteIds?: string[], importSelectedRows?: Set<number>) => {
    try {
      // Usa le righe selezionate passate dal modal, con fallback allo state locale
      const activeSelectedRows = importSelectedRows || selectedRows;
      
      // Prepara i dati applicando le risoluzioni dei conflitti
      const { resolvedPersons, finalOverwriteIds } = prepareDataForImport(
        persons,
        conflicts,
        activeSelectedRows,
        overwriteIds
      );

      // Formatta i dati per l'API
      const formattedPersons = formatPersonsForAPI(resolvedPersons);

      await onImport(formattedPersons, finalOverwriteIds);
      
      // Aggiorna i dati esistenti dopo l'importazione per rilevare nuovi duplicati
      if (onRefreshData) {
        await onRefreshData();
      }
      
      onClose();
    } catch (error) {
      throw error;
    }
  }, [conflicts, selectedRows, onImport, onClose, onRefreshData]);



  // Gestione dell'assegnazione delle aziende tramite dropdown
  const handleCompanyChange = useCallback((selectedRowIds: string[], companyId: string) => {
    // Trova l'azienda selezionata
    const selectedCompany = existingCompanies.find(c => c.id === companyId);
    if (!selectedCompany) {
      return;
    }
    
    const companyName = selectedCompany.ragioneSociale || selectedCompany.name;
    
    // Aggiorna i dati di preview per le righe selezionate
    setPreviewData(prevData => {
      const newData = [...prevData];
      
      selectedRowIds.forEach(rowIdStr => {
        const rowIndex = parseInt(rowIdStr);
        
        if (rowIndex >= 0 && rowIndex < newData.length) {
          newData[rowIndex] = {
            ...newData[rowIndex],
            companyId: companyId,
            companyName: companyName
          };
          
          // Rimuovi eventuali conflitti di azienda non valida per questa riga
          if (conflicts[rowIndex] && conflicts[rowIndex].type === 'invalid_company') {
            setConflicts(prevConflicts => {
              const newConflicts = { ...prevConflicts };
              delete newConflicts[rowIndex];
              return newConflicts;
            });
          }
        }
      });
      
      return newData;
    });
  }, [existingCompanies, conflicts]);

  // Controlli extra per il modal (vuoti come richiesto)
  const extraControls = (
    <div className="mb-4">
      {/* Sezione rimossa come richiesto dall'utente */}
    </div>
  );

  return (
    <>
      <ImportModal
        title="Importa Persone"
        subtitle="Carica un file CSV per importare le persone nel sistema"
        onImport={handleImport}
        onClose={onClose}
        processFile={customProcessFile}
        uniqueKey="taxCode"
        existingData={existingPersons}
        previewColumns={PREVIEW_COLUMNS}
        validateRows={validatePersons}
        supportedFormats={['.csv']}
        formatsMessage="Formato supportato: CSV (separatore punto e virgola)"
        showBulkSelectButtons={true}
        extraControls={extraControls}
        hidePreviewTable={false}
        useSingleCheckboxColumn={false}
        initialPreviewData={previewData}
        conflicts={conflicts}
        onConflictResolutionChange={updateConflictResolution}
        selectedRows={selectedRows}
        onRowSelectionChange={handleRowSelectionChange}
        availableCompanies={existingCompanies}
        onCompanyChange={handleCompanyChange}
      />
      
      {/* Modal per gestire i conflitti di duplicati */}
      {Object.keys(conflicts).length > 0 && (
        <PersonImportConflictModal
          isOpen={Object.keys(conflicts).length > 0}
          conflicts={Object.entries(conflicts).map(([index, conflictInfo]) => ({
            person: previewData[parseInt(index)],
            index: parseInt(index),
            type: conflictInfo.type,
            existingPerson: conflictInfo.existingPerson,
            suggestedCompanies: conflictInfo.suggestedCompanies
          }))}
          onResolve={(resolutions) => {
            // Converte le risoluzioni dal formato del modal al formato interno
            resolutions.forEach(resolution => {
              updateConflictResolution(resolution.index, {
                resolution: resolution.action,
                selectedCompanyId: resolution.companyId,
                selectedCompanyName: resolution.companyName
              });
            });
          }}
          onClose={() => {
            // Chiudi il modal dei conflitti ma mantieni aperto l'ImportModal
          }}
          existingCompanies={existingCompanies}
        />
      )}
    </>
  );
};

export default PersonImportRefactored;
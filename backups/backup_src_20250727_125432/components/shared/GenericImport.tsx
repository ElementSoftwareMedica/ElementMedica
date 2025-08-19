import React, { useState } from 'react';
import Papa from 'papaparse';
import ImportModal from './ImportModal';
import { ImportPreviewColumn } from './ImportPreviewTable';
import { Upload } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

export interface GenericImportProps<T> {
  /** Tipo di entità da importare (es. "dipendenti", "aziende") */
  entityType: string;
  /** Campo univoco per identificare un'entità esistente */
  uniqueField: keyof T | string;
  /** Funzione di callback per l'importazione */
  onImport: (data: T[], overwriteIds?: string[]) => Promise<void>;
  /** Funzione di callback per la chiusura */
  onClose: () => void;
  /** Array di entità esistenti */
  existingEntities?: T[];
  /** Mappatura dei campi CSV ai campi dell'entità */
  csvHeaderMap?: Record<string, string>;
  /** Titolo del componente */
  title?: string;
  /** Sottotitolo del componente */
  subtitle?: string;
  /** Funzione di validazione personalizzata */
  customValidation?: (entity: T, index?: number) => string[];
  /** Campi obbligatori */
  requiredFields?: string[];
  /** Delimitatore CSV */
  csvDelimiter?: string;
  /** Dati di debug per la validazione */
  validationDebug?: {[key: string]: {matched: boolean, alternatives: string[]}};
  /** Funzione personalizzata per processare il file CSV */
  customProcessFile?: (file: File) => Promise<T[]>;
  /** Componente React da mostrare come pannello di avviso personalizzato */
  customWarningPanel?: React.ReactNode;
  /** Funzione chiamata quando cambiano le righe selezionate */
  onSelectedRowsChange?: (selectedIds: string[]) => void;
  /** Lista delle aziende disponibili per il menu a pillola */
  availableCompanies?: Array<{id: string, name: string}>;
  /** Funzione per gestire il cambio di azienda per le righe selezionate */
  onCompanyChange?: (selectedIds: string[], companyId: string) => void;
  /** Dati iniziali per la preview */
  initialPreviewData?: T[];
}

/**
 * Normalizza una stringa rimuovendo spazi e convertendo in maiuscolo
 */
const normalizeString = (str: string | null | undefined): string => {
  if (str === null || str === undefined) return '';
  return String(str).replace(/\s/g, '').toUpperCase();
};

/**
 * Processa un file CSV con le opzioni predefinite
 */
export const defaultProcessFile = async (file: File, csvHeaderMap: Record<string, string>, csvDelimiter = ';'): Promise<any[]> => {
  const text = await file.text();
  const result = Papa.parse(text, { header: true, delimiter: csvDelimiter });
  
  if (result.errors.length > 0) {
    throw new Error(`Errore nel parsing del file CSV: ${result.errors[0].message}`);
  }
  
  // Verifica che ci siano dati
  if (!result.data || result.data.length === 0) {
    throw new Error('Il file CSV non contiene dati.');
  }
  
  // Verifica che le intestazioni del CSV corrispondano alle mappature previste
  const csvHeaders = Object.keys(result.data[0] || {});
  const mappedHeaders = Object.keys(csvHeaderMap);
  
  // Verifica se almeno una delle intestazioni richieste è presente
  const foundHeaders = mappedHeaders.filter(header => 
    csvHeaders.some(csvHeader => csvHeader.trim().toLowerCase() === header.toLowerCase())
  );
  
  if (foundHeaders.length === 0) {
    throw new Error(`Il formato del CSV non è compatibile. Intestazioni attese: ${mappedHeaders.join(', ')}. Intestazioni trovate: ${csvHeaders.join(', ')}`);
  }
  
  // Se abbiamo meno del 30% delle intestazioni richieste, mostra un avviso
  if (foundHeaders.length < mappedHeaders.length * 0.3) {
    throw new Error(`Formato del file non compatibile: solo ${foundHeaders.length} delle ${mappedHeaders.length} intestazioni attese sono state trovate. Intestazioni attese: ${mappedHeaders.join(', ')}. Intestazioni trovate: ${csvHeaders.join(', ')}`);
  }
  
  // Mapping dei campi secondo la struttura definita
  return (result.data as any[]).map(row => {
    const mapped: Record<string, any> = {};
    Object.entries(row).forEach(([k, v]) => {
      const key = csvHeaderMap[k.trim()] || k.trim();
      // Ignora valori vuoti
      if (v !== null && v !== undefined && v !== '') {
        mapped[key] = v.toString().trim();
      }
    });
    return mapped;
  });
};

// Funzione per verificare se un errore è un errore di conflitto (409)
const isConflictError = (error: any): boolean => {
  return error?.response?.status === 409;
};

// Funzione per verificare se una stringa è una data valida in formato ISO 8601
export const isValidISODate = (dateStr: string): boolean => {
  if (!dateStr) return true; // Consideriamo valide le date vuote
  
  // Verifica il formato ISO 8601 (YYYY-MM-DD)
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;
  if (!isoDateRegex.test(dateStr)) return false;
  
  // Verifica se la data è valida
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
};

// Funzione per validare i campi comuni che possono causare errori 500
export const validateCommonFields = (item: Record<string, any>): string[] => {
  const errors: string[] = [];
  
  // Controllo campi data
  const dateFields = ['birthDate', 'birth_date', 'data_nascita', 'date', 'startDate', 'endDate'];
  dateFields.forEach(field => {
    if (item[field] && !isValidISODate(item[field])) {
      errors.push(`Il campo ${field} contiene una data non valida: ${item[field]}`);
    }
  });
  
  // Altri controlli per campi che potrebbero causare errori 500
  if (item.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email)) {
    errors.push('Il formato dell\'email non è valido');
  }
  
  return errors;
};

/**
 * Normalizza i campi di un elemento in base alla mappatura CSV
 * @param item L'elemento da normalizzare
 * @param csvHeaderMap La mappatura dei campi CSV ai campi dell'entità
 * @returns Un nuovo oggetto con i campi normalizzati
 */
const normalizeItemFields = (
  item: Record<string, any>,
  csvHeaderMap: Record<string, string>
): Record<string, any> => {
  const result: Record<string, any> = {};
  
  // Per ogni campo nella mappatura, cerca il valore nell'item
  for (const [header, field] of Object.entries(csvHeaderMap)) {
    if (item[field] !== undefined) {
      result[field] = item[field];
    }
  }
  
  // Copia anche i campi non mappati
  for (const [key, value] of Object.entries(item)) {
    if (result[key] === undefined) {
      result[key] = value;
    }
  }
  
  return result;
};

/**
 * Componente per l'importazione generica di entità
 */
export default function GenericImport<T extends Record<string, any>>({
  entityType,
  uniqueField,
  onImport,
  onClose,
  existingEntities = [],
  csvHeaderMap = {},
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
  requiredFields = []
}: GenericImportProps<T>) {
  const defaultTitle = `Importa ${entityType && typeof entityType === 'string' ? entityType.charAt(0).toUpperCase() + entityType.slice(1) : 'Elementi'}`;
  const defaultSubtitle = `Carica un file CSV con i dati dei ${entityType || 'elementi'} da importare`;
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>(initialPreviewData || []);
  const { showToast } = useToast();
  // Aggiungiamo gli stati mancanti
  const [importing, setImporting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [rowErrors, setRowErrors] = useState<{ [rowIdx: number]: string[] }>({});
  const [validationErrors, setValidationErrors] = useState<{ [rowIdx: number]: string[] }>({});

  // Definizione delle colonne per la tabella di anteprima
  const previewColumns: ImportPreviewColumn[] = Object.entries(csvHeaderMap).map(([header, key]) => ({
    key,
    label: header,
    minWidth: 80,
    width: 120,
  }));

  // Funzione per processare il file CSV (usiamo customProcessFile se fornito)
  const processFile = async (file: File): Promise<any[]> => {
    if (customProcessFile) {
      const data = await customProcessFile(file);
      setPreviewData(data);
      return data;
    }
    
    const mappedEntities = await defaultProcessFile(file, csvHeaderMap, csvDelimiter);

    // Aggiungiamo gli ID delle entità esistenti per il merge basato sul campo univoco
    const processedData = mappedEntities.map(entity => {
      if (!entity[String(uniqueField)]) return entity;
      
      // Normalizza il valore del campo univoco per il confronto
      const normalizedValue = normalizeString(entity[String(uniqueField)]);
      
      // Trova l'entità esistente con lo stesso valore normalizzato per il campo univoco
      const existingEntity = existingEntities.find(existing => {
        const existingValue = existing[uniqueField];
        const existingNormalizedValue = normalizeString(existingValue as string | null | undefined);
        const matchFound = existingNormalizedValue === normalizedValue;
        
        return matchFound;
      });
      
      if (existingEntity) {
        // Manteniamo l'ID originale per permettere la sovrascrittura
        return { ...entity, id: existingEntity.id, _isExisting: true };
      }
      
      return entity;
    });
    
    setPreviewData(processedData);
    return processedData;
  };

  // Validazione delle righe
  const validateRows = (rows: any[]): { [rowIdx: number]: string[] } => {
    const errors: { [rowIdx: number]: string[] } = {};
    
    rows.forEach((row, idx) => {
      const rowErrors: string[] = [];
      
      // Verifica con la funzione di validazione personalizzata se disponibile
      if (customValidation) {
        const customErrors = customValidation(row, idx);
        if (customErrors.length > 0) {
          rowErrors.push(...customErrors);
        }
      } else {
        // Validazione base predefinita
        // Per le aziende
        if (entityType === 'aziende') {
          if (!row.ragione_sociale) {
            rowErrors.push('Ragione Sociale obbligatoria');
          }
          
          if (!row.piva && !row.codiceFiscale && !row.codice_fiscale) {
            rowErrors.push('P.IVA o Codice Fiscale obbligatori');
          }
          
          if (row.piva && (row.piva.length < 8 || row.piva.length > 13)) {
            rowErrors.push('P.IVA non valida');
          }
        } 
        // Per i dipendenti
        else if (entityType === 'dipendenti') {
          if (!row.firstName && !row.nome) {
            rowErrors.push('Nome obbligatorio');
          }
          
          if (!row.lastName && !row.cognome) {
            rowErrors.push('Cognome obbligatorio');
          }
          
          if (!row.codiceFiscale && !row.codice_fiscale) {
            rowErrors.push('Codice Fiscale obbligatorio');
          } else if ((row.codiceFiscale && row.codiceFiscale.length !== 16) || (row.codice_fiscale && row.codice_fiscale.length !== 16)) {
            rowErrors.push('Codice Fiscale deve essere di 16 caratteri');
          }
        }
        // Per i formatori
        else if (entityType === 'formatori') {
          if (!row.firstName && !row.nome) {
            rowErrors.push('Nome obbligatorio');
          }
          
          if (!row.lastName && !row.cognome) {
            rowErrors.push('Cognome obbligatorio');
          }
          
          if (!row.codiceFiscale && !row.codice_fiscale) {
            rowErrors.push('Codice Fiscale obbligatorio');
          } else if ((row.codiceFiscale && row.codiceFiscale.length !== 16) || (row.codice_fiscale && row.codice_fiscale.length !== 16)) {
            rowErrors.push('Codice Fiscale deve essere di 16 caratteri');
          }
        }
        // Per i corsi
        else if (entityType === 'corsi') {
          if (!row.title) {
            rowErrors.push('Titolo obbligatorio');
          }
          
          if (!row.code) {
            rowErrors.push('Codice corso obbligatorio');
          }
        }
      }
      
      if (rowErrors.length > 0) {
        errors[idx] = rowErrors;
      }
    });
    
    return errors;
  };

  // Toggle per gestire le righe selezionate
  const handleToggleOverwrite = (rowId: string) => {
    const newSelectedRows = selectedRows.includes(rowId) 
      ? selectedRows.filter(id => id !== rowId)
      : [...selectedRows, rowId];
    
    setSelectedRows(newSelectedRows);
    
    // Notifica il genitore del cambiamento se è fornita la callback
    if (onSelectedRowsChange) {
      onSelectedRowsChange(newSelectedRows);
    }
  };

  // Gestore dell'importazione
  const handleImport = async (entities: any[], overwriteIds?: string[]) => {
    if (!entities || entities.length === 0) {
      setError('Nessun dato da importare');
      setImporting(false);
      return;
    }
    
    setImporting(true);
    setError('');
    
    try {
      const dataToProcess = [...entities];
      
      // Ottimizzazione: utilizza una Map per lookups più veloci
      let existingEntitiesMap = new Map<string, any>();
      
      if (existingEntities && existingEntities.length > 0) {
        existingEntitiesMap = new Map(
          existingEntities
            .filter(entity => entity[uniqueField as keyof T] !== undefined && entity[uniqueField as keyof T] !== null)
            .map(entity => [
              String(entity[uniqueField as keyof T]).toLowerCase().trim(),
              entity
            ])
        );
      }
      
      // Ora processa ogni entità da importare
      const newEntities: any[] = [];
      const updateEntities: any[] = [];
      const skippedEntities: any[] = [];
      const idsToOverwrite: string[] = overwriteIds || [];
      const finalPayload: any[] = [];
      
      // Processa ogni entità da importare
      for (let i = 0; i < dataToProcess.length; i++) {
        try {
          // Prepara una copia pulita dei dati con i campi normalizzati secondo la mappa CSV
          const rawData = dataToProcess[i];
          const cleanData: Record<string, any> = normalizeItemFields(rawData, csvHeaderMap);
          
          // Special handling for courses to ensure numeric fields are converted
          if (entityType === 'corsi') {
            // Force numeric fields to be numbers for courses
            ['duration', 'validityYears', 'price', 'pricePerPerson', 'maxPeople'].forEach(field => {
              if (cleanData[field] !== undefined && cleanData[field] !== null && cleanData[field] !== '') {
                const numValue = parseInt(String(cleanData[field]).replace(/[^\d]/g, ''), 10);
                if (!isNaN(numValue)) {
                  cleanData[field] = numValue; // Force number type
                } else if (field === 'duration' || field === 'validityYears') {
                  // For required fields, use 0 as default
                  cleanData[field] = 0;
                } else {
                  // For optional fields, remove if invalid
                  delete cleanData[field];
                }
              }
            });
            
            // Ensure renewalDuration is a string
            if (cleanData.renewalDuration !== undefined) {
              cleanData.renewalDuration = String(cleanData.renewalDuration || '');
            }
          }

          // Verifica se esiste già un'entità con lo stesso valore nel campo univoco
          // Ma solo se il campo univoco è presente nell'entità
          let existingEntity = null;
          const uniqueFieldStr = String(uniqueField);
          const uniqueValue = cleanData[uniqueFieldStr];
          
          if (uniqueValue !== undefined && uniqueValue !== null && uniqueValue !== '') {
            const uniqueValueNormalized = String(uniqueValue).toLowerCase().trim();
            existingEntity = existingEntitiesMap.get(uniqueValueNormalized);
            
            if (existingEntity) {
              if (idsToOverwrite.includes(existingEntity.id)) {
                // Aggiungi l'ID dell'entità esistente ai dati puliti per identificare l'aggiornamento
                cleanData.id = existingEntity.id;
                // Aggiungi ai record da aggiornare
                updateEntities.push(cleanData);
                // Aggiungi al payload finale
                finalPayload.push(cleanData);
              } else {
                // Salta questa entità (non sovrascrivere)
                skippedEntities.push(cleanData);
              }
            } else {
              // Non esiste un'entità con questo valore univoco, aggiungi come nuova
              newEntities.push(cleanData);
              // Aggiungi al payload finale
              finalPayload.push(cleanData);
            }
          } else {
            // Il campo univoco non è presente o è vuoto, tratta come nuova entità
            newEntities.push(cleanData);
            // Aggiungi al payload finale
            finalPayload.push(cleanData);
          }
        } catch (error) {
          // Ignora errori e continua con la prossima entità
        }
      }
        
      try {
        // MODIFICA: Rimuoviamo il JSON.parse(JSON.stringify()) che causa problema con payload grande
        // e manteniamo i tipi di dati corretti (number, boolean, etc)
        await onImport(finalPayload as T[], idsToOverwrite);
      
        // Mostra una notifica di successo con il numero di elementi importati
        const newCount = newEntities.length;
        const updateCount = updateEntities.length;
        const skippedCount = skippedEntities.length;
      
        let successMessage = '';
        if (newCount > 0 && updateCount > 0) {
          successMessage = `Importazione completata: ${newCount} nuovi elementi, ${updateCount} aggiornati`;
        } else if (newCount > 0) {
          successMessage = `Importazione completata: ${newCount} nuovi elementi`;
        } else if (updateCount > 0) {
          successMessage = `Importazione completata: ${updateCount} elementi aggiornati`;
        } else {
          successMessage = `Importazione completata con successo`;
        }
      
        if (skippedCount > 0) {
          successMessage += `, ${skippedCount} saltati`;
        }
      
        showToast({
          message: successMessage,
          type: 'success'
        });
      
        // Chiudi il modale di importazione
        onClose();
      } catch (error: any) {
        let errorMessage = error?.message || "Errore durante l'importazione";
        if (error?.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        setError(`Errore durante l'importazione: ${errorMessage}`);
        showToast({
          message: `Errore: ${errorMessage}`,
          type: 'error'
        });
      }
    } catch (error: any) {
      setError(`Errore imprevisto: ${error?.message || "Errore sconosciuto"}`);
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
      uniqueKey="id" // Usiamo ID per supportare il merge
      existingData={existingEntities}
      previewColumns={previewColumns}
      validateRows={validateRows}
      supportedFormats={['.csv']}
      formatsMessage="Formato supportato: CSV (separatore punto e virgola)"
      showBulkSelectButtons={true}
      extraControls={customWarningPanel}
      // Nascondi la tabella di preview standard quando c'è un pannello personalizzato
      hidePreviewTable={!!customWarningPanel}
      // Imposta l'opzione per usare un'unica colonna di checkbox
      useSingleCheckboxColumn={true}
      // Passa le aziende disponibili e la funzione di cambio azienda
      availableCompanies={availableCompanies}
      onCompanyChange={onCompanyChange}
      // Passa i dati iniziali
      initialPreviewData={previewData}
      // Callback per quando cambiano le righe selezionate
      onOverwriteChange={onSelectedRowsChange}
    />
  );
} 

// Assegna la funzione defaultProcessFile come metodo statico
GenericImport.defaultProcessFile = defaultProcessFile;
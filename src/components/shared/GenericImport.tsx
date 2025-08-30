import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Papa from 'papaparse';
import ImportModal from './modals/ImportModal';
import { ImportPreviewColumn } from './ImportPreviewTable';

import { useToast } from '../../hooks/useToast';

export interface GenericImportProps<T> {
  /** Tipo di entità da importare (es. "dipendenti", "aziende") */
  entityType: string;
  /** Campo univoco per identificare un'entità esistente */
  uniqueField: keyof T | string;
  /** Funzione di callback per l'importazione */
  onImport: (data: T[], overwriteIds?: string[], selectedRowIndices?: Set<number>) => Promise<void>;
  /** Funzione di callback per la chiusura */
  onClose: () => void;
  /** Array di entità esistenti */
  existingEntities?: T[];
  /** Mappatura dei campi CSV ai campi dell'entità */
  csvHeaderMap?: Record<string, string>;
  /** Ordine personalizzato delle colonne (array di chiavi dal csvHeaderMap) */
  columnOrder?: string[];
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
  /** Conflitti rilevati per riga */
  conflicts?: { [rowIdx: number]: any };
  /** Callback per aggiornare la risoluzione di un conflitto */
  onConflictResolutionChange?: (rowIdx: number, resolution: any) => void;
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
// Funzione di parsing manuale come fallback
const manualCsvParse = (text: string, delimiter: string = ';'): any[] => {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, any> = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    data.push(row);
  }
  
  return data;
};

export const defaultProcessFile = async (file: File, csvHeaderMap: Record<string, string>, csvDelimiter = ';'): Promise<any[]> => {
  const text = await file.text();
  // Rimuovi il BOM (Byte Order Mark) se presente
  const cleanText = text.replace(/^\uFEFF/, '');
  
  // Prova prima con il delimitatore specificato
  let result = Papa.parse(cleanText, {
    header: true,
    delimiter: csvDelimiter,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim()
  });
  
  // Se il parsing non ha prodotto colonne multiple, prova con auto-detect
  if (result.data.length > 0) {
    const firstRow = result.data[0] as Record<string, any>;
    const columnCount = Object.keys(firstRow).length;
    
    if (columnCount <= 1) {
      // Prova con auto-detect del delimitatore
      result = Papa.parse(cleanText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim()
      });
      
      if (result.data.length > 0) {
        const autoFirstRow = result.data[0] as Record<string, any>;
        
        // Se ancora non funziona, prova con virgola
        if (Object.keys(autoFirstRow).length <= 1) {
          result = Papa.parse(cleanText, {
            header: true,
            delimiter: ',',
            skipEmptyLines: true,
            transformHeader: (header: string) => header.trim()
          });
          
          if (result.data.length > 0) {
             const commaFirstRow = result.data[0] as Record<string, any>;
             
             // Se anche la virgola fallisce, prova parsing manuale
             if (Object.keys(commaFirstRow).length <= 1) {
               // Prova prima con punto e virgola
                let manualData = manualCsvParse(cleanText, ';');
                if (manualData.length > 0 && Object.keys(manualData[0]).length > 1) {
                  result = { 
                    data: manualData, 
                    errors: [], 
                    meta: { 
                      delimiter: ';', 
                      linebreak: '\n', 
                      aborted: false, 
                      truncated: false, 
                      cursor: 0 
                    } 
                  };
                } else {
                  // Prova con virgola
                  manualData = manualCsvParse(cleanText, ',');
                  if (manualData.length > 0 && Object.keys(manualData[0]).length > 1) {
                    result = { 
                      data: manualData, 
                      errors: [], 
                      meta: { 
                        delimiter: ',', 
                        linebreak: '\n', 
                        aborted: false, 
                        truncated: false, 
                        cursor: 0 
                      } 
                    };
                  }
                }
             }
           }
        }
      }
    }
  }
  
  if (result.errors.length > 0) {
    console.error('Errori durante il parsing CSV:', result.errors);
    throw new Error(`Errore nel parsing del file CSV: ${result.errors[0].message}`);
  }
  
  // Verifica che ci siano dati
  if (!result.data || result.data.length === 0) {
    throw new Error('Il file CSV non contiene dati.');
  }
  
  // Verifica che le intestazioni del CSV corrispondano alle mappature previste
  const csvHeaders = Object.keys((result.data[0] as Record<string, any>) || {});
  const mappedHeaders = Object.keys(csvHeaderMap);
  
  // Verifica se almeno una delle intestazioni richieste è presente (case-insensitive)
  const foundHeaders = mappedHeaders.filter(header => 
    csvHeaders.some(csvHeader => csvHeader.trim().toLowerCase() === header.toLowerCase())
  );
  
  if (foundHeaders.length === 0) {
    throw new Error(`Il formato del CSV non è compatibile. Intestazioni attese: ${mappedHeaders.join(', ')}. Intestazioni trovate: ${csvHeaders.join(', ')}`);
  }
  
  // Se abbiamo meno del 10% delle intestazioni richieste, mostra un avviso
  if (foundHeaders.length < mappedHeaders.length * 0.1) {
    throw new Error(`Formato del file non compatibile: solo ${foundHeaders.length} delle ${mappedHeaders.length} intestazioni attese sono state trovate. Intestazioni attese: ${mappedHeaders.join(', ')}. Intestazioni trovate: ${csvHeaders.join(', ')}`);
  }
  
  // Mapping dei campi secondo la struttura definita
  return (result.data as any[]).map(row => {
    const mapped: Record<string, any> = {};
    Object.entries(row).forEach(([k, v]) => {
      // Cerca la mappatura corretta per l'intestazione CSV
      const csvHeader = k.trim();
      let mappedKey = csvHeader; // Default: usa l'intestazione originale
      
      // Cerca una corrispondenza nel csvHeaderMap (case-insensitive)
      for (const [headerKey, fieldKey] of Object.entries(csvHeaderMap)) {
        if (headerKey.toLowerCase() === csvHeader.toLowerCase()) {
          mappedKey = fieldKey;
          break;
        }
      }
      
      // Mantieni tutti i campi, anche se vuoti (importante per i template)
      mapped[mappedKey] = v !== null && v !== undefined ? v.toString().trim() : '';
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
  onConflictResolutionChange
}: GenericImportProps<T>) {
  const defaultTitle = `Importa ${entityType && typeof entityType === 'string' ? entityType.charAt(0).toUpperCase() + entityType.slice(1) : 'Elementi'}`;
  const defaultSubtitle = `Carica un file CSV con i dati dei ${entityType || 'elementi'} da importare`;
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [selectedRowsForImport, setSelectedRowsForImport] = useState<Set<number>>(new Set());
  const [previewData, setPreviewData] = useState<any[]>(initialPreviewData || []);
  const { showToast } = useToast();
  // Aggiungiamo gli stati mancanti
  const [importing, setImporting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [rowErrors, setRowErrors] = useState<{ [rowIdx: number]: string[] }>({});
  const [validationErrors, setValidationErrors] = useState<{ [rowIdx: number]: string[] }>({});

  // Aggiorna previewData quando initialPreviewData cambia
  useEffect(() => {
    console.log('🔄 GenericImport useEffect triggered - initialPreviewData:', initialPreviewData?.length || 0, 'elementi');
    // Aggiorna sempre previewData quando initialPreviewData cambia
    // Questo include anche il caso di array vuoto per reset
    if (initialPreviewData !== undefined) {
      console.log('🔄 GenericImport: Aggiornamento previewData da initialPreviewData:', initialPreviewData.length, 'elementi');
      console.log('📊 GenericImport: Primo elemento:', initialPreviewData[0]);
      console.log('🏢 GenericImport: Aziende assegnate:', initialPreviewData.filter(item => item.companyId || item.company_name).length);
      console.log('🔍 GenericImport: Dettaglio aziende:', initialPreviewData.slice(0, 3).map(item => ({ 
        nome: item.nome, 
        cognome: item.cognome, 
        company_name: item.company_name, 
        companyId: item.companyId,
        _assignedCompany: item._assignedCompany 
      })));
      setPreviewData([...initialPreviewData]); // Crea una nuova copia per forzare il re-render
    }
  }, [initialPreviewData]);

  // Definizione delle colonne per la tabella di anteprima (memoizzata per evitare ricalcoli)
  const previewColumns = useMemo(() => {
    const columns: ImportPreviewColumn[] = [];
    const usedKeys = new Set<string>();
    const fieldToLabelMap = new Map<string, string>();

    // Prima passata: crea una mappa dei campi ai loro label preferiti
    Object.entries(csvHeaderMap).forEach(([header, key]) => {
      if (!fieldToLabelMap.has(key)) {
        // Preferisci i label più leggibili (con spazi e maiuscole)
        fieldToLabelMap.set(key, header);
      } else {
        const currentLabel = fieldToLabelMap.get(key)!;
        // Sostituisci se il nuovo header è più leggibile (contiene spazi o maiuscole)
        if (header.includes(' ') || /[A-Z]/.test(header)) {
          if (!currentLabel.includes(' ') && !/[A-Z]/.test(currentLabel)) {
            fieldToLabelMap.set(key, header);
          }
        }
      }
    });

    // Se è fornito un ordine personalizzato, usalo
    if (columnOrder && columnOrder.length > 0) {
      // Prima aggiungi le colonne nell'ordine specificato
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
      
      // Poi aggiungi eventuali colonne rimanenti non specificate nell'ordine
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
      // Comportamento originale se non è specificato un ordine
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

  // Toggle per gestire le righe selezionate per la sovrascrittura
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

  // Callback per gestire la selezione delle righe da importare
  const handleRowSelectionChange = useCallback((selectedRows: Set<number>) => {
    setSelectedRowsForImport(selectedRows);
  }, []);

  // Inizializza la selezione delle righe quando cambiano i dati di preview
  useEffect(() => {
    if (previewData && previewData.length > 0) {
      // Seleziona tutte le righe di default
      const allRowIndices = new Set(Array.from({ length: previewData.length }, (_, i) => i));
      setSelectedRowsForImport(allRowIndices);
    }
  }, [previewData]);

  // Gestore dell'importazione
  const handleImport = async (entities: any[], overwriteIds?: string[]) => {
    if (!entities || entities.length === 0) {
      setError('Nessun dato da importare');
      setImporting(false);
      return;
    }
    
    // MODIFICA: Non filtrare qui le righe selezionate, lascia che sia la funzione personalizzata
    // a gestire la logica di filtraggio basata su selectedRowsForImport e overwriteIds
    // Questo permette una gestione più flessibile della selezione
    const selectedEntities = entities; // Passa tutti i dati
    
    // Verifica che ci siano righe selezionate per l'importazione
    if (selectedRowsForImport.size === 0) {
      setError('Nessuna riga selezionata per l\'importazione');
      setImporting(false);
      return;
    }
    
    setImporting(true);
    setError('');
    
    try {
      const dataToProcess = [...selectedEntities];
      
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
        // MODIFICA: Passa le informazioni sulle righe selezionate alla funzione personalizzata
        // per permettere una gestione più flessibile della selezione
        await onImport(finalPayload as T[], idsToOverwrite, selectedRowsForImport);
      
        // MODIFICA: Non mostrare toast di successo automaticamente - lascia che sia il componente padre a decidere
        // Questo permette ai componenti di gestire modal di conflitti o altre interazioni prima di mostrare il successo
        
        // MODIFICA: Non chiudere automaticamente il modal - lascia che sia il componente padre a decidere
        // Questo permette ai componenti di gestire modal di conflitti o altre interazioni
        // onClose();
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
      uniqueKey={String(uniqueField)} // Usa il campo univoco specificato
      existingData={existingEntities}
      previewColumns={previewColumns}
      validateRows={validateRows}
      supportedFormats={['.csv']}
      formatsMessage="Formato supportato: CSV (separatore punto e virgola)"
      showBulkSelectButtons={true}
      extraControls={customWarningPanel}
      // Non nascondere la tabella di preview per i controlli extra
      hidePreviewTable={false}
      // Imposta l'opzione per usare un'unica colonna di checkbox
      useSingleCheckboxColumn={true}
      // Passa le aziende disponibili e la funzione di cambio azienda
      availableCompanies={availableCompanies}
      onCompanyChange={onCompanyChange}
      // Passa i dati iniziali
      initialPreviewData={previewData}
      // Callback per quando cambiano le righe selezionate per la sovrascrittura
      onOverwriteChange={onSelectedRowsChange}
      // Gestione della selezione delle righe da importare
      selectedRows={selectedRowsForImport}
      onRowSelectionChange={handleRowSelectionChange}
      // Passa i conflitti e la funzione di risoluzione
      conflicts={conflicts}
      onConflictResolutionChange={onConflictResolutionChange}
    />
  );
} 

// Assegna la funzione defaultProcessFile come metodo statico
GenericImport.defaultProcessFile = defaultProcessFile;
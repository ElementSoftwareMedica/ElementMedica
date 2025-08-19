import React, { useState, useRef, ReactNode } from 'react';
import { Upload, AlertCircle, X, AlertTriangle } from 'lucide-react';
import ImportPreviewTable, { ImportPreviewColumn } from './ImportPreviewTable';
import EnhancedImportPreviewTable from './EnhancedImportPreviewTable';
import { Button } from '../../design-system/atoms/Button';
import ErrorDisplay from './ErrorDisplay';
import CSVFormatError from './CSVFormatError';

export interface ImportModalProps<T> {
  /** Titolo del modale (es. "Importa Aziende") */
  title: string;
  /** Sottotitolo opzionale con istruzioni */
  subtitle?: string;
  /** Chiamata quando l'utente conferma l'importazione */
  onImport: (data: T[], overwriteIds?: string[]) => Promise<void>;
  /** Chiamata quando l'utente chiude il modale */
  onClose: () => void;
  /** Funzione per processare il file caricato e convertirlo in dati strutturati */
  processFile: (file: File) => Promise<T[]>;
  /** Chiave per identificare elementi duplicati */
  uniqueKey: string;
  /** Dati esistenti per confronto e individuazione dei duplicati */
  existingData: any[];
  /** Colonne da visualizzare nella tabella di anteprima */
  previewColumns: ImportPreviewColumn[];
  /** Funzione per validare le righe e rilevare eventuali errori */
  validateRows?: (rows: T[]) => { [rowIdx: number]: string[] };
  /** Componenti aggiuntivi da mostrare sopra la tabella di anteprima */
  extraControls?: ReactNode;
  /** Formati di file supportati */
  supportedFormats?: string[];
  /** Messaggio informativo sui formati supportati */
  formatsMessage?: string;
  /** Mostra o nasconde i pulsanti per selezionare/deselezionare tutti */
  showBulkSelectButtons?: boolean;
  /** Nasconde la tabella di anteprima standard (utile quando si usa un componente personalizzato) */
  hidePreviewTable?: boolean;
  /** Usa un'unica colonna di checkbox per selezione/sovrascrittura */
  useSingleCheckboxColumn?: boolean;
  /** Lista delle aziende disponibili per il menu a pillola */
  availableCompanies?: Array<{id: string, name: string}>;
  /** Funzione per gestire il cambio di azienda per le righe selezionate */
  onCompanyChange?: (selectedIds: string[], companyId: string) => void;
  /** Dati iniziali da mostrare nella preview */
  initialPreviewData?: T[];
  /** Callback per le righe selezionate */
  onOverwriteChange?: (selectedIds: string[]) => void;
}

/**
 * Componente generico per mostrare un modale di importazione dati
 */
export default function ImportModal<T extends Record<string, any>>({
  title,
  subtitle,
  onImport,
  onClose,
  processFile,
  uniqueKey,
  existingData,
  previewColumns,
  validateRows,
  extraControls,
  supportedFormats = ['.csv'],
  formatsMessage = 'Formati supportati: CSV',
  showBulkSelectButtons = true,
  hidePreviewTable = false,
  useSingleCheckboxColumn = false,
  availableCompanies,
  onCompanyChange,
  initialPreviewData = [],
  onOverwriteChange
}: ImportModalProps<T>) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<T[]>(initialPreviewData);
  const [overwriteIds, setOverwriteIds] = useState<string[]>([]);
  const [rowErrors, setRowErrors] = useState<{ [rowIdx: number]: string[] }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expectedHeaders, setExpectedHeaders] = useState<string[]>([]);
  const [foundHeaders, setFoundHeaders] = useState<string[]>([]);

  // Aggiorna la preview quando cambiano i dati iniziali
  React.useEffect(() => {
    if (initialPreviewData && initialPreviewData.length > 0) {
      setPreview(initialPreviewData);
      if (validateRows) {
        const errors = validateRows(initialPreviewData);
        setRowErrors(errors);
      }
    }
  }, [initialPreviewData, validateRows]);

  // Gestisce gli eventi di trascinamento
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Gestisce il file lasciato nella zona di trascinamento
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleFileProcess(file);
    }
  };

  // Gestisce la selezione del file tramite finestra di dialogo
  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileProcess(file);
    }
  };

  // Processa il file selezionato o trascinato
  const handleFileProcess = async (file: File) => {
    setError('');
    setRowErrors({});
    setImporting(true);
    setExpectedHeaders([]);
    setFoundHeaders([]);
    
    // Verifica estensione
    const fileExt = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    if (!supportedFormats.includes(fileExt)) {
      setError(`Formato file non supportato. Formati accettati: ${supportedFormats.join(', ')}`);
      setImporting(false);
      return;
    }
    
    // Verifica dimensione file (max 10MB)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxFileSize) {
      setError(`Il file è troppo grande (${(file.size / (1024 * 1024)).toFixed(2)}MB). Dimensione massima: 10MB`);
      setImporting(false);
      return;
    }

    try {
      // Processa il file
      const processedData = await processFile(file);
      
      // Verifica che ci siano dati
      if (!processedData || processedData.length === 0) {
        throw new Error('Il file non contiene dati validi. Verifica che il file CSV sia formattato correttamente.');
      }
      
      // Verifica la qualità dei dati
      const firstRow = processedData[0];
      if (firstRow && Object.keys(firstRow).length <= 1) {
        throw new Error('Il formato del file non sembra corretto. Verifica che il delimitatore CSV sia corretto (es. ";" o ",")');
      }
      
      setPreview(processedData);
      
      // Valida i dati se è disponibile una funzione di validazione
      if (validateRows) {
        const errors = validateRows(processedData);
        setRowErrors(errors);
        
        // Se ci sono errori in tutte le righe, potrebbe indicare un problema di formato
        const rowCount = processedData.length;
        const errorCount = Object.keys(errors).length;
        
        if (errorCount === rowCount && rowCount > 0) {
          // Recupera il primo errore per mostrarlo come esempio
          const firstErrorRow = Object.keys(errors)[0];
          const firstError = errors[Number(firstErrorRow)]?.[0] || '';
          
          // Se tutti gli errori sono uguali, potrebbe essere un problema di formato
          if (firstError.includes('obbligator')) {
            setError(`Possibile formato CSV non compatibile: ${firstError}. Verifica che le colonne CSV corrispondano ai campi richiesti.`);
          }
        }
      }
    } catch (err) {
      console.error('Errore durante l\'elaborazione del file:', err);
      
      // Fornisci messaggi di errore più dettagliati
      const errorMessage = err instanceof Error ? err.message : 'Errore durante l\'elaborazione del file';
      
      // Gestisci errori specifici
      if (errorMessage.includes('Intestazioni attese') && errorMessage.includes('Intestazioni trovate')) {
        // Estrai le intestazioni attese e trovate dall'errore
        try {
          const expectedMatch = errorMessage.match(/Intestazioni attese: ([^.]+)/);
          const foundMatch = errorMessage.match(/Intestazioni trovate: ([^.]+)/);
          
          if (expectedMatch && expectedMatch[1]) {
            setExpectedHeaders(expectedMatch[1].split(', ').map(h => h.trim()));
          }
          
          if (foundMatch && foundMatch[1]) {
            setFoundHeaders(foundMatch[1].split(', ').map(h => h.trim()));
          }
        } catch (parseErr) {
          console.error('Errore nel parsing delle intestazioni:', parseErr);
        }
        
        setError(errorMessage);
      } else if (errorMessage.includes('Parse error')) {
        setError('Errore durante l\'analisi del CSV. Verifica che il delimitatore sia corretto (;) e che il file non contenga caratteri speciali non validi.');
      } else if (errorMessage.includes('Il formato del CSV non è compatibile')) {
        setError(errorMessage);
      } else {
        setError(`Errore durante l'elaborazione del file: ${errorMessage}`);
      }
      
      setPreview([]);
    } finally {
      setImporting(false);
    }
  };

  // Gestore per la conferma dell'importazione
  const handleImport = async () => {
    if (preview.length === 0) return;
    
    // Se ci sono errori di validazione, non procedere con l'importazione
    if (Object.keys(rowErrors).length > 0) {
      setError('Ci sono errori nei dati. Correggi il file e riprova.');
      return;
    }
    
    setImporting(true);
    setError('');
    
    try {
      await onImport(preview, overwriteIds);
      // Non chiamiamo onClose qui, lo lasciamo gestire al chiamante in base al risultato
    } catch (err) {
      console.error('Errore durante l\'importazione:', err);
      setError(err instanceof Error ? err.message : 'Errore durante l\'importazione');
      setImporting(false);
    }
  };

  // Determina il testo del pulsante di importazione in base alle selezioni
  const getImportButtonText = () => {
    if (importing) return 'Importazione in corso...';
    
    if (useSingleCheckboxColumn && preview.length > 0) {
      // Conta quanti elementi sono selezionati (esistenti da sovrascrivere)
      const selectedCount = overwriteIds.length;
      
      // Numero di elementi che sono nuovi (non duplicati)
      const nonDuplicateCount = preview.filter(item => 
        !item[uniqueKey] || !existingData.some(e => {
          // Normalizza i valori per il confronto
          const itemValue = String(item[uniqueKey] || '').trim().toUpperCase();
          const existingValue = String(e[uniqueKey] || '').trim().toUpperCase();
          return itemValue === existingValue;
        })
      ).length;
      
      // Calcola il totale da importare (selezionati + nuovi)
      const totalToImport = selectedCount + nonDuplicateCount;
      
      if (totalToImport === 0) {
        return 'Nessun elemento da importare';
      } else if (selectedCount > 0 && nonDuplicateCount > 0) {
        return `Importa ${totalToImport} elementi (${nonDuplicateCount} nuovi, ${selectedCount} aggiornamenti)`;
      } else if (selectedCount > 0) {
        return `Aggiorna ${selectedCount} elementi`;
      } else if (nonDuplicateCount > 0) {
        return `Importa ${nonDuplicateCount} nuovi elementi`;
      }
    }
    
    return `Importa tutti (${preview.length})`;
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full mx-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            aria-label="Chiudi"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!preview.length ? (
          <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-sm text-gray-600">
              Trascina qui il file, oppure{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                sfoglia
              </button>
            </p>
            <p className="mt-2 text-xs text-gray-500">
              {formatsMessage}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={supportedFormats.join(',')}
              onChange={handleFileInput}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Controlli extra (es. selezione azienda) */}
            {extraControls && <div>{extraControls}</div>}
            
            {/* Tabella di anteprima */}
            {!hidePreviewTable && (
              <ImportPreviewTable
                columns={previewColumns}
                preview={preview}
                existing={existingData}
                uniqueKey={uniqueKey}
                rowErrors={rowErrors}
                onOverwriteChange={setOverwriteIds}
                showBulkSelectButtons={showBulkSelectButtons}
                useSingleCheckboxColumn={useSingleCheckboxColumn}
                availableCompanies={availableCompanies}
                onCompanyChange={onCompanyChange}
                overwriteIds={overwriteIds}
              />
            )}
          </div>
        )}

        {error && (
          error.includes('formato CSV') || error.includes('Intestazioni') || error.includes('delimitatore') || error.includes('formato del file') ? (
            <CSVFormatError 
              message={error}
              expectedHeaders={expectedHeaders}
              foundHeaders={foundHeaders}
              onClose={() => {
                setError('');
                setPreview([]); // Reset preview to allow new file upload
              }}
              className="mt-4 mb-4"
            />
          ) : (
            <ErrorDisplay 
              type="error"
              message={error}
              onClose={() => setError('')}
              className="mt-4 mb-4"
            />
          )
        )}

        <div className="mt-6 flex justify-end space-x-3">
          <Button
            onClick={onClose}
            variant="secondary"
            disabled={importing}
          >
            Annulla
          </Button>
          <Button
            onClick={handleImport}
            variant="primary"
            disabled={preview.length === 0 || importing || Object.keys(rowErrors).length > 0}
          >
            {getImportButtonText()}
          </Button>
        </div>
      </div>
    </div>
  );
}
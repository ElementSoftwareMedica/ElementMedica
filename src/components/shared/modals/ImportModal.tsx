import React, { useState, useRef, ReactNode } from 'react';
import { Upload, X } from 'lucide-react';
import ImportPreviewTable, { ImportPreviewColumn, ConflictInfo } from '../ImportPreviewTable';
import Button from '../../../design-system/atoms/Button/Button';
import ErrorDisplay from '../ErrorDisplay';
import CSVFormatError from '../CSVFormatError';
import { createPortal } from 'react-dom';

export interface ImportModalProps<T> {
  /** Titolo del modale (es. "Importa Aziende") */
  title: string;
  /** Sottotitolo opzionale con istruzioni */
  subtitle?: string;
  /** Chiamata quando l'utente conferma l'importazione */
  onImport: (data: T[], overwriteIds?: string[], selectedRows?: Set<number>) => Promise<void>;
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
  availableCompanies?: Array<{ id: string, name?: string, ragioneSociale?: string }>;
  /** Funzione per gestire il cambio di azienda per le righe selezionate */
  onCompanyChange?: (selectedIds: string[], companyId: string) => void;
  /** Dati iniziali da mostrare nella preview */
  initialPreviewData?: T[];
  /** Callback per le righe selezionate */
  onOverwriteChange?: (selectedIds: string[]) => void;
  /** Conflitti rilevati per riga */
  conflicts?: { [rowIdx: number]: ConflictInfo };
  /** Callback per aggiornare la risoluzione di un conflitto */
  onConflictResolutionChange?: (rowIdx: number, resolution: Partial<ConflictInfo>) => void;
  /** Set delle righe selezionate per l'importazione (indici) */
  selectedRows?: Set<number>;
  /** Callback per gestire la selezione delle righe */
  onRowSelectionChange?: (selectedRows: Set<number>) => void;
  /** Funzione per normalizzare la chiave unica per il confronto duplicati */
  normalizeKey?: (value: any) => string;
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
  onOverwriteChange,
  conflicts,
  onConflictResolutionChange,
  selectedRows,
  onRowSelectionChange,
  normalizeKey
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

  // Normalizzazione centralizzata della chiave unica
  const normalizeKeyFn = (v: any) => (normalizeKey ? normalizeKey(v) : String(v ?? '').toLowerCase().trim());
  const norm = (v: any) => normalizeKeyFn(v);

  // Handler interno: aggiorna lo stato locale e propaga verso l'alto
  const handleOverwriteChangeInternal = (selected: string[]) => {
    setOverwriteIds(selected);
    if (onOverwriteChange) onOverwriteChange(selected);
  };

  // Aggiorna la preview quando cambiano i dati iniziali
  React.useEffect(() => {
    if (initialPreviewData && initialPreviewData.length > 0) {
      setPreview(initialPreviewData);
      if (validateRows) {
        const errors = validateRows(initialPreviewData);
        setRowErrors(errors);
        // Auto-deseleziona le righe con errori per permettere import parziale dei soli record validi
        if (onRowSelectionChange) {
          const errorIdx = new Set(Object.keys(errors).map((k) => Number(k)));
          const validIdx = initialPreviewData.map((_, i) => i).filter((i) => !errorIdx.has(i));
          onRowSelectionChange(new Set(validIdx));
        }
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

        // Auto-deseleziona le righe con errori per permettere import parziale
        if (onRowSelectionChange) {
          const errorIdx = new Set(Object.keys(errors).map((k) => Number(k)));
          const validIdx = processedData.map((_, i) => i).filter((i) => !errorIdx.has(i));
          onRowSelectionChange(new Set(validIdx));
        }

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

      setError('Errore durante l\'elaborazione del file');

      setPreview([]);
    } finally {
      setImporting(false);
    }
  };

  // Gestore per la conferma dell'importazione
  const handleImport = async () => {
    if (preview.length === 0) return;

    // Calcola le righe selezionate valide (esclude quelle con errori)
    const allIdx = preview.map((_, i) => i);
    const selected = selectedRows ? Array.from(selectedRows) : allIdx;
    const validSelected = selected.filter((i) => !rowErrors[i]);

    if (validSelected.length === 0) {
      setError('Nessuna riga valida selezionata per l\'importazione');
      return;
    }

    setImporting(true);
    setError('');

    try {
      // Passa anche le righe selezionate (solo quelle valide) alla funzione di importazione
      await onImport(preview, overwriteIds, new Set(validSelected));
      // Non chiamiamo onClose qui, lo lasciamo gestire al chiamante in base al risultato
    } catch (err) {
      setError('Errore durante l\'importazione');
      setImporting(false);
    }
  };

  // Determina il testo del pulsante di importazione in base alle selezioni
  const getImportButtonText = () => {
    if (importing) return 'Importazione in corso...';

    if (useSingleCheckboxColumn && preview.length > 0) {
      // Conta quanti elementi sono selezionati (esistenti da sovrascrivere)
      const selectedCount = overwriteIds.length;

      // Se abbiamo selectedRows, usa quello per calcolare il numero di righe selezionate
      if (selectedRows && selectedRows.size !== undefined) {
        // Filtra le righe selezionate per distinguere tra nuove e aggiornamenti
        const selectedIndices = Array.from(selectedRows);
        let newCount = 0;
        let updateCount = 0;

        selectedIndices.forEach(index => {
          if (index < preview.length) {
            const item = preview[index];
            const isExisting = item[uniqueKey] && existingData.some(e => {
              const itemValueNorm = norm(item[uniqueKey]);
              return norm(e[uniqueKey]) === itemValueNorm;
            });

            if (isExisting) {
              // È un elemento esistente, conta solo se è selezionato per sovrascrittura
              if (item.id && overwriteIds.includes(item.id)) {
                updateCount++;
              }
            } else {
              // È un nuovo elemento
              newCount++;
            }
          }
        });

        const totalToImport = newCount + updateCount;

        if (totalToImport === 0) {
          return 'Nessun elemento da importare';
        } else if (updateCount > 0 && newCount > 0) {
          return `Importa ${totalToImport} elementi (${newCount} nuovi, ${updateCount} aggiornamenti)`;
        } else if (updateCount > 0) {
          return `Aggiorna ${updateCount} elementi`;
        } else if (newCount > 0) {
          return `Importa ${newCount} nuovi elementi`;
        }
      } else {
        // Fallback alla logica precedente se selectedRows non è disponibile
        // Numero di elementi che sono nuovi (non duplicati)
        const nonDuplicateCount = preview.filter(item =>
          !item[uniqueKey] || !existingData.some(e => {
            return norm(e[uniqueKey]) === norm(item[uniqueKey]);
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
    }

    return `Importa tutti (${preview.length})`;
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-30 dark:bg-opacity-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-black/30 max-w-6xl w-full mx-auto flex flex-col max-h-[90vh]">
        {/* Header fisso */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-300"
            aria-label="Chiudi"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Errori fissi in alto - altezza limitata */}
        {error && (
          <div className="border-b border-gray-200 dark:border-gray-700 flex-shrink-0 max-h-32 overflow-y-auto">
            {error.includes('formato CSV') || error.includes('Intestazioni') || error.includes('delimitatore') || error.includes('formato del file') ? (
              <CSVFormatError
                message={error}
                expectedHeaders={expectedHeaders}
                foundHeaders={foundHeaders}
                onClose={() => {
                  setError('');
                  setPreview([]); // Reset preview to allow new file upload
                }}
                className="m-4"
              />
            ) : (
              <ErrorDisplay
                type="error"
                message={error}
                onClose={() => setError('')}
                className="m-4"
              />
            )}
          </div>
        )}

        {/* Contenuto scrollabile */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">

          {!preview.length ? (
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                Trascina qui il file, oppure{' '}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium"
                >
                  sfoglia
                </button>
              </p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
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
                  onOverwriteChange={handleOverwriteChangeInternal}
                  showBulkSelectButtons={showBulkSelectButtons}
                  useSingleCheckboxColumn={useSingleCheckboxColumn}
                  availableCompanies={availableCompanies}
                  onCompanyChange={onCompanyChange}
                  overwriteIds={overwriteIds}
                  conflicts={conflicts}
                  onConflictResolutionChange={onConflictResolutionChange}
                  selectedRows={selectedRows}
                  onRowSelectionChange={onRowSelectionChange}
                  normalizeKey={normalizeKey}
                />
              )}
            </div>
          )}
        </div>

        {/* Footer fisso con pulsanti */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end space-x-3 flex-shrink-0">
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
            disabled={preview.length === 0 || importing}
          >
            {getImportButtonText()}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
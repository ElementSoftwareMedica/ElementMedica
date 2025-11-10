import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

export interface ImportPreviewColumn {
  key: string;
  label: string;
  minWidth: number;
  width: number;
}

export interface ConflictInfo {
  type: 'duplicate' | 'invalid_company';
  existingPerson?: any;
  suggestedCompanies?: any[];
  resolution?: 'skip' | 'overwrite' | 'assign_company';
  selectedCompanyId?: string;
  selectedCompanyName?: string;
}

interface ImportPreviewTableProps<T> {
  columns: ImportPreviewColumn[];
  preview: T[];
  existing?: T[];
  uniqueKey: string;
  rowErrors?: { [rowIdx: number]: string[] };
  onOverwriteChange?: (selected: string[]) => void;
  showBulkSelectButtons?: boolean;
  /** Usa un'unica colonna di checkbox per selezione/sovrascrittura */
  useSingleCheckboxColumn?: boolean;
  /** Funzione opzionale per cambiare l'azienda di un dipendente selezionato */
  onCompanyChange?: (selectedIds: string[], companyId: string) => void;
  /** Lista delle aziende disponibili per il menu a pillola */
  availableCompanies?: Array<{id: string, name?: string, ragioneSociale?: string}>;
  overwriteIds?: string[];
  /** NUOVO: Conflitti rilevati per riga */
  conflicts?: { [rowIdx: number]: ConflictInfo };
  /** NUOVO: Callback per aggiornare la risoluzione di un conflitto */
  onConflictResolutionChange?: (rowIdx: number, resolution: Partial<ConflictInfo>) => void;
  /** NUOVO: Righe selezionate per l'import */
  selectedRows?: Set<number>;
  /** NUOVO: Callback per gestire la selezione delle righe */
  onRowSelectionChange?: (selectedRows: Set<number>) => void;
  /** NUOVO: Funzione di normalizzazione chiave univoca (es. CF) */
  normalizeKey?: (value: unknown) => string;
  /** Mappature chiavi CSV -> chiavi DB per confronto valori */
  fieldMappings?: Record<string, string[]>;
}

export default function ImportPreviewTable<T extends Record<string, any>>({
  columns,
  preview,
  existing = [],
  uniqueKey,
  rowErrors = {},
  onOverwriteChange,
  showBulkSelectButtons = true,
  useSingleCheckboxColumn = false,
  onCompanyChange,
  availableCompanies = [],
  overwriteIds = [],
  conflicts = {},
  onConflictResolutionChange,
  selectedRows = new Set(Array.from({ length: preview.length }, (_, i) => i)), // Default: tutte le righe selezionate
  onRowSelectionChange,
  normalizeKey,
  fieldMappings = {}
}: ImportPreviewTableProps<T>) {
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => 
    columns.reduce((acc, col) => ({ ...acc, [col.key]: col.width }), {} as Record<string, number>)
  );
  const [overwriteToggles, setOverwriteToggles] = useState<{ [id: string]: boolean }>({});
  // (rimosso) const [initialized, setInitialized] = useState(false);
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  
  const resizingCol = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Funzione di normalizzazione per la chiave univoca
  const normalizeKeyFn = (v: any) => (normalizeKey ? normalizeKey(v) : String(v ?? '').toLowerCase().trim());
  
  // Helper per confrontare array di stringhe (ordinati)
  const arraysEqual = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  };

  // Helper per confronto shallow dei toggle
  const togglesShallowEqual = (a: { [id: string]: boolean }, b: { [id: string]: boolean }) => {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const k of aKeys) {
      if (a[k] !== b[k]) return false;
    }
    return true;
  };

  // Identifica le righe duplicate utilizzando la chiave univoca (con normalizzazione) - memorizzato per evitare ricreazioni inutili
  const existingKeys = useMemo(() => new Set(
    existing
      .map(item => item[uniqueKey])
      .filter(Boolean)
      .map(value => normalizeKeyFn(value))
  ), [existing, uniqueKey, normalizeKey]);

  // Helper per normalizzare valori chiave
  const norm = (v: any) => normalizeKeyFn(v);

  // Signature per capire quando preview/existing cambiano sostanzialmente
  const previewSignature = useMemo(() => {
    try {
      return preview.map(item => (item && item[uniqueKey] ? norm(item[uniqueKey]) : '')).join('|');
    } catch {
      return String(preview.length);
    }
  }, [preview, uniqueKey, normalizeKey]);

  const existingSignature = useMemo(() => {
    const arr = Array.from(existingKeys);
    arr.sort();
    return arr.join('|');
  }, [existingKeys]);

  const prevPreviewSigRef = useRef<string>('');
  const prevExistingSigRef = useRef<string>('');
  const lastReportedIdsRef = useRef<string[]>([]);
  
  // Inizializza/sincronizza i toggle di sovrascrittura quando cambiano preview/existing
  useEffect(() => {
    const previewChanged = prevPreviewSigRef.current !== previewSignature;
    const existingChanged = prevExistingSigRef.current !== existingSignature;

    if (!previewChanged && !existingChanged) return;

    setOverwriteToggles(prev => {
      const computed: { [id: string]: boolean } = { ...prev };

      // Popola toggle per elementi con id o duplicati (in base a uniqueKey)
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

      // Evita aggiornamenti di stato se non ci sono variazioni reali
      if (togglesShallowEqual(prev, computed)) return prev;
      return computed;
    });

    prevPreviewSigRef.current = previewSignature;
    prevExistingSigRef.current = existingSignature;
  // Limita le dipendenze ai soli signature per evitare re-trigger inutili
  }, [previewSignature, existingSignature]);

  // Elenco aziende filtrato per ricerca
  const filteredCompanies = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return availableCompanies;
    return availableCompanies.filter(c =>
      (c.ragioneSociale || c.name || '').toLowerCase().includes(term)
    );
  }, [availableCompanies, searchTerm]);

  // Selezione azienda dal dropdown e applicazione alle righe selezionate o a tutte
  const handleCompanySelect = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setIsCompanyDropdownOpen(false);

    if (onCompanyChange) {
      const targetRowIds = (selectedRows && selectedRows.size > 0)
        ? Array.from(selectedRows).map(i => String(i))
        : preview.map((_, i) => String(i));
      onCompanyChange(targetRowIds, companyId);
    }
  };

  // Imposta i toggle predefiniti per i duplicati all'inizializzazione, solo una volta
  // (rimosso effetto obsoleto basato su "initialized")
  // useEffect(() => {
  //   if (!initialized) {
  //     const toggles: { [id: string]: boolean } = {};
  //     preview.forEach(item => {
  //       if (item.id) {
  //         toggles[String(item.id)] = true;
  //       } else if (item[uniqueKey] && existingKeys.has(norm(item[uniqueKey]))) {
  //         const existingItem = existing.find(e => norm(e[uniqueKey]) === norm(item[uniqueKey]));
  //         if (existingItem) {
  //           const exId = (existingItem as any).id;
  //           if (exId) toggles[String(exId)] = true;
  //         }
  //       }
  //     });
  //     setOverwriteToggles(toggles);
  //     setInitialized(true);
  //   }
  // }, [preview, existingKeys, uniqueKey, initialized, existing]);

  // Effetto separato per notificare i cambiamenti
  useEffect(() => {
    if (!onOverwriteChange) return;
    const selectedIds = Object.keys(overwriteToggles).filter(key => overwriteToggles[key]);
    // Evita notifiche duplicate quando non ci sono cambiamenti reali
    if (arraysEqual(selectedIds, lastReportedIdsRef.current)) return;
    lastReportedIdsRef.current = selectedIds;
    onOverwriteChange(selectedIds);
  }, [overwriteToggles, onOverwriteChange]);
  
  // Gestione del click all'esterno del dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCompanyDropdownOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Gestione selezione righe per l'import
  const handleRowSelectionToggle = (rowIndex: number) => {
    // ... existing code ...
  };

  const handleSelectAllRows = () => {
    if (!onRowSelectionChange) return;
    
    const allRowsSelected = selectedRows.size === preview.length;
    if (allRowsSelected) {
      // Deseleziona tutte le righe
      onRowSelectionChange(new Set());
      
      // Deseleziona anche tutti i toggle di sovrascrittura
      const noToggles: { [id: string]: boolean } = {};
      preview.forEach(item => {
        const key = item[uniqueKey];
        if (key && existingKeys.has(norm(key))) {
          // Trova l'elemento esistente corrispondente per ottenere l'ID corretto
          const existingItem = existing.find(e => 
            norm(e[uniqueKey]) === norm(key)
          );
          if (existingItem && (existingItem as any).id) {
            noToggles[String((existingItem as any).id)] = false;
          }
        }
      });
      setOverwriteToggles(noToggles);
    } else {
      // Seleziona tutte le righe
      onRowSelectionChange(new Set(Array.from({ length: preview.length }, (_, i) => i)));
      
      // Seleziona anche tutti i toggle di sovrascrittura per i duplicati
      const allToggles: { [id: string]: boolean } = { ...overwriteToggles };
      preview.forEach(item => {
        const key = item[uniqueKey];
        if (key && existingKeys.has(norm(key))) {
          const existingItem = existing.find(e => 
            norm(e[uniqueKey]) === norm(key)
          );
          if (existingItem && (existingItem as any).id) {
            allToggles[String((existingItem as any).id)] = true;
          }
        }
      });
      setOverwriteToggles(allToggles);
    }
  };

  const areAllRowsSelected = selectedRows.size === preview.length && preview.length > 0;
  const areSomeRowsSelected = selectedRows.size > 0 && selectedRows.size < preview.length;
  const handleResizeStart = (col: string, e: React.MouseEvent) => {
    resizingCol.current = col;
    startX.current = e.clientX;
    startWidth.current = colWidths[col];
    
    document.addEventListener('mousemove', handleResizing as any);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const handleResizing = (e: MouseEvent) => {
    if (!resizingCol.current) return;
    const diff = e.clientX - startX.current;
    const col = resizingCol.current;
    const minWidth = columns.find(c => c.key === col)?.minWidth || 40;
    const newWidth = Math.max(minWidth, startWidth.current + diff);
    setColWidths(w => ({ ...w, [col]: newWidth }));
  };

  const handleResizeEnd = () => {
    resizingCol.current = null;
    document.removeEventListener('mousemove', handleResizing as any);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  // Gestore per il cambio di stato dei checkbox di sovrascrittura
  const handleToggleOverwrite = (id: string) => {
    // Aggiorna lo stato immediatamente con una funzione per evitare problemi di state batching
    setOverwriteToggles(prev => {
      const newState = {
        ...prev,
        [id]: !prev[id]
      };
      
      // Sincronizza con la selezione delle righe
      if (onRowSelectionChange) {
        const existingItem = existing.find(e => String(e.id) === id);
        if (existingItem) {
          const rowIndex = preview.findIndex(item => 
            item[uniqueKey] && 
            norm(item[uniqueKey]) === norm(existingItem[uniqueKey])
          );
          
          if (rowIndex !== -1) {
            const newSelectedRows = new Set(selectedRows);
            if (newState[id]) {
              // Se viene selezionato per sovrascrittura, seleziona anche per importazione
              newSelectedRows.add(rowIndex);
            } else {
              // Se viene deselezionato per sovrascrittura, deseleziona anche per importazione
              newSelectedRows.delete(rowIndex);
            }
            onRowSelectionChange(newSelectedRows);
          }
        }
      }
      
      return newState;
    });
  };

  // Seleziona tutti i duplicati
  const selectAllOverwrites = () => {
    const allToggles: { [id: string]: boolean } = {};
    
    // Assicurati che tutti gli ID presenti in existingKeys abbiano un toggle
    preview.forEach(item => {
      const key = item[uniqueKey];
      if (key && existingKeys.has(norm(key))) {
        // Trova l'elemento esistente corrispondente per ottenere l'ID corretto
        const existingItem = existing.find(e => 
          norm(e[uniqueKey]) === norm(key)
        );
        if (existingItem && existingItem.id) {
          allToggles[String(existingItem.id)] = true;
        }
      }
    });
    
    setOverwriteToggles(allToggles);
    
    // Notifica immediatamente il cambiamento al parent
    if (onOverwriteChange) {
      const selectedIds = Object.keys(allToggles).filter(key => allToggles[key]);
      onOverwriteChange(selectedIds);
    }
  };

  // Deseleziona tutti i duplicati
  const deselectAllOverwrites = () => {
    // Creiamo un nuovo oggetto con tutti i valori impostati a false invece di usare un oggetto vuoto
    const noToggles: { [id: string]: boolean } = {};
    
    // Assicurati che tutti gli ID presenti in existingKeys abbiano un toggle
    preview.forEach(item => {
      const key = item[uniqueKey];
      if (key && existingKeys.has(norm(key))) {
        // Trova l'elemento esistente corrispondente per ottenere l'ID corretto
        const existingItem = existing.find(e => 
          norm(e[uniqueKey]) === norm(key)
        );
        if (existingItem && existingItem.id) {
          noToggles[String(existingItem.id)] = false;
        }
      }
    });
    
    setOverwriteToggles(noToggles);
    
    // Notifica immediatamente il cambiamento al parent
    if (onOverwriteChange) {
      onOverwriteChange([]);
    }
  };

  // Controlla se tutte le righe duplicate sono selezionate
  const duplicateCount = preview.filter(item => item[uniqueKey] && existingKeys.has(norm(item[uniqueKey]))).length;
  const selectedCount = selectedRows.size;
  const areAllDuplicatesSelected = duplicateCount > 0 && selectedCount === duplicateCount;
  
  // Stato per il checkbox "seleziona tutto"
  const handleToggleAllDuplicates = () => {
    if (areAllDuplicatesSelected) {
      deselectAllOverwrites();
    } else {
      selectAllOverwrites();
    }
  };

  // Funzione unificata per formattare le date in formato dd/mm/yyyy
  const formatDateForComparison = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return String(dateString);
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      return String(dateString);
    }
  };

  // Formattazione e normalizzazione booleana
  const normalizeBoolean = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    const s = String(value).trim().toLowerCase();
    if (['true', '1', 'yes', 'si', 'sì', 'y'].includes(s)) return 'true';
    if (['false', '0', 'no', 'n'].includes(s)) return 'false';
    return '';
  };

  const formatBooleanForDisplay = (value: unknown): string => {
    const n = normalizeBoolean(value);
    if (n === 'true') return 'Sì';
    if (n === 'false') return 'No';
    return '';
  };

  // Trova il valore corrispondente nel database tramite mappatura dei campi
  const getDbValue = (existingItem: Record<string, any>, csvKey: string, currentRow?: Record<string, any>): string => {
    // Rimuovi l'indice dalla chiave se presente (es. "postalCode-0" -> "postalCode")
    const originalKey = csvKey.replace(/-\d+$/, '');

    // Gestione specifica per campi Sede Aziendale: confronta contro existingItem.sites[]
    if (
      ['siteName', 'siteIndirizzo', 'siteCitta', 'siteProvincia', 'siteCap'].includes(originalKey) &&
      existingItem && Array.isArray((existingItem as any).sites)
    ) {
      const sites: any[] = (existingItem as any).sites || [];
      const targetNameRaw = (currentRow?.siteName ?? currentRow?.siteCitta ?? '').toString();
      const targetAddrRaw = (currentRow?.siteIndirizzo ?? '').toString();

      let matchedSite: any | undefined;
      if (targetNameRaw) {
        const targetName = norm(targetNameRaw);
        matchedSite = sites.find(s => norm(s?.siteName || s?.name || '') === targetName);
      }
      if (!matchedSite && targetAddrRaw) {
        const targetAddr = norm(targetAddrRaw);
        matchedSite = sites.find(s => norm(s?.siteIndirizzo || s?.address || s?.indirizzo || '') === targetAddr);
      }

      if (matchedSite) {
        switch (originalKey) {
          case 'siteName':
            return String(matchedSite.siteName || matchedSite.name || '');
          case 'siteIndirizzo':
            return String(matchedSite.siteIndirizzo || matchedSite.address || matchedSite.indirizzo || '');
          case 'siteCitta':
            return String(matchedSite.siteCitta || matchedSite.city || matchedSite.citta || '');
          case 'siteProvincia':
            return String(matchedSite.siteProvincia || matchedSite.province || matchedSite.provincia || '');
          case 'siteCap':
            return String(matchedSite.siteCap || matchedSite.cap || matchedSite.zip || '');
        }
      }
      // Se non c'è match di sito, non mostriamo valore DB per questi campi
      return '';
    }

    // Ottieni possibili nomi di campi nel database per questa chiave CSV
    const possibleKeys = fieldMappings[originalKey] || [originalKey];

    // Prova ogni possibile chiave nel database
    for (const dbKey of possibleKeys) {
      if (existingItem[dbKey] !== undefined && existingItem[dbKey] !== null) {
        const value = existingItem[dbKey];
        
        // Gestione speciale per i campi di tipo data
        if (originalKey === 'data_nascita' && value) {
          return formatDateForComparison(value);
        }
        
        // Gestione speciale per il campo company_name/companyId
        if (originalKey === 'company_name' && (dbKey === 'companyId' || dbKey === 'companyName') && value) {
          // Trova il nome dell'azienda dall'ID
          const company = availableCompanies.find(c => c.id === value);
          return company ? (company.ragioneSociale || company.name || '') : String(value);
        }
        
        return String(value);
      }
    }
    
    return '';
  };
  
  // Controlla se qualche riga è selezionata
  const hasSelectedRows = selectedCount > 0;
  
  // Stato della riga (nuovo, aggiornato, errore, conflitto)
  const renderRowStatus = (item: T, index: number) => {
    const hasErrors = rowErrors[index] && rowErrors[index].length > 0;
    const errors = rowErrors[index] || [];
    const conflict = conflicts[index];
    const isRowSelected = selectedRows.has(index);
    
    // Controlla se ci sono errori specifici del codice fiscale
    const hasFiscalCodeError = errors.some(error => 
      error.toLowerCase().includes('codice fiscale') || 
      error.toLowerCase().includes('fiscal') ||
      error.toLowerCase().includes('cf')
    );
    
    // Se l'elemento ha già un ID, è un record esistente
    // Oppure se c'è un conflitto di tipo duplicate, è anche esistente
    // Oppure se ha il flag _isExisting impostato da EmployeeImport
    const isExisting = item.id !== undefined || 
      item._isExisting === true ||
      (item[uniqueKey] && existingKeys.has(norm(item[uniqueKey]))) ||
      (conflict && conflict.type === 'duplicate');
    

    
    // Se l'elemento ha un ID, usiamo quello per il checkbox
    const id = item.id || (() => {
      // Altrimenti, troviamo l'ID corrispondente nel dataset esistente
      if (item[uniqueKey]) {
        const existingItem = existing.find(e => 
          norm(e[uniqueKey]) === norm(item[uniqueKey])
        );
        return existingItem?.id;
      }
      return null;
    })();
    
    // Gestione conflitti
    if (conflict) {
      return (
        <div className="flex flex-col items-center space-y-1 p-1 min-w-[160px]">
          {/* Checkbox di selezione per l'import */}
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={isRowSelected}
              onChange={() => handleRowSelectionToggle(index)}
              className="accent-blue-600 mr-1"
              title="Seleziona per importare"
            />
            <span className="text-xs text-gray-600 font-medium">Importa</span>
          </div>
          
          {conflict.type === 'duplicate' && (
            <>
              <div className="flex items-center justify-center text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-200 w-full">
                <span className="text-xs font-medium">⚠️ Duplicato CF</span>
              </div>
              <div className="flex space-x-1 w-full">
                <button
                  onClick={() => onConflictResolutionChange?.(index, { resolution: 'skip' })}
                  className={`flex-1 px-2 py-1 text-xs rounded font-medium transition-colors ${
                    conflict.resolution === 'skip' 
                      ? 'bg-red-500 text-white shadow-sm' 
                      : 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600 border border-gray-300'
                  }`}
                  title="Mantieni il record esistente"
                >
                  Salta
                </button>
                <button
                  onClick={() => onConflictResolutionChange?.(index, { resolution: 'overwrite' })}
                  className={`flex-1 px-2 py-1 text-xs rounded font-medium transition-colors ${
                    conflict.resolution === 'overwrite' 
                      ? 'bg-blue-500 text-white shadow-sm' 
                      : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-600 border border-gray-300'
                  }`}
                  title="Sostituisci con i nuovi dati"
                >
                  Sovrascrivi
                </button>
              </div>
            </>
          )}
          
          {conflict.type === 'invalid_company' && (
            <>
              <div className="flex items-center justify-center text-orange-600 bg-orange-50 px-2 py-1 rounded-md border border-orange-200 w-full">
                <span className="text-xs font-medium">🏢 Azienda non trovata</span>
              </div>
              <select
                value={conflict.selectedCompanyId || ''}
                onChange={(e) => {
                  const selectedCompany = availableCompanies.find(c => c.id === e.target.value);
                  onConflictResolutionChange?.(index, { 
                    resolution: e.target.value ? 'assign_company' : undefined,
                    selectedCompanyId: e.target.value || undefined,
                    selectedCompanyName: selectedCompany?.ragioneSociale || selectedCompany?.name
                  });
                }}
                className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                title="Seleziona un'azienda"
              >
                <option value="">🔍 Seleziona azienda...</option>
                {availableCompanies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.ragioneSociale || company.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      );
    }
    
    // Gestione normale (senza conflitti)
    return (
      <div className="flex flex-col items-center space-y-1 p-1">
        {/* Checkbox di selezione per l'import */}
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={isRowSelected}
            onChange={() => handleRowSelectionToggle(index)}
            className="accent-blue-600 mr-1"
            title="Seleziona per importare"
          />
          <span className="text-xs text-gray-600 font-medium">Importa</span>
        </div>
        
        {/* Indicatore di stato compatto */}
        <div className="flex items-center justify-center">
          {hasErrors ? (
            <div className="flex items-center text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200" title={errors.join(', ')}>
              <AlertCircle size={12} className="mr-1" />
              <span className="text-xs font-medium">Errore</span>
            </div>
          ) : isExisting ? (
            <div className="flex items-center text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              <CheckCircle size={12} className="mr-1" />
              <span className="text-xs font-medium">Agg.</span>
            </div>
          ) : (
            <div className="flex items-center text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
              <CheckCircle size={12} className="mr-1" />
              <span className="text-xs font-medium">Nuovo</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="rounded-t-lg bg-gray-50">
        <div className="py-4 px-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-700">
                {preview.length} righe trovate
              </span>
              {duplicateCount > 0 && (
                <span className="text-blue-700 bg-blue-100 px-2 py-0.5 text-xs rounded-full">
                  {duplicateCount} duplicati
                </span>
              )}
            </div>
            
            {availableCompanies && availableCompanies.length > 0 && (
              <div className="relative" ref={dropdownRef}>
                <div 
                  onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-full border border-blue-700 cursor-pointer flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                  </svg>
                  <span>
                    {selectedCompanyId ? 
                      (availableCompanies.find(c => c.id === selectedCompanyId)?.ragioneSociale || 
                       availableCompanies.find(c => c.id === selectedCompanyId)?.name || 'Seleziona azienda') : 
                      'Assegna azienda'}
                  </span>
                  <svg className={`w-4 h-4 transition-transform ${isCompanyDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
                
                {isCompanyDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-300 rounded-lg shadow-xl z-[999] overflow-hidden">
                    <div className="p-3 border-b border-gray-200 bg-gray-50">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                        <input
                          type="text"
                          placeholder="Cerca azienda per nome..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          autoFocus
                        />
                      </div>
                      <p className="text-xs text-gray-600">
                        {selectedRows.size > 0 && selectedRows.size < preview.length
                          ? `Assegna azienda alle ${selectedRows.size} righe selezionate` 
                          : 'Assegna azienda a tutte le righe'}
                      </p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {filteredCompanies.length > 0 ? (
                        filteredCompanies.map((company) => (
                          <div
                            key={company.id}
                            onClick={() => handleCompanySelect(company.id)}
                            className={`px-4 py-3 text-sm cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                              selectedCompanyId === company.id ? "bg-blue-100 text-blue-800 border-blue-200" : "text-gray-700"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                               <div className="flex-1">
                                 <div className="font-medium">{company.ragioneSociale || company.name}</div>
                               </div>
                               {selectedCompanyId === company.id && (
                                 <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                 </svg>
                               )}
                             </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-6 text-center">
                          <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                          </svg>
                          <p className="text-sm text-gray-500">Nessuna azienda trovata</p>
                          <p className="text-xs text-gray-400 mt-1">Prova a modificare i criteri di ricerca</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="max-h-96 overflow-auto">
        <table className="min-w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            {/* Se useremo un'unica colonna di checkbox, modifichiamo la larghezza */}
            <col style={{ width: '60px', minWidth: '60px', maxWidth: '80px' }} />
            {columns.map(col => (
              <col key={col.key} style={{ width: colWidths[col.key], minWidth: col.minWidth }} />
            ))}
            {/* Se non unifichiamo le colonne, aggiungiamo la colonna per l'indicatore di sovrascrittura */}
            {!useSingleCheckboxColumn && <col style={{ width: '70px', minWidth: '70px' }} />}
          </colgroup>
          
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-xs font-medium">Stato</span>
                  <div className="flex items-center space-x-1">
                    <input
                      type="checkbox"
                      checked={areAllRowsSelected}
                      ref={(el) => {
                        if (el) {
                          el.indeterminate = areSomeRowsSelected && !areAllRowsSelected;
                        }
                      }}
                      onChange={handleSelectAllRows}
                      className="accent-blue-600"
                      title={areAllRowsSelected ? "Deseleziona tutto" : "Seleziona tutto"}
                    />
                    <span className="text-xs text-gray-600">Tutti</span>
                  </div>
                </div>
              </th>
              {columns.map(col => (
                <th 
                  key={col.key}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative group select-none"
                >
                  {col.label}
                  <div
                    onMouseDown={(e) => handleResizeStart(col.key, e)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded bg-gray-300 group-hover:bg-blue-500 cursor-col-resize transition"
                    style={{ zIndex: 2 }}
                    role="separator"
                    aria-orientation="vertical"
                    tabIndex={-1}
                  />
                </th>
              ))}
              {/* Se non unifichiamo le colonne, aggiungiamo l'header per l'indicatore di sovrascrittura */}
              {!useSingleCheckboxColumn && (
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sovr.
                </th>
              )}
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {preview.map((item, idx) => {
              // Trova eventuale record esistente corrispondente
              const key = item[uniqueKey];
              const isExisting = key && existingKeys.has(norm(key));
              const existingItem = isExisting 
              ? existing.find(e => norm(e[uniqueKey]) === norm(key)) 
              : null;
                
              // Ottieni eventuali errori per questa riga
              const errors = rowErrors[idx] || [];
              
              // Determina se il checkbox deve essere mostrato
              const showCheckbox = isExisting && useSingleCheckboxColumn;
              
              // Genera una chiave unica stabile basata solo sull'indice della riga
              // Questo garantisce che ogni riga abbia sempre una chiave unica e stabile
              const uniqueRowKey = `import-row-${idx}`;
              
              return (
                <tr key={uniqueRowKey} className={errors.length ? 'bg-red-50' : (idx % 2 === 0 ? 'bg-white' : 'bg-gray-50')}>
                  <td className="text-center p-2">
                    <div className="flex justify-center items-center h-full">
                      {renderRowStatus(item, idx)}
                    </div>
                  </td>
                  
                  {columns.map(col => {
                    // Estrai la chiave originale rimuovendo l'indice aggiunto per l'unicità
                    const originalKey = col.key.replace(/-\d+$/, '');
                    
                    // Determina se questo campo è diverso nell'elemento esistente
                    let isDifferent = false;
                    let existingValue = '';
                    
                    if (isExisting && existingItem) {
                      // Normalizza i valori per il confronto
                      const newValueRaw: any = (item as any)[originalKey];
                      let newValueForCompare = '';

                      // Formattazione speciale per le date nel confronto
                      if ((originalKey === 'data_nascita' || originalKey === 'birthDate') && newValueRaw) {
                        newValueForCompare = formatDateForComparison(String(newValueRaw));
                      } else {
                        // Gestione booleana (es. isActive)
                        const nb = normalizeBoolean(newValueRaw);
                        newValueForCompare = nb || String(newValueRaw ?? '').trim();
                      }
                      
                      const dbRaw = getDbValue(existingItem, originalKey, item as unknown as Record<string, any>);
                      // Per confronto DB applica la stessa normalizzazione
                      let existingValueForCompare = '';
                      if ((originalKey === 'data_nascita' || originalKey === 'birthDate') && dbRaw) {
                        existingValueForCompare = formatDateForComparison(dbRaw);
                      } else {
                        const nbDb = normalizeBoolean(dbRaw);
                        existingValueForCompare = nbDb || String(dbRaw ?? '').trim();
                      }
                      
                      existingValue = String(dbRaw ?? '').trim();
                      // Evidenzia differenze
                      isDifferent = newValueForCompare !== existingValueForCompare;
                    }
                    
                    const value = (item as any)[originalKey];
                    let displayValue = '';
                    
                    // Formattazione speciale per la data di nascita
                    if ((originalKey === 'data_nascita' || originalKey === 'birthDate') && value) {
                      displayValue = formatDateForComparison(String(value));
                    } else if (normalizeBoolean(value)) {
                      // Formattazione booleana leggibile
                      displayValue = formatBooleanForDisplay(value);
                    } else {
                      displayValue = value !== undefined && value !== null 
                        ? String(value) 
                        : '';
                    }

                    // Valore DB formattato per tooltip (applica stessa logica)
                    let existingValueDisplay = existingValue;
                    if (existingValue) {
                      if ((originalKey === 'data_nascita' || originalKey === 'birthDate')) {
                        existingValueDisplay = formatDateForComparison(existingValue);
                      } else if (normalizeBoolean(existingValue)) {
                        existingValueDisplay = formatBooleanForDisplay(existingValue);
                      }
                    }
                    
                    // Genera una chiave unica per la cella che combina indice riga e chiave colonna
                    const cellKey = `${uniqueRowKey}-${col.key}`;
                    
                    return (
                      <td
                        key={cellKey}
                        className={`px-3 py-2 whitespace-nowrap overflow-hidden text-sm ${
                          isDifferent ? 'text-blue-600 font-medium' : 'text-gray-900'
                        }`}
                        style={{ maxWidth: colWidths[col.key], minWidth: col.minWidth }}
                        title={displayValue}
                      >
                        <div className="truncate">
                          {displayValue || <span className="text-gray-400 italic">(vuoto)</span>}
                          {isDifferent && existingItem && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 truncate">
                              <span className="inline-block w-1.5 h-1.5 bg-blue-400 rounded-full"></span> 
                              DB: {existingValueDisplay || "(vuoto)"}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  
                  {/* Se non usiamo una colonna unificata, aggiungiamo la colonna per i checkbox */}
                  {!useSingleCheckboxColumn && isExisting && (
                    <td className="px-3 py-2 whitespace-nowrap text-center">
                      <input
                        type="checkbox"
                        checked={item.id ? overwriteToggles[String(item.id)] || false : false}
                        onChange={() => item.id && handleToggleOverwrite(String(item.id))}
                        className="accent-blue-600 w-4 h-4"
                      />
                    </td>
                  )}
                  
                  {/* Se non usiamo una colonna unificata e non è un record esistente, aggiungiamo una cella vuota */}
                  {!useSingleCheckboxColumn && !isExisting && (
                    <td className="px-3 py-2 whitespace-nowrap text-center text-green-500">
                      <span className="text-sm font-medium">Nuovo</span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Mostra eventuali errori di riga */}
      {Object.keys(rowErrors).length > 0 && (
        <div className="mt-2 bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          <div className="font-medium mb-1">Errori rilevati:</div>
          <ul className="list-disc pl-5 space-y-1">
            {Object.entries(rowErrors).map(([rowIdx, errors]) => (
              <li key={rowIdx}>
                Riga {parseInt(rowIdx) + 1}: {errors.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
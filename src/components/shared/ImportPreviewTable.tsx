import React, { useState, useRef, useEffect } from 'react';
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
}

// Mappa dei campi tra nomi diversi (CSV e database)
const fieldMappings: Record<string, string[]> = {
  // CSV key: [possibili chiavi nel database]
  'nome': ['firstName', 'nome'],
  'cognome': ['lastName', 'cognome'],
  'codice_fiscale': ['codiceFiscale', 'codice_fiscale', 'taxCode'],
  'company_name': ['companyName', 'company_name', 'companyId'],
  'profilo_professionale': ['title', 'profilo_professionale', 'mansione', 'position'],
  'email': ['email'],
  'telefono': ['phone', 'telefono'],
  'indirizzo': ['residenceAddress', 'indirizzo'],
  'citta': ['city', 'citta'],
  'provincia': ['province', 'provincia'],
  'cap': ['postalCode', 'postal_code', 'cap'],
  'data_nascita': ['birthDate', 'birth_date', 'data_nascita'],
  'department_id': ['departmentId', 'department_id']
};

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
  onRowSelectionChange
}: ImportPreviewTableProps<T>) {
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => 
    columns.reduce((acc, col) => ({ ...acc, [col.key]: col.width }), {} as Record<string, number>)
  );
  const [overwriteToggles, setOverwriteToggles] = useState<{ [id: string]: boolean }>({});
  const [initialized, setInitialized] = useState(false);
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  
  const resizingCol = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Identifica le righe duplicate utilizzando la chiave univoca (con normalizzazione)
  const existingKeys = new Set(
    existing
      .map(item => item[uniqueKey])
      .filter(Boolean)
      .map(value => String(value).toLowerCase().trim())
  );

  // Imposta i toggle predefiniti per i duplicati all'inizializzazione, solo una volta
  useEffect(() => {
    if (!initialized) {
      const toggles: { [id: string]: boolean } = {};
      preview.forEach(item => {
        // Se il record ha un ID, significa che è un record esistente
        if (item.id) {
          toggles[String(item.id)] = true;
        } 
        // Altrimenti, verifica usando la chiave univoca
        else if (item[uniqueKey] && existingKeys.has(String(item[uniqueKey]))) {
          // Trova l'ID del record esistente
          const existingItem = existing.find(e => String(e[uniqueKey]) === String(item[uniqueKey]));
          if (existingItem) {
            toggles[String(existingItem.id)] = true;
          }
        }
      });
      setOverwriteToggles(toggles);
      setInitialized(true);
    }
  }, [preview, existingKeys, uniqueKey, initialized, existing]);

  // Effetto separato per notificare i cambiamenti
  useEffect(() => {
    if (onOverwriteChange) {
      const selectedIds = Object.keys(overwriteToggles).filter(key => overwriteToggles[key]);
      onOverwriteChange(selectedIds);
    }
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
    if (!onRowSelectionChange) return;
    
    const newSelectedRows = new Set(selectedRows);
    const item = preview[rowIndex];
    
    if (newSelectedRows.has(rowIndex)) {
      // Deseleziona la riga per l'importazione
      newSelectedRows.delete(rowIndex);
      
      // Se la riga è un duplicato, deseleziona anche dalla sovrascrittura
      if (item && item[uniqueKey] && existingKeys.has(String(item[uniqueKey]).toLowerCase().trim())) {
        const existingItem = existing.find(e => 
          String(e[uniqueKey]).toLowerCase().trim() === String(item[uniqueKey]).toLowerCase().trim()
        );
        if (existingItem && existingItem.id) {
          setOverwriteToggles(prev => ({
            ...prev,
            [String(existingItem.id)]: false
          }));
        }
      }
    } else {
      // Seleziona la riga per l'importazione
      newSelectedRows.add(rowIndex);
      
      // Se la riga è un duplicato, seleziona anche per la sovrascrittura
      if (item && item[uniqueKey] && existingKeys.has(String(item[uniqueKey]).toLowerCase().trim())) {
        const existingItem = existing.find(e => 
          String(e[uniqueKey]).toLowerCase().trim() === String(item[uniqueKey]).toLowerCase().trim()
        );
        if (existingItem && existingItem.id) {
          setOverwriteToggles(prev => ({
            ...prev,
            [String(existingItem.id)]: true
          }));
        }
      }
    }
    
    onRowSelectionChange(newSelectedRows);
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
        if (key && existingKeys.has(String(key).toLowerCase().trim())) {
          const existingItem = existing.find(e => 
            String(e[uniqueKey]).toLowerCase().trim() === String(key).toLowerCase().trim()
          );
          if (existingItem && existingItem.id) {
            noToggles[String(existingItem.id)] = false;
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
        if (key && existingKeys.has(String(key).toLowerCase().trim())) {
          const existingItem = existing.find(e => 
            String(e[uniqueKey]).toLowerCase().trim() === String(key).toLowerCase().trim()
          );
          if (existingItem && existingItem.id) {
            allToggles[String(existingItem.id)] = true;
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
            String(item[uniqueKey]).toLowerCase().trim() === String(existingItem[uniqueKey]).toLowerCase().trim()
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
      if (key && existingKeys.has(String(key).toLowerCase().trim())) {
        // Trova l'elemento esistente corrispondente per ottenere l'ID corretto
        const existingItem = existing.find(e => 
          String(e[uniqueKey]).toLowerCase().trim() === String(key).toLowerCase().trim()
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
      if (key && existingKeys.has(String(key).toLowerCase().trim())) {
        // Trova l'elemento esistente corrispondente per ottenere l'ID corretto
        const existingItem = existing.find(e => 
          String(e[uniqueKey]).toLowerCase().trim() === String(key).toLowerCase().trim()
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

  // Gestore per il cambio dell'azienda per le righe selezionate
  const handleCompanySelect = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setIsCompanyDropdownOpen(false);
    
    if (onCompanyChange) {
      // Se ci sono righe selezionate tramite checkbox, applica solo a quelle
      if (selectedRows.size > 0) {
        // Passa gli indici delle righe selezionate come stringhe
        const selectedRowIndices = Array.from(selectedRows).map(index => String(index));
        onCompanyChange(selectedRowIndices, companyId);
      } else {
        // Se non ci sono righe selezionate tramite checkbox, applica a tutte le righe
        const allRowIndices = Array.from({ length: preview.length }, (_, index) => String(index));
        onCompanyChange(allRowIndices, companyId);
      }
    }
  };

  // Filtra le aziende in base al termine di ricerca
  const filteredCompanies = availableCompanies.filter(company => 
    (company.ragioneSociale || company.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Controlla se tutte le righe duplicate sono selezionate
  const duplicateCount = preview.filter(item => item[uniqueKey] && existingKeys.has(String(item[uniqueKey]))).length;
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

  // Trova il valore corrispondente nel database tramite mappatura dei campi
  const getDbValue = (existingItem: Record<string, any>, csvKey: string): string => {
    // Rimuovi l'indice dalla chiave se presente (es. "postalCode-0" -> "postalCode")
    const originalKey = csvKey.replace(/-\d+$/, '');
    
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
      (item[uniqueKey] && existingKeys.has(String(item[uniqueKey]).toLowerCase().trim())) ||
      (conflict && conflict.type === 'duplicate');
    

    
    // Se l'elemento ha un ID, usiamo quello per il checkbox
    const id = item.id || (() => {
      // Altrimenti, troviamo l'ID corrispondente nel dataset esistente
      if (item[uniqueKey]) {
        const existingItem = existing.find(e => 
          String(e[uniqueKey]).toLowerCase().trim() === String(item[uniqueKey]).toLowerCase().trim()
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
            <div className="flex items-center text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-200" title={errors.join(', ')}>
              <AlertCircle size={12} className="mr-1" />
              <span className="text-xs font-medium">
                {hasFiscalCodeError ? '❌ CF Invalido' : '❌ Errore'}
              </span>
            </div>
          ) : isExisting ? (
            <div className="flex items-center text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
              <CheckCircle size={12} className="mr-1" />
              <span className="text-xs font-medium">🔄 Esistente</span>
            </div>
          ) : (
            <div className="flex items-center text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-200">
              <CheckCircle size={12} className="mr-1" />
              <span className="text-xs font-medium">✨ Nuovo</span>
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
              const isExisting = key && existingKeys.has(String(key));
              const existingItem = isExisting 
                ? existing.find(e => String(e[uniqueKey]) === String(key)) 
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
                      let newValue = String(item[originalKey] ?? '').trim();
                      
                      // Formattazione speciale per le date nel confronto
                      if ((originalKey === 'data_nascita' || originalKey === 'birthDate') && newValue) {
                        newValue = formatDateForComparison(newValue);
                      }
                      
                      existingValue = getDbValue(existingItem, originalKey).trim();
                      
                      // Evidenzia le differenze in tutti i casi:
                      // - Nuovo valore diverso da quello esistente (anche se vuoto)
                      // - Valore esistente diverso da quello nuovo (anche se vuoto)
                      isDifferent = newValue !== existingValue;
                    }
                    
                    const value = item[originalKey];
                    let displayValue = '';
                    
                    // Formattazione speciale per la data di nascita
                    if ((originalKey === 'data_nascita' || originalKey === 'birthDate') && value) {
                      displayValue = formatDateForComparison(value);
                    } else {
                      displayValue = value !== undefined && value !== null 
                        ? String(value) 
                        : '';
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
                              DB: {existingValue || "(vuoto)"}
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
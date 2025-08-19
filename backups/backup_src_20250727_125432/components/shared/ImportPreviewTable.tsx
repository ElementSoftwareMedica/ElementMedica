import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { formatDate } from '../../design-system/utils';

export interface ImportPreviewColumn {
  key: string;
  label: string;
  minWidth: number;
  width: number;
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
  availableCompanies?: Array<{id: string, name: string}>;
  overwriteIds?: string[];
}

// Mappa dei campi tra nomi diversi (CSV e database)
const fieldMappings: Record<string, string[]> = {
  // CSV key: [possibili chiavi nel database]
  'nome': ['firstName', 'nome'],
  'cognome': ['lastName', 'cognome'],
  'codice_fiscale': ['codiceFiscale', 'codice_fiscale'],
  'company_name': ['companyName', 'company_name', 'companyId'],
  'mansione': ['title', 'mansione', 'position'],
  'email': ['email'],
  'telefono': ['phone', 'telefono'],
  'indirizzo': ['address', 'indirizzo'],
  'citta': ['city', 'citta'],
  'provincia': ['province', 'provincia'],
  'cap': ['postalCode', 'postal_code', 'cap'],
  'data_nascita': ['birthDate', 'birth_date', 'data_nascita'],
  'luogo_nascita': ['birthPlace', 'birth_place', 'luogo_nascita'],
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
  overwriteIds = []
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
  
  // Identifica le righe duplicate utilizzando la chiave univoca
  const existingKeys = new Set(
    existing
      .map(item => item[uniqueKey])
      .filter(Boolean)
      .map(String)
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

  // Gestione del ridimensionamento delle colonne
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
      
      return newState;
    });
  };

  // Seleziona tutti i duplicati
  const selectAllOverwrites = () => {
    const allToggles: { [id: string]: boolean } = {};
    
    // Assicurati che tutti gli ID presenti in existingKeys abbiano un toggle
    preview.forEach(item => {
      const key = item[uniqueKey];
      if (key && existingKeys.has(String(key))) {
        const stringKey = String(key);
        allToggles[stringKey] = true;
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
      if (key && existingKeys.has(String(key))) {
        const stringKey = String(key);
        noToggles[stringKey] = false;
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
      // Ottieni gli ID selezionati
      const selectedIds = Object.keys(overwriteToggles).filter(key => overwriteToggles[key]);
      if (selectedIds.length > 0) {
        onCompanyChange(selectedIds, companyId);
      }
    }
  };

  // Filtra le aziende in base al termine di ricerca
  const filteredCompanies = availableCompanies.filter(company => 
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Controlla se tutte le righe duplicate sono selezionate
  const duplicateCount = preview.filter(item => item[uniqueKey] && existingKeys.has(String(item[uniqueKey]))).length;
  const selectedCount = Object.values(overwriteToggles).filter(Boolean).length;
  const areAllDuplicatesSelected = duplicateCount > 0 && selectedCount === duplicateCount;
  
  // Stato per il checkbox "seleziona tutto"
  const handleToggleAllDuplicates = () => {
    if (areAllDuplicatesSelected) {
      deselectAllOverwrites();
    } else {
      selectAllOverwrites();
    }
  };

  // Trova il valore corrispondente nel database tramite mappatura dei campi
  const getDbValue = (existingItem: Record<string, any>, csvKey: string): string => {
    // Ottieni possibili nomi di campi nel database per questa chiave CSV
    const possibleKeys = fieldMappings[csvKey] || [csvKey];
    
    // Prova ogni possibile chiave nel database
    for (const dbKey of possibleKeys) {
      if (existingItem[dbKey] !== undefined) {
        const value = existingItem[dbKey];
        
        // Gestione speciale per i campi di tipo data
        if (csvKey === 'data_nascita' && value) {
          return formatDate(value);
        }
        
        // Gestione speciale per il campo company_name/companyId
        if (csvKey === 'company_name' && (dbKey === 'companyId' || dbKey === 'companyName') && value) {
          // Trova il nome dell'azienda dall'ID
          const company = availableCompanies.find(c => c.id === value);
          return company ? company.name : value;
        }
        
        return String(value !== null ? value : '');
      }
    }
    
    return '';
  };
  
  // Controlla se qualche riga è selezionata
  const hasSelectedRows = selectedCount > 0;
  
  // Stato della riga (nuovo, aggiornato, errore)
  const renderRowStatus = (item: T, index: number) => {
    const hasErrors = rowErrors[index] && rowErrors[index].length > 0;
    
    // Se l'elemento ha già un ID, è un record esistente
    const isExisting = item.id !== undefined || (
      item[uniqueKey] && existingKeys.has(String(item[uniqueKey]))
    );
    
    // Se l'elemento ha un ID, usiamo quello per il checkbox
    const id = item.id || (() => {
      // Altrimenti, troviamo l'ID corrispondente nel dataset esistente
      if (item[uniqueKey]) {
        const existingItem = existing.find(e => String(e[uniqueKey]) === String(item[uniqueKey]));
        return existingItem?.id;
      }
      return null;
    })();
    
    if (hasErrors) {
      return (
        <div className="flex items-center text-red-500">
          <AlertCircle size={16} />
        </div>
      );
    } else if (isExisting) {
      return (
        <div className="flex items-center text-blue-500">
          {useSingleCheckboxColumn ? (
            <div className="flex justify-center">
              <input
                type="checkbox"
                checked={id ? overwriteToggles[String(id)] || false : false}
                onChange={() => id && handleToggleOverwrite(String(id))}
                className="accent-blue-600"
                title="Seleziona per importare/aggiornare"
              />
            </div>
          ) : (
            <CheckCircle size={16} className="text-blue-500" aria-label="Duplicato" />
          )}
        </div>
      );
    } else {
      return (
        <div className="flex items-center text-green-500">
          {useSingleCheckboxColumn ? (
            <div className="flex justify-center">
              <input
                type="checkbox"
                checked={true}
                disabled
                className="accent-green-600 opacity-50"
                title="Nuova voce (sempre importata)"
              />
            </div>
          ) : (
            <CheckCircle size={16} className="text-green-500" aria-label="Nuova voce" />
          )}
        </div>
      );
    }
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
            
            {availableCompanies && availableCompanies.length > 0 && hasSelectedRows && (
              <div className="relative" ref={dropdownRef}>
                <div 
                  onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
                  className="px-3 py-1.5 text-sm bg-blue-100 text-blue-800 rounded-full border border-blue-300 cursor-pointer flex items-center gap-2"
                >
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                  {selectedCompanyId ? 
                    availableCompanies.find(c => c.id === selectedCompanyId)?.name || 'Cambia azienda' : 
                    'Cambia azienda'}
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
                
                {isCompanyDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg z-[999]">
                    <div className="p-2 border-b border-gray-200">
                      <input
                        type="text"
                        placeholder="Cerca azienda..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto py-1">
                      {filteredCompanies.length > 0 ? (
                        filteredCompanies.map((company) => (
                          <div
                            key={company.id}
                            onClick={() => handleCompanySelect(company.id)}
                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-100 ${
                              selectedCompanyId === company.id ? "bg-blue-50 text-blue-700" : ""
                            }`}
                          >
                            {company.name}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">Nessun risultato</div>
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
                {duplicateCount > 0 && (
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={areAllDuplicatesSelected}
                      onChange={handleToggleAllDuplicates}
                      className="accent-blue-600"
                      title="Seleziona/deseleziona tutti i duplicati"
                    />
                  </div>
                )}
                {duplicateCount === 0 && "Stato"}
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
              
              return (
                <tr key={idx} className={errors.length ? 'bg-red-50' : (idx % 2 === 0 ? 'bg-white' : 'bg-gray-50')}>
                  <td className="text-center p-2">
                    <div className="flex justify-center items-center h-full">
                      {renderRowStatus(item, idx)}
                    </div>
                  </td>
                  
                  {columns.map(col => {
                    // Determina se questo campo è diverso nell'elemento esistente
                    let isDifferent = false;
                    let existingValue = '';
                    
                    if (isExisting && existingItem) {
                      const newValue = String(item[col.key] ?? '').trim();
                      existingValue = getDbValue(existingItem, col.key);
                      isDifferent = newValue !== '' && newValue !== existingValue;
                    }
                    
                    const value = item[col.key];
                    let displayValue = '';
                    
                    // Formattazione speciale per la data di nascita
                    if (col.key === 'data_nascita' && value) {
                      try {
                        displayValue = formatDate(value);
                      } catch (e) {
                        displayValue = String(value);
                      }
                    } else {
                      displayValue = value !== undefined && value !== null 
                        ? String(value) 
                        : '';
                    }
                    
                    return (
                      <td
                        key={col.key}
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
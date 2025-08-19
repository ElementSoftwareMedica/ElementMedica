import React, { useState, useEffect } from 'react';
import ImportTableCell from './ImportTableCell';

interface EnhancedImportPreviewTableProps<T extends Record<string, any>> {
  preview: T[];
  columns: string[];
  existing: T[];
  uniqueKey: string;
  overwriteToggles: Record<string, boolean>;
  onToggleOverwrite: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  fieldMappings?: Record<string, string[]>;
  rowErrors?: Record<number, string[]>;
  useSingleCheckboxColumn?: boolean;
}

/**
 * Tabella migliorata per l'anteprima dei dati da importare
 * con evidenziazione delle differenze rispetto ai dati esistenti
 */
const EnhancedImportPreviewTable = <T extends Record<string, any>>({
  preview,
  columns,
  existing,
  uniqueKey,
  overwriteToggles,
  onToggleOverwrite,
  onToggleAll,
  fieldMappings = {},
  rowErrors = {},
  useSingleCheckboxColumn = true
}: EnhancedImportPreviewTableProps<T>) => {
  const [initialized, setInitialized] = useState(false);
  
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
          if (existingItem?.id) {
            toggles[String(existingItem.id)] = true;
          }
        }
      });
      
      // Imposta i toggle e marca come inizializzato
      Object.entries(toggles).forEach(([id, value]) => {
        onToggleOverwrite(id);
      });
      setInitialized(true);
    }
  }, [initialized, preview, existingKeys, existing, uniqueKey, onToggleOverwrite]);

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
        <div className="text-red-500 font-medium">
          Errore
        </div>
      );
    }
    
    if (isExisting) {
      if (useSingleCheckboxColumn) {
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={id ? overwriteToggles[String(id)] || false : false}
              onChange={() => id && onToggleOverwrite(id)}
              className="mr-2 accent-blue-600"
            />
            <span className="text-amber-600 font-medium">Aggiorna</span>
          </div>
        );
      } else {
        return <span className="text-amber-600 font-medium">Esistente</span>;
      }
    }
    
    return <span className="text-green-600 font-medium">Nuovo</span>;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              {useSingleCheckboxColumn ? (
                <div className="flex justify-center items-center">
                  <input
                    type="checkbox"
                    onChange={(e) => onToggleAll(e.target.checked)}
                    className="accent-blue-600"
                  />
                  <span className="ml-2">Stato</span>
                </div>
              ) : (
                "Stato"
              )}
            </th>
            
            {columns.map((col) => (
              <th
                key={col}
                scope="col"
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {col}
              </th>
            ))}
            
            {!useSingleCheckboxColumn && (
              <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aggiorna
              </th>
            )}
          </tr>
        </thead>
        
        <tbody className="bg-white divide-y divide-gray-200">
          {preview.map((item, idx) => {
            const errors = rowErrors[idx] || [];
            
            // Determina se questo item è un duplicato
            const isExisting = item.id !== undefined || (
              item[uniqueKey] && existingKeys.has(String(item[uniqueKey]))
            );
            
            // Ottieni il record DB corrispondente
            const dbRecord = item._dbRecord || (isExisting && item[uniqueKey] ? 
              existing.find(e => String(e[uniqueKey]) === String(item[uniqueKey])) : 
              null);
            
            return (
              <tr key={idx} className={errors.length ? 'bg-red-50' : (idx % 2 === 0 ? 'bg-white' : 'bg-gray-50')}>
                <td className="text-center p-2">
                  <div className="flex justify-center items-center h-full">
                    {renderRowStatus(item, idx)}
                  </div>
                </td>
                
                {columns.map(col => (
                  <td key={col} className="px-3 py-2 whitespace-nowrap">
                    <ImportTableCell
                      item={item}
                      column={col}
                      dbRecord={dbRecord}
                      fieldMappings={fieldMappings}
                      showDiff={isExisting}
                    />
                  </td>
                ))}
                
                {/* Se non usiamo una colonna unificata, aggiungiamo la colonna per i checkbox */}
                {!useSingleCheckboxColumn && isExisting && (
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    <input
                      type="checkbox"
                      checked={item.id ? overwriteToggles[String(item.id)] || false : false}
                      onChange={() => item.id && onToggleOverwrite(item.id)}
                      className="accent-blue-600"
                    />
                  </td>
                )}
                
                {/* Colonna per spazio vuoto se non è esistente e non usiamo checkbox unificati */}
                {!useSingleCheckboxColumn && !isExisting && (
                  <td className="px-3 py-2 whitespace-nowrap"></td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {/* Legenda errori */}
      <div className="mt-4">
        {Object.entries(rowErrors).flatMap(([rowIndex, errors]) => 
          errors.map((error, i) => (
            <div key={`${rowIndex}-${i}`} className="text-red-600 text-sm">
              Riga {parseInt(rowIndex) + 1}: {error}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EnhancedImportPreviewTable; 
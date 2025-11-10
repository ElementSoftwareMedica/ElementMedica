import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import type { ImportPreviewColumn } from '../hooks/useResizableColumns';
import type { ConflictInfo } from '../hooks/useConflictResolution';
import { ConflictResolver } from './ConflictResolver';
import { 
  formatDateForComparison, 
  formatBooleanForDisplay, 
  normalizeBoolean,
  normalizeKey 
} from '../utils/importHelpers';

interface TableRowProps<T> {
  item: T;
  index: number;
  columns: ImportPreviewColumn[];
  colWidths: Record<string, number>;
  existingKeys: Set<string>;
  existing: T[];
  uniqueKey: string;
  rowErrors: { [rowIdx: number]: string[] };
  conflicts?: { [rowIdx: number]: ConflictInfo };
  selectedRows: Set<number>;
  overwriteToggles: { [id: string]: boolean };
  useSingleCheckboxColumn?: boolean;
  availableCompanies?: Array<{ id: string; name?: string; ragioneSociale?: string }>;
  fieldMappings?: Record<string, string[]>;
  onRowSelectionToggle: (rowIndex: number) => void;
  onToggleOverwrite: (id: string) => void;
  onConflictResolutionChange?: (rowIdx: number, resolution: Partial<ConflictInfo>) => void;
  normalizer?: (v: unknown) => string;
}

/**
 * Table row component for import preview
 * 
 * Displays row data with conflict indicators, status, and overwrite checkboxes
 */
export function TableRow<T extends Record<string, any>>({
  item,
  index,
  columns,
  colWidths,
  existingKeys,
  existing,
  uniqueKey,
  rowErrors,
  conflicts = {},
  selectedRows,
  overwriteToggles,
  useSingleCheckboxColumn = false,
  availableCompanies = [],
  fieldMappings = {},
  onRowSelectionToggle,
  onToggleOverwrite,
  onConflictResolutionChange,
  normalizer
}: TableRowProps<T>) {
  const norm = (v: any) => normalizeKey(v, normalizer);
  
  const errors = rowErrors[index] || [];
  const conflict = conflicts[index];
  const isRowSelected = selectedRows.has(index);
  
  const key = item[uniqueKey];
  const isExisting = key && existingKeys.has(norm(key));
  const existingItem = isExisting 
    ? existing.find(e => norm(e[uniqueKey]) === norm(key)) 
    : null;
  
  const hasErrors = errors.length > 0;
  
  // Helper to get database value with field mappings
  const getDbValue = (existingItem: Record<string, any>, csvKey: string, currentRow?: Record<string, any>): string => {
    const originalKey = csvKey.replace(/-\d+$/, '');

    // Special handling for site fields
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
      return '';
    }

    const possibleKeys = fieldMappings[originalKey] || [originalKey];

    for (const dbKey of possibleKeys) {
      if (existingItem[dbKey] !== undefined && existingItem[dbKey] !== null) {
        const value = existingItem[dbKey];
        
        if (originalKey === 'data_nascita' && value) {
          return formatDateForComparison(value);
        }
        
        if (originalKey === 'company_name' && (dbKey === 'companyId' || dbKey === 'companyName') && value) {
          const company = availableCompanies.find(c => c.id === value);
          return company ? (company.ragioneSociale || company.name || '') : String(value);
        }
        
        return String(value);
      }
    }
    
    return '';
  };

  // Render row status column
  const renderRowStatus = () => {
    if (conflict) {
      return (
        <ConflictResolver
          conflict={conflict}
          rowIndex={index}
          isRowSelected={isRowSelected}
          onRowSelectionToggle={onRowSelectionToggle}
          onResolutionChange={onConflictResolutionChange!}
          availableCompanies={availableCompanies}
        />
      );
    }
    
    return (
      <div className="flex flex-col items-center space-y-1 p-1">
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={isRowSelected}
            onChange={() => onRowSelectionToggle(index)}
            className="accent-blue-600 mr-1"
            title="Seleziona per importare"
          />
          <span className="text-xs text-gray-600 font-medium">Importa</span>
        </div>
        
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

  const uniqueRowKey = `import-row-${index}`;

  return (
    <tr key={uniqueRowKey} className={hasErrors ? 'bg-red-50' : (index % 2 === 0 ? 'bg-white' : 'bg-gray-50')}>
      <td className="text-center p-2">
        <div className="flex justify-center items-center h-full">
          {renderRowStatus()}
        </div>
      </td>
      
      {columns.map(col => {
        const originalKey = col.key.replace(/-\d+$/, '');
        
        let isDifferent = false;
        let existingValue = '';
        
        if (isExisting && existingItem) {
          const newValueRaw: any = (item as any)[originalKey];
          let newValueForCompare = '';

          if ((originalKey === 'data_nascita' || originalKey === 'birthDate') && newValueRaw) {
            newValueForCompare = formatDateForComparison(String(newValueRaw));
          } else {
            const nb = normalizeBoolean(newValueRaw);
            newValueForCompare = nb || String(newValueRaw ?? '').trim();
          }
          
          const dbRaw = getDbValue(existingItem, originalKey, item as unknown as Record<string, any>);
          let existingValueForCompare = '';
          if ((originalKey === 'data_nascita' || originalKey === 'birthDate') && dbRaw) {
            existingValueForCompare = formatDateForComparison(dbRaw);
          } else {
            const nbDb = normalizeBoolean(dbRaw);
            existingValueForCompare = nbDb || String(dbRaw ?? '').trim();
          }
          
          existingValue = String(dbRaw ?? '').trim();
          isDifferent = newValueForCompare !== existingValueForCompare;
        }
        
        const value = (item as any)[originalKey];
        let displayValue = '';
        
        if ((originalKey === 'data_nascita' || originalKey === 'birthDate') && value) {
          displayValue = formatDateForComparison(String(value));
        } else if (normalizeBoolean(value)) {
          displayValue = formatBooleanForDisplay(value);
        } else {
          displayValue = value !== undefined && value !== null 
            ? String(value) 
            : '';
        }

        let existingValueDisplay = existingValue;
        if (existingValue) {
          if ((originalKey === 'data_nascita' || originalKey === 'birthDate')) {
            existingValueDisplay = formatDateForComparison(existingValue);
          } else if (normalizeBoolean(existingValue)) {
            existingValueDisplay = formatBooleanForDisplay(existingValue);
          }
        }
        
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
      
      {!useSingleCheckboxColumn && isExisting && (
        <td className="px-3 py-2 whitespace-nowrap text-center">
          <input
            type="checkbox"
            checked={item.id ? overwriteToggles[String(item.id)] || false : false}
            onChange={() => item.id && onToggleOverwrite(String(item.id))}
            className="accent-blue-600 w-4 h-4"
          />
        </td>
      )}
      
      {!useSingleCheckboxColumn && !isExisting && (
        <td className="px-3 py-2 whitespace-nowrap text-center text-green-500">
          <span className="text-sm font-medium">Nuovo</span>
        </td>
      )}
    </tr>
  );
}

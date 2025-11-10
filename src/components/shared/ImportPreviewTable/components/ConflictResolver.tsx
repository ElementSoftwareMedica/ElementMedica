import React from 'react';
import type { ConflictInfo } from '../hooks/useConflictResolution';

interface ConflictResolverProps {
  conflict: ConflictInfo;
  rowIndex: number;
  isRowSelected: boolean;
  onRowSelectionToggle: (rowIndex: number) => void;
  onResolutionChange: (rowIndex: number, resolution: Partial<ConflictInfo>) => void;
  availableCompanies?: Array<{ id: string; name?: string; ragioneSociale?: string }>;
}

/**
 * Conflict resolution component for duplicate and invalid company conflicts
 * 
 * Displays conflict type and resolution options (Skip, Overwrite, Assign Company)
 */
export function ConflictResolver({
  conflict,
  rowIndex,
  isRowSelected,
  onRowSelectionToggle,
  onResolutionChange,
  availableCompanies = []
}: ConflictResolverProps) {
  return (
    <div className="flex flex-col items-center space-y-1 p-1 min-w-[160px]">
      {/* Checkbox di selezione per l'import */}
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={isRowSelected}
          onChange={() => onRowSelectionToggle(rowIndex)}
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
              onClick={() => onResolutionChange(rowIndex, { resolution: 'skip' })}
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
              onClick={() => onResolutionChange(rowIndex, { resolution: 'overwrite' })}
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
              onResolutionChange(rowIndex, { 
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

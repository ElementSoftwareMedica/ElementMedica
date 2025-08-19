import React from 'react';
import { ConflictInfo, CompanyOption } from '../../../types/import/personImportTypes';
import SearchableSelect from './SearchableSelect';

interface ConflictResolutionPanelProps {
  conflicts: ConflictInfo[];
  companies: CompanyOption[];
  onResolveConflict: (index: number, resolution: 'skip' | 'overwrite' | 'company', companyId?: string) => void;
}

/**
 * Pannello per la risoluzione dei conflitti durante l'importazione
 * Gestisce duplicati e aziende non valide
 */
const ConflictResolutionPanel: React.FC<ConflictResolutionPanelProps> = ({
  conflicts,
  companies,
  onResolveConflict
}) => {
  if (conflicts.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="text-lg font-medium text-yellow-800 mb-4">
        Risoluzione Conflitti ({conflicts.length})
      </h3>
      
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {conflicts.map((conflict, index) => (
          <div key={index} className="bg-white p-4 rounded-md border border-yellow-200">
            {/* Informazioni sulla riga */}
            <div className="mb-3">
              <span className="text-sm font-medium text-gray-700">
                Riga {conflict.rowIndex + 1}:
              </span>
              <span className="ml-2 text-sm text-gray-600">
                {conflict.personData.firstName} {conflict.personData.lastName}
                {conflict.personData.fiscalCode && (
                  <span className="ml-2 text-xs text-gray-500">
                    ({conflict.personData.fiscalCode})
                  </span>
                )}
              </span>
            </div>

            {/* Tipo di conflitto */}
            <div className="mb-3">
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                conflict.type === 'duplicate' 
                  ? 'bg-red-100 text-red-800' 
                  : 'bg-orange-100 text-orange-800'
              }`}>
                {conflict.type === 'duplicate' ? 'Duplicato' : 'Azienda Non Valida'}
              </span>
            </div>

            {/* Messaggio del conflitto */}
            <div className="mb-4 text-sm text-gray-700">
              {conflict.message}
            </div>

            {/* Opzioni di risoluzione */}
            <div className="space-y-3">
              {conflict.type === 'duplicate' ? (
                // Opzioni per duplicati
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                      conflict.resolution === 'skip'
                        ? 'bg-gray-100 border-gray-400 text-gray-800'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => onResolveConflict(index, 'skip')}
                  >
                    Salta
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                      conflict.resolution === 'overwrite'
                        ? 'bg-blue-100 border-blue-400 text-blue-800'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => onResolveConflict(index, 'overwrite')}
                  >
                    Sovrascrivi
                  </button>
                </div>
              ) : (
                // Opzioni per aziende non valide
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                        conflict.resolution === 'skip'
                          ? 'bg-gray-100 border-gray-400 text-gray-800'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => onResolveConflict(index, 'skip')}
                    >
                      Salta
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                        conflict.resolution === 'company'
                          ? 'bg-green-100 border-green-400 text-green-800'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => onResolveConflict(index, 'company', conflict.suggestedCompanyId)}
                    >
                      Seleziona Azienda
                    </button>
                  </div>
                  
                  {/* Selezione azienda */}
                  {conflict.resolution === 'company' && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Seleziona azienda:
                      </label>
                      <SearchableSelect
                        value={conflict.resolvedCompanyId || ''}
                        onChange={(companyId) => onResolveConflict(index, 'company', companyId)}
                        options={companies}
                        placeholder="Seleziona un'azienda..."
                        className="w-full"
                      />
                      
                      {/* Suggerimenti */}
                      {conflict.suggestedCompanies && conflict.suggestedCompanies.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs text-gray-600">Suggerimenti:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {conflict.suggestedCompanies.slice(0, 3).map((suggestion, idx) => (
                              <button
                                key={idx}
                                type="button"
                                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                                onClick={() => onResolveConflict(index, 'company', suggestion.id)}
                              >
                                {suggestion.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Stato risoluzione */}
            {conflict.resolution && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <span className="text-xs text-gray-600">
                  Risoluzione: 
                  <span className="ml-1 font-medium">
                    {conflict.resolution === 'skip' && 'Riga saltata'}
                    {conflict.resolution === 'overwrite' && 'Sovrascrivi esistente'}
                    {conflict.resolution === 'company' && conflict.resolvedCompanyId && 
                      `Azienda: ${companies.find(c => c.value === conflict.resolvedCompanyId)?.label || 'Selezionata'}`
                    }
                  </span>
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Riepilogo */}
      <div className="mt-4 pt-4 border-t border-yellow-200">
        <div className="flex justify-between text-sm text-yellow-800">
          <span>Conflitti totali: {conflicts.length}</span>
          <span>
            Risolti: {conflicts.filter(c => c.resolution).length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ConflictResolutionPanel;
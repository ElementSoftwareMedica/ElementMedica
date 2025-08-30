import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface CompanyImportData {
  ragioneSociale: string;
  piva?: string;
  codiceFiscale?: string;
  citta?: string;
  indirizzo?: string;
  mail?: string;
  [key: string]: unknown;
}

interface CompanyConflict {
  index: number;
  error: string;
  data: CompanyImportData;
  existingCompany?: {
    id: string;
    ragioneSociale: string;
    piva?: string;
    codiceFiscale?: string;
  };
}

interface CompanyImportConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: CompanyConflict[];
  onResolve: (resolutions: ConflictResolution[]) => void;
}

interface ConflictResolution {
  index: number;
  action: 'skip' | 'overwrite';
  companyId?: string;
}

const CompanyImportConflictModal: React.FC<CompanyImportConflictModalProps> = ({
  isOpen,
  onClose,
  conflicts,
  onResolve
}) => {
  const [resolutions, setResolutions] = useState<{ [index: number]: ConflictResolution }>({});

  // Inizializza le risoluzioni con 'skip' come default
  useEffect(() => {
    if (conflicts.length > 0) {
      const initialResolutions: { [index: number]: ConflictResolution } = {};
      conflicts.forEach(conflict => {
        initialResolutions[conflict.index] = { 
          index: conflict.index, 
          action: 'skip' 
        };
      });
      setResolutions(initialResolutions);
    }
  }, [conflicts]);

  // Aggiorna una risoluzione
  const updateResolution = (index: number, updates: Partial<ConflictResolution>) => {
    setResolutions(prev => ({
      ...prev,
      [index]: { ...prev[index], ...updates }
    }));
  };

  // Gestisce la conferma delle risoluzioni
  const handleConfirm = () => {
    const resolvedConflicts = Object.values(resolutions).filter(r => r.action === 'overwrite');
    onResolve(resolvedConflicts);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Conflitti durante l'importazione
              </h3>
              <p className="text-sm text-gray-500">
                {conflicts.length} aziende con conflitti trovate
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
            {conflicts.map((conflict) => (
              <div key={conflict.index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Riga {conflict.index + 1}: {conflict.data.ragioneSociale}
                    </h4>
                    <p className="text-sm text-red-600 mb-3">
                      {conflict.error}
                    </p>
                    
                    {/* Dati dell'azienda da importare */}
                    <div className="bg-blue-50 p-3 rounded-md mb-3">
                      <h5 className="font-medium text-blue-900 mb-2">Dati da importare:</h5>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><strong>Ragione Sociale:</strong> {conflict.data.ragioneSociale}</div>
                        {conflict.data.piva && <div><strong>P.IVA:</strong> {conflict.data.piva}</div>}
                        {conflict.data.codiceFiscale && <div><strong>Codice Fiscale:</strong> {conflict.data.codiceFiscale}</div>}
                        {conflict.data.citta && <div><strong>Città:</strong> {conflict.data.citta}</div>}
                        {conflict.data.indirizzo && <div><strong>Indirizzo:</strong> {conflict.data.indirizzo}</div>}
                        {conflict.data.mail && <div><strong>Email:</strong> {conflict.data.mail}</div>}
                      </div>
                    </div>

                    {/* Dati dell'azienda esistente */}
                    {conflict.existingCompany && (
                      <div className="bg-amber-50 p-3 rounded-md mb-3">
                        <h5 className="font-medium text-amber-900 mb-2">Azienda esistente nel database:</h5>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><strong>Ragione Sociale:</strong> {conflict.existingCompany.ragioneSociale}</div>
                          {conflict.existingCompany.piva && <div><strong>P.IVA:</strong> {conflict.existingCompany.piva}</div>}
                          {conflict.existingCompany.codiceFiscale && <div><strong>Codice Fiscale:</strong> {conflict.existingCompany.codiceFiscale}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Opzioni di risoluzione */}
                <div className="space-y-2">
                  <h5 className="font-medium text-gray-900">Come vuoi procedere?</h5>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name={`resolution-${conflict.index}`}
                      checked={resolutions[conflict.index]?.action === 'skip'}
                      onChange={() => updateResolution(conflict.index, { action: 'skip' })}
                      className="mr-2"
                    />
                    Salta questa azienda (mantieni esistente)
                  </label>
                  
                  {conflict.existingCompany && (
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={`resolution-${conflict.index}`}
                        checked={resolutions[conflict.index]?.action === 'overwrite'}
                        onChange={() => updateResolution(conflict.index, { 
                          action: 'overwrite',
                          companyId: conflict.existingCompany!.id
                        })}
                        className="mr-2"
                      />
                      Sovrascrivi i dati dell'azienda esistente
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Annulla
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Conferma Risoluzioni
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyImportConflictModal;
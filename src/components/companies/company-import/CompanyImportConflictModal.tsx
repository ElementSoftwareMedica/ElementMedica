import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Building2, MapPin } from 'lucide-react';
import type { CompanyData } from './types';

export interface CompanyConflict {
  index: number;
  error: string;
  data: CompanyData;
  existingCompany?: {
    id: string;
    ragioneSociale: string;
    piva?: string;
    codiceFiscale?: string;
    sites?: Array<{
      id: string;
      siteName: string;
      indirizzo?: string;
      citta?: string;
      provincia?: string;
      cap?: string;
    }>;
  };
}

export interface CompanyImportConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: CompanyConflict[];
  onResolve: (resolutions: ConflictResolution[]) => void;
}

export interface ConflictResolution {
  index: number;
  action: 'skip' | 'overwrite' | 'addAsSite';
  companyId?: string;
  siteData?: {
    name: string;
    address?: string;
    city?: string;
    province?: string;
    postalCode?: string;
  };
}

const CompanyImportConflictModal: React.FC<CompanyImportConflictModalProps> = ({
  isOpen,
  onClose,
  conflicts,
  onResolve
}) => {
  const [resolutions, setResolutions] = useState<{ [index: number]: ConflictResolution }>({});
  const [siteNames, setSiteNames] = useState<{ [index: number]: string }>({});

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
    const resolvedConflicts = Object.values(resolutions).map(resolution => {
      if (resolution.action === 'addAsSite') {
        const conflict = conflicts.find(c => c.index === resolution.index);
        return {
          ...resolution,
          siteData: {
            name: siteNames[resolution.index] || `Sede ${conflict?.data.citta || 'Principale'}`,
            address: conflict?.data.indirizzo,
            city: conflict?.data.citta,
            province: conflict?.data.provincia,
            postalCode: conflict?.data.cap
          }
        };
      }
      return resolution;
    }).filter(r => r.action !== 'skip');
    
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
                        <h5 className="font-medium text-amber-900 mb-2 flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Azienda esistente nel database:
                        </h5>
                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                          <div><strong>Ragione Sociale:</strong> {conflict.existingCompany.ragioneSociale}</div>
                          {conflict.existingCompany.piva && <div><strong>P.IVA:</strong> {conflict.existingCompany.piva}</div>}
                          {conflict.existingCompany.codiceFiscale && <div><strong>Codice Fiscale:</strong> {conflict.existingCompany.codiceFiscale}</div>}
                        </div>
                        
                        {/* Existing Sites */}
                        {conflict.existingCompany.sites && conflict.existingCompany.sites.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-amber-200">
                            <h6 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              Sedi esistenti ({conflict.existingCompany.sites.length}):
                            </h6>
                            <div className="space-y-2">
                              {conflict.existingCompany.sites.map((site, idx) => (
                                <div key={site.id} className="text-sm bg-amber-100/50 rounded p-2">
                                  <div className="font-medium">{site.siteName}</div>
                                  {site.indirizzo && <div className="text-gray-600">{site.indirizzo}</div>}
                                  {site.citta && (
                                    <div className="text-gray-600">
                                      {site.citta}
                                      {site.provincia && ` (${site.provincia})`}
                                      {site.cap && ` - ${site.cap}`}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Opzioni di risoluzione */}
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-900">Come vuoi procedere?</h5>
                  
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="radio"
                      name={`resolution-${conflict.index}`}
                      checked={resolutions[conflict.index]?.action === 'skip'}
                      onChange={() => updateResolution(conflict.index, { action: 'skip' })}
                      className="mr-3 mt-1"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Salta questa azienda</div>
                      <div className="text-sm text-gray-500">Mantieni solo l'azienda esistente nel database</div>
                    </div>
                  </label>
                  
                  {conflict.existingCompany && (
                    <>
                      <label className="flex items-start cursor-pointer">
                        <input
                          type="radio"
                          name={`resolution-${conflict.index}`}
                          checked={resolutions[conflict.index]?.action === 'overwrite'}
                          onChange={() => updateResolution(conflict.index, { 
                            action: 'overwrite',
                            companyId: conflict.existingCompany!.id
                          })}
                          className="mr-3 mt-1"
                        />
                        <div>
                          <div className="font-medium text-gray-900">Sovrascrivi i dati</div>
                          <div className="text-sm text-gray-500">Aggiorna l'azienda esistente con i nuovi dati dal CSV</div>
                        </div>
                      </label>
                      
                      <label className="flex items-start cursor-pointer">
                        <input
                          type="radio"
                          name={`resolution-${conflict.index}`}
                          checked={resolutions[conflict.index]?.action === 'addAsSite'}
                          onChange={() => updateResolution(conflict.index, { 
                            action: 'addAsSite',
                            companyId: conflict.existingCompany!.id
                          })}
                          className="mr-3 mt-1"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            Aggiungi come nuova sede
                          </div>
                          <div className="text-sm text-gray-500 mb-2">
                            Crea una nuova sede per l'azienda esistente con i dati dal CSV
                          </div>
                          
                          {/* Site name input - only show if addAsSite is selected */}
                          {resolutions[conflict.index]?.action === 'addAsSite' && (
                            <div className="mt-2 ml-6">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nome sede:
                              </label>
                              <input
                                type="text"
                                value={siteNames[conflict.index] || `Sede ${conflict.data.citta || 'Principale'}`}
                                onChange={(e) => setSiteNames(prev => ({ ...prev, [conflict.index]: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Es. Sede Milano, Filiale Roma..."
                              />
                              <div className="mt-2 text-xs text-gray-500 space-y-1">
                                <div>📍 <strong>Indirizzo:</strong> {conflict.data.indirizzo || 'Non specificato'}</div>
                                <div>🏙️ <strong>Città:</strong> {conflict.data.citta || 'Non specificata'}</div>
                                {conflict.data.provincia && <div>📮 <strong>Provincia:</strong> {conflict.data.provincia}</div>}
                                {conflict.data.cap && <div>📫 <strong>CAP:</strong> {conflict.data.cap}</div>}
                              </div>
                            </div>
                          )}
                        </div>
                      </label>
                    </>
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
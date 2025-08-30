import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle,
  Building2,
  Search,
  Users,
  X
} from 'lucide-react';
import { Button } from '../../design-system/atoms/Button/Button';
import { PersonData } from '../../types/import/personImportTypes';
import { Company } from '../../types';

interface PersonConflict {
  person: PersonData;
  index: number;
  type: 'duplicate' | 'invalid_company' | 'multiple';
  existingPerson?: PersonData;
  suggestedCompanies?: Company[];
}

interface PersonImportConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: PersonConflict[];
  existingCompanies: Company[];
  onResolve: (resolutions: ConflictResolution[]) => void;
}

interface ConflictResolution {
  index: number;
  action: 'skip' | 'overwrite' | 'assign_company';
  companyId?: string;
  companyName?: string;
}

const PersonImportConflictModal: React.FC<PersonImportConflictModalProps> = ({
  isOpen,
  onClose,
  conflicts,
  existingCompanies,
  onResolve
}) => {
  const [resolutions, setResolutions] = useState<{ [index: number]: ConflictResolution }>({});
  const [searchTerms, setSearchTerms] = useState<{ [index: number]: string }>({});

  // Debug log per verificare quando il componente viene renderizzato
  console.log('🎭 PersonImportConflictModal render START:', {
    isOpen,
    conflictsLength: conflicts?.length || 0,
    existingCompaniesLength: existingCompanies?.length || 0,
    conflicts: conflicts,
    timestamp: new Date().toISOString()
  });

  // Log dettagliato dei conflitti ricevuti
  if (conflicts && conflicts.length > 0) {
    console.log('📋 Conflicts details:');
    conflicts.forEach((conflict, idx) => {
      console.log(`  Conflict ${idx}:`, {
        index: conflict.index,
        type: conflict.type,
        person: conflict.person,
        existingPerson: conflict.existingPerson,
        suggestedCompanies: conflict.suggestedCompanies
      });
    });
  }

  // Inizializza le risoluzioni
  useEffect(() => {
    console.log('🔄 PersonImportConflictModal useEffect triggered:', {
      isOpen,
      conflictsLength: conflicts.length
    });
    
    const initialResolutions: { [index: number]: ConflictResolution } = {};
    conflicts.forEach(conflict => {
      if (conflict.type === 'duplicate') {
        initialResolutions[conflict.index] = { index: conflict.index, action: 'skip' };
      } else if (conflict.type === 'invalid_company') {
        // Se c'è un suggerimento automatico, usalo come default
        if (conflict.suggestedCompanies && conflict.suggestedCompanies.length > 0) {
          initialResolutions[conflict.index] = {
            index: conflict.index,
            action: 'assign_company',
            companyId: conflict.suggestedCompanies[0].id
          };
        } else {
          initialResolutions[conflict.index] = { index: conflict.index, action: 'skip' };
        }
      } else if (conflict.type === 'multiple') {
        // Per conflitti multipli, priorità al duplicato (skip di default)
        initialResolutions[conflict.index] = { index: conflict.index, action: 'skip' };
      }
    });
    setResolutions(initialResolutions);
  }, [conflicts]);

  // Filtra le aziende in base al termine di ricerca
  const getFilteredCompanies = (searchTerm: string) => {
    if (!searchTerm.trim()) return existingCompanies;
    
    const term = searchTerm.toLowerCase();
    return existingCompanies.filter(company => {
      const name = (company.ragioneSociale || company.name || '').toLowerCase();
      return name.includes(term);
    });
  };

  // Aggiorna una risoluzione
  const updateResolution = (index: number, updates: Partial<ConflictResolution>) => {
    setResolutions(prev => ({
      ...prev,
      [index]: { ...prev[index], ...updates }
    }));
  };

  // Gestisce la selezione di un'azienda
  const handleCompanySelect = (index: number, company: any) => {
    updateResolution(index, {
      action: 'assign_company',
      companyId: company.id,
      companyName: company.ragioneSociale || company.name
    });
  };

  // Gestisce la conferma delle risoluzioni
  const handleConfirm = () => {
    const resolvedConflicts = Object.values(resolutions).filter(r => r.action !== 'skip');
    onResolve(resolvedConflicts);
  };

  // Conta i conflitti per tipo
  const duplicateConflicts = conflicts.filter(c => c.type === 'duplicate');
  const companyConflicts = conflicts.filter(c => c.type === 'invalid_company');
  const multipleConflicts = conflicts.filter(c => c.type === 'multiple');

  if (!isOpen) {
    console.log('❌ PersonImportConflictModal not rendering - isOpen is false');
    return null;
  }

  console.log('✅ PersonImportConflictModal rendering modal...');
  console.log('🎯 Modal data:', {
    duplicateConflicts: duplicateConflicts.length,
    companyConflicts: companyConflicts.length,
    multipleConflicts: multipleConflicts.length,
    totalConflicts: duplicateConflicts.length + companyConflicts.length + multipleConflicts.length
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
           style={{ zIndex: 10001 }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Risolvi Conflitti di Importazione
              </h2>
              <p className="text-sm text-gray-600">
                {duplicateConflicts.length} duplicati, {companyConflicts.length} aziende non valide e {multipleConflicts.length} conflitti multipli trovati
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
          {/* Duplicati */}
          {duplicateConflicts.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center space-x-2 mb-4">
                <Users className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-medium text-gray-900">
                  Duplicati Codice Fiscale ({duplicateConflicts.length})
                </h3>
              </div>
              
              <div className="space-y-4">
                {duplicateConflicts.map(conflict => (
                  <div key={conflict.index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Persona nel CSV */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Nel CSV</h4>
                        <div className="bg-blue-50 p-3 rounded">
                          <p><strong>Nome:</strong> {conflict.person.firstName} {conflict.person.lastName}</p>
                          <p><strong>CF:</strong> {conflict.person.taxCode}</p>
                          <p><strong>Email:</strong> {conflict.person.email || 'Non specificata'}</p>
                          <p><strong>Telefono:</strong> {conflict.person.phone || 'Non specificato'}</p>
                          <p><strong>Azienda:</strong> {conflict.person.companyName || 'Non specificata'}</p>
                        </div>
                      </div>
                      
                      {/* Persona esistente */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Nel Database</h4>
                        <div className="bg-gray-50 p-3 rounded">
                          <p><strong>Nome:</strong> {conflict.existingPerson?.firstName} {conflict.existingPerson?.lastName}</p>
                          <p><strong>CF:</strong> {conflict.existingPerson?.taxCode}</p>
                          <p><strong>Email:</strong> {conflict.existingPerson?.email || 'Non specificata'}</p>
                          <p><strong>Telefono:</strong> {conflict.existingPerson?.phone || 'Non specificato'}</p>
                          <p><strong>Azienda:</strong> {conflict.existingPerson?.companyName || 'Non specificata'}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Azioni */}
                    <div className="mt-4 flex space-x-3">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`duplicate-${conflict.index}`}
                          checked={resolutions[conflict.index]?.action === 'skip'}
                          onChange={() => updateResolution(conflict.index, { action: 'skip' })}
                          className="mr-2"
                        />
                        Salta (mantieni esistente)
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`duplicate-${conflict.index}`}
                          checked={resolutions[conflict.index]?.action === 'overwrite'}
                          onChange={() => updateResolution(conflict.index, { action: 'overwrite' })}
                          className="mr-2"
                        />
                        Sovrascrivi con dati CSV
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conflitti multipli */}
          {multipleConflicts.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center space-x-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <h3 className="text-lg font-medium text-gray-900">
                  Conflitti Multipli ({multipleConflicts.length})
                </h3>
                <span className="text-sm text-gray-600">
                  (Duplicato + Azienda non valida)
                </span>
              </div>
              
              <div className="space-y-4">
                {multipleConflicts.map(conflict => (
                  <div key={conflict.index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                        <span>{conflict.person.firstName} {conflict.person.lastName}</span>
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                          Duplicato + Azienda non valida
                        </span>
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                      {/* Problema duplicato */}
                      <div className="border border-blue-200 rounded p-3 bg-blue-50">
                        <h5 className="font-medium text-blue-900 mb-2">🔄 Duplicato Codice Fiscale</h5>
                        <div className="text-sm space-y-1">
                          <p><strong>CF:</strong> {conflict.person.taxCode}</p>
                          <p><strong>Esistente:</strong> {conflict.existingPerson?.firstName} {conflict.existingPerson?.lastName}</p>
                        </div>
                      </div>

                      {/* Problema azienda */}
                      <div className="border border-orange-200 rounded p-3 bg-orange-50">
                        <h5 className="font-medium text-orange-900 mb-2">🏢 Azienda Non Trovata</h5>
                        <div className="text-sm space-y-1">
                          <p><strong>Cercata:</strong> "{conflict.person.companyName}"</p>
                          {conflict.suggestedCompanies && conflict.suggestedCompanies.length > 0 && (
                            <p><strong>Suggerita:</strong> {conflict.suggestedCompanies[0].ragioneSociale || conflict.suggestedCompanies[0].name}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Suggerimenti automatici per azienda */}
                    {conflict.suggestedCompanies && conflict.suggestedCompanies.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Aziende simili trovate:</p>
                        <div className="flex flex-wrap gap-2">
                          {conflict.suggestedCompanies.map(company => (
                            <button
                              key={company.id}
                              onClick={() => handleCompanySelect(conflict.index, company)}
                              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                                resolutions[conflict.index]?.companyId === company.id
                                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                                  : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {company.ragioneSociale || company.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Ricerca aziende */}
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Cerca un'azienda..."
                          value={searchTerms[conflict.index] || ''}
                          onChange={(e) => setSearchTerms(prev => ({
                            ...prev,
                            [conflict.index]: e.target.value
                          }))}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      {searchTerms[conflict.index] && (
                        <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                          {getFilteredCompanies(searchTerms[conflict.index]).map(company => (
                            <button
                              key={company.id}
                              onClick={() => handleCompanySelect(conflict.index, company)}
                              className={`w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                                resolutions[conflict.index]?.companyId === company.id
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'text-gray-700'
                              }`}
                            >
                              {company.ragioneSociale || company.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Azioni */}
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`multiple-${conflict.index}`}
                          checked={resolutions[conflict.index]?.action === 'skip'}
                          onChange={() => updateResolution(conflict.index, { action: 'skip' })}
                          className="mr-2"
                        />
                        Salta questa persona (mantieni esistente)
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`multiple-${conflict.index}`}
                          checked={resolutions[conflict.index]?.action === 'overwrite'}
                          onChange={() => updateResolution(conflict.index, { action: 'overwrite' })}
                          className="mr-2"
                        />
                        Sovrascrivi duplicato con dati CSV (richiede azienda valida)
                      </label>
                      {resolutions[conflict.index]?.companyId && (
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name={`multiple-${conflict.index}`}
                            checked={resolutions[conflict.index]?.action === 'assign_company'}
                            onChange={() => updateResolution(conflict.index, { action: 'assign_company' })}
                            className="mr-2"
                          />
                          Sovrascrivi e assegna a: {resolutions[conflict.index]?.companyName}
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aziende non valide */}
          {companyConflicts.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Building2 className="h-5 w-5 text-orange-500" />
                <h3 className="text-lg font-medium text-gray-900">
                  Aziende Non Trovate ({companyConflicts.length})
                </h3>
              </div>
              
              <div className="space-y-4">
                {companyConflicts.map(conflict => (
                  <div key={conflict.index} className="border border-gray-200 rounded-lg p-4">
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900">
                        {conflict.person.firstName} {conflict.person.lastName}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Azienda cercata: <span className="font-medium text-red-600">"{conflict.person.companyName}"</span>
                      </p>
                    </div>

                    {/* Suggerimenti automatici */}
                    {conflict.suggestedCompanies && conflict.suggestedCompanies.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Aziende simili trovate:</p>
                        <div className="flex flex-wrap gap-2">
                          {conflict.suggestedCompanies.map(company => (
                            <button
                              key={company.id}
                              onClick={() => handleCompanySelect(conflict.index, company)}
                              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                                resolutions[conflict.index]?.companyId === company.id
                                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                                  : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {company.ragioneSociale || company.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Ricerca aziende */}
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Cerca un'azienda..."
                          value={searchTerms[conflict.index] || ''}
                          onChange={(e) => setSearchTerms(prev => ({
                            ...prev,
                            [conflict.index]: e.target.value
                          }))}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      {searchTerms[conflict.index] && (
                        <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                          {getFilteredCompanies(searchTerms[conflict.index]).map(company => (
                            <button
                              key={company.id}
                              onClick={() => handleCompanySelect(conflict.index, company)}
                              className={`w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                                resolutions[conflict.index]?.companyId === company.id
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'text-gray-700'
                              }`}
                            >
                              {company.ragioneSociale || company.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Azioni */}
                    <div className="flex space-x-3">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`company-${conflict.index}`}
                          checked={resolutions[conflict.index]?.action === 'skip'}
                          onChange={() => updateResolution(conflict.index, { action: 'skip' })}
                          className="mr-2"
                        />
                        Salta questa persona
                      </label>
                      {resolutions[conflict.index]?.companyId && (
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name={`company-${conflict.index}`}
                            checked={resolutions[conflict.index]?.action === 'assign_company'}
                            onChange={() => updateResolution(conflict.index, { action: 'assign_company' })}
                            className="mr-2"
                          />
                          Assegna a: {resolutions[conflict.index]?.companyName}
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {Object.values(resolutions).filter(r => r.action !== 'skip').length} conflitti risolti
          </div>
          <div className="flex space-x-3">
            <Button
              variant="secondary"
              onClick={onClose}
            >
              Annulla
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
            >
              Applica Risoluzioni
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonImportConflictModal;
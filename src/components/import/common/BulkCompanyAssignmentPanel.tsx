/**
 * @file BulkCompanyAssignmentPanel.tsx
 * @description Pannello per assegnazione bulk di dipendenti ad un'azienda
 * P49: Aggiornato per supportare companyTenantProfileId
 */

import React, { useState } from 'react';
import { Building2, Users, ChevronDown, Search } from 'lucide-react';

export interface Company {
  id: string;
  companyTenantProfileId?: string;
  companyId?: string;
  ragioneSociale: string;
  businessName?: string;
  piva?: string;
  vatNumber?: string;
  sedeLegaleCitta?: string;
  citta?: string;
  city?: string;
  sites?: CompanySite[];
}

export interface CompanySite {
  id: string;
  companyTenantProfileId?: string;
  tenantId?: string;
  siteName: string;
  citta?: string;
  indirizzo?: string;
}

interface CompanySiteOption {
  companyId: string;
  companyName: string;
  siteId?: string;
  siteName?: string;
  displayText: string;
}

interface BulkCompanyAssignmentPanelProps {
  companies: Company[];
  selectedCount: number;
  onCompanySelect: (companyId: string | null, siteId?: string | null) => void;
  selectedCompanyId: string | null;
  selectedSiteId?: string | null;
  onAssign?: () => void; // Callback per confermare l'assegnazione
}

const BulkCompanyAssignmentPanel: React.FC<BulkCompanyAssignmentPanelProps> = ({
  companies,
  selectedCount,
  onCompanySelect,
  selectedCompanyId,
  selectedSiteId,
  onAssign
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Helper per ottenere il nome dell'azienda
  const getCompanyName = (company: Company): string => {
    return company.ragioneSociale || company.businessName || 'N/A';
  };

  // Helper per ottenere P.IVA
  const getCompanyVat = (company: Company): string | undefined => {
    return company.piva || company.vatNumber;
  };

  // Helper per ottenere città
  const getCompanyCity = (company: Company): string | undefined => {
    return company.citta || company.city;
  };

  if (selectedCount === 0) return null;

  // Crea lista flat di opzioni azienda+sede
  const companySiteOptions: CompanySiteOption[] = [];
  companies.forEach(company => {
    const companyName = getCompanyName(company);
    if (company.sites && company.sites.length > 0) {
      // Se l'azienda ha sedi, crea un'opzione per ogni sede
      company.sites.forEach(site => {
        companySiteOptions.push({
          companyId: company.id,
          companyName: companyName,
          siteId: site.id,
          siteName: site.siteName,
          displayText: `${companyName} - ${site.siteName}${site.citta ? ` (${site.citta})` : ''}`
        });
      });
    } else {
      // Se l'azienda non ha sedi, crea un'opzione solo azienda
      companySiteOptions.push({
        companyId: company.id,
        companyName: companyName,
        siteId: undefined,
        siteName: undefined,
        displayText: `${companyName}${getCompanyCity(company) ? ` (${getCompanyCity(company)})` : ''}`
      });
    }
  });

  // Filtra opzioni in base alla ricerca
  const filteredOptions = companySiteOptions.filter(option => {
    const company = companies.find(c => c.id === option.companyId);
    const vat = company ? getCompanyVat(company) : '';
    return option.displayText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vat?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Trova l'opzione selezionata
  const selectedOption = companySiteOptions.find(
    opt => opt.companyId === selectedCompanyId && opt.siteId === selectedSiteId
  );

  return (
    <div className="mt-4 border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="font-semibold text-blue-800 dark:text-blue-200">
          Assegnazione Bulk Azienda
        </h3>
      </div>

      <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
        <Users className="w-4 h-4 inline mr-1" />
        {selectedCount} {selectedCount === 1 ? 'dipendente selezionato' : 'dipendenti selezionati'}
      </p>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Assegna tutti i dipendenti selezionati all'azienda:
        </label>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
          >
            <span className="text-sm">
              {selectedOption ? (
                <span className="font-medium text-gray-900 dark:text-gray-100">{selectedOption.displayText}</span>
              ) : (
                <span className="text-gray-400 dark:text-gray-500">Seleziona azienda e sede...</span>
              )}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg dark:shadow-black/30 overflow-hidden">
              {/* Searchbar */}
              <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Cerca azienda..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              {/* Lista scrollabile */}
              <div className="max-h-60 overflow-y-auto">
                {/* Opzione "Nessuna" */}
                <button
                  type="button"
                  onClick={() => {
                    onCompanySelect(null);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700"
                >
                  <span className="text-gray-500 dark:text-gray-400 italic">Nessuna assegnazione</span>
                </button>

                {/* Lista aziende filtrate */}
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Nessuna azienda/sede trovata
                  </div>
                ) : (
                  filteredOptions.map((option, index) => {
                    const company = companies.find(c => c.id === option.companyId);
                    const isSelected = selectedOption?.companyId === option.companyId &&
                      selectedOption?.siteId === option.siteId;
                    return (
                      <button
                        key={`${option.companyId}-${option.siteId || 'no-site'}-${index}`}
                        onClick={() => {
                          onCompanySelect(option.companyId, option.siteId);
                          setIsOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isSelected ? 'bg-blue-100 dark:bg-blue-900/40' : ''
                          }`}
                      >
                        <div className="font-medium text-gray-900 dark:text-gray-100">{option.displayText}</div>
                        {company && getCompanyVat(company) && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            P.IVA: {getCompanyVat(company)}
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pulsante per confermare l'assegnazione */}
        {selectedOption && onAssign && (
          <button
            onClick={onAssign}
            className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors font-medium"
          >
            Assegna a {selectedCount} {selectedCount === 1 ? 'dipendente' : 'dipendenti'}
          </button>
        )}
      </div>
    </div>
  );
};

export default BulkCompanyAssignmentPanel;

import React from 'react';
import { Building2 } from 'lucide-react';
import { CompanyCard } from './CompanyCard';
import type { Company, CompanyConfig, CompanyTotals } from '../types';

interface CompanyListProps {
  selectedCompanies: Company[];
  companiesConfig: Map<string | number, CompanyConfig>;
  companyTotals: Map<string | number, CompanyTotals>;
  selectedCompanyId: string | number | null;
  onSelectCompany: (id: string | number) => void;
  onToggleEnabled: (id: string | number) => void;
  onUpdateParticipants: (id: string | number, count: number) => void;
}

/**
 * Company list sidebar component
 * 
 * Displays list of companies with configuration controls
 */
export function CompanyList({
  selectedCompanies,
  companiesConfig,
  companyTotals,
  selectedCompanyId,
  onSelectCompany,
  onToggleEnabled,
  onUpdateParticipants
}: CompanyListProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 bg-white dark:bg-gray-800 flex-shrink-0">
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm mb-1 flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Aziende Partecipanti
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Configura il numero di partecipanti per ciascuna azienda
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {selectedCompanies.map((company) => {
          const config = companiesConfig.get(company.id);
          const isSelected = selectedCompanyId === company.id;
          const totals = companyTotals.get(company.id);

          return (
            <CompanyCard
              key={company.id}
              company={company}
              config={config}
              totals={totals}
              isSelected={isSelected}
              onSelect={() => onSelectCompany(company.id)}
              onToggleEnabled={() => onToggleEnabled(company.id)}
              onUpdateParticipants={(count: number) => onUpdateParticipants(company.id, count)}
            />
          );
        })}
      </div>
    </div>
  );
}

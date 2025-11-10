import React from 'react';
import { Label } from '../../../../design-system/atoms/Label';
import { Input } from '../../../../design-system/atoms/Input';
import { Button } from '../../../../design-system/atoms/Button';
import type { Company } from '../../../../types';

interface StepCompanySelectionSimpleProps {
  companies: Company[];
  selectedCompanies: Set<string | number>;
  companySearch: string;
  onCompanyToggle: (companyId: string | number) => void;
  onCompanySearchChange: (search: string) => void;
}

export const StepCompanySelectionSimple: React.FC<StepCompanySelectionSimpleProps> = ({
  companies,
  selectedCompanies,
  companySearch,
  onCompanyToggle,
  onCompanySearchChange
}) => {
  const filteredCompanies = companies.filter(company => 
    company.name?.toLowerCase().includes(companySearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="companySearch">Cerca Azienda</Label>
        <Input
          id="companySearch"
          type="text"
          value={companySearch}
          onChange={(e) => onCompanySearchChange(e.target.value)}
          placeholder="Cerca per nome azienda..."
        />
      </div>

      <div className="space-y-2">
        <Label>Aziende Selezionate ({selectedCompanies.size})</Label>
        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
          {filteredCompanies.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {companySearch ? 'Nessuna azienda trovata' : 'Nessuna azienda disponibile'}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredCompanies.map((company) => {
                const isSelected = selectedCompanies.has(company.id);
                return (
                  <div
                    key={company.id}
                    className={`p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer ${
                      isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                    onClick={() => onCompanyToggle(company.id)}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{company.name}</div>
                      {company.address && (
                        <div className="text-sm text-gray-500">{company.address}</div>
                      )}
                      {company.email && (
                        <div className="text-sm text-gray-500">{company.email}</div>
                      )}
                    </div>
                    <div className="ml-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onCompanyToggle(company.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedCompanies.size > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-green-800 font-medium">
            {selectedCompanies.size} azienda{selectedCompanies.size !== 1 ? 'e' : ''} selezionata{selectedCompanies.size !== 1 ? 'e' : ''}
          </div>
          <div className="text-green-700 text-sm mt-1">
            Procedi al passo successivo per selezionare i partecipanti
          </div>
        </div>
      )}
    </div>
  );
};

export default StepCompanySelectionSimple;
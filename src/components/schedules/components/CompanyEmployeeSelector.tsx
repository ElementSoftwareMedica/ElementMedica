import React, { useCallback } from 'react';
import { Button } from '../../../design-system/atoms/Button';
import { Input } from '../../../design-system/atoms/Input';
import { Label } from '../../../design-system/atoms/Label';
import { Company } from '../../../types';

interface Person {
  id: string | number;
  firstName: string;
  lastName: string;
  companyId: string | number;
  company_id?: string | number;
  company?: { id: string | number; name: string };
  email?: string;
  position?: string;
}

interface CompanyEmployeeSelectorProps {
  companies: Company[];
  persons: Person[];
  selectedCompanies: (string | number)[];
  selectedPersons: (string | number)[];
  onCompanyToggle: (companyId: string | number) => void;
  onPersonToggle: (personId: string | number) => void;
  onSelectAllPersons: (companyId: string | number) => void;
  onDeselectAllPersons: (companyId: string | number) => void;
  getCompanyName: (companyId: string | number) => string;
  getPersonIdsForCompany: (companyId: string) => (string | number)[];
  companySearch: string;
  onCompanySearchChange: (search: string) => void;
  personSearch: string;
  onPersonSearchChange: (search: string) => void;
  personTab: string | number;
  onPersonTabChange: (tab: string | number) => void;
}

export const CompanyEmployeeSelector: React.FC<CompanyEmployeeSelectorProps> = ({
  companies,
  persons,
  selectedCompanies,
  selectedPersons,
  onCompanyToggle,
  onPersonToggle,
  onSelectAllPersons,
  onDeselectAllPersons,
  getCompanyName,
  getPersonIdsForCompany,
  companySearch,
  onCompanySearchChange,
  personSearch,
  onPersonSearchChange,
  personTab,
  onPersonTabChange
}) => {
  const filteredCompanies = companies.filter(company =>
    company.name?.toLowerCase().includes(companySearch.toLowerCase()) ?? false
  );

  const getFilteredPersonsForCompany = useCallback((companyId: string | number) => {
    return persons.filter((person: Person) => {
      const personCompanyId = person.company_id || person.companyId;
      const matchesCompany = personCompanyId === companyId;
      const matchesSearch = personSearch === '' || 
        `${person.firstName} ${person.lastName}`.toLowerCase().includes(personSearch.toLowerCase());
      return matchesCompany && matchesSearch;
    });
  }, [persons, personSearch]);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-700">Seleziona Aziende e Partecipanti</h3>
      
      {/* Company Search */}
      <div>
        <Label>Cerca Aziende</Label>
        <Input
          type="text"
          placeholder="Cerca per nome azienda..."
          value={companySearch}
          onChange={(e) => onCompanySearchChange(e.target.value)}
        />
      </div>

      {/* Companies List */}
      <div className="border rounded max-h-48 overflow-y-auto">
        {filteredCompanies.map(company => {
          const companyPersons = getPersonIdsForCompany(String(company.id));
          const isSelected = selectedCompanies.includes(company.id);
          
          return (
            <div key={company.id} className="flex items-center p-2 border-b hover:bg-gray-50">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onCompanyToggle(company.id)}
                className="mr-3"
              />
              <div className="flex-1">
                <div className="font-medium">{company.name}</div>
                <div className="text-sm text-gray-500">
                  {companyPersons.length} dipendenti
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Companies Summary */}
      {selectedCompanies.length > 0 && (
        <div className="bg-blue-50 p-3 rounded">
          <div className="font-medium text-sm mb-2">
            Aziende selezionate: {selectedCompanies.length}
          </div>
          <div className="text-sm text-gray-600">
            {selectedCompanies.map(companyId => getCompanyName(companyId)).join(', ')}
          </div>
        </div>
      )}

      {/* Person Selection */}
      {selectedCompanies.length > 0 && (
        <div className="space-y-3">
          <div>
            <Label>Cerca Dipendenti</Label>
            <Input
              type="text"
              placeholder="Cerca per nome dipendente..."
              value={personSearch}
              onChange={(e) => onPersonSearchChange(e.target.value)}
            />
          </div>

          {/* Company Tabs */}
          <div className="flex flex-wrap gap-2">
            {selectedCompanies.map(companyId => (
              <button
                key={companyId}
                type="button"
                onClick={() => onPersonTabChange(companyId)}
                className={`px-3 py-1 text-sm rounded ${
                  personTab === companyId
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {getCompanyName(companyId)}
              </button>
            ))}
          </div>

          {/* Person List for Selected Company */}
          {personTab && (
            <div className="border rounded">
              <div className="p-2 bg-gray-50 border-b flex justify-between items-center">
                <span className="font-medium text-sm">
                  Dipendenti - {getCompanyName(personTab)}
                </span>
                <div className="space-x-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => onSelectAllPersons(personTab)}
                  >
                    Seleziona Tutti
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => onDeselectAllPersons(personTab)}
                  >
                    Deseleziona Tutti
                  </Button>
                </div>
              </div>
              
              <div className="max-h-64 overflow-y-auto">
                {getFilteredPersonsForCompany(personTab).map((person: Person) => (
                  <div key={person.id} className="flex items-center p-2 border-b hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedPersons.includes(person.id)}
                      onChange={() => onPersonToggle(person.id)}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {person.firstName} {person.lastName}
                      </div>
                      {person.email && (
                        <div className="text-xs text-gray-500">{person.email}</div>
                      )}
                      {person.position && (
                        <div className="text-xs text-gray-500">{person.position}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Persons Summary */}
          <div className="bg-green-50 p-3 rounded">
            <div className="font-medium text-sm">
              Partecipanti selezionati: {selectedPersons.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyEmployeeSelector;
import React from 'react';
import { CompanyEmployeeSelector } from '../index';
import type { FormData } from '../../types';

interface StepCompanySelectionProps {
  // Selections
  selectedPersons: (string | number)[];
  selectedCompanies: (string | number)[];
  onCompanyToggle: (companyId: string | number) => void;
  onPersonToggle: (personId: string | number) => void;
  onSelectAllPersons: (companyId: string | number) => void;
  onDeselectAllPersons: (companyId: string | number) => void;

  // Search
  companySearch: string;
  onCompanySearchChange: (value: string) => void;
  personSearch: string;
  onPersonSearchChange: (value: string) => void;

  // Tab state
  personTab: string | number;
  onPersonTabChange: (tab: string | number) => void;

  // Data
  companies: any[];
  persons: any[];

  // Utility functions
  getPersonIdsForCompany: (companyId: string) => (string | number)[];
  getCompanyName: (companyId: string | number) => string;
}

export const StepCompanySelection: React.FC<StepCompanySelectionProps> = ({
  selectedPersons = [],
  selectedCompanies = [],
  onCompanyToggle,
  onPersonToggle,
  onSelectAllPersons,
  onDeselectAllPersons,
  companySearch,
  onCompanySearchChange,
  personSearch,
  onPersonSearchChange,
  personTab,
  onPersonTabChange,
  companies = [],
  persons = [],
  getPersonIdsForCompany,
  getCompanyName
}) => {
  return (
    <CompanyEmployeeSelector
      companies={companies}
      persons={persons}
      selectedPersons={selectedPersons}
      selectedCompanies={selectedCompanies}
      onCompanyToggle={onCompanyToggle}
      onPersonToggle={onPersonToggle}
      onSelectAllPersons={onSelectAllPersons}
      onDeselectAllPersons={onDeselectAllPersons}
      companySearch={companySearch}
      onCompanySearchChange={onCompanySearchChange}
      personSearch={personSearch}
      onPersonSearchChange={onPersonSearchChange}
      personTab={personTab}
      onPersonTabChange={onPersonTabChange}
      getPersonIdsForCompany={getPersonIdsForCompany}
      getCompanyName={getCompanyName}
    />
  );
};

export default StepCompanySelection;
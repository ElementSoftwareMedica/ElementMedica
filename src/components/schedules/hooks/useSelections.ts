import { useState, useCallback } from 'react';
import { getPersonIdsForCompanyUniversal } from '../utils';
import type { Person } from '../types';

// Tipi
export type SelectionEvent = {
  company_ids?: (string | number)[];
  companies?: { id: string | number }[];
  employee_ids?: (string | number)[];
  employees?: { id: string | number }[];
};

export interface UseSelectionsProps {
  existingEvent?: SelectionEvent;
  persons: Person[];
}

export interface UseSelectionsReturn {
  selectedCompanies: (string | number)[];
  selectedPersons: (string | number)[];
  setSelectedCompanies: React.Dispatch<React.SetStateAction<(string | number)[]>>;
  setSelectedPersons: React.Dispatch<React.SetStateAction<(string | number)[]>>;
  handleCompanyToggle: (companyId: string | number) => void;
  handlePersonToggle: (personId: string | number) => void;
  handleSelectAllPersons: (companyId: string | number) => void;
  handleDeselectAllPersons: (companyId: string | number) => void;
  getPersonIdsForCompany: (companyId: string) => (string | number)[];
}

export function useSelections({
  existingEvent,
  persons,
}: UseSelectionsProps): UseSelectionsReturn {
  // Inizializzazione selezioni dall'event esistente (senza cast any)
  const [selectedCompanies, setSelectedCompanies] = useState<(string | number)[]>(
    existingEvent?.company_ids ?? existingEvent?.companies?.map(c => c.id) ?? []
  );

  const [selectedPersons, setSelectedPersons] = useState<(string | number)[]>(
    existingEvent?.employee_ids ?? existingEvent?.employees?.map(e => e.id) ?? []
  );

  // Funzione di utilità
  const getPersonIdsForCompany = useCallback((companyId: string) => {
    return getPersonIdsForCompanyUniversal(persons, companyId);
  }, [persons]);

  // Gestori aziende
  const handleCompanyToggle = useCallback((companyId: string | number) => {
    const id = String(companyId);
    setSelectedCompanies(prev => {
      const prevSet = new Set(prev.map(String));
      if (prevSet.has(id)) {
        return prev.filter(existingId => String(existingId) !== id);
      }
      return Array.from(new Set([...prev.map(String), id]));
    });
  }, []);

  // Gestori persone
  const handlePersonToggle = useCallback((personId: string | number) => {
    const id = String(personId);
    setSelectedPersons(prev => {
      const prevSet = new Set(prev.map(String));
      if (prevSet.has(id)) {
        return prev.filter(existingId => String(existingId) !== id);
      }
      return Array.from(new Set([...prev.map(String), id]));
    });
  }, []);

  const handleSelectAllPersons = useCallback((companyId: string | number) => {
    const companyPersonIds = getPersonIdsForCompany(String(companyId)).map(String);
    setSelectedPersons(prev => Array.from(new Set([...prev.map(String), ...companyPersonIds])));
  }, [getPersonIdsForCompany]);

  const handleDeselectAllPersons = useCallback((companyId: string | number) => {
    const companyPersonIds = new Set(getPersonIdsForCompany(String(companyId)).map(String));
    setSelectedPersons(prev => prev.filter(id => !companyPersonIds.has(String(id))));
  }, [getPersonIdsForCompany]);

  return {
    selectedCompanies,
    selectedPersons,
    setSelectedCompanies,
    setSelectedPersons,
    handleCompanyToggle,
    handlePersonToggle,
    handleSelectAllPersons,
    handleDeselectAllPersons,
    getPersonIdsForCompany,
  };
}
/**
 * Utility per la gestione dei conflitti nell'importazione persone
 */

import { PersonData } from '../../../types/import/personImportTypes';
import { Company } from '../../../types';

export interface ConflictInfo {
  type: 'duplicate' | 'invalid_company';
  existingPerson?: PersonData;
  suggestedCompanies?: Company[];
  resolution?: 'skip' | 'overwrite' | 'assign_company';
  selectedCompanyId?: string;
  selectedCompanyName?: string;
}

/**
 * Rileva conflitti nei dati delle persone
 */
export const detectConflicts = (
  persons: PersonData[], 
  existingPersons: PersonData[], 
  existingCompanies: Company[]
): { [index: number]: ConflictInfo } => {
  const detectedConflicts: { [index: number]: ConflictInfo } = {};
  
  persons.forEach((person, index) => {
    // Controlla duplicati di codice fiscale
    if (person.taxCode) {
      const existingPerson = existingPersons.find(ep => 
        ep.taxCode && ep.taxCode.toLowerCase().trim() === person.taxCode!.toLowerCase().trim()
      );
      
      if (existingPerson) {
        detectedConflicts[index] = {
          type: 'duplicate',
          existingPerson: {
            firstName: existingPerson.firstName,
            lastName: existingPerson.lastName,
            email: existingPerson.email,
            phone: existingPerson.phone,
            taxCode: existingPerson.taxCode,
            birthDate: existingPerson.birthDate,
            residenceAddress: existingPerson.residenceAddress,
            city: existingPerson.city,
            province: existingPerson.province,
            postalCode: existingPerson.postalCode,
            roleType: existingPerson.roleType,
            companyName: existingPerson.companyName
          }
          // Rimuovo la risoluzione automatica 'skip' per permettere all'utente di scegliere
        };
      }
    }
    
    // Controlla aziende non valide
    if (person.companyName && !person.companyId) {
      // Trova aziende simili
      const suggestedCompanies = existingCompanies.filter(c => {
        const companyName = c.ragioneSociale || c.name || '';
        return companyName.toLowerCase().includes(person.companyName!.toLowerCase()) ||
               person.companyName!.toLowerCase().includes(companyName.toLowerCase());
      });
      
      detectedConflicts[index] = {
        type: 'invalid_company',
        suggestedCompanies,
        resolution: suggestedCompanies.length > 0 ? 'assign_company' : 'skip',
        selectedCompanyId: suggestedCompanies.length > 0 ? suggestedCompanies[0].id : undefined,
        selectedCompanyName: suggestedCompanies.length > 0 ? (suggestedCompanies[0].ragioneSociale || suggestedCompanies[0].name) : undefined
      };
    }
  });
  
  return detectedConflicts;
};

/**
 * Risolve automaticamente tutti i duplicati con l'azione specificata
 */
export const resolveAllDuplicates = (
  conflicts: { [index: number]: ConflictInfo },
  action: 'skip' | 'overwrite'
): { [index: number]: ConflictInfo } => {
  const updated = { ...conflicts };
  Object.keys(updated).forEach(indexStr => {
    const index = parseInt(indexStr);
    if (updated[index] && updated[index].type === 'duplicate') {
      updated[index] = { ...updated[index], resolution: action };
    }
  });
  return updated;
};

/**
 * Risolve automaticamente tutte le aziende non valide con l'azione specificata
 */
export const resolveAllInvalidCompanies = (
  conflicts: { [index: number]: ConflictInfo },
  action: 'skip' | 'assign_first'
): { [index: number]: ConflictInfo } => {
  const updated = { ...conflicts };
  Object.keys(updated).forEach(indexStr => {
    const index = parseInt(indexStr);
    if (updated[index] && updated[index].type === 'invalid_company') {
      if (action === 'skip') {
        updated[index] = { ...updated[index], resolution: 'skip' };
      } else if (action === 'assign_first' && updated[index].suggestedCompanies && updated[index].suggestedCompanies!.length > 0) {
        const firstCompany = updated[index].suggestedCompanies![0];
        updated[index] = { 
          ...updated[index], 
          resolution: 'assign_company',
          selectedCompanyId: firstCompany.id,
          selectedCompanyName: firstCompany.ragioneSociale || firstCompany.name
        };
      }
    }
  });
  return updated;
};

/**
 * Converte i conflitti dal formato interno al formato del modal
 */
export const convertConflictsForModal = (
  conflicts: { [index: number]: ConflictInfo },
  previewData: PersonData[]
) => {
  return Object.entries(conflicts).map(([index, conflict]) => ({
    person: previewData[parseInt(index)],
    index: parseInt(index),
    type: conflict.type,
    existingPerson: conflict.existingPerson,
    suggestedCompanies: conflict.suggestedCompanies || []
  }));
};
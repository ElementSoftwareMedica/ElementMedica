/**
 * Utility per il processamento dei dati nell'importazione persone
 */

import { defaultProcessFile } from '../../shared/GenericImport';
import { applyTitleCaseToFields } from '../../../utils/textFormatters';
import { extractBirthDateFromTaxCode } from './dateUtils';
import { detectConflicts, ConflictInfo } from './conflictUtils';
import { normalizePersonStatus } from './validationUtils';
import { formatDateForAPI } from './dateUtils';
import { CSV_HEADER_MAP, TITLE_CASE_FIELDS } from './constants';
import { PersonData } from '../../../types/import/personImportTypes';
import { Company } from '../../../types';

/**
 * Processa il file CSV e prepara i dati per l'importazione
 */
export const processPersonImportFile = async (
  file: File,
  existingCompanies: Company[],
  existingPersons: PersonData[]
): Promise<{
  data: PersonData[];
  conflicts: { [index: number]: ConflictInfo };
  selectedRows: Set<number>;
}> => {
  // Prima processa il file con la funzione standard
  const data = await defaultProcessFile(file, CSV_HEADER_MAP, ';');
  
  if (data.length === 0) {
    return { data: [], conflicts: {}, selectedRows: new Set() };
  }
  
  // Applica Title Case ai campi specificati per ogni persona
  const processedData = data.map((person: PersonData) => 
    applyTitleCaseToFields(person as Record<string, unknown>, TITLE_CASE_FIELDS)
  );
  
  // Risolvi i nomi delle aziende in ID
  const finalData = processedData.map((person: PersonData) => {
    // Normalizza il codice fiscale
    if (person.taxCode) {
      person.taxCode = person.taxCode.toUpperCase().trim();
    }
    
    // Se c'è un codice fiscale ma non una data di nascita, prova a estrarla
    if (person.taxCode && !person.birthDate) {
      const extractedDate = extractBirthDateFromTaxCode(person.taxCode);
      if (extractedDate) {
        person.birthDate = extractedDate;
      }
    }
    
    if (person.companyName && typeof person.companyName === 'string') {
      const company = existingCompanies.find(c => 
        (c.ragioneSociale && c.ragioneSociale.toLowerCase().trim() === person.companyName!.toLowerCase().trim()) ||
        (c.name && c.name.toLowerCase().trim() === person.companyName!.toLowerCase().trim())
      );
      
      if (company) {
        person.companyId = company.id;
        person.companyName = company.ragioneSociale || company.name;
      } else {
        // NON assegnare companyId se non trovato - questo dovrebbe attivare il conflict detection
        person.companyId = undefined;
      }
    }
    
    return person;
  });
  
  // Rileva conflitti
  const detectedConflicts = detectConflicts(finalData, existingPersons, existingCompanies);
  
  // Deseleziona automaticamente le righe con conflitti di duplicato
  let selectedRows: Set<number>;
  if (Object.keys(detectedConflicts).length > 0) {
    selectedRows = new Set<number>();
    finalData.forEach((_, index) => {
      const conflict = detectedConflicts[index];
      // Seleziona solo le righe senza conflitti di duplicato
      if (!conflict || conflict.type !== 'duplicate') {
        selectedRows.add(index);
      }
    });
  } else {
    // Se non ci sono conflitti, seleziona tutte le righe
    selectedRows = new Set(Array.from({ length: finalData.length }, (_, i) => i));
  }
  
  return {
    data: finalData,
    conflicts: detectedConflicts,
    selectedRows
  };
};

/**
 * Prepara i dati per l'importazione applicando le risoluzioni dei conflitti
 */
export const prepareDataForImport = (
  persons: PersonData[],
  conflicts: { [index: number]: ConflictInfo },
  selectedRows: Set<number>,
  overwriteIds: string[] = []
): {
  resolvedPersons: PersonData[];
  finalOverwriteIds: string[];
} => {
  const resolvedPersons: PersonData[] = [];
  const finalOverwriteIds = [...overwriteIds];
  
  // Itera attraverso tutte le persone per applicare le risoluzioni dei conflitti
  persons.forEach((person, index) => {
    // Se la riga non è selezionata, saltala
    if (!selectedRows.has(index)) {
      return;
    }
    
    const conflict = conflicts[index];
    
    // Se non c'è conflitto, aggiungi la persona
    if (!conflict) {
      resolvedPersons.push(person);
      return;
    }

    // Gestione dei duplicati
    if (conflict.type === 'duplicate') {
      if (!conflict.resolution) {
        return; // Salta questo duplicato
      }
      
      if (conflict.resolution === 'skip') {
        return; // Salta questo duplicato
      }
      
      if (conflict.resolution === 'overwrite' && conflict.existingPerson) {
        // Assumiamo che existingPerson possa avere un id quando viene dal database
        const existingPersonWithId = conflict.existingPerson as PersonData & { id?: string };
        if (existingPersonWithId.id) {
          finalOverwriteIds.push(existingPersonWithId.id);
        }
        resolvedPersons.push(person);
        return;
      }
    }

    // Gestione delle aziende non valide
    if (conflict.type === 'invalid_company') {
      if (conflict.resolution === 'skip') {
        return; // Salta questa persona
      }

      if (conflict.resolution === 'assign_company' && conflict.selectedCompanyId) {
        resolvedPersons.push({
          ...person,
          companyId: conflict.selectedCompanyId,
          companyName: conflict.selectedCompanyName
        });
        return;
      }
    }

    // Se arriviamo qui, c'è un conflitto non risolto - salta la persona
  });

  return { resolvedPersons, finalOverwriteIds };
};

/**
 * Formatta i dati delle persone per l'API
 */
export const formatPersonsForAPI = (persons: PersonData[]): PersonData[] => {
  return persons.map(person => {
    const formatted: Record<string, unknown> = {};
    
    // Copia tutti i campi necessari
    ['firstName', 'lastName', 'email', 'phone', 'taxCode', 'birthDate',
      'residenceAddress', 'city', 'province', 'postalCode', 'title', 'companyId', 'username', 'notes', 'status'].forEach(field => {
      const value = (person as Record<string, unknown>)[field];
      if (value !== undefined && value !== null && value !== '') {
        formatted[field] = value;
      }
    });

    // Gestione speciale per il campo status
    formatted.status = normalizePersonStatus(person.status);

    // Formatta la data di nascita se presente
    if (formatted.birthDate) {
      formatted.birthDate = formatDateForAPI(formatted.birthDate as string);
    }

    // Assicurati che il roleType sia valido
    if (!formatted.roleType) {
      formatted.roleType = 'EMPLOYEE'; // Default
    }

    return formatted as PersonData;
  });
};